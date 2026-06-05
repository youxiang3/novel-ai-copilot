package com.novel.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class StoryGraphRequest {

    private UUID novelId;

    private UUID chapterId;

    private String mode;
}
