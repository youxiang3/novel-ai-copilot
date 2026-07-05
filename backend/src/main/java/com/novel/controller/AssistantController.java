package com.novel.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.common.Result;
import com.novel.config.UserContext;
import com.novel.dto.AssistantAction;
import com.novel.dto.AssistantChatRequest;
import com.novel.dto.AssistantChatResponse;
import com.novel.service.AiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/assistant")
@RequiredArgsConstructor
@Tag(name = "智能创作助手", description = "模型驱动的小说创作助手接口")
public class AssistantController {

    private final AiService aiService;
    private final ObjectMapper objectMapper;

    @PostMapping("/chat")
    @Operation(summary = "发送智能助手消息")
    public Result<AssistantChatResponse> chat(@RequestBody AssistantChatRequest request) {
        requireUser();
        if (request.getMessage() == null || request.getMessage().trim().isEmpty()) {
            return Result.error(400, "message 不能为空");
        }

        String prompt = buildPrompt(request);
        String output = aiService.call(prompt);
        AssistantChatResponse response = parseModelOutput(output);
        response.setRawModelOutput(output);
        return Result.success(response);
    }

    private String buildPrompt(AssistantChatRequest request) {
        String workContext = request.getWorkContext() == null || request.getWorkContext().isBlank()
                ? "当前没有打开作品。"
                : request.getWorkContext();
        return """
                你是 NovelAI Copilot 的智能创作助手，帮助中文小说作者通过对话完成创作。

                你必须遵守：
                1. 不要声称已经发布、同步云端或真实删除任何数据。
                2. 涉及写入、覆盖、删除、发布的动作必须让用户确认。
                3. 如果上下文不足，先追问关键问题。
                4. 输出必须是 JSON，不要使用 Markdown 代码块。

                可建议的 actions 类型只允许：
                - appendChapterText：追加到当前章节
                - replaceChapterDraft：替换当前章节草稿
                - createMemoryDraft：创建待确认记忆
                - createCheckSuggestion：创建检查建议
                - openWebAiPrompt：打开 Web AI Prompt
                - openWorkManagement：打开作品管理
                - openModelSettings：打开模型设置
                - openExportCenter：打开导出中心

                JSON 格式：
                {
                  "reply": "给用户看的自然语言回复",
                  "actions": [
                    { "type": "appendChapterText", "label": "追加到当前章节", "payload": "要写入的文本" }
                  ],
                  "warnings": ["需要用户注意的边界"]
                }

                当前作品上下文：
                %s

                用户消息：
                %s
                """.formatted(workContext, request.getMessage().trim());
    }

    private AssistantChatResponse parseModelOutput(String output) {
        AssistantChatResponse response = new AssistantChatResponse();
        try {
            JsonNode root = objectMapper.readTree(stripJsonFence(output));
            response.setReply(root.path("reply").asText(output));

            List<AssistantAction> actions = new ArrayList<>();
            if (root.path("actions").isArray()) {
                for (JsonNode actionNode : root.path("actions")) {
                    String type = actionNode.path("type").asText("");
                    if (!isAllowedAction(type)) {
                        continue;
                    }
                    AssistantAction action = new AssistantAction();
                    action.setType(type);
                    action.setLabel(actionNode.path("label").asText(type));
                    JsonNode payload = actionNode.path("payload");
                    action.setPayload(payload.isObject() || payload.isArray() ? payload.toString() : payload.asText(""));
                    actions.add(action);
                }
            }
            response.setActions(actions);

            List<String> warnings = new ArrayList<>();
            if (root.path("warnings").isArray()) {
                for (JsonNode warningNode : root.path("warnings")) {
                    warnings.add(warningNode.asText());
                }
            }
            response.setWarnings(warnings);
        } catch (Exception e) {
            response.setReply(output);
            response.setWarnings(List.of("模型没有返回标准 JSON，已按普通回复展示。"));
        }
        return response;
    }

    private boolean isAllowedAction(String type) {
        return List.of(
                "appendChapterText",
                "replaceChapterDraft",
                "createMemoryDraft",
                "createCheckSuggestion",
                "openWebAiPrompt",
                "openWorkManagement",
                "openModelSettings",
                "openExportCenter"
        ).contains(type);
    }

    private String stripJsonFence(String output) {
        String trimmed = output == null ? "" : output.trim();
        if (trimmed.startsWith("```")) {
            trimmed = trimmed.replaceFirst("^```(?:json)?", "").trim();
            if (trimmed.endsWith("```")) {
                trimmed = trimmed.substring(0, trimmed.length() - 3).trim();
            }
        }
        return trimmed;
    }

    private void requireUser() {
        UUID userId = UserContext.getUserId();
        if (userId == null) {
            throw new RuntimeException("未登录");
        }
    }
}
