package com.novel.skill.novel;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.config.UserContext;
import com.novel.dto.ChapterExpansionRequest;
import com.novel.dto.ChapterExpansionResult;
import com.novel.entity.Chapter;
import com.novel.entity.Lore;
import com.novel.entity.MemorySummary;
import com.novel.entity.Novel;
import com.novel.service.AiService;
import com.novel.service.ChapterService;
import com.novel.service.LoreService;
import com.novel.service.MemorySummaryService;
import com.novel.service.NovelService;
import com.novel.skill.NovelSkill;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class ChapterExpansionSkill implements NovelSkill<ChapterExpansionRequest, ChapterExpansionResult> {

    private final NovelService novelService;
    private final ChapterService chapterService;
    private final LoreService loreService;
    private final MemorySummaryService memorySummaryService;
    private final AiService aiService;
    private final ObjectMapper objectMapper;

    @Override
    public String getName() {
        return "ChapterExpansionSkill";
    }

    @Override
    public ChapterExpansionResult execute(ChapterExpansionRequest input) {
        validateRequest(input);

        Novel novel = novelService.getById(input.getNovelId());
        if (novel == null) {
            throw new RuntimeException("小说不存在");
        }
        validateOwnership(novel);

        Chapter chapter = chapterService.getById(input.getChapterId());
        if (chapter == null || !input.getNovelId().equals(chapter.getNovelId())) {
            throw new RuntimeException("章节不存在");
        }

        List<Lore> lores = safeLores(input.getNovelId());
        List<Lore> relevantLores = findRelevantLores(input.getSceneText(), lores);
        List<MemorySummary> summaries = memorySummaryService.getPreviousSummaries(
                input.getNovelId(),
                chapter.getChapterNumber(),
                3
        );

        ChapterExpansionResult fallback = createFallback(input, novel, chapter, relevantLores, summaries);
        try {
            String response = aiService.call(buildPrompt(input, novel, chapter, relevantLores, summaries));
            ChapterExpansionResult result = objectMapper.readValue(extractJson(response), ChapterExpansionResult.class);
            fillResultDefaults(result, fallback);
            return result;
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private void validateRequest(ChapterExpansionRequest input) {
        if (input.getNovelId() == null) {
            throw new RuntimeException("novelId 不能为空");
        }
        if (input.getChapterId() == null) {
            throw new RuntimeException("chapterId 不能为空");
        }
        if (input.getSceneText() == null || input.getSceneText().isBlank()) {
            throw new RuntimeException("sceneText 不能为空");
        }
    }

    private void validateOwnership(Novel novel) {
        UUID userId = UserContext.getUserId();
        if (userId == null || !userId.equals(novel.getUserId())) {
            throw new RuntimeException("无权访问");
        }
    }

    private List<Lore> safeLores(UUID novelId) {
        try {
            return loreService.listByNovelId(novelId);
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private List<Lore> findRelevantLores(String sceneText, List<Lore> lores) {
        String source = sceneText == null ? "" : sceneText.toLowerCase();
        return lores.stream()
                .filter(lore -> {
                    String name = blankToDefault(lore.getName(), "").toLowerCase();
                    String content = blankToDefault(lore.getContent(), "").toLowerCase();
                    return !name.isBlank() && (source.contains(name) || content.contains(source));
                })
                .limit(8)
                .collect(Collectors.toList());
    }

    private String buildPrompt(ChapterExpansionRequest input, Novel novel, Chapter chapter, List<Lore> lores, List<MemorySummary> summaries) {
        String mainCharacter = lores.stream()
                .filter(lore -> "character".equalsIgnoreCase(lore.getCategory()))
                .map(lore -> lore.getName() + "：" + blankToDefault(lore.getContent(), ""))
                .findFirst()
                .orElse("暂未建立主角设定，请根据短画面保持克制补足。");
        String worldRules = lores.stream()
                .filter(lore -> "world_rule".equalsIgnoreCase(lore.getCategory()) || "sect".equalsIgnoreCase(lore.getCategory()) || "faction".equalsIgnoreCase(lore.getCategory()))
                .map(lore -> lore.getName() + "：" + blankToDefault(lore.getContent(), ""))
                .collect(Collectors.joining("\n"));
        String relatedLore = lores.stream()
                .map(lore -> lore.getName() + "：" + blankToDefault(lore.getContent(), ""))
                .collect(Collectors.joining("\n"));
        String previousSummary = summaries.stream()
                .map(MemorySummary::getSummaryContent)
                .filter(item -> item != null && !item.isBlank())
                .collect(Collectors.joining("\n"));

        return """
                你是一个擅长网文节奏的章节扩写助手。

                输入信息：
                - 作品标题：%s
                - 一句话卖点/全局大纲：%s
                - 当前章节标题：%s
                - 短画面内容：%s
                - 当前章节目标：%s
                - 主角设定：%s
                - 相关角色状态/设定：%s
                - 世界规则摘要：%s
                - 前文摘要：%s
                - 文风要求：%s

                请把短画面扩写成一段可直接放入章节正文的内容。

                要求：
                1. 保持网文节奏，有冲突、有情绪推进、有画面感。
                2. 不要写成大纲，要写成正文。
                3. 不要随意推翻已有设定。
                4. 如果短画面信息不足，可以合理补足细节，但不要新增过多复杂设定。
                5. 结尾尽量留下轻微追读钩子。
                6. 输出必须是合法 JSON，不要输出 Markdown。

                JSON 格式：
                {
                  "chapterText": "",
                  "chapterSummary": "",
                  "characterUpdates": [
                    {
                      "characterName": "",
                      "stateChange": "",
                      "relationshipChange": ""
                    }
                  ],
                  "newForeshadowing": [
                    {
                      "title": "",
                      "description": "",
                      "payoffSuggestion": ""
                    }
                  ],
                  "newWorldFacts": [""]
                }
                """.formatted(
                novel.getTitle(),
                blankToDefault(novel.getGlobalOutline(), "暂未填写"),
                blankToDefault(chapter.getTitle(), "未命名章节"),
                input.getSceneText(),
                blankToDefault(input.getChapterGoal(), chapter.getTitle()),
                mainCharacter,
                blankToDefault(relatedLore, "暂无相关设定"),
                blankToDefault(worldRules, "暂无世界规则"),
                blankToDefault(previousSummary, "这是开篇或暂无前文摘要"),
                blankToDefault(input.getStyle(), blankToDefault(novel.getAuthorStylePrompt(), "清爽、有画面感，避免空泛"))
        );
    }

    private ChapterExpansionResult createFallback(ChapterExpansionRequest input, Novel novel, Chapter chapter, List<Lore> lores, List<MemorySummary> summaries) {
        ChapterExpansionResult result = new ChapterExpansionResult();
        String scene = input.getSceneText().trim();
        String loreHint = lores.isEmpty() ? "空气里只有尚未说出口的压力" : lores.get(0).getName() + "像一根暗线压在场中";
        String memoryHint = summaries.isEmpty() ? "这是读者第一次真正看见这场危机" : "前文留下的余波还没散去";

        result.setChapterText("""
                %s

                %s，%s。

                他没有立刻回答。越是这种时候，越不能把所有情绪都写在脸上。周围的目光像细密的针，一点点扎进沉默里，逼着他后退，也逼着他做出选择。

                可他偏偏往前迈了一步。

                那一瞬间，原本看似普通的局面忽然变了味道。%s，连旁人的呼吸都慢了半拍。主角知道，这一步迈出去，就再也不能装作什么都没有发生。

                他抬眼看向对面，声音不高，却让所有议论都停了下来。

                “既然你们非要一个答案，那我现在就给。”

                话音落下，最先变化的不是众人的脸色，而是他掌心深处那一点几乎被压住的异动。
                """.formatted(
                scene,
                blankToDefault(novel.getTitle(), "这本书") + "的这一章还没真正爆开",
                memoryHint,
                loreHint
        ).trim());
        result.setChapterSummary(blankToDefault(chapter.getTitle(), "当前章节") + "围绕“" + scene + "”推进，主角在压力中做出主动选择，并留下新的异动钩子。");

        ChapterExpansionResult.CharacterUpdate update = new ChapterExpansionResult.CharacterUpdate();
        update.setCharacterName("主角");
        update.setStateChange("从被动承受转为主动回应当前危机。");
        update.setRelationshipChange("与压迫方的冲突公开升级。");
        result.setCharacterUpdates(List.of(update));

        ChapterExpansionResult.ForeshadowingHint hint = new ChapterExpansionResult.ForeshadowingHint();
        hint.setTitle("掌心异动");
        hint.setDescription("主角做出选择后，掌心或随身物出现异常反应。");
        hint.setPayoffSuggestion("可在后续章节解释为身份、血脉、道具或旧案线索。");
        result.setNewForeshadowing(List.of(hint));
        result.setNewWorldFacts(List.of("当前世界规则会通过公开压力迫使主角表态，冲突升级后会引出更高层势力或秘密。"));
        return result;
    }

    private void fillResultDefaults(ChapterExpansionResult result, ChapterExpansionResult fallback) {
        if (result.getChapterText() == null || result.getChapterText().isBlank()) result.setChapterText(fallback.getChapterText());
        if (result.getChapterSummary() == null || result.getChapterSummary().isBlank()) result.setChapterSummary(fallback.getChapterSummary());
        if (result.getCharacterUpdates() == null || result.getCharacterUpdates().isEmpty()) result.setCharacterUpdates(fallback.getCharacterUpdates());
        if (result.getNewForeshadowing() == null || result.getNewForeshadowing().isEmpty()) result.setNewForeshadowing(fallback.getNewForeshadowing());
        if (result.getNewWorldFacts() == null || result.getNewWorldFacts().isEmpty()) result.setNewWorldFacts(fallback.getNewWorldFacts());
    }

    private String extractJson(String value) {
        int start = value.indexOf('{');
        int end = value.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return value.substring(start, end + 1);
        }
        return value;
    }

    private String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
