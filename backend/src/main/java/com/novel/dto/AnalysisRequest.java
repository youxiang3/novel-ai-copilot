package com.novel.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class AnalysisRequest {
    private UUID novelId;
    private UUID chapterId;
    private String analysisType;
}
