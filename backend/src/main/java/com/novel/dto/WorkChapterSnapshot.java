package com.novel.dto;

import lombok.Data;

@Data
public class WorkChapterSnapshot {
    private String frontendChapterId;
    private Integer chapterNumber;
    private String title;
    private String content;
    private String status;
}
