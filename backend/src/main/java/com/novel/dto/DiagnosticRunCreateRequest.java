package com.novel.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
public class DiagnosticRunCreateRequest {
    private UUID novelId;
    private UUID chapterId;
    private String runType;
    private String mode;
    private String title;
    private String summary;
    private Integer overallScore;
    private String inputSnapshot;
    private List<DiagnosticIssueRequest> issues = new ArrayList<>();
}
