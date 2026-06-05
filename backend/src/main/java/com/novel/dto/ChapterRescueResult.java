package com.novel.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class ChapterRescueResult {

    private List<Solution> solutions = new ArrayList<>();

    @Data
    public static class Solution {
        private String title;
        private String reason;
        private String conflictHint;
        private String continuationText;
        private String nextPlotSuggestion;
    }
}
