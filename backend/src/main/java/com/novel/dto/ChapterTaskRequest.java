package com.novel.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
public class ChapterTaskRequest {
    private UUID novelId;
    private UUID chapterId;
    private String status;
    private List<String> titleCandidates = new ArrayList<>();
    private String coreGoal;
    private String emotionGoal;
    private Integer targetWords;
    private String storyline;
    private String volumeNode;
    private List<String> mustDo = new ArrayList<>();
    private List<String> forbidden = new ArrayList<>();
    private List<String> rhythmSteps = new ArrayList<>();
    private String source;
    private List<String> sourceBasis = new ArrayList<>();
}
