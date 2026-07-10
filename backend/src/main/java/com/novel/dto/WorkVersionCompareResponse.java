package com.novel.dto;

import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class WorkVersionCompareResponse {
    private UUID baseVersionId;
    private UUID targetVersionId;
    private Integer wordDelta;
    private Integer chapterDelta;
    private Integer addedCount;
    private Integer removedCount;
    private Integer changedCount;
    private Integer unchangedCount;
    private List<WorkVersionChapterDiff> chapterDiffs;
}
