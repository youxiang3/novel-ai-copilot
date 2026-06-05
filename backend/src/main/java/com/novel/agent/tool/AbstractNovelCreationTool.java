package com.novel.agent.tool;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

abstract class AbstractNovelCreationTool implements NovelCreationTool {

    protected Map<String, Object> objectSchema(Map<String, Object> properties, List<String> required) {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("properties", properties);
        schema.put("required", required);
        schema.put("additionalProperties", false);
        return schema;
    }

    protected Map<String, Object> stringProperty(String description) {
        return Map.of("type", "string", "description", description);
    }

    protected String stringArg(Map<String, Object> arguments, String key, String fallback) {
        Object value = arguments == null ? null : arguments.get(key);
        if (value == null || value.toString().isBlank()) {
            return fallback;
        }
        return value.toString();
    }

    protected String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
