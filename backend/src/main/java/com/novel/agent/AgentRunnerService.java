package com.novel.agent;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.dto.AgentTaskResponse;
import com.novel.agent.dto.CreateNovelAgentTaskRequest;
import com.novel.agent.tool.NovelCreationTool;
import com.novel.agent.tool.NovelCreationToolContext;
import com.novel.config.UserContext;
import com.novel.entity.AgentTask;
import com.novel.entity.AgentTaskStep;
import com.novel.entity.UserModelConfig;
import com.novel.mapper.UserModelConfigMapper;
import com.novel.service.ModelConfigCryptoService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AgentRunnerService {

    private static final int MAX_TOOL_ROUNDS = 12;

    private final NovelCreationAgentWorkflow fixedWorkflow;
    private final AgentAuthorizationService authorizationService;
    private final AgentTaskService taskService;
    private final UserModelConfigMapper modelConfigMapper;
    private final ModelConfigCryptoService cryptoService;
    private final ObjectMapper objectMapper;
    private final List<NovelCreationTool> novelCreationTools;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(20))
            .build();

    public AgentTaskResponse startNovelCreation(CreateNovelAgentTaskRequest request) {
        String mode = normalizeMode(request.getRunnerMode());
        if ("FIXED_WORKFLOW".equals(mode) || "AGENTS_SDK".equals(mode)) {
            return fixedWorkflow.start(request);
        }

        UserModelConfig config = currentModelConfig();
        if (!canUseResponsesApi(config)) {
            return fixedWorkflow.start(request);
        }

        try {
            return runWithResponsesApi(request, config);
        } catch (Exception error) {
            return fixedWorkflow.start(request);
        }
    }

    private AgentTaskResponse runWithResponsesApi(CreateNovelAgentTaskRequest request, UserModelConfig config) throws Exception {
        validateAuthorization(request);

        AgentTask task = taskService.createTask(AgentType.NOVEL_CREATION, request.getTitle(), inputSnapshot(request, "RESPONSES_API"));
        taskService.updateStatus(task, AgentTaskStatus.RUNNING);
        taskService.log(task, AgentLogLevel.INFO, "使用 OpenAI Responses API 运行小说创建工具", Map.of(
                "provider", config.getProvider(),
                "model", config.getModel()
        ));

        NovelCreationToolContext context = createContext(request);
        Map<String, NovelCreationTool> toolsByName = novelCreationTools.stream()
                .collect(Collectors.toMap(NovelCreationTool::getName, tool -> tool));

        try {
            String previousResponseId = null;
            List<Map<String, Object>> toolOutputs = null;
            for (int round = 0; round < MAX_TOOL_ROUNDS; round++) {
                JsonNode response = callResponsesApi(config, previousResponseId, toolOutputs, buildInputPrompt(request), buildToolSpecs());
                previousResponseId = response.path("id").asText(previousResponseId);
                List<JsonNode> functionCalls = findFunctionCalls(response);
                if (functionCalls.isEmpty()) {
                    break;
                }

                toolOutputs = new ArrayList<>();
                for (JsonNode functionCall : functionCalls) {
                    String toolName = functionCall.path("name").asText();
                    String callId = functionCall.path("call_id").asText();
                    NovelCreationTool tool = toolsByName.get(toolName);
                    if (tool == null) {
                        toolOutputs.add(functionOutput(callId, "{\"error\":\"Unknown tool\"}"));
                        continue;
                    }

                    Map<String, Object> arguments = parseArguments(functionCall.path("arguments").asText("{}"));
                    Object output = executeToolStep(task, context, tool, arguments);
                    toolOutputs.add(functionOutput(callId, taskService.toJson(output)));
                }
            }

            ensureRequiredToolsCompleted(context, request);
            Map<String, Object> result = context.resultSnapshot();
            result.put("runnerMode", "RESPONSES_API");
            taskService.finishSuccess(task, result);
            taskService.log(task, AgentLogLevel.INFO, "Responses API 工具运行完成", result);
            AgentTaskResponse response = taskService.toResponse(task);
            response.setMessage("小说创建代理任务已通过 Responses API 工具调用完成");
            return response;
        } catch (Exception error) {
            taskService.finishFailed(task, error.getMessage());
            taskService.log(task, AgentLogLevel.ERROR, "Responses API 工具运行失败", Map.of("error", error.getMessage()));
            AgentTaskResponse response = taskService.toResponse(task);
            response.setMessage("Responses API 工具运行失败");
            return response;
        }
    }

    private Object executeToolStep(AgentTask task, NovelCreationToolContext context, NovelCreationTool tool, Map<String, Object> arguments) {
        AgentTaskStep step = taskService.startStep(task, tool.getKey(), toolStepName(tool), arguments);
        taskService.log(task, AgentLogLevel.INFO, "模型调用工具：" + tool.getName(), Map.of("stepKey", tool.getKey()));
        try {
            Object output = tool.execute(context, arguments);
            taskService.finishStep(step, output);
            return output;
        } catch (Exception error) {
            taskService.failStep(step, error.getMessage());
            throw error;
        }
    }

    private JsonNode callResponsesApi(UserModelConfig config, String previousResponseId, List<Map<String, Object>> toolOutputs, String inputPrompt, List<Map<String, Object>> tools) throws Exception {
        String apiKey = cryptoService.decrypt(config.getApiKeyEncrypted());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", config.getModel());
        body.put("tools", tools);
        body.put("tool_choice", "auto");
        if (previousResponseId == null) {
            body.put("input", inputPrompt);
        } else {
            body.put("previous_response_id", previousResponseId);
            body.put("input", toolOutputs);
        }

        String baseUrl = config.getBaseUrl().replaceAll("/+$", "");
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/responses"))
                .timeout(Duration.ofMinutes(3))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body), StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new RuntimeException("Responses API 调用失败: HTTP " + response.statusCode());
        }
        return objectMapper.readTree(response.body());
    }

    private List<Map<String, Object>> buildToolSpecs() {
        return novelCreationTools.stream()
                .map(tool -> {
                    Map<String, Object> spec = new LinkedHashMap<>();
                    spec.put("type", "function");
                    spec.put("name", tool.getName());
                    spec.put("description", tool.getDescription());
                    spec.put("parameters", tool.getParametersSchema());
                    return spec;
                })
                .toList();
    }

    private String buildInputPrompt(CreateNovelAgentTaskRequest request) {
        return """
                You are a novel creation agent. Use the provided tools to create the novel.
                You must call tools in this order:
                1. create_novel_draft
                2. confirm_novel
                3. generate_first_chapter if autoGenerateFirstChapter is true
                4. save_first_chapter if a first chapter was generated
                5. generate_story_graph if autoGenerateStoryGraph is true

                Do not ask the user for confirmation in this MVP. The user has already authorized the scopes.
                Return a concise final summary only after all required tools are complete.

                title: %s
                idea: %s
                genre: %s
                style: %s
                autoGenerateFirstChapter: %s
                autoGenerateStoryGraph: %s
                """.formatted(
                request.getTitle(),
                blankToDefault(request.getIdea(), ""),
                blankToDefault(request.getGenre(), ""),
                blankToDefault(request.getStyle(), ""),
                Boolean.TRUE.equals(request.getAutoGenerateFirstChapter()),
                Boolean.TRUE.equals(request.getAutoGenerateStoryGraph())
        );
    }

    private List<JsonNode> findFunctionCalls(JsonNode response) {
        List<JsonNode> calls = new ArrayList<>();
        JsonNode output = response.path("output");
        if (output.isArray()) {
            for (JsonNode item : output) {
                if ("function_call".equals(item.path("type").asText())) {
                    calls.add(item);
                }
            }
        }
        return calls;
    }

    private Map<String, Object> functionOutput(String callId, String output) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("type", "function_call_output");
        item.put("call_id", callId);
        item.put("output", output);
        return item;
    }

    private Map<String, Object> parseArguments(String arguments) {
        try {
            return objectMapper.readValue(arguments, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ignored) {
            return Map.of();
        }
    }

    private void ensureRequiredToolsCompleted(NovelCreationToolContext context, CreateNovelAgentTaskRequest request) {
        if (context.getDraft() == null) {
            throw new RuntimeException("模型未调用 create_novel_draft");
        }
        if (context.getNovel() == null) {
            throw new RuntimeException("模型未调用 confirm_novel");
        }
        if (Boolean.TRUE.equals(request.getAutoGenerateFirstChapter()) && context.getFirstChapterExpansion() == null) {
            throw new RuntimeException("模型未调用 generate_first_chapter");
        }
        if (Boolean.TRUE.equals(request.getAutoGenerateStoryGraph()) && context.getStoryGraph() == null) {
            throw new RuntimeException("模型未调用 generate_story_graph");
        }
    }

    private void validateAuthorization(CreateNovelAgentTaskRequest request) {
        List<String> scopes = new ArrayList<>(List.of("novel:create", "chapter:create", "chapter:update"));
        if (Boolean.TRUE.equals(request.getAutoGenerateStoryGraph())) {
            scopes.add("storyGraph:generate");
        }
        authorizationService.validate(request.getAuthorizationId(), AgentType.NOVEL_CREATION, scopes);
    }

    private UserModelConfig currentModelConfig() {
        UUID userId = UserContext.getUserId();
        return userId == null ? null : modelConfigMapper.selectActiveByUserId(userId);
    }

    private boolean canUseResponsesApi(UserModelConfig config) {
        return config != null
                && config.getApiKeyEncrypted() != null
                && !config.getApiKeyEncrypted().isBlank()
                && config.getBaseUrl() != null
                && config.getBaseUrl().replaceAll("/+$", "").endsWith("api.openai.com/v1")
                && config.getModel() != null
                && !config.getModel().isBlank();
    }

    private Map<String, Object> inputSnapshot(CreateNovelAgentTaskRequest request, String runnerMode) {
        Map<String, Object> input = new LinkedHashMap<>();
        input.put("authorizationId", request.getAuthorizationId());
        input.put("title", request.getTitle());
        input.put("idea", request.getIdea());
        input.put("genre", request.getGenre());
        input.put("style", request.getStyle());
        input.put("autoGenerateFirstChapter", Boolean.TRUE.equals(request.getAutoGenerateFirstChapter()));
        input.put("autoGenerateStoryGraph", Boolean.TRUE.equals(request.getAutoGenerateStoryGraph()));
        input.put("runnerMode", runnerMode);
        return input;
    }

    private NovelCreationToolContext createContext(CreateNovelAgentTaskRequest request) {
        NovelCreationToolContext context = new NovelCreationToolContext();
        context.setTitle(request.getTitle());
        context.setIdea(request.getIdea());
        context.setGenre(request.getGenre());
        context.setStyle(request.getStyle());
        context.setAutoGenerateFirstChapter(Boolean.TRUE.equals(request.getAutoGenerateFirstChapter()));
        context.setAutoGenerateStoryGraph(Boolean.TRUE.equals(request.getAutoGenerateStoryGraph()));
        return context;
    }

    private String toolStepName(NovelCreationTool tool) {
        return switch (tool.getKey()) {
            case "CREATE_DRAFT" -> "生成作品资料草稿";
            case "CONFIRM_NOVEL" -> "确认创建作品";
            case "GENERATE_FIRST_CHAPTER" -> "生成第一章开篇正文";
            case "SAVE_CHAPTER" -> "保存第一章";
            case "GENERATE_STORY_GRAPH" -> "生成世界观图谱";
            default -> tool.getName();
        };
    }

    private String normalizeMode(String runnerMode) {
        if (runnerMode == null || runnerMode.isBlank()) {
            return "AUTO";
        }
        return runnerMode.trim().toUpperCase();
    }

    private String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
