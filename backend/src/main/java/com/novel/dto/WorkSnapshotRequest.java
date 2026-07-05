package com.novel.dto;

import lombok.Data;

@Data
public class WorkSnapshotRequest {
    private String frontendWorkId;
    private String title;
    private String globalOutline;
    private String chapterTitle;
    private String chapterText;
    private String payload;
}
