package com.novel.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class ChapterExpansionResult {

    private String chapterText;

    private String chapterSummary;

    private List<CharacterUpdate> characterUpdates = new ArrayList<>();

    private List<ForeshadowingHint> newForeshadowing = new ArrayList<>();

    private List<String> newWorldFacts = new ArrayList<>();

    @Data
    public static class CharacterUpdate {
        private String characterName;
        private String stateChange;
        private String relationshipChange;
    }

    @Data
    public static class ForeshadowingHint {
        private String title;
        private String description;
        private String payoffSuggestion;
    }
}
