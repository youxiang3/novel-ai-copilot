package com.novel.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class ChapterRescueRequest {

    private UUID novelId;

    private UUID chapterId;

    private String selectedText;

    private String userDirection;

    private String rescueMode;
}
