package com.novel.agent;

import com.novel.entity.AIGenerationLog;
import com.novel.entity.EmotionCurve;
import com.novel.entity.Novel;
import com.novel.event.ChapterPublishEvent;
import com.novel.mapper.AIGenerationLogMapper;
import com.novel.mapper.EmotionCurveMapper;
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
public class EmotionAgent {

    private final AiService aiService;
    private final EmotionCurveMapper emotionCurveMapper;
    private final NovelMapper novelMapper;
    private final AIGenerationLogMapper aiGenerationLogMapper;

    @Async
    @EventListener
    public void handleChapterPublish(ChapterPublishEvent event) {
        log.info("[EmotionAgent] 开始分析章节 {} 的情绪曲线", event.getChapterNumber());

        try {
            Novel novel = novelMapper.selectById(event.getNovelId());
            if (novel == null) {
                log.warn("[EmotionAgent] 小说不存在: {}", event.getNovelId());
                return;
            }

            String prompt = buildEmotionPrompt(event.getContent());

            String response = aiService.call(prompt);

            EmotionCurve emotionCurve = parseEmotionResponse(event, response);

            emotionCurveMapper.insert(emotionCurve);

            AIGenerationLog aiLog = new AIGenerationLog();
            aiLog.setNovelId(event.getNovelId());
            aiLog.setChapterId(event.getChapterId());
            aiLog.setWorkflowType("emotion_analyze");
            aiLog.setPromptSnapshot(prompt);
            aiLog.setResponseSnapshot(response);
            aiLog.setModelName("deepseek-chat");
            aiGenerationLogMapper.insert(aiLog);

            log.info("[EmotionAgent] 章节 {} 情绪曲线分析成功: tension={}, satisfaction={}, mystery={}, despair={}, warmth={}",
                    event.getChapterNumber(),
                    emotionCurve.getTension(),
                    emotionCurve.getSatisfaction(),
                    emotionCurve.getMystery(),
                    emotionCurve.getDespair(),
                    emotionCurve.getWarmth());

        } catch (Exception e) {
            log.error("[EmotionAgent] 分析情绪曲线失败: chapter={}", event.getChapterNumber(), e);
        }
    }

    private String buildEmotionPrompt(String content) {
        return """
                作为网文情绪分析师，请分析以下章节在五个情绪维度上的数值。

                五个情绪维度（每个 0-100）：
                1. 张力(tension)：剧情的紧张程度，包括冲突、危机、悬念
                2. 爽感(satisfaction)：读者的满足感，包括打脸、复仇、突破
                3. 悬念(mystery)：未知感和好奇度，包括伏笔、谜题、未知
                4. 压抑(despair)：负面情绪，包括失败、失去、困境
                5. 温情(warmth)：正面情感，包括爱情、友情、成长

                要求：
                1. 只输出五个数值，格式：tension=XX,satisfaction=XX,mystery=XX,despair=XX,warmth=XX
                2. 每个数值必须是 0-100 之间的整数
                3. 不要输出任何其他内容

                章节正文如下：

                """ + content;
    }

    private EmotionCurve parseEmotionResponse(ChapterPublishEvent event, String response) {
        EmotionCurve emotionCurve = new EmotionCurve();
        emotionCurve.setNovelId(event.getNovelId());
        emotionCurve.setChapterId(event.getChapterId());

        try {
            String[] parts = response.split(",");
            for (String part : parts) {
                String[] keyValue = part.trim().split("=");
                if (keyValue.length == 2) {
                    String key = keyValue[0].trim().toLowerCase();
                    int value = Integer.parseInt(keyValue[1].trim());

                    switch (key) {
                        case "tension" -> emotionCurve.setTension(Math.min(100, Math.max(0, value)));
                        case "satisfaction" -> emotionCurve.setSatisfaction(Math.min(100, Math.max(0, value)));
                        case "mystery" -> emotionCurve.setMystery(Math.min(100, Math.max(0, value)));
                        case "despair" -> emotionCurve.setDespair(Math.min(100, Math.max(0, value)));
                        case "warmth" -> emotionCurve.setWarmth(Math.min(100, Math.max(0, value)));
                    }
                }
            }
        } catch (Exception e) {
            log.warn("[EmotionAgent] 解析情绪响应失败，使用默认值: {}", response);
            emotionCurve.setTension(50);
            emotionCurve.setSatisfaction(50);
            emotionCurve.setMystery(50);
            emotionCurve.setDespair(50);
            emotionCurve.setWarmth(50);
        }

        if (emotionCurve.getTension() == null) emotionCurve.setTension(50);
        if (emotionCurve.getSatisfaction() == null) emotionCurve.setSatisfaction(50);
        if (emotionCurve.getMystery() == null) emotionCurve.setMystery(50);
        if (emotionCurve.getDespair() == null) emotionCurve.setDespair(50);
        if (emotionCurve.getWarmth() == null) emotionCurve.setWarmth(50);

        return emotionCurve;
    }
}
