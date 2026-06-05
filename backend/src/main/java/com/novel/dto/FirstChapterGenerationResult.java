package com.novel.dto;

import lombok.Data;

@Data
public class FirstChapterGenerationResult {

    private String chapterTitle;

    private String chapterText;

    private String chapterSummary;

    private String suggestedNextStep;
}
