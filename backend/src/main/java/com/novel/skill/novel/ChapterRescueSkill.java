package com.novel.skill.novel;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.config.UserContext;
import com.novel.dto.ChapterRescueRequest;
import com.novel.dto.ChapterRescueResult;
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
public class ChapterRescueSkill implements NovelSkill<ChapterRescueRequest, ChapterRescueResult> {

    private final NovelService novelService;
    private final ChapterService chapterService;
    private final LoreService loreService;
    private final MemorySummaryService memorySummaryService;
    private final AiService aiService;
    private final ObjectMapper objectMapper;

    @Override
    public String getName() {
        return "ChapterRescueSkill";
    }

    @Override
    public ChapterRescueResult execute(ChapterRescueRequest input) {
        validateRequest(input);

        Novel novel = novelService.getById(input.getNovelId());
        if (novel == null) {
            throw new RuntimeException("Novel not found");
        }
        validateOwnership(novel);

        Chapter chapter = chapterService.getById(input.getChapterId());
        if (chapter == null || !input.getNovelId().equals(chapter.getNovelId())) {
            throw new RuntimeException("Chapter not found");
        }

        List<Lore> lores = safeLores(input.getNovelId());
        List<Lore> relevantLores = findRelevantLores(input, chapter, lores);
        List<MemorySummary> summaries = memorySummaryService.getPreviousSummaries(input.getNovelId(), chapter.getChapterNumber(), 3);

        ChapterRescueResult fallback = createFallback(input, novel, chapter, relevantLores, summaries);
        try {
            String response = aiService.call(buildPrompt(input, novel, chapter, relevantLores, summaries));
            ChapterRescueResult result = objectMapper.readValue(extractJson(response), ChapterRescueResult.class);
            fillResultDefaults(result, fallback);
            return result;
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private void validateRequest(ChapterRescueRequest input) {
        if (input.getNovelId() == null) {
            throw new RuntimeException("novelId is required");
        }
        if (input.getChapterId() == null) {
            throw new RuntimeException("chapterId is required");
        }
    }

    private void validateOwnership(Novel novel) {
        UUID userId = UserContext.getUserId();
        if (userId == null || !userId.equals(novel.getUserId())) {
            throw new RuntimeException("Access denied");
        }
    }

    private List<Lore> safeLores(UUID novelId) {
        try {
            return loreService.listByNovelId(novelId);
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private List<Lore> findRelevantLores(ChapterRescueRequest input, Chapter chapter, List<Lore> lores) {
        String source = String.join("\n",
                blankToDefault(input.getSelectedText(), ""),
                blankToDefault(input.getUserDirection(), ""),
                blankToDefault(input.getRescueMode(), ""),
                blankToDefault(chapter.getContent(), "")
        ).toLowerCase();
        return lores.stream()
                .filter(lore -> {
                    String name = blankToDefault(lore.getName(), "").toLowerCase();
                    String content = blankToDefault(lore.getContent(), "").toLowerCase();
                    return !name.isBlank() && (source.contains(name) || content.contains(source));
                })
                .limit(8)
                .collect(Collectors.toList());
    }

    private String buildPrompt(ChapterRescueRequest input, Novel novel, Chapter chapter, List<Lore> lores, List<MemorySummary> summaries) {
        String mainCharacter = lores.stream()
                .filter(lore -> "character".equalsIgnoreCase(lore.getCategory()))
                .map(lore -> lore.getName() + ": " + blankToDefault(lore.getContent(), ""))
                .findFirst()
                .orElse("No main character lore yet. Keep the protagonist consistent with the current chapter.");
        String worldRules = lores.stream()
                .filter(lore -> "world_rule".equalsIgnoreCase(lore.getCategory()) || "sect".equalsIgnoreCase(lore.getCategory()) || "faction".equalsIgnoreCase(lore.getCategory()))
                .map(lore -> lore.getName() + ": " + blankToDefault(lore.getContent(), ""))
                .collect(Collectors.joining("\n"));
        String relatedLore = lores.stream()
                .map(lore -> lore.getName() + ": " + blankToDefault(lore.getContent(), ""))
                .collect(Collectors.joining("\n"));
        String previousSummary = summaries.stream()
                .map(MemorySummary::getSummaryContent)
                .filter(item -> item != null && !item.isBlank())
                .collect(Collectors.joining("\n"));

        return """
                You are a web-novel writer rescue assistant.

                Input:
                - Novel title: %s
                - Sell point / global outline: %s
                - Current chapter title: %s
                - Current chapter text: %s
                - Stuck selected fragment, may be empty: %s
                - User desired direction, may be empty: %s
                - Rescue mode, may be empty: %s
                - Current hook line: %s
                - Main character setting: %s
                - Related character states / lore: %s
                - World rules summary: %s
                - Previous summaries: %s
                - Style requirement: %s

                Generate 3 different continuation solutions.

                Requirements:
                1. Each solution must have clear plot progress, not vague advice.
                2. Solutions must differ clearly, such as conflict escalation, information reversal, relationship progress, or payoff.
                3. Every solution must include a continuationText that can be inserted directly into the chapter.
                4. Keep character personality and world rules consistent.
                5. Do not jump to the ending or skip key process.
                6. continuationText must be prose, not outline.
                7. Output valid JSON only. Do not output Markdown.

                JSON format:
                {
                  "solutions": [
                    {
                      "title": "",
                      "reason": "",
                      "conflictHint": "",
                      "continuationText": "",
                      "nextPlotSuggestion": ""
                    }
                  ]
                }
                """.formatted(
                novel.getTitle(),
                blankToDefault(novel.getGlobalOutline(), "Not provided"),
                blankToDefault(chapter.getTitle(), "Untitled chapter"),
                shorten(blankToDefault(chapter.getContent(), "Current chapter is empty."), 6000),
                blankToDefault(input.getSelectedText(), ""),
                blankToDefault(input.getUserDirection(), ""),
                blankToDefault(input.getRescueMode(), ""),
                blankToDefault(input.getUserDirection(), blankToDefault(chapter.getTitle(), "")),
                mainCharacter,
                blankToDefault(relatedLore, "No related lore."),
                blankToDefault(worldRules, "No world rules."),
                blankToDefault(previousSummary, "No previous summary."),
                blankToDefault(novel.getAuthorStylePrompt(), "Clean, vivid, conflict-driven prose.")
        );
    }

    private ChapterRescueResult createFallback(ChapterRescueRequest input, Novel novel, Chapter chapter, List<Lore> lores, List<MemorySummary> summaries) {
        String anchor = blankToDefault(input.getSelectedText(), lastText(chapter.getContent()));
        String direction = blankToDefault(input.getUserDirection(), "continue the current pressure");
        String mode = blankToDefault(input.getRescueMode(), "conflict escalation");
        String loreHint = lores.isEmpty() ? "an unresolved detail" : lores.get(0).getName();

        ChapterRescueResult result = new ChapterRescueResult();
        result.setSolutions(List.of(
                solution(
                        "Conflict escalation",
                        "It fits the current stuck point because it gives the scene an immediate external pressure.",
                        "Let the opposite side force the protagonist to answer now.",
                        anchor + "\n\nThe silence did not last. Someone stepped forward before the protagonist could explain, and the room tightened around that single movement. The old pressure became specific: a name, a demand, and a deadline. He looked at the faces waiting for him to bow his head, then slowly closed his fingers around the one thing they had all ignored.\n\nIf he retreated here, everything after this would be decided by others. So he raised his eyes and said, \"No. This time, I decide.\"",
                        "Follow with a concrete counter-move from the antagonist, then let the protagonist pay a small price for refusing."
                ),
                solution(
                        "Information reversal",
                        "It solves the stall by changing what the reader understands about the scene.",
                        "Reveal that " + loreHint + " is not what everyone thought.",
                        anchor + "\n\nOnly when the accusation landed did he notice the flaw. The other party had spoken too quickly, as if afraid the missing half of the truth would surface. He replayed the sentence in his mind, word by word, and the chill in his chest turned sharp.\n\nThey were not here because they had evidence.\n\nThey were here because they feared he did.",
                        "Let the protagonist test this discovery with one calm question and force the other side to expose a mistake."
                ),
                solution(
                        "Payoff and hook",
                        "It gives the reader a small reward while leaving a new reason to continue.",
                        "Turn the current block into a visible payoff, then leave a deeper clue.",
                        anchor + "\n\nHe had endured enough to understand one thing: patience was not the same as weakness. When the pressure reached its highest point, he finally moved. The result was small, almost quiet, but everyone close enough saw it. The rule they trusted bent for one breath.\n\nNo one spoke.\n\nThen, from somewhere beyond the crowd, another voice said his name as if it had been waiting for years.",
                        "End the scene with the new speaker or clue, then open the next beat with their connection to the protagonist."
                )
        ));
        return result;
    }

    private ChapterRescueResult.Solution solution(String title, String reason, String conflictHint, String continuationText, String nextPlotSuggestion) {
        ChapterRescueResult.Solution solution = new ChapterRescueResult.Solution();
        solution.setTitle(title);
        solution.setReason(reason);
        solution.setConflictHint(conflictHint);
        solution.setContinuationText(continuationText);
        solution.setNextPlotSuggestion(nextPlotSuggestion);
        return solution;
    }

    private void fillResultDefaults(ChapterRescueResult result, ChapterRescueResult fallback) {
        if (result.getSolutions() == null || result.getSolutions().isEmpty()) {
            result.setSolutions(fallback.getSolutions());
        } else if (result.getSolutions().size() < 3) {
            result.getSolutions().addAll(fallback.getSolutions().subList(result.getSolutions().size(), 3));
        }
    }

    private String extractJson(String value) {
        int start = value.indexOf('{');
        int end = value.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return value.substring(start, end + 1);
        }
        return value;
    }

    private String lastText(String content) {
        String text = blankToDefault(content, "The current scene reaches a point where the protagonist must choose.");
        return text.length() > 420 ? text.substring(text.length() - 420) : text;
    }

    private String shorten(String value, int maxLength) {
        if (value.length() <= maxLength) {
            return value;
        }
        return value.substring(value.length() - maxLength);
    }

    private String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
