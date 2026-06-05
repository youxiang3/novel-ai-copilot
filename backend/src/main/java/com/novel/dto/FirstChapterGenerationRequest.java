package com.novel.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
public class FirstChapterGenerationRequest {

    private UUID novelId;

    private String title;

    private String idea;

    private String genre;

    private String style;

    private List<OpeningGuideAnswer> answers = new ArrayList<>();

    private NovelDraftResponse draft;
}
