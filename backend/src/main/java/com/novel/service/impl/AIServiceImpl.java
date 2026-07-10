package com.novel.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.config.UserContext;
import com.novel.dto.AiCallResult;
import com.novel.entity.UserModelConfig;
import com.novel.mapper.UserModelConfigMapper;
import com.novel.service.AiService;
import com.novel.service.ModelConfigCryptoService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.scheduler.Schedulers;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
public class AIServiceImpl implements AiService {

    private final ChatClient chatClient;
    private final UserModelConfigMapper modelConfigMapper;
    private final ModelConfigCryptoService cryptoService;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public AIServiceImpl(ObjectProvider<ChatClient> chatClientProvider, UserModelConfigMapper modelConfigMapper, ModelConfigCryptoService cryptoService, ObjectMapper objectMapper) {
        this.chatClient = chatClientProvider.getIfAvailable();
        this.modelConfigMapper = modelConfigMapper;
        this.cryptoService = cryptoService;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(20))
                .build();
    }

    @Override
    public String call(String prompt) {
        return callWithUsage(prompt).getContent();
    }

    @Override
    public AiCallResult callWithUsage(String prompt) {
        log.info("Calling AI with prompt (sync): {}", prompt.length() > 100 ? prompt.substring(0, 100) + "..." : prompt);

        UserModelConfig config = currentModelConfig();
        if (hasUsableCustomConfig(config)) {
            return callOpenAiCompatible(prompt, config);
        }
        if (chatClient == null) {
            throw new RuntimeException("未配置可用模型：请保存用户模型配置，或配置 Spring AI ChatClient");
        }
        
        Message message = new UserMessage(prompt);
        Prompt aiPrompt = new Prompt(List.of(message));
        
        ChatResponse response = chatClient.call(aiPrompt);
        String result = response.getResult().getOutput().getContent();
        
        log.info("AI response received (sync), length: {}", result.length());
        return estimatedResult(result, null, prompt);
    }

    @Override
    public Flux<String> streamCall(String prompt) {
        log.info("Calling AI with prompt (stream): {}", prompt.length() > 100 ? prompt.substring(0, 100) + "..." : prompt);

        UserModelConfig config = currentModelConfig();
        if (hasUsableCustomConfig(config)) {
            return streamOpenAiCompatible(prompt, config);
        }
        if (chatClient == null) {
            return Flux.error(new RuntimeException("未配置可用模型：请保存用户模型配置，或配置 Spring AI ChatClient"));
        }
        
        Message message = new UserMessage(prompt);
        Prompt aiPrompt = new Prompt(List.of(message));
        
        return Flux.just(call(prompt));
    }

    private UserModelConfig currentModelConfig() {
        UUID userId = UserContext.getUserId();
        if (userId == null) {
            return null;
        }
        return modelConfigMapper.selectActiveByUserId(userId);
    }

    private boolean hasUsableCustomConfig(UserModelConfig config) {
        return config != null
                && config.getBaseUrl() != null
                && !config.getBaseUrl().isBlank()
                && config.getModel() != null
                && !config.getModel().isBlank()
                && config.getApiKeyEncrypted() != null
                && !config.getApiKeyEncrypted().isBlank();
    }

    private AiCallResult callOpenAiCompatible(String prompt, UserModelConfig config) {
        try {
            String apiKey = cryptoService.decrypt(config.getApiKeyEncrypted());
            String body = objectMapper.writeValueAsString(Map.of(
                    "model", config.getModel(),
                    "messages", List.of(Map.of("role", "user", "content", prompt)),
                    "temperature", 0.7,
                    "stream", false
            ));

            HttpRequest request = baseRequest(config, apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new RuntimeException("模型调用失败: HTTP " + response.statusCode() + " " + response.body());
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode content = root.path("choices").path(0).path("message").path("content");
            if (content.isMissingNode() || content.isNull()) {
                throw new RuntimeException("模型返回格式异常");
            }
            return resultFromOpenAiCompatible(root, content.asText(), config.getModel(), prompt);
        } catch (Exception e) {
            throw new RuntimeException("模型调用失败: " + e.getMessage(), e);
        }
    }

    private Flux<String> streamOpenAiCompatible(String prompt, UserModelConfig config) {
        return Flux.<String>create(sink -> {
            try {
                String apiKey = cryptoService.decrypt(config.getApiKeyEncrypted());
                String body = objectMapper.writeValueAsString(Map.of(
                        "model", config.getModel(),
                        "messages", List.of(Map.of("role", "user", "content", prompt)),
                        "temperature", 0.7,
                        "stream", true
                ));

                HttpRequest request = baseRequest(config, apiKey)
                        .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
                if (response.statusCode() < 200 || response.statusCode() >= 300) {
                    sink.error(new RuntimeException("模型调用失败: HTTP " + response.statusCode() + " " + response.body()));
                    return;
                }

                for (String line : response.body().split("\\R")) {
                    if (!line.startsWith("data:")) {
                        continue;
                    }
                    String data = line.substring(5).trim();
                    if ("[DONE]".equals(data)) {
                        break;
                    }
                    String chunk = extractStreamChunk(data);
                    if (!chunk.isEmpty()) {
                        sink.next(chunk);
                    }
                }
                sink.complete();
            } catch (Exception e) {
                sink.error(e);
            }
        }).subscribeOn(Schedulers.boundedElastic());
    }

    private HttpRequest.Builder baseRequest(UserModelConfig config, String apiKey) {
        String baseUrl = config.getBaseUrl().replaceAll("/+$", "");
        return HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/chat/completions"))
                .timeout(Duration.ofMinutes(2))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey);
    }

    private String extractStreamChunk(String data) {
        try {
            JsonNode root = objectMapper.readTree(data);
            JsonNode content = root.path("choices").path(0).path("delta").path("content");
            return content.isMissingNode() || content.isNull() ? "" : content.asText();
        } catch (Exception e) {
            log.debug("Ignoring malformed stream chunk: {}", data);
            return "";
        }
    }

    private AiCallResult resultFromOpenAiCompatible(JsonNode root, String content, String modelName, String prompt) {
        AiCallResult result = new AiCallResult();
        result.setContent(content);
        result.setModelName(firstNonBlank(root.path("model").asText(null), modelName));
        JsonNode usage = root.path("usage");
        Integer promptTokens = firstPositiveInt(usage.path("prompt_tokens"), usage.path("input_tokens"));
        Integer completionTokens = firstPositiveInt(usage.path("completion_tokens"), usage.path("output_tokens"));
        Integer totalTokens = positiveInt(usage.path("total_tokens"));
        if (totalTokens == null && promptTokens != null && completionTokens != null) {
            totalTokens = promptTokens + completionTokens;
        }
        result.setPromptTokens(promptTokens);
        result.setCompletionTokens(completionTokens);
        result.setTotalTokens(totalTokens == null ? estimateTokenUsage(prompt, content) : totalTokens);
        result.setUsageSource(totalTokens == null ? "estimated" : "provider");
        return result;
    }

    private AiCallResult estimatedResult(String content, String modelName, String prompt) {
        AiCallResult result = new AiCallResult();
        result.setContent(content);
        result.setModelName(modelName);
        result.setTotalTokens(estimateTokenUsage(prompt, content));
        result.setUsageSource("estimated");
        return result;
    }

    private Integer positiveInt(JsonNode node) {
        return node == null || !node.canConvertToInt() || node.asInt() < 1 ? null : node.asInt();
    }

    private Integer firstPositiveInt(JsonNode... nodes) {
        for (JsonNode node : nodes) {
            Integer value = positiveInt(node);
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private int estimateTokenUsage(String prompt, String response) {
        int promptLength = prompt == null ? 0 : prompt.length();
        int responseLength = response == null ? 0 : response.length();
        return Math.max(1, (promptLength + responseLength + 3) / 4);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return "";
    }
}
