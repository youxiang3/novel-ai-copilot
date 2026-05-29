package com.novel.controller;

import com.novel.common.Result;
import com.novel.entity.MemorySummary;
import com.novel.service.MemorySummaryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/memory-summary")
@RequiredArgsConstructor
@Tag(name = "记忆摘要管理", description = "章节记忆摘要相关接口")
public class MemorySummaryController {

    private final MemorySummaryService memorySummaryService;

    @GetMapping("/list")
    @Operation(summary = "获取记忆摘要列表")
    public Result<List<MemorySummary>> list(@RequestParam UUID novelId) {
        return Result.success(memorySummaryService.listByNovelId(novelId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取记忆摘要详情")
    public Result<MemorySummary> getById(@PathVariable UUID id) {
        return Result.success(memorySummaryService.getById(id));
    }

    @PostMapping
    @Operation(summary = "创建记忆摘要")
    public Result<MemorySummary> create(@RequestBody MemorySummary summary) {
        memorySummaryService.save(summary);
        return Result.success(summary);
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新记忆摘要")
    public Result<Void> update(@PathVariable UUID id, @RequestBody MemorySummary summary) {
        summary.setId(id);
        memorySummaryService.updateById(summary);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除记忆摘要")
    public Result<Void> delete(@PathVariable UUID id) {
        memorySummaryService.removeById(id);
        return Result.success();
    }
}
