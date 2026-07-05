package com.novel.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.novel.common.Result;
import com.novel.config.UserContext;
import com.novel.dto.WorkSnapshotRequest;
import com.novel.dto.WorkSnapshotResponse;
import com.novel.entity.Chapter;
import com.novel.entity.Novel;
import com.novel.service.ChapterService;
import com.novel.service.NovelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/work-library")
@RequiredArgsConstructor
@Tag(name = "作品库快照", description = "前端作品库渐进式后端持久化接口")
public class WorkLibraryController {

    private final NovelService novelService;
    private final ChapterService chapterService;

    @GetMapping
    @Operation(summary = "获取当前用户作品快照")
    public Result<List<WorkSnapshotResponse>> list() {
        UUID userId = requireUserId();
        return Result.success(novelService.listByUserId(userId).stream()
                .filter(novel -> novel.getFrontendWorkId() != null && novel.getSavedWorkPayload() != null)
                .map(this::toResponse)
                .toList());
    }

    @PostMapping
    @Operation(summary = "保存或更新作品快照")
    public Result<WorkSnapshotResponse> save(@RequestBody WorkSnapshotRequest request) {
        UUID userId = requireUserId();
        if (isBlank(request.getFrontendWorkId())) {
            return Result.error(400, "frontendWorkId 不能为空");
        }
        if (isBlank(request.getPayload())) {
            return Result.error(400, "payload 不能为空");
        }

        Novel novel = findByFrontendWorkId(userId, request.getFrontendWorkId());
        if (novel == null) {
            novel = new Novel();
            novel.setUserId(userId);
            novel.setFrontendWorkId(request.getFrontendWorkId());
        }
        novel.setTitle(isBlank(request.getTitle()) ? "未命名作品" : request.getTitle());
        novel.setGlobalOutline(request.getGlobalOutline());
        novel.setSavedWorkPayload(request.getPayload());
        novel.setUpdateTime(LocalDateTime.now());
        if (novel.getCreateTime() == null) {
            novel.setCreateTime(LocalDateTime.now());
        }

        if (novel.getId() == null) {
            novelService.save(novel);
        } else {
            novelService.updateById(novel);
        }

        syncFirstChapter(novel.getId(), request);
        return Result.success(toResponse(novelService.getById(novel.getId())));
    }

    @DeleteMapping("/{frontendWorkId}")
    @Operation(summary = "删除作品快照")
    public Result<Void> delete(@PathVariable String frontendWorkId) {
        UUID userId = requireUserId();
        Novel novel = findByFrontendWorkId(userId, frontendWorkId);
        if (novel != null) {
            novelService.removeById(novel.getId());
        }
        return Result.success();
    }

    private void syncFirstChapter(UUID novelId, WorkSnapshotRequest request) {
        Chapter chapter = chapterService.getByNovelIdAndNumber(novelId, 1);
        if (chapter == null) {
            chapter = new Chapter();
            chapter.setNovelId(novelId);
            chapter.setChapterNumber(1);
            chapter.setStatus("draft");
            chapter.setCreateTime(LocalDateTime.now());
        }
        chapter.setTitle(isBlank(request.getChapterTitle()) ? "第一章：未命名章节" : request.getChapterTitle());
        chapter.setContent(request.getChapterText() == null ? "" : request.getChapterText());
        chapter.setUpdateTime(LocalDateTime.now());
        if (chapter.getId() == null) {
            chapterService.save(chapter);
        } else {
            chapterService.updateById(chapter);
        }
    }

    private WorkSnapshotResponse toResponse(Novel novel) {
        WorkSnapshotResponse response = new WorkSnapshotResponse();
        response.setNovelId(novel.getId());
        response.setFrontendWorkId(novel.getFrontendWorkId());
        response.setPayload(novel.getSavedWorkPayload());
        response.setUpdatedAt(novel.getUpdateTime());
        Chapter chapter = chapterService.getByNovelIdAndNumber(novel.getId(), 1);
        if (chapter != null) {
            response.setChapterId(chapter.getId());
        }
        return response;
    }

    private Novel findByFrontendWorkId(UUID userId, String frontendWorkId) {
        LambdaQueryWrapper<Novel> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Novel::getUserId, userId)
                .eq(Novel::getFrontendWorkId, frontendWorkId)
                .last("limit 1");
        return novelService.getOne(wrapper, false);
    }

    private UUID requireUserId() {
        UUID userId = UserContext.getUserId();
        if (userId == null) {
            throw new RuntimeException("未登录");
        }
        return userId;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
