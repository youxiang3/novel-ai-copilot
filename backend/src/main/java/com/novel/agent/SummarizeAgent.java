package com.novel.agent;

import com.novel.entity.AIGenerationLog;
import com.novel.entity.MemorySummary;
import com.novel.entity.Novel;
import com.novel.event.ChapterPublishEvent;
import com.novel.mapper.AIGenerationLogMapper;
import com.novel.mapper.MemorySummaryMapper;
import com.novel.mapper.NovelMapper;
import com.novel.service.AiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class SummarizeAgent {

    private final AiService aiService;
    private final MemorySummaryMapper memorySummaryMapper;
    private final NovelMapper novelMapper;
    private final AIGenerationLogMapper aiGenerationLogMapper;

    @Async
    @EventListener
    public void handleChapterPublish(ChapterPublishEvent event) {
        log.info("[SummarizeAgent] 开始生成章节 {} 的记忆摘要", event.getChapterNumber());

        try {
            Novel novel = novelMapper.selectById(event.getNovelId());
            if (novel == null) {
                log.warn("[SummarizeAgent] 小说不存在: {}", event.getNovelId());
                return;
            }

            String prompt = buildSummarizePrompt(event.getContent());

            String summary = aiService.call(prompt);

            MemorySummary memorySummary = new MemorySummary();
            memorySummary.setNovelId(event.getNovelId());
            memorySummary.setChapterId(event.getChapterId());
            memorySummary.setSummaryContent(summary);
            memorySummaryMapper.insert(memorySummary);

            AIGenerationLog aiLog = new AIGenerationLog();
            aiLog.setNovelId(event.getNovelId());
            aiLog.setChapterId(event.getChapterId());
            aiLog.setWorkflowType("summarize");
            aiLog.setPromptSnapshot(prompt);
            aiLog.setResponseSnapshot(summary);
            aiLog.setModelName("deepseek-chat");
            aiGenerationLogMapper.insert(aiLog);

            log.info("[SummarizeAgent] 章节 {} 记忆摘要生成成功", event.getChapterNumber());

        } catch (Exception e) {
            log.error("[SummarizeAgent] 生成记忆摘要失败: chapter={}", event.getChapterNumber(), e);
        }
    }

    private String buildSummarizePrompt(String content) {
        return """
                作为小说分析师，请将以下章节总结为 150-200 字的客观剧情摘要。

                要求：
                1. 必须包含：关键人物的动作、核心冲突结果、获得的物品或境界变化
                2. 使用客观第三人称叙述
                3. 只描述已发生的事实，不添加未来预测
                4. 摘要必须直接来自原文内容，不要添加你自己的理解

                章节正文如下：

                """ + content;
    }
}
