package com.novel.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class WorkChapterSnapshot {
    private String frontendChapterId;
    private UUID backendChapterId;
    private Integer chapterNumber;
    private String title;
    private String content;
    private String status;
}
