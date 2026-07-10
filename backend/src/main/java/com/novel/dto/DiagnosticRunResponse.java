package com.novel.dto;

import com.novel.entity.DiagnosticIssue;
import com.novel.entity.DiagnosticRun;
import lombok.Data;

import java.util.List;

@Data
public class DiagnosticRunResponse {
    private DiagnosticRun run;
    private List<DiagnosticIssue> issues;
}
