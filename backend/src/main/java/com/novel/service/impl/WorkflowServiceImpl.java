package com.novel.service.impl;

import com.novel.entity.*;
import com.novel.mapper.*;
import com.novel.service.AiService;
import com.novel.service.WorkflowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowServiceImpl implements WorkflowService {

    private final AiService aiService;
    private final NovelMapper novelMapper;
    private final ChapterMapper chapterMapper;
    private final LoreMapper loreMapper;
    private final MemorySummaryMapper memorySummaryMapper;
    private final EmotionCurveMapper emotionCurveMapper;
    private final ForeshadowingMapper foreshadowingMapper;

    @Override
    public Flux<String> generateScreenplay(Long novelId, Long chapterId, String targetScene, Integer targetDuration) {
        log.info("[WorkflowService] 生成短剧脚本: novelId={}, chapterId={}, scene={}", novelId, chapterId, targetScene);

        Novel novel = novelMapper.selectById(novelId);
        Chapter chapter = chapterMapper.selectById(chapterId);

        if (novel == null || chapter == null) {
            return Flux.error(new RuntimeException("小说或章节不存在"));
        }

        String prompt = buildScreenplayPrompt(novel, chapter, targetScene, targetDuration);
        System.out.println("========================================");
        System.out.println("=== 短剧脚本生成 - 完整 Prompt ===");
        System.out.println("========================================");
        System.out.println(prompt);
        System.out.println("========================================");

        return aiService.streamCall(prompt);
    }

    @Override
    public String generateChapterPlan(Long novelId, Integer startChapter, Integer endChapter) {
        log.info("[WorkflowService] 生成章节计划: novelId={}, chapters={}-{}", novelId, startChapter, endChapter);

        Novel novel = novelMapper.selectById(novelId);
        if (novel == null) {
            throw new RuntimeException("小说不存在");
        }

        List<Chapter> chapters = chapterMapper.selectByNovelId(UUID.fromString(novelId.toString()));

        String prompt = buildChapterPlanPrompt(novel, chapters, startChapter, endChapter);
        System.out.println("========================================");
        System.out.println("=== 章节计划生成 - 完整 Prompt ===");
        System.out.println("========================================");
        System.out.println(prompt);
        System.out.println("========================================");

        return aiService.call(prompt);
    }

    @Override
    public String analyzeChapter(Long novelId, Long chapterId, String analysisType) {
        log.info("[WorkflowService] 分析章节: novelId={}, chapterId={}, type={}", novelId, chapterId, analysisType);

        Novel novel = novelMapper.selectById(novelId);
        Chapter chapter = chapterMapper.selectById(chapterId);

        if (novel == null || chapter == null) {
            throw new RuntimeException("小说或章节不存在");
        }

        String prompt = buildAnalysisPrompt(novel, chapter, analysisType);
        System.out.println("========================================");
        System.out.println("=== 章节分析 - 完整 Prompt ===");
        System.out.println("========================================");
        System.out.println(prompt);
        System.out.println("========================================");

        return aiService.call(prompt);
    }

    @Override
    public String editorInChiefReview(Long novelId, Long chapterId) {
        log.info("[WorkflowService] 责编审稿: novelId={}, chapterId={}", novelId, chapterId);

        Novel novel = novelMapper.selectById(novelId);
        Chapter chapter = chapterMapper.selectById(chapterId);
        EmotionCurve emotionCurve = emotionCurveMapper.selectByChapterId(UUID.fromString(chapterId.toString()));
        List<Foreshadowing> pendingForeshadowings = foreshadowingMapper.selectByNovelIdAndStatus(
                UUID.fromString(novelId.toString()), "setup");

        String prompt = buildEditorReviewPrompt(novel, chapter, emotionCurve, pendingForeshadowings);
        System.out.println("========================================");
        System.out.println("=== 责编审稿 - 完整 Prompt ===");
        System.out.println("========================================");
        System.out.println(prompt);
        System.out.println("========================================");

        return aiService.call(prompt);
    }

    @Override
    public String generateScreenplayDraft(String workTitle, String chapterTitle, String chapterContent, String genre,
                                          String sellingPoint, String summary, List<String> characters,
                                          List<String> worldRules, String targetScene, Integer targetDuration) {
        validateChapterContent(chapterContent);
        String prompt = buildIpScreenplayPrompt(workTitle, chapterTitle, chapterContent, genre, sellingPoint,
                summary, characters, worldRules, targetScene, targetDuration);
        log.info("[WorkflowService] IP Factory 短剧脚本草案: workTitle={}, chapterTitle={}", workTitle, chapterTitle);
        return aiService.call(prompt);
    }

    @Override
    public String generateGamePackage(String workTitle, String chapterTitle, String chapterContent, String genre,
                                      String sellingPoint, String summary, List<String> characters,
                                      List<String> worldRules) {
        validateChapterContent(chapterContent);
        String prompt = buildGamePackagePrompt(workTitle, chapterTitle, chapterContent, genre, sellingPoint,
                summary, characters, worldRules);
        log.info("[WorkflowService] IP Factory 互动剧情游戏设定包: workTitle={}, chapterTitle={}", workTitle, chapterTitle);
        return aiService.call(prompt);
    }

    private String buildScreenplayPrompt(Novel novel, Chapter chapter, String targetScene, Integer targetDuration) {
        StringBuilder sb = new StringBuilder();
        sb.append("【短剧脚本生成】\n\n");

        sb.append("【小说信息】\n");
        sb.append("标题：").append(novel.getTitle()).append("\n");
        if (novel.getAuthorStylePrompt() != null) {
            sb.append("文风：").append(novel.getAuthorStylePrompt()).append("\n");
        }
        sb.append("\n");

        sb.append("【目标场景】\n");
        sb.append(targetScene).append("\n\n");

        sb.append("【场景章节内容】\n");
        sb.append(chapter.getContent()).append("\n\n");

        sb.append("【要求】\n");
        sb.append("1. 将上述场景转化为适合短视频平台的竖屏短剧脚本\n");
        sb.append("2. 建议时长：").append(targetDuration != null ? targetDuration : 60).append("秒\n");
        sb.append("3. 包含：分镜描述、人物动作、对话台词、情绪提示\n");
        sb.append("4. 保持原著的爽点和情感张力\n");
        sb.append("5. 结尾留有悬念或反转，吸引用户关注\n");

        return sb.toString();
    }

    private String buildIpScreenplayPrompt(String workTitle, String chapterTitle, String chapterContent, String genre,
                                           String sellingPoint, String summary, List<String> characters,
                                           List<String> worldRules, String targetScene, Integer targetDuration) {
        StringBuilder sb = new StringBuilder();
        sb.append("【IP Factory：小说转竖屏短剧脚本】\n\n");
        appendIpSource(sb, workTitle, chapterTitle, genre, sellingPoint, summary, characters, worldRules);
        sb.append("【目标场景】\n");
        sb.append(blankToDefault(targetScene, chapterTitle)).append("\n\n");
        sb.append("【章节正文】\n");
        sb.append(chapterContent).append("\n\n");
        sb.append("【输出要求】\n");
        sb.append("请输出 Markdown，不要输出解释性前言。\n");
        sb.append("1. 先给出 3 秒高能钩子，必须保留原著核心冲突。\n");
        sb.append("2. 建议总时长：").append(targetDuration != null && targetDuration > 0 ? targetDuration : 90).append(" 秒。\n");
        sb.append("3. 使用表格输出分镜：镜头序号、景别、画面/动作、台词/字幕、情绪目标、拍摄提示。\n");
        sb.append("4. 强化反转、悬念和短视频节奏，但不要改变人物底层动机。\n");
        sb.append("5. 结尾必须留下下一集钩子。\n");
        return sb.toString();
    }

    private String buildGamePackagePrompt(String workTitle, String chapterTitle, String chapterContent, String genre,
                                          String sellingPoint, String summary, List<String> characters,
                                          List<String> worldRules) {
        StringBuilder sb = new StringBuilder();
        sb.append("【IP Factory：小说转互动剧情游戏设定包】\n\n");
        appendIpSource(sb, workTitle, chapterTitle, genre, sellingPoint, summary, characters, worldRules);
        sb.append("【章节正文】\n");
        sb.append(chapterContent).append("\n\n");
        sb.append("【输出要求】\n");
        sb.append("只输出合法 JSON，不要使用 Markdown 代码块，不要输出解释性前言。\n");
        sb.append("JSON 顶层字段必须包含：\n");
        sb.append("- title: 字符串，游戏设定包标题\n");
        sb.append("- source: 对象，包含 workTitle、chapterTitle、genre、sellingPoint\n");
        sb.append("- gameType: 字符串，例如 文字冒险 / 互动叙事 / AVG / 剧情解谜 / 轻量 RPG\n");
        sb.append("- coreLoop: 字符串数组，描述探索、选择、对话、事件触发、资源或好感度变化\n");
        sb.append("- playerGoal: 字符串，玩家在本章节原型中的目标\n");
        sb.append("- characters: 数组，每项包含 id、name、role、motivation、relationshipVariables\n");
        sb.append("- scenes: 数组，每项包含 id、name、objective、sourceExcerpt、interactiveObjects\n");
        sb.append("- quests: 数组，每项包含 id、title、successCondition、failureCondition\n");
        sb.append("- branches: 数组，每项包含 id、prompt、options；options 每项包含 id、text、effect、result\n");
        sb.append("- failureStates: 数组，描述失败反馈\n");
        sb.append("- exportNotes: 字符串数组，说明如何交给前端或游戏引擎继续实现\n");
        sb.append("请保留原著核心世界观、主角动机和关键冲突，并把章节冲突拆成可交互选择。\n");
        return sb.toString();
    }

    private void appendIpSource(StringBuilder sb, String workTitle, String chapterTitle, String genre,
                                String sellingPoint, String summary, List<String> characters, List<String> worldRules) {
        sb.append("【作品信息】\n");
        sb.append("作品标题：").append(blankToDefault(workTitle, "未命名作品")).append("\n");
        sb.append("章节标题：").append(blankToDefault(chapterTitle, "当前章节")).append("\n");
        sb.append("题材：").append(blankToDefault(genre, "未设置")).append("\n");
        sb.append("一句话卖点：").append(blankToDefault(sellingPoint, "未设置")).append("\n");
        sb.append("作品简介：").append(blankToDefault(summary, "未设置")).append("\n");
        sb.append("主要人物：").append(joinOrDefault(characters, "未设置")).append("\n");
        sb.append("世界规则：").append(joinOrDefault(worldRules, "未设置")).append("\n\n");
    }

    private void validateChapterContent(String chapterContent) {
        if (chapterContent == null || chapterContent.isBlank()) {
            throw new RuntimeException("章节正文不能为空");
        }
    }

    private String blankToDefault(String value, String defaultValue) {
        return value == null || value.isBlank() ? defaultValue : value.trim();
    }

    private String joinOrDefault(List<String> values, String defaultValue) {
        if (values == null || values.isEmpty()) return defaultValue;
        String joined = values.stream()
                .filter(value -> value != null && !value.isBlank())
                .map(String::trim)
                .collect(Collectors.joining("、"));
        return joined.isBlank() ? defaultValue : joined;
    }

    private String buildChapterPlanPrompt(Novel novel, List<Chapter> chapters, Integer startChapter, Integer endChapter) {
        StringBuilder sb = new StringBuilder();
        sb.append("【章节计划生成】\n\n");

        sb.append("【小说信息】\n");
        sb.append("标题：").append(novel.getTitle()).append("\n");
        if (novel.getGlobalOutline() != null) {
            sb.append("全局大纲：").append(novel.getGlobalOutline()).append("\n");
        }
        sb.append("\n");

        sb.append("【已有章节】\n");
        for (Chapter ch : chapters) {
            sb.append("第").append(ch.getChapterNumber()).append("章")
              .append(ch.getTitle() != null ? "：" + ch.getTitle() : "")
              .append(" - ").append(ch.getWordCount()).append("字\n");
        }
        sb.append("\n");

        sb.append("【计划范围】\n");
        sb.append("起始章节：").append(startChapter).append("\n");
        sb.append("结束章节：").append(endChapter).append("\n\n");

        sb.append("【要求】\n");
        sb.append("1. 为每个章节生成简要的剧情发展方向\n");
        sb.append("2. 确保章节之间有逻辑连贯性\n");
        sb.append("3. 标注每章的预期爽点和情绪变化\n");
        sb.append("4. 格式：章节号 | 标题 | 核心事件 | 预期字数\n");

        return sb.toString();
    }

    private String buildAnalysisPrompt(Novel novel, Chapter chapter, String analysisType) {
        StringBuilder sb = new StringBuilder();
        sb.append("【章节自动分析】\n\n");

        sb.append("【分析类型】\n");
        sb.append(analysisType).append("\n\n");

        sb.append("【小说信息】\n");
        sb.append("标题：").append(novel.getTitle()).append("\n");
        sb.append("\n");

        sb.append("【章节内容】\n");
        sb.append(chapter.getContent()).append("\n\n");

        switch (analysisType) {
            case "logic" -> {
                sb.append("【要求】\n");
                sb.append("1. 检查本章的逻辑连贯性\n");
                sb.append("2. 指出可能存在的漏洞或矛盾\n");
                sb.append("3. 给出改进建议\n");
            }
            case "pace" -> {
                sb.append("【要求】\n");
                sb.append("1. 分析本章的节奏是否紧凑\n");
                sb.append("2. 指出节奏过慢或过快的地方\n");
                sb.append("3. 提供节奏调整建议\n");
            }
            case "character" -> {
                sb.append("【要求】\n");
                sb.append("1. 分析本章人物的行为是否合理\n");
                sb.append("2. 指出人物塑造的亮点和不足\n");
                sb.append("3. 提供人物发展建议\n");
            }
            default -> {
                sb.append("【要求】\n");
                sb.append("1. 提供综合性的改进建议\n");
                sb.append("2. 指出亮点和不足\n");
            }
        }

        return sb.toString();
    }

    private String buildEditorReviewPrompt(Novel novel, Chapter chapter, EmotionCurve emotionCurve,
                                           List<Foreshadowing> pendingForeshadowings) {
        StringBuilder sb = new StringBuilder();
        sb.append("【责编审稿意见】\n\n");

        sb.append("【小说信息】\n");
        sb.append("标题：").append(novel.getTitle()).append("\n");
        sb.append("文风：").append(novel.getAuthorStylePrompt() != null ? novel.getAuthorStylePrompt() : "未设置").append("\n");
        sb.append("\n");

        sb.append("【待审章节】\n");
        sb.append("章节号：").append(chapter.getChapterNumber()).append("\n");
        sb.append("标题：").append(chapter.getTitle()).append("\n");
        sb.append("字数：").append(chapter.getWordCount()).append("\n\n");

        if (emotionCurve != null) {
            sb.append("【情绪分析】\n");
            sb.append("张力：").append(emotionCurve.getTension()).append("/100\n");
            sb.append("爽感：").append(emotionCurve.getSatisfaction()).append("/100\n");
            sb.append("悬念：").append(emotionCurve.getMystery()).append("/100\n");
            sb.append("压抑：").append(emotionCurve.getDespair()).append("/100\n");
            sb.append("温情：").append(emotionCurve.getWarmth()).append("/100\n\n");
        }

        if (!pendingForeshadowings.isEmpty()) {
            sb.append("【待回收伏笔】\n");
            for (Foreshadowing f : pendingForeshadowings) {
                sb.append("- 第").append(f.getSetupChapter()).append("章埋设：")
                  .append(f.getContent()).append("\n");
            }
            sb.append("\n");
        }

        sb.append("【章节正文】\n");
        sb.append(chapter.getContent()).append("\n\n");

        sb.append("【审稿要求】\n");
        sb.append("1. 给出是否通过的审稿意见\n");
        sb.append("2. 如不通过，指出具体问题和修改建议\n");
        sb.append("3. 标注本章的亮点（可学习的写作技巧）\n");
        sb.append("4. 提醒是否有伏笔需要在本章或后续章节回收\n");
        sb.append("5. 给出综合评分（1-10分）\n");

        return sb.toString();
    }
}
