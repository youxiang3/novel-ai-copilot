package com.novel.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.novel.common.Result;
import com.novel.config.UserContext;
import com.novel.dto.ChapterVersionCreateRequest;
import com.novel.entity.Chapter;
import com.novel.entity.ChapterVersion;
import com.novel.mapper.ChapterVersionMapper;
import com.novel.service.ChapterService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/chapter")
@RequiredArgsConstructor
@Tag(name = "章节管理", description = "章节相关接口")
public class ChapterController {

    private final ChapterService chapterService;
    private final ChapterVersionMapper chapterVersionMapper;

    private static final Set<String> VERSION_SOURCES = Set.of(
            "manual-save", "manual-snapshot", "ai-adopt", "restore-backup", "restore"
    );

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

    @GetMapping("/{id}/versions")
    @Operation(summary = "获取章节版本历史")
    public Result<List<ChapterVersion>> versions(@PathVariable UUID id) {
        chapterService.getOwnedById(id);
        LambdaQueryWrapper<ChapterVersion> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ChapterVersion::getChapterId, id)
                .orderByDesc(ChapterVersion::getVersionNumber)
                .last("limit 100");
        return Result.success(chapterVersionMapper.selectList(wrapper));
    }

    @GetMapping("/{id}/versions/{versionId}")
    @Operation(summary = "获取章节版本详情")
    public Result<ChapterVersion> versionDetail(@PathVariable UUID id, @PathVariable UUID versionId) {
        chapterService.getOwnedById(id);
        ChapterVersion version = requireOwnedVersion(id, versionId);
        return Result.success(version);
    }

    @PostMapping("/{id}/versions")
    @Operation(summary = "创建章节版本快照")
    public Result<ChapterVersion> createVersion(@PathVariable UUID id, @RequestBody(required = false) ChapterVersionCreateRequest request) {
        Chapter chapter = chapterService.getOwnedById(id);
        String source = request == null ? "manual-snapshot" : normalizeVersionSource(request.getSource());
        ChapterVersion version = createVersionSnapshot(chapter, source, request == null ? null : request.getChangeSummary(),
                request == null ? null : request.getParentVersionId(), request == null ? null : request.getAiGenerationLogId());
        return Result.success(version);
    }

    @PostMapping("/{id}/versions/{versionId}/restore")
    @Operation(summary = "恢复章节版本", description = "恢复前会自动备份当前章节正文")
    @Transactional
    public Result<ChapterVersion> restoreVersion(@PathVariable UUID id, @PathVariable UUID versionId) {
        Chapter chapter = chapterService.getOwnedById(id);
        ChapterVersion target = requireOwnedVersion(id, versionId);
        createVersionSnapshot(chapter, "restore-backup", "恢复版本前自动备份", null, null);

        chapter.setTitle(target.getTitle());
        chapter.setContent(target.getContent());
        chapter.setWordCount(target.getWordCount());
        chapterService.updateById(chapter);

        ChapterVersion restored = createVersionSnapshot(chapter, "restore", "恢复至版本 " + target.getVersionNumber(), target.getId(), null);
        return Result.success(restored);
    }

    private ChapterVersion requireOwnedVersion(UUID chapterId, UUID versionId) {
        ChapterVersion version = chapterVersionMapper.selectById(versionId);
        UUID userId = UserContext.getUserId();
        if (version == null || !chapterId.equals(version.getChapterId()) || userId == null || !userId.equals(version.getUserId())) {
            throw new RuntimeException("章节版本不存在或无权访问");
        }
        return version;
    }

    private ChapterVersion createVersionSnapshot(Chapter chapter, String source, String summary, UUID parentVersionId, UUID aiGenerationLogId) {
        LambdaQueryWrapper<ChapterVersion> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ChapterVersion::getChapterId, chapter.getId())
                .orderByDesc(ChapterVersion::getVersionNumber)
                .last("limit 1");
        ChapterVersion latest = chapterVersionMapper.selectOne(wrapper);

        ChapterVersion version = new ChapterVersion();
        version.setId(UUID.randomUUID());
        version.setUserId(UserContext.getUserId());
        version.setNovelId(chapter.getNovelId());
        version.setChapterId(chapter.getId());
        version.setVersionNumber(latest == null ? 1 : latest.getVersionNumber() + 1);
        version.setTitle(chapter.getTitle());
        version.setContent(chapter.getContent());
        version.setWordCount(chapter.getContent() == null ? 0 : chapter.getContent().replaceAll("\\s", "").length());
        version.setSource(normalizeVersionSource(source));
        version.setChangeSummary(summary);
        version.setParentVersionId(parentVersionId);
        version.setAiGenerationLogId(aiGenerationLogId);
        version.setCreatedAt(LocalDateTime.now());
        chapterVersionMapper.insert(version);
        return version;
    }

    private String normalizeVersionSource(String source) {
        return source != null && VERSION_SOURCES.contains(source) ? source : "manual-snapshot";
    }
}
