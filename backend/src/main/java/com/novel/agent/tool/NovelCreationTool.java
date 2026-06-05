package com.novel.agent.tool;

import java.util.Map;

public interface NovelCreationTool {

    String getKey();

    String getName();

    String getDescription();

    Map<String, Object> getParametersSchema();

    Object execute(NovelCreationToolContext context, Map<String, Object> arguments);
}
