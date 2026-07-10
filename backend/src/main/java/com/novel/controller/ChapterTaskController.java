package com.novel.controller;

import com.novel.common.Result;
import com.novel.dto.ChapterTaskRequest;
import com.novel.dto.ChapterTaskResponse;
import com.novel.service.ChapterTaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chapter-tasks")
@RequiredArgsConstructor
@Tag(name = "章节任务卡", description = "章节任务卡当前版本、历史版本和状态流转")
public class ChapterTaskController {
    private final ChapterTaskService chapterTaskService;

    @GetMapping
    @Operation(summary = "获取作品当前任务卡")
    public Result<List<ChapterTaskResponse>> list(@RequestParam UUID novelId) {
        return Result.success(chapterTaskService.listCurrent(novelId));
    }

    @GetMapping("/current")
    @Operation(summary = "获取章节当前任务卡")
    public Result<ChapterTaskResponse> current(@RequestParam UUID chapterId) {
        return Result.success(chapterTaskService.getCurrent(chapterId));
    }

    @GetMapping("/versions")
    @Operation(summary = "获取章节任务卡版本历史")
    public Result<List<ChapterTaskResponse>> versions(@RequestParam UUID chapterId) {
        return Result.success(chapterTaskService.listVersions(chapterId));
    }

    @PostMapping
    @Operation(summary = "创建章节任务卡")
    public Result<ChapterTaskResponse> create(@RequestBody ChapterTaskRequest request) {
        return Result.success(chapterTaskService.create(request));
    }

    @PutMapping("/{taskId}")
    @Operation(summary = "保存任务卡新版本")
    public Result<ChapterTaskResponse> createVersion(@PathVariable UUID taskId, @RequestBody ChapterTaskRequest request) {
        return Result.success(chapterTaskService.createVersion(taskId, request));
    }

    @DeleteMapping
    @Operation(summary = "删除章节全部任务卡版本")
    public Result<Void> delete(@RequestParam UUID chapterId) {
        chapterTaskService.deleteForChapter(chapterId);
        return Result.success();
    }
}
