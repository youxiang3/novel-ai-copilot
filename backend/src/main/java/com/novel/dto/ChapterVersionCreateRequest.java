package com.novel.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class ChapterVersionCreateRequest {
    private String source;
    private String changeSummary;
    private UUID parentVersionId;
    private UUID aiGenerationLogId;
}
