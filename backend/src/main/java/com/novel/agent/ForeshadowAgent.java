package com.novel.agent;

import com.novel.entity.AIGenerationLog;
import com.novel.entity.Foreshadowing;
import com.novel.entity.Novel;
import com.novel.event.ChapterPublishEvent;
import com.novel.mapper.AIGenerationLogMapper;
import com.novel.mapper.ForeshadowingMapper;
import com.novel.mapper.NovelMapper;
import com.novel.service.AiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class ForeshadowAgent {

    private final AiService aiService;
    private final ForeshadowingMapper foreshadowingMapper;
    private final NovelMapper novelMapper;
    private final AIGenerationLogMapper aiGenerationLogMapper;

    @Async
    @EventListener
    public void handleChapterPublish(ChapterPublishEvent event) {
        log.info("[ForeshadowAgent] 开始分析章节 {} 的伏笔", event.getChapterNumber());

        try {
            Novel novel = novelMapper.selectById(event.getNovelId());
            if (novel == null) {
                log.warn("[ForeshadowAgent] 小说不存在: {}", event.getNovelId());
                return;
            }

            String prompt = buildForeshadowPrompt(event.getContent());

            String response = aiService.call(prompt);

            parseAndSaveForeshadowings(event, response);

            AIGenerationLog aiLog = new AIGenerationLog();
            aiLog.setNovelId(event.getNovelId());
            aiLog.setChapterId(event.getChapterId());
            aiLog.setWorkflowType("foreshadow_analyze");
            aiLog.setPromptSnapshot(prompt);
            aiLog.setResponseSnapshot(response);
            aiLog.setModelName("deepseek-chat");
            aiGenerationLogMapper.insert(aiLog);

            log.info("[ForeshadowAgent] 章节 {} 伏笔分析完成", event.getChapterNumber());

        } catch (Exception e) {
            log.error("[ForeshadowAgent] 分析伏笔失败: chapter={}", event.getChapterNumber(), e);
        }
    }

    private String buildForeshadowPrompt(String content) {
        return """
                作为网文伏笔分析师，请分析以下章节中可能存在的伏笔。

                伏笔类型：
                1. 物品伏笔：某人获得某件物品，日后会有大用
                2. 话语伏笔：某人说的某些话，日后应验或改变剧情
                3. 人物伏笔：某个配角的微小举动，暗示未来发展
                4. 环境伏笔：某个环境细节，暗示后续事件
                5. 境界伏笔：当前境界或瓶颈，暗示后续突破

                要求：
                1. 只输出发现的伏笔，每个伏笔一行
                2. 格式：伏笔内容 | 重要性(1-5)
                3. 如果没有发现伏笔，输出"无"
                4. 最多输出 3 个最重要的伏笔

                章节正文如下：

                """ + content;
    }

    private void parseAndSaveForeshadowings(ChapterPublishEvent event, String response) {
        if (response == null || response.trim().equals("无") || response.trim().isEmpty()) {
            log.info("[ForeshadowAgent] 章节 {} 未发现伏笔", event.getChapterNumber());
            return;
        }

        try {
            String[] lines = response.split("\n");
            int count = 0;

            for (String line : lines) {
                if (count >= 3) break;

                line = line.trim();
                if (line.isEmpty() || line.equals("无")) continue;

                String[] parts = line.split("\\|");
                String content = parts[0].trim();
                int importance = 3;

                if (parts.length > 1) {
                    try {
                        importance = Integer.parseInt(parts[1].trim());
                        importance = Math.min(5, Math.max(1, importance));
                    } catch (NumberFormatException e) {
                        importance = 3;
                    }
                }

                Foreshadowing foreshadowing = new Foreshadowing();
                foreshadowing.setNovelId(event.getNovelId());
                foreshadowing.setSetupChapter(event.getChapterNumber());
                foreshadowing.setContent(content);
                foreshadowing.setStatus("setup");
                foreshadowing.setImportance(importance);
                foreshadowingMapper.insert(foreshadowing);

                count++;
                log.info("[ForeshadowAgent] 发现伏笔: {} (重要性: {})", content, importance);
            }
        } catch (Exception e) {
            log.warn("[ForeshadowAgent] 解析伏笔响应失败: {}", response, e);
        }
    }
}
