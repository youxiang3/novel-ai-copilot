package com.novel.controller;

import com.novel.common.Result;
import com.novel.dto.ChapterWorkflowTransitionRequest;
import com.novel.entity.ChapterWorkflowState;
import com.novel.service.ChapterWorkflowStateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chapter-workflow")
@RequiredArgsConstructor
@Tag(name = "章节创作阶段", description = "任务、写作、诊断、改稿、记忆与发布阶段状态")
public class ChapterWorkflowStateController {
    private final ChapterWorkflowStateService stateService;

    @GetMapping("/current")
    @Operation(summary = "获取章节当前创作阶段")
    public Result<ChapterWorkflowState> current(@RequestParam UUID chapterId) {
        return Result.success(stateService.current(chapterId));
    }

    @GetMapping("/history")
    @Operation(summary = "获取章节阶段变更历史")
    public Result<List<ChapterWorkflowState>> history(@RequestParam UUID chapterId) {
        return Result.success(stateService.history(chapterId));
    }

    @PostMapping("/transition")
    @Operation(summary = "推进章节创作阶段")
    public Result<ChapterWorkflowState> transition(@RequestBody ChapterWorkflowTransitionRequest request) {
        return Result.success(stateService.transition(request));
    }
}
