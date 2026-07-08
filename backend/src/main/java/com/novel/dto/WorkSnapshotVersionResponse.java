package com.novel.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class WorkSnapshotVersionResponse {
    private UUID versionId;
    private UUID novelId;
    private String frontendWorkId;
    private String title;
    private String payload;
    private List<WorkChapterSnapshot> chapters;
    private Integer chapterCount;
    private Integer wordCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
