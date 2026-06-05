package com.novel.agent.tool;

import com.novel.dto.ChapterExpansionRequest;
import com.novel.dto.ChapterExpansionResult;
import com.novel.dto.FirstChapterGenerationRequest;
import com.novel.dto.FirstChapterGenerationResult;
import com.novel.dto.NovelDraftResponse;
import com.novel.entity.Chapter;
import com.novel.entity.Novel;
import com.novel.skill.novel.ChapterExpansionSkill;
import com.novel.skill.novel.FirstChapterGenerationSkill;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class GenerateFirstChapterTool extends AbstractNovelCreationTool {

    private final FirstChapterGenerationSkill firstChapterGenerationSkill;
    private final ChapterExpansionSkill chapterExpansionSkill;

    @Override
    public String getKey() {
        return "GENERATE_FIRST_CHAPTER";
    }

    @Override
    public String getName() {
        return "generate_first_chapter";
    }

    @Override
    public String getDescription() {
        return "Generate the first chapter opening text from the confirmed novel draft.";
    }

    @Override
    public Map<String, Object> getParametersSchema() {
        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put("sceneText", stringProperty("Opening scene text to expand."));
        properties.put("chapterGoal", stringProperty("First chapter goal."));
        return objectSchema(properties, List.of());
    }

    @Override
    public ChapterExpansionResult execute(NovelCreationToolContext context, Map<String, Object> arguments) {
        Novel novel = context.getNovel();
        Chapter firstChapter = context.getFirstChapter();
        NovelDraftResponse draft = context.getDraft();
        if (novel == null || firstChapter == null || draft == null) {
            throw new RuntimeException("请先确认创建作品");
        }

        try {
            FirstChapterGenerationRequest request = new FirstChapterGenerationRequest();
            request.setNovelId(novel.getId());
            request.setTitle(context.getTitle());
            request.setIdea(context.getIdea());
            request.setGenre(context.getGenre());
            request.setStyle(context.getStyle());
            request.setDraft(draft);

            FirstChapterGenerationResult generated = firstChapterGenerationSkill.execute(request);
            ChapterExpansionResult result = toExpansionResult(generated);
            context.setGeneratedFirstChapterTitle(generated == null ? null : generated.getChapterTitle());
            context.setFirstChapterExpansion(result);
            return result;
        } catch (Exception ignored) {
            ChapterExpansionRequest request = new ChapterExpansionRequest();
            request.setNovelId(novel.getId());
            request.setChapterId(firstChapter.getId());
            request.setSceneText(stringArg(arguments, "sceneText", blankToDefault(draft.getFirstChapterOpeningScene(), context.getIdea())));
            request.setChapterGoal(stringArg(arguments, "chapterGoal", blankToDefault(draft.getOpeningChapterGoal(), "写出第一章开篇，完成主角亮相、核心冲突和追读钩子。")));
            request.setStyle(context.getStyle());
            ChapterExpansionResult result = chapterExpansionSkill.execute(request);
            context.setGeneratedFirstChapterTitle(blankToDefault(draft.getFirstChapterTitle(), null));
            context.setFirstChapterExpansion(result);
            return result;
        }
    }

    private ChapterExpansionResult toExpansionResult(FirstChapterGenerationResult generated) {
        ChapterExpansionResult result = new ChapterExpansionResult();
        result.setChapterText(generated == null ? "" : generated.getChapterText());
        result.setChapterSummary(generated == null ? "" : generated.getChapterSummary());
        return result;
    }
}
