package com.novel.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class ChapterTaskResponse {
    private UUID id;
    private UUID novelId;
    private UUID chapterId;
    private Integer versionNumber;
    private UUID parentTaskId;
    private String status;
    private List<String> titleCandidates;
    private String coreGoal;
    private String emotionGoal;
    private Integer targetWords;
    private String storyline;
    private String volumeNode;
    private List<String> mustDo;
    private List<String> forbidden;
    private List<String> rhythmSteps;
    private String source;
    private List<String> sourceBasis;
    private Boolean current;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
