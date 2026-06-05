package com.novel.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
public class StoryGraphResult {

    private List<Node> nodes = new ArrayList<>();

    private List<Edge> edges = new ArrayList<>();

    @Data
    public static class Node {
        private String id;
        private String type;
        private String label;
        private Map<String, Object> metadata = new HashMap<>();
    }

    @Data
    public static class Edge {
        @JsonAlias("source_id")
        private String sourceId;
        @JsonAlias("target_id")
        private String targetId;
        private String type;
        private String label;
        private Map<String, Object> metadata = new HashMap<>();
    }
}
