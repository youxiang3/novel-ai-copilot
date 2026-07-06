package com.novel.dto;

import lombok.Data;

import java.util.List;

@Data
public class WorkSnapshotRequest {
    private String frontendWorkId;
    private String title;
    private String globalOutline;
    private String chapterTitle;
    private String chapterText;
    private List<WorkChapterSnapshot> chapters;
    private String payload;
}
