package com.novel.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class NovelDraftResponse {

    private String title;

    private String subtitle;

    private String sellPoint;

    private String genre;

    private String style;

    private List<String> globalOutline = new ArrayList<>();

    private MainCharacter mainCharacter = new MainCharacter();

    private List<WorldRule> worldRules = new ArrayList<>();

    private List<String> longTermArcs = new ArrayList<>();

    private List<String> currentHookLine = new ArrayList<>();

    private String firstChapterOpeningScene;

    private String openingChapterGoal;

    private String firstChapterTitle;

    @Data
    public static class MainCharacter {
        private String name;
        private String identity;
        private String desire;
        private String weakness;
        private String initialSituation;
        private String growthArc;
    }

    @Data
    public static class WorldRule {
        private String name;
        private String description;
    }
}
