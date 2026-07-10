package com.novel.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class DiagnosticIssueRequest {
    private String issueType;
    private String severity;
    private String status;
    private String position;
    private String title;
    private String description;
    private String evidence;
    private String reason;
    private String suggestion;
    private String dimension;
    private Integer priority;
    private BigDecimal confidence;
    private String source;
}
