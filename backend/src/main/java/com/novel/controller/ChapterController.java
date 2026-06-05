package com.novel.controller;

import com.novel.common.Result;
import com.novel.entity.Chapter;
import com.novel.service.ChapterService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chapter")
@RequiredArgsConstructor
@Tag(name = "章节管理", description = "章节相关接口")
public class ChapterController {

    private final ChapterService chapterService;

    @GetMapping("/list")
    @Operation(summary = "获取章节列表")
    public Result<List<Chapter>> list(@RequestParam UUID novelId) {
        return Result.success(chapterService.listByNovelId(novelId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取章节详情")
    public Result<Chapter> getById(@PathVariable UUID id) {
        return Result.success(chapterService.getOwnedById(id));
    }

    @PostMapping
    @Operation(summary = "创建章节")
    public Result<Chapter> create(@RequestBody Chapter chapter) {
        chapterService.save(chapter);
        return Result.success(chapter);
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新章节")
    public Result<Void> update(@PathVariable UUID id, @RequestBody Chapter chapter) {
        chapter.setId(id);
        chapterService.updateById(chapter);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除章节")
    public Result<Void> delete(@PathVariable UUID id) {
        chapterService.removeById(id);
        return Result.success();
    }

    @PostMapping("/{id}/publish")
    @Operation(summary = "发布章节", description = "发布章节时会异步生成记忆摘要")
    public Result<Void> publish(@PathVariable UUID id) {
        chapterService.publishChapter(id);
        return Result.success();
    }
}
