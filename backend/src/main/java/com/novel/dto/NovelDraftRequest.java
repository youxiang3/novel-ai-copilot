package com.novel.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Data
public class NovelDraftRequest {

    private String title;

    private String idea;

    private String genre;

    private String style;

    private List<OpeningGuideAnswer> answers = new ArrayList<>();

    private Map<String, Object> draftPatch = new LinkedHashMap<>();
}
