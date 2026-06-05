package com.novel.agent.tool;

import com.novel.dto.NovelDraftResponse;
import com.novel.entity.Chapter;
import com.novel.entity.Novel;
import com.novel.service.ChapterService;
import com.novel.service.NovelDraftService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class ConfirmNovelTool extends AbstractNovelCreationTool {

    private final NovelDraftService novelDraftService;
    private final ChapterService chapterService;

    @Override
    public String getKey() {
        return "CONFIRM_NOVEL";
    }

    @Override
    public String getName() {
        return "confirm_novel";
    }

    @Override
    public String getDescription() {
        return "Confirm the current novel draft and create the novel plus initial assets.";
    }

    @Override
    public Map<String, Object> getParametersSchema() {
        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put("confirmation", stringProperty("A short confirmation note."));
        return objectSchema(properties, List.of());
    }

    @Override
    public Novel execute(NovelCreationToolContext context, Map<String, Object> arguments) {
        NovelDraftResponse draft = context.getDraft();
        if (draft == null) {
            throw new RuntimeException("请先生成作品资料草稿");
        }
        Novel novel = novelDraftService.confirmDraft(draft);
        Chapter firstChapter = chapterService.getByNovelIdAndNumber(novel.getId(), 1);
        context.setNovel(novel);
        context.setFirstChapter(firstChapter);
        return novel;
    }
}
