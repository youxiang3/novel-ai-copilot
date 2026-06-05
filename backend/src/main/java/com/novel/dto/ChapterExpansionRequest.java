package com.novel.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class ChapterExpansionRequest {

    private UUID novelId;

    private UUID chapterId;

    private String sceneText;

    private String chapterGoal;

    private String style;
}
