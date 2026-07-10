package com.novel.controller;

import com.novel.common.Result;
import com.novel.dto.DiagnosticIssueStatusRequest;
import com.novel.dto.DiagnosticRunCreateRequest;
import com.novel.dto.DiagnosticRunResponse;
import com.novel.entity.DiagnosticIssue;
import com.novel.entity.DiagnosticRun;
import com.novel.service.DiagnosticService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/diagnostics")
@RequiredArgsConstructor
@Tag(name = "证据化诊断", description = "章节诊断运行、问题证据和处理状态")
public class DiagnosticController {
    private final DiagnosticService diagnosticService;

    @PostMapping
    @Operation(summary = "保存一次诊断运行")
    public Result<DiagnosticRunResponse> create(@RequestBody DiagnosticRunCreateRequest request) {
        return Result.success(diagnosticService.create(request));
    }

    @GetMapping
    @Operation(summary = "获取诊断运行历史")
    public Result<List<DiagnosticRun>> list(@RequestParam UUID novelId,
                                            @RequestParam(required = false) UUID chapterId,
                                            @RequestParam(required = false) String runType,
                                            @RequestParam(defaultValue = "10") Integer limit) {
        return Result.success(diagnosticService.list(novelId, chapterId, runType, limit == null ? 10 : limit));
    }

    @GetMapping("/{runId}")
    @Operation(summary = "获取诊断运行及问题详情")
    public Result<DiagnosticRunResponse> detail(@PathVariable UUID runId) {
        return Result.success(diagnosticService.detail(runId));
    }

    @PutMapping("/issues/{issueId}/status")
    @Operation(summary = "更新诊断问题处理状态")
    public Result<DiagnosticIssue> updateIssueStatus(@PathVariable UUID issueId,
                                                      @RequestBody DiagnosticIssueStatusRequest request) {
        return Result.success(diagnosticService.updateIssueStatus(issueId, request == null ? null : request.getStatus()));
    }

    @DeleteMapping("/{runId}")
    @Operation(summary = "删除诊断运行")
    public Result<Void> delete(@PathVariable UUID runId) {
        diagnosticService.deleteRun(runId);
        return Result.success();
    }
}
