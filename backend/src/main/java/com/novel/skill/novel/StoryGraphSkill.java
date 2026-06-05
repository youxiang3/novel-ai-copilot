package com.novel.skill.novel;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.config.UserContext;
import com.novel.dto.StoryGraphRequest;
import com.novel.dto.StoryGraphResult;
import com.novel.entity.Chapter;
import com.novel.entity.Foreshadowing;
import com.novel.entity.Lore;
import com.novel.entity.MemorySummary;
import com.novel.entity.Novel;
import com.novel.mapper.ForeshadowingMapper;
import com.novel.service.AiService;
import com.novel.service.ChapterService;
import com.novel.service.LoreService;
import com.novel.service.MemorySummaryService;
import com.novel.service.NovelService;
import com.novel.skill.NovelSkill;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class StoryGraphSkill implements NovelSkill<StoryGraphRequest, StoryGraphResult> {

    private final NovelService novelService;
    private final ChapterService chapterService;
    private final LoreService loreService;
    private final MemorySummaryService memorySummaryService;
    private final ForeshadowingMapper foreshadowingMapper;
    private final AiService aiService;
    private final ObjectMapper objectMapper;

    @Override
    public String getName() {
        return "StoryGraphSkill";
    }

    @Override
    public StoryGraphResult execute(StoryGraphRequest input) {
        if (input.getNovelId() == null) {
            throw new RuntimeException("novelId is required");
        }

        Novel novel = novelService.getById(input.getNovelId());
        if (novel == null) {
            throw new RuntimeException("Novel not found");
        }
        validateOwnership(novel);

        List<Chapter> chapters = chapterService.listByNovelId(input.getNovelId());
        List<Lore> lores = loreService.listByNovelId(input.getNovelId());
        List<MemorySummary> summaries = memorySummaryService.listByNovelId(input.getNovelId());
        List<Foreshadowing> hooks = foreshadowingMapper.selectByNovelId(input.getNovelId());
        StoryGraphResult fallback = createFallback(novel, chapters, lores, summaries, hooks);

        try {
            String response = aiService.call(buildPrompt(novel, chapters, lores, summaries, hooks, input));
            StoryGraphResult result = objectMapper.readValue(extractJson(response), StoryGraphResult.class);
            if (result.getNodes() == null || result.getNodes().isEmpty()) {
                return fallback;
            }
            if (result.getEdges() == null) {
                result.setEdges(List.of());
            }
            return result;
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private void validateOwnership(Novel novel) {
        UUID userId = UserContext.getUserId();
        if (userId == null || !userId.equals(novel.getUserId())) {
            throw new RuntimeException("Access denied");
        }
    }

    private String buildPrompt(Novel novel, List<Chapter> chapters, List<Lore> lores, List<MemorySummary> summaries, List<Foreshadowing> hooks, StoryGraphRequest request) {
        return """
                You are a story graph extraction assistant for a long-form web novel.
                Extract a structured world/story graph from the current novel data.

                Node types: character, faction, location, event, hook, chapter, volume.
                Edge types: relationship, located_in, belongs_to, related_hook, conflict, appears_in, causes, follows.

                Requirements:
                1. Output valid JSON only. Do not output Markdown.
                2. Keep ids stable and readable, such as character_linqingyun or chapter_1.
                3. metadata must be an object and can contain chapterNumber, status, importance, summary, category, tags.
                4. Include chapter structure, important characters, factions, locations, events and unresolved hooks.
                5. Do not invent too many entities. Prefer entities supported by lore, summaries or chapter text.

                JSON format:
                {
                  "nodes": [
                    { "id": "", "type": "character", "label": "", "metadata": {} }
                  ],
                  "edges": [
                    { "sourceId": "", "targetId": "", "type": "relationship", "label": "", "metadata": {} }
                  ]
                }

                Novel title: %s
                Global outline: %s
                Mode: %s
                Chapters:
                %s

                Lore:
                %s

                Previous summaries:
                %s

                Hooks:
                %s
                """.formatted(
                novel.getTitle(),
                blankToDefault(novel.getGlobalOutline(), "Not provided"),
                blankToDefault(request.getMode(), "full"),
                chapters.stream().map(chapter -> "chapter_" + chapter.getChapterNumber() + ": " + blankToDefault(chapter.getTitle(), "") + " / " + shorten(blankToDefault(chapter.getContent(), ""), 1200)).collect(Collectors.joining("\n")),
                lores.stream().map(lore -> lore.getCategory() + " / " + lore.getName() + ": " + blankToDefault(lore.getContent(), "")).collect(Collectors.joining("\n")),
                summaries.stream().map(MemorySummary::getSummaryContent).filter(item -> item != null && !item.isBlank()).collect(Collectors.joining("\n")),
                hooks.stream().map(hook -> "chapter " + hook.getSetupChapter() + " / " + hook.getStatus() + ": " + hook.getContent()).collect(Collectors.joining("\n"))
        );
    }

    private StoryGraphResult createFallback(Novel novel, List<Chapter> chapters, List<Lore> lores, List<MemorySummary> summaries, List<Foreshadowing> hooks) {
        StoryGraphResult result = new StoryGraphResult();
        StoryGraphResult.Node novelNode = node("novel_" + safeId(novel.getTitle()), "volume", novel.getTitle(), Map.of("summary", blankToDefault(novel.getGlobalOutline(), "")));
        result.getNodes().add(novelNode);

        for (Chapter chapter : chapters) {
            StoryGraphResult.Node chapterNode = node("chapter_" + chapter.getChapterNumber(), "chapter", blankToDefault(chapter.getTitle(), "Chapter " + chapter.getChapterNumber()), Map.of(
                    "chapterNumber", chapter.getChapterNumber(),
                    "status", blankToDefault(chapter.getStatus(), "draft"),
                    "summary", findSummary(chapter, summaries)
            ));
            result.getNodes().add(chapterNode);
            result.getEdges().add(edge(novelNode.getId(), chapterNode.getId(), "follows", "chapter", Map.of("chapterNumber", chapter.getChapterNumber())));
        }

        for (Lore lore : lores) {
            String type = mapLoreType(lore.getCategory());
            StoryGraphResult.Node loreNode = node(type + "_" + safeId(lore.getName()), type, lore.getName(), Map.of(
                    "category", blankToDefault(lore.getCategory(), ""),
                    "summary", blankToDefault(lore.getContent(), ""),
                    "importance", 3
            ));
            result.getNodes().add(loreNode);
            result.getEdges().add(edge(loreNode.getId(), novelNode.getId(), "belongs_to", "belongs to story", Map.of()));
        }

        for (Foreshadowing hook : hooks) {
            StoryGraphResult.Node hookNode = node("hook_" + safeId(hook.getContent()), "hook", shorten(blankToDefault(hook.getContent(), "Hook"), 32), Map.of(
                    "status", blankToDefault(hook.getStatus(), "setup"),
                    "importance", hook.getImportance() == null ? 3 : hook.getImportance(),
                    "setupChapter", hook.getSetupChapter()
            ));
            result.getNodes().add(hookNode);
            String chapterId = hook.getSetupChapter() == null ? novelNode.getId() : "chapter_" + hook.getSetupChapter();
            result.getEdges().add(edge(chapterId, hookNode.getId(), "related_hook", "sets up", Map.of()));
        }

        return result;
    }

    private StoryGraphResult.Node node(String id, String type, String label, Map<String, Object> metadata) {
        StoryGraphResult.Node node = new StoryGraphResult.Node();
        node.setId(id);
        node.setType(type);
        node.setLabel(blankToDefault(label, id));
        node.setMetadata(new HashMap<>(metadata));
        return node;
    }

    private StoryGraphResult.Edge edge(String sourceId, String targetId, String type, String label, Map<String, Object> metadata) {
        StoryGraphResult.Edge edge = new StoryGraphResult.Edge();
        edge.setSourceId(sourceId);
        edge.setTargetId(targetId);
        edge.setType(type);
        edge.setLabel(label);
        edge.setMetadata(new HashMap<>(metadata));
        return edge;
    }

    private String mapLoreType(String category) {
        if ("character".equalsIgnoreCase(category)) return "character";
        if ("location".equalsIgnoreCase(category)) return "location";
        if ("sect".equalsIgnoreCase(category) || "faction".equalsIgnoreCase(category) || "world_rule".equalsIgnoreCase(category)) return "faction";
        return "event";
    }

    private String findSummary(Chapter chapter, List<MemorySummary> summaries) {
        return summaries.stream()
                .filter(summary -> chapter.getId() != null && chapter.getId().equals(summary.getChapterId()))
                .map(MemorySummary::getSummaryContent)
                .filter(item -> item != null && !item.isBlank())
                .findFirst()
                .orElse(shorten(blankToDefault(chapter.getContent(), ""), 180));
    }

    private String extractJson(String value) {
        int start = value.indexOf('{');
        int end = value.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return value.substring(start, end + 1);
        }
        return value;
    }

    private String safeId(String value) {
        String safe = blankToDefault(value, "node").toLowerCase().replaceAll("[^a-z0-9\\u4e00-\\u9fa5]+", "_");
        return safe.length() > 36 ? safe.substring(0, 36) : safe;
    }

    private String shorten(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return blankToDefault(value, "");
        }
        return value.substring(0, maxLength);
    }

    private String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
