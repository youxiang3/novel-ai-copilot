package com.novel.agent.tool;

import com.novel.dto.StoryGraphRequest;
import com.novel.dto.StoryGraphResult;
import com.novel.entity.Novel;
import com.novel.skill.novel.StoryGraphSkill;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class GenerateStoryGraphTool extends AbstractNovelCreationTool {

    private final StoryGraphSkill storyGraphSkill;

    @Override
    public String getKey() {
        return "GENERATE_STORY_GRAPH";
    }

    @Override
    public String getName() {
        return "generate_story_graph";
    }

    @Override
    public String getDescription() {
        return "Generate a story/world graph for the created novel.";
    }

    @Override
    public Map<String, Object> getParametersSchema() {
        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put("mode", stringProperty("Graph generation mode. Use full by default."));
        return objectSchema(properties, List.of());
    }

    @Override
    public StoryGraphResult execute(NovelCreationToolContext context, Map<String, Object> arguments) {
        Novel novel = context.getNovel();
        if (novel == null) {
            throw new RuntimeException("请先确认创建作品");
        }
        StoryGraphRequest request = new StoryGraphRequest();
        request.setNovelId(novel.getId());
        request.setMode(stringArg(arguments, "mode", "full"));
        StoryGraphResult result = storyGraphSkill.execute(request);
        context.setStoryGraph(result);
        return result;
    }
}
