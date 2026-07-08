package com.novel.skill.novel;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.dto.ChapterRewriteRequest;
import com.novel.dto.ChapterRewriteResult;
import com.novel.entity.AIGenerationLog;
import com.novel.mapper.AIGenerationLogMapper;
import com.novel.service.AiService;
import com.novel.skill.NovelSkill;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class ChapterRewriteSkill implements NovelSkill<ChapterRewriteRequest, ChapterRewriteResult> {

    private final AiService aiService;
    private final ObjectMapper objectMapper;
    private final AIGenerationLogMapper aiGenerationLogMapper;

    @Override
    public String getName() {
        return "ChapterRewriteSkill";
    }

    @Override
    public ChapterRewriteResult execute(ChapterRewriteRequest input) {
        validateRequest(input);
        String prompt = buildPrompt(input);
        String response = aiService.call(prompt);
        ChapterRewriteResult result = parseResult(response);
        saveGenerationLog(input, prompt, response, result);
        return result;
    }

    private void validateRequest(ChapterRewriteRequest input) {
        if (input == null) {
            throw new RuntimeException("request cannot be null");
        }
        if (isBlank(input.getChapterText()) && isBlank(input.getSelectedText())) {
            throw new RuntimeException("chapterText or selectedText cannot be blank");
        }
    }

    private ChapterRewriteResult parseResult(String response) {
        try {
            ChapterRewriteResult result = objectMapper.readValue(extractJson(response), ChapterRewriteResult.class);
            fillDefaults(result);
            return result;
        } catch (Exception ignored) {
            ChapterRewriteResult result = new ChapterRewriteResult();
            result.setMode("model-api-raw");
            result.setReplacementText(response == null ? "" : response.trim());
            result.setConservativeText(result.getReplacementText());
            result.getRiskNotes().add("模型未返回标准 JSON，已保留原始文本；采用前请人工检查人物动机、设定和伏笔。");
            return result;
        }
    }

    private void fillDefaults(ChapterRewriteResult result) {
        if (result.getRiskNotes() == null) {
            result.setRiskNotes(new ArrayList<>());
        }
        String replacement = firstNonBlank(
                result.getReplacementText(),
                result.getConservativeText(),
                result.getPolishedText(),
                result.getExpandedText(),
                result.getIntenseText()
        );
        result.setReplacementText(replacement);
        if (isBlank(result.getConservativeText())) result.setConservativeText(replacement);
        if (isBlank(result.getPolishedText())) result.setPolishedText(replacement);
    }

    private String buildPrompt(ChapterRewriteRequest input) {
        String targetText = isBlank(input.getSelectedText())
                ? trimToLimit(input.getChapterText(), 4000)
                : input.getSelectedText().trim();
        String lore = joinContext(input.getLoreContext());
        String memory = joinContext(input.getMemoryContext());
        return """
                你是中文网文编辑和章节改稿助手。请基于作品资料、长篇记忆和当前章节，输出可确认采用的改稿版本。

                重要边界：
                - 不要承诺平台推荐、真实商业表现或检测器判断。
                - 不要自动替作者决定剧情走向。
                - 不要大幅改写全文，只处理【本次改稿范围】。
                - 如果新增设定、改变人物动机或影响伏笔，必须写入 riskNotes。

                请只输出合法 JSON，不要输出 Markdown。JSON 格式：
                {
                  "mode": "model-api",
                  "replacementText": "最推荐作者采用的可直接替换文本",
                  "conservativeText": "保守改版本",
                  "expandedText": "扩写版本",
                  "polishedText": "精修版本",
                  "intenseText": "强刺激改版本",
                  "riskNotes": ["采用前需要确认的风险"]
                }

                【作品】
                标题：%s
                题材：%s
                卖点：%s

                【章节】
                标题：%s
                当前章节正文：
                %s

                【本次改稿要求】
                %s

                【本次改稿范围】
                %s

                【资料库】
                %s

                【长篇记忆】
                %s
                """.formatted(
                blankToDefault(input.getWorkTitle(), "未命名作品"),
                blankToDefault(input.getGenre(), "未设置"),
                blankToDefault(input.getSellingPoint(), "未设置"),
                blankToDefault(input.getChapterTitle(), "未命名章节"),
                trimToLimit(input.getChapterText(), 6000),
                blankToDefault(input.getInstruction(), "请增强现场感、人物反应、冲突压力和网文节奏。"),
                trimToLimit(targetText, 3000),
                blankToDefault(lore, "暂无"),
                blankToDefault(memory, "暂无")
        );
    }

    private void saveGenerationLog(ChapterRewriteRequest input, String prompt, String response, ChapterRewriteResult result) {
        if (input.getNovelId() == null) {
            return;
        }
        try {
            AIGenerationLog log = new AIGenerationLog();
            log.setNovelId(input.getNovelId());
            log.setChapterId(input.getChapterId());
            log.setWorkflowType("chapter_rewrite");
            log.setPromptSnapshot(trimToLimit(prompt, 12000));
            log.setResponseSnapshot(trimToLimit(response, 12000));
            log.setModelName(firstNonBlank(result.getMode(), "model-api"));
            log.setTokenUsage(estimateTokenUsage(prompt, response));
            log.setCreateTime(LocalDateTime.now());
            aiGenerationLogMapper.insert(log);
        } catch (Exception ignored) {
            // Logging must never block returning the rewrite result to the writer.
        }
    }

    private int estimateTokenUsage(String prompt, String response) {
        int promptLength = prompt == null ? 0 : prompt.length();
        int responseLength = response == null ? 0 : response.length();
        return Math.max(1, (promptLength + responseLength + 3) / 4);
    }

    private String extractJson(String value) {
        if (value == null) return "{}";
        int start = value.indexOf('{');
        int end = value.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return value.substring(start, end + 1);
        }
        return value;
    }

    private String joinContext(List<String> items) {
        if (items == null || items.isEmpty()) return "";
        return items.stream()
                .filter(item -> item != null && !item.isBlank())
                .limit(20)
                .reduce("", (left, right) -> left + "- " + trimToLimit(right, 500) + "\n");
    }

    private String trimToLimit(String value, int limit) {
        if (value == null) return "";
        String text = value.trim();
        return text.length() > limit ? text.substring(0, limit) + "\n（后文已截断）" : text;
    }

    private String blankToDefault(String value, String fallback) {
        return isBlank(value) ? fallback : value.trim();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (!isBlank(value)) return value.trim();
        }
        return "";
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
