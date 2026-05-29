package com.novel.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class ScreenplayRequest {
    private UUID novelId;
    private UUID chapterId;
    private String targetScene;
    private Integer targetDuration;
}
