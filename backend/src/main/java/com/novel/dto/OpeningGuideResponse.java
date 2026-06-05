package com.novel.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class OpeningGuideResponse {

    private Boolean finished = false;

    private String question;

    private List<String> options = new ArrayList<>();

    private String helperText;

    private DraftPatch draftPatch = new DraftPatch();

    @Data
    public static class DraftPatch {
        private String mainConflict;
        private String openingHook;
        private String protagonistHint;
        private String worldRuleHint;
    }
}
