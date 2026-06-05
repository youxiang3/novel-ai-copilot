package com.novel.agent.tool;

import com.novel.dto.NovelDraftRequest;
import com.novel.dto.NovelDraftResponse;
import com.novel.service.NovelDraftService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class CreateDraftTool extends AbstractNovelCreationTool {

    private final NovelDraftService novelDraftService;

    @Override
    public String getKey() {
        return "CREATE_DRAFT";
    }

    @Override
    public String getName() {
        return "create_novel_draft";
    }

    @Override
    public String getDescription() {
        return "Generate a novel profile draft from title, idea, genre, and style.";
    }

    @Override
    public Map<String, Object> getParametersSchema() {
        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put("title", stringProperty("Novel title."));
        properties.put("idea", stringProperty("One-sentence story idea."));
        properties.put("genre", stringProperty("Target genre."));
        properties.put("style", stringProperty("Writing style."));
        return objectSchema(properties, List.of("title"));
    }

    @Override
    public NovelDraftResponse execute(NovelCreationToolContext context, Map<String, Object> arguments) {
        NovelDraftRequest request = new NovelDraftRequest();
        request.setTitle(stringArg(arguments, "title", context.getTitle()));
        request.setIdea(stringArg(arguments, "idea", context.getIdea()));
        request.setGenre(stringArg(arguments, "genre", context.getGenre()));
        request.setStyle(stringArg(arguments, "style", context.getStyle()));
        NovelDraftResponse draft = novelDraftService.createDraft(request);
        context.setDraft(draft);
        return draft;
    }
}
