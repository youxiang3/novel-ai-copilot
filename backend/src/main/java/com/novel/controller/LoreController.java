package com.novel.controller;

import com.novel.common.Result;
import com.novel.entity.Lore;
import com.novel.service.LoreService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/lore")
@RequiredArgsConstructor
@Tag(name = "设定管理", description = "世界观设定相关接口")
public class LoreController {

    private final LoreService loreService;

    @GetMapping("/list")
    @Operation(summary = "获取设定列表")
    public Result<List<Lore>> list(@RequestParam UUID novelId, @RequestParam(required = false) String category) {
        if (category != null) {
            return Result.success(loreService.listByNovelIdAndCategory(novelId, category));
        }
        return Result.success(loreService.listByNovelId(novelId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取设定详情")
    public Result<Lore> getById(@PathVariable UUID id) {
        return Result.success(loreService.getOwnedById(id));
    }

    @PostMapping
    @Operation(summary = "创建设定")
    public Result<Lore> create(@RequestBody Lore lore) {
        loreService.save(lore);
        return Result.success(lore);
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新设定")
    public Result<Void> update(@PathVariable UUID id, @RequestBody Lore lore) {
        lore.setId(id);
        loreService.updateById(lore);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除设定")
    public Result<Void> delete(@PathVariable UUID id) {
        loreService.removeById(id);
        return Result.success();
    }
}
