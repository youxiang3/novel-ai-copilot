package com.novel.service;

import com.novel.dto.DiagnosticRunCreateRequest;
import com.novel.dto.DiagnosticRunResponse;
import com.novel.entity.DiagnosticIssue;
import com.novel.entity.DiagnosticRun;

import java.util.List;
import java.util.UUID;

public interface DiagnosticService {
    DiagnosticRunResponse create(DiagnosticRunCreateRequest request);
    List<DiagnosticRun> list(UUID novelId, UUID chapterId, String runType, int limit);
    DiagnosticRunResponse detail(UUID runId);
    DiagnosticIssue updateIssueStatus(UUID issueId, String status);
    void deleteRun(UUID runId);
}
