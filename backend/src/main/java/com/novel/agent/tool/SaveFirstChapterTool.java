package com.novel.agent.tool;

import com.novel.dto.ChapterExpansionResult;
import com.novel.dto.NovelDraftResponse;
import com.novel.entity.Chapter;
import com.novel.service.ChapterService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class SaveFirstChapterTool extends AbstractNovelCreationTool {

    private final ChapterService chapterService;

    @Override
    public String getKey() {
        return "SAVE_CHAPTER";
    }

    @Override
    public String getName() {
        return "save_first_chapter";
    }

    @Override
    public String getDescription() {
        return "Save the generated first chapter text into the initial chapter.";
    }

    @Override
    public Map<String, Object> getParametersSchema() {
        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put("chapterTitle", stringProperty("Optional chapter title override."));
        return objectSchema(properties, List.of());
    }

    @Override
    public Chapter execute(NovelCreationToolContext context, Map<String, Object> arguments) {
        Chapter chapter = context.getFirstChapter();
        ChapterExpansionResult expansion = context.getFirstChapterExpansion();
        NovelDraftResponse draft = context.getDraft();
        if (chapter == null || expansion == null) {
            throw new RuntimeException("没有可保存的第一章正文");
        }

        String title = stringArg(arguments, "chapterTitle", buildTitle(draft, context));
        chapter.setTitle(title);
        chapter.setContent(expansion.getChapterText());
        chapter.setWordCount(expansion.getChapterText() == null ? 0 : expansion.getChapterText().length());
        chapter.setStatus("draft");
        chapterService.updateById(chapter);
        context.setFirstChapter(chapter);
        return chapter;
    }

    private String buildTitle(NovelDraftResponse draft, NovelCreationToolContext context) {
        String generated = context.getGeneratedFirstChapterTitle();
        if (generated != null && !generated.isBlank()) return trimTitle(generated);
        if (draft != null && draft.getFirstChapterTitle() != null && !draft.getFirstChapterTitle().isBlank()) {
            return trimTitle(draft.getFirstChapterTitle());
        }
        String opening = draft == null ? context.getIdea() : blankToDefault(draft.getFirstChapterOpeningScene(), context.getIdea());
        return trimTitle("第一章：" + blankToDefault(opening, "开篇").replaceAll("[，。；、\\s].*$", ""));
    }

    private String trimTitle(String title) {
        String value = blankToDefault(title, "第一章：开篇");
        return value.length() > 24 ? value.substring(0, 24) : value;
    }
}
