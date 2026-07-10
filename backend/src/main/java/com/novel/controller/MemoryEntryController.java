package com.novel.controller;

import com.novel.common.Result;
import com.novel.dto.MemoryEntryRequest;
import com.novel.entity.MemoryEntry;
import com.novel.service.MemoryEntryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/memories")
@RequiredArgsConstructor
@Tag(name = "长篇记忆", description = "可确认、可拒绝、可过期且关联来源章节的长篇记忆条目")
public class MemoryEntryController {

    private final MemoryEntryService memoryEntryService;

    @GetMapping
    @Operation(summary = "获取作品长篇记忆", description = "可按状态和记忆类型筛选")
    public Result<List<MemoryEntry>> list(@RequestParam UUID novelId,
                                          @RequestParam(required = false) String status,
                                          @RequestParam(required = false) String memoryType) {
        return Result.success(memoryEntryService.listOwned(novelId, status, memoryType));
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取长篇记忆详情")
    public Result<MemoryEntry> detail(@PathVariable UUID id) {
        return Result.success(memoryEntryService.getOwnedById(id));
    }

    @PostMapping
    @Operation(summary = "创建长篇记忆候选或条目")
    public Result<MemoryEntry> create(@RequestBody MemoryEntryRequest request) {
        return Result.success(memoryEntryService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新长篇记忆", description = "用于编辑正文以及确认、拒绝、标记过期或恢复为待确认")
    public Result<MemoryEntry> update(@PathVariable UUID id, @RequestBody MemoryEntryRequest request) {
        return Result.success(memoryEntryService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除长篇记忆")
    public Result<Void> delete(@PathVariable UUID id) {
        memoryEntryService.removeOwnedById(id);
        return Result.success();
    }
}
