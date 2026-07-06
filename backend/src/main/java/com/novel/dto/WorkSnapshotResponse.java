package com.novel.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class WorkSnapshotResponse {
    private UUID novelId;
    private UUID chapterId;
    private String frontendWorkId;
    private String payload;
    private List<WorkChapterSnapshot> chapters;
    private LocalDateTime updatedAt;
}
