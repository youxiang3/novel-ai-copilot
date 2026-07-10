package com.novel.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class ChapterWorkflowTransitionRequest {
    private UUID novelId;
    private UUID chapterId;
    private String stage;
    private String source;
    private String reason;
    private String referenceType;
    private UUID referenceId;
}
