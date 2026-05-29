package com.novel.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class ChapterPlanRequest {
    private UUID novelId;
    private Integer startChapter;
    private Integer endChapter;
    private String planType;
}
