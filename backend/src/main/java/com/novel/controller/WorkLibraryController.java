package com.novel.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.common.Result;
import com.novel.config.UserContext;
import com.novel.dto.WorkSnapshotRequest;
import com.novel.dto.WorkSnapshotResponse;
import com.novel.dto.WorkChapterSnapshot;
import com.novel.dto.WorkSnapshotVersionResponse;
import com.novel.dto.WorkVersionChapterDiff;
import com.novel.dto.WorkVersionCompareResponse;
import com.novel.entity.Chapter;
import com.novel.entity.Novel;
import com.novel.entity.WorkSnapshotVersion;
import com.novel.mapper.WorkSnapshotVersionMapper;
import com.novel.service.ChapterService;
import com.novel.service.NovelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.LinkedHashMap;
import java.util.stream.Collectors;
import java.util.UUID;

@RestController
@RequestMapping("/api/work-library")
@RequiredArgsConstructor
@Tag(name = "作品库快照", description = "前端作品库渐进式后端持久化接口")
public class WorkLibraryController {

    private final NovelService novelService;
    private final ChapterService chapterService;
    private final WorkSnapshotVersionMapper workSnapshotVersionMapper;
    private final ObjectMapper objectMapper;

    @GetMapping
    @Operation(summary = "获取当前用户作品快照")
    public Result<List<WorkSnapshotResponse>> list() {
        UUID userId = requireUserId();
        return Result.success(novelService.listByUserId(userId).stream()
                .filter(novel -> novel.getFrontendWorkId() != null && novel.getSavedWorkPayload() != null)
                .map(this::toResponse)
                .toList());
    }

    @GetMapping("/versions")
    @Operation(summary = "获取当前用户作品云端版本历史")
    public Result<List<WorkSnapshotVersionResponse>> versions(@RequestParam(required = false) String frontendWorkId) {
        UUID userId = requireUserId();
        LambdaQueryWrapper<WorkSnapshotVersion> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(WorkSnapshotVersion::getUserId, userId);
        if (!isBlank(frontendWorkId)) {
            wrapper.eq(WorkSnapshotVersion::getFrontendWorkId, frontendWorkId);
        }
        wrapper.orderByDesc(WorkSnapshotVersion::getCreatedAt).last("limit 80");
        return Result.success(workSnapshotVersionMapper.selectList(wrapper).stream()
                .map(this::toVersionResponse)
                .toList());
    }

    @GetMapping("/versions/compare")
    @Operation(summary = "比较两个云端作品版本")
    public Result<WorkVersionCompareResponse> compareVersions(@RequestParam UUID baseVersionId, @RequestParam UUID targetVersionId) {
        UUID userId = requireUserId();
        WorkSnapshotVersion base = workSnapshotVersionMapper.selectById(baseVersionId);
        WorkSnapshotVersion target = workSnapshotVersionMapper.selectById(targetVersionId);
        if (base == null || target == null) {
            return Result.error(404, "版本不存在");
        }
        if (!userId.equals(base.getUserId()) || !userId.equals(target.getUserId())) {
            return Result.error(403, "无权访问该版本");
        }
        if (!Objects.equals(base.getFrontendWorkId(), target.getFrontendWorkId())) {
            return Result.error(400, "只能比较同一作品的版本");
        }
        return Result.success(compareVersionPayloads(base, target));
    }

    @PostMapping
    @Operation(summary = "保存或更新作品快照")
    @Transactional
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

        List<WorkChapterSnapshot> syncedChapters = syncChapters(novel.getId(), request);
        saveSnapshotVersion(userId, novel, syncedChapters, request);
        WorkSnapshotResponse response = toResponse(novelService.getById(novel.getId()));
        response.setChapters(syncedChapters);
        return Result.success(response);
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

    private List<WorkChapterSnapshot> syncChapters(UUID novelId, WorkSnapshotRequest request) {
        List<WorkChapterSnapshot> snapshots = normalizeChapterSnapshots(request);
        if (snapshots.isEmpty()) {
            return snapshots;
        }

        List<Chapter> existingChapters = chapterService.listByNovelId(novelId);
        Map<UUID, Chapter> existingById = existingChapters.stream()
                .filter(chapter -> chapter.getId() != null)
                .collect(Collectors.toMap(Chapter::getId, chapter -> chapter, (left, right) -> left, LinkedHashMap::new));
        Map<Integer, Chapter> existingByNumber = existingChapters.stream()
                .collect(Collectors.toMap(Chapter::getChapterNumber, chapter -> chapter, (left, right) -> left, LinkedHashMap::new));
        Set<UUID> requestedIds = snapshots.stream()
                .map(WorkChapterSnapshot::getBackendChapterId)
                .filter(id -> id != null)
                .collect(Collectors.toSet());
        Set<Integer> requestedNumbers = snapshots.stream()
                .map(WorkChapterSnapshot::getChapterNumber)
                .collect(Collectors.toSet());

        for (WorkChapterSnapshot snapshot : snapshots) {
            Chapter chapter = snapshot.getBackendChapterId() == null ? null : existingById.get(snapshot.getBackendChapterId());
            if (chapter == null) {
                chapter = existingByNumber.get(snapshot.getChapterNumber());
            }
            if (chapter == null) {
                chapter = new Chapter();
                chapter.setNovelId(novelId);
                chapter.setChapterNumber(snapshot.getChapterNumber());
                chapter.setCreateTime(LocalDateTime.now());
            }
            chapter.setChapterNumber(snapshot.getChapterNumber());
            chapter.setTitle(isBlank(snapshot.getTitle()) ? "第 " + snapshot.getChapterNumber() + " 章" : snapshot.getTitle());
            chapter.setContent(snapshot.getContent() == null ? "" : snapshot.getContent());
            chapter.setStatus("published".equals(snapshot.getStatus()) ? "published" : "draft");
            chapter.setUpdateTime(LocalDateTime.now());
            if (chapter.getId() == null) {
                chapterService.save(chapter);
            } else {
                chapterService.updateById(chapter);
            }
            snapshot.setBackendChapterId(chapter.getId());
        }

        if (request.getChapters() != null && !request.getChapters().isEmpty()) {
            existingChapters.stream()
                    .filter(chapter -> !requestedIds.contains(chapter.getId()) && !requestedNumbers.contains(chapter.getChapterNumber()))
                    .forEach(chapter -> chapterService.removeById(chapter.getId()));
        }
        return snapshots;
    }

    private List<WorkChapterSnapshot> normalizeChapterSnapshots(WorkSnapshotRequest request) {
        if (request.getChapters() != null && !request.getChapters().isEmpty()) {
            return request.getChapters().stream()
                    .filter(chapter -> chapter != null)
                    .map(new ChapterSnapshotNormalizer())
                    .sorted(Comparator.comparing(WorkChapterSnapshot::getChapterNumber))
                    .toList();
        }

        if (isBlank(request.getChapterTitle()) && isBlank(request.getChapterText())) {
            return List.of();
        }
        WorkChapterSnapshot first = new WorkChapterSnapshot();
        first.setChapterNumber(1);
        first.setTitle(isBlank(request.getChapterTitle()) ? "第一章：未命名章节" : request.getChapterTitle());
        first.setContent(request.getChapterText() == null ? "" : request.getChapterText());
        first.setStatus("draft");
        return List.of(first);
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
        response.setChapters(chapterService.listByNovelId(novel.getId()).stream()
                .map(this::toChapterSnapshot)
                .toList());
        return response;
    }

    private WorkChapterSnapshot toChapterSnapshot(Chapter chapter) {
        WorkChapterSnapshot snapshot = new WorkChapterSnapshot();
        snapshot.setBackendChapterId(chapter.getId());
        snapshot.setChapterNumber(chapter.getChapterNumber());
        snapshot.setTitle(chapter.getTitle());
        snapshot.setContent(chapter.getContent());
        snapshot.setStatus(chapter.getStatus());
        return snapshot;
    }

    private void saveSnapshotVersion(UUID userId, Novel novel, List<WorkChapterSnapshot> chapters, WorkSnapshotRequest request) {
        WorkSnapshotVersion version = new WorkSnapshotVersion();
        version.setUserId(userId);
        version.setNovelId(novel.getId());
        version.setFrontendWorkId(novel.getFrontendWorkId());
        version.setTitle(novel.getTitle());
        version.setPayload(novel.getSavedWorkPayload());
        version.setGlobalOutline(novel.getGlobalOutline());
        version.setChapterCount(chapters.size());
        version.setWordCount(chapters.stream().mapToInt(chapter -> chapter.getContent() == null ? 0 : chapter.getContent().replaceAll("\\s+", "").length()).sum());
        version.setChaptersPayload(writeJson(chapters));
        version.setCreatedAt(LocalDateTime.now());
        workSnapshotVersionMapper.insert(version);

        pruneOldVersions(userId, request.getFrontendWorkId());
    }

    private void pruneOldVersions(UUID userId, String frontendWorkId) {
        LambdaQueryWrapper<WorkSnapshotVersion> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(WorkSnapshotVersion::getUserId, userId)
                .eq(WorkSnapshotVersion::getFrontendWorkId, frontendWorkId)
                .orderByDesc(WorkSnapshotVersion::getCreatedAt);
        List<WorkSnapshotVersion> versions = workSnapshotVersionMapper.selectList(wrapper);
        if (versions.size() <= 20) {
            return;
        }
        versions.stream()
                .skip(20)
                .forEach(version -> workSnapshotVersionMapper.deleteById(version.getId()));
    }

    private WorkSnapshotVersionResponse toVersionResponse(WorkSnapshotVersion version) {
        WorkSnapshotVersionResponse response = new WorkSnapshotVersionResponse();
        response.setVersionId(version.getId());
        response.setNovelId(version.getNovelId());
        response.setFrontendWorkId(version.getFrontendWorkId());
        response.setTitle(version.getTitle());
        response.setPayload(version.getPayload());
        response.setChapters(readChapters(version.getChaptersPayload()));
        response.setChapterCount(version.getChapterCount());
        response.setWordCount(version.getWordCount());
        response.setCreatedAt(version.getCreatedAt());
        response.setUpdatedAt(version.getCreatedAt());
        return response;
    }

    private WorkVersionCompareResponse compareVersionPayloads(WorkSnapshotVersion base, WorkSnapshotVersion target) {
        List<WorkChapterSnapshot> baseChapters = readChapters(base.getChaptersPayload());
        List<WorkChapterSnapshot> targetChapters = readChapters(target.getChaptersPayload());
        Map<String, WorkChapterSnapshot> baseByKey = indexChapters(baseChapters);
        Map<String, WorkChapterSnapshot> targetByKey = indexChapters(targetChapters);
        Set<String> keys = new LinkedHashSet<>();
        keys.addAll(baseByKey.keySet());
        keys.addAll(targetByKey.keySet());

        int addedCount = 0;
        int removedCount = 0;
        int changedCount = 0;
        int unchangedCount = 0;
        List<WorkVersionChapterDiff> diffs = new ArrayList<>();

        for (String key : keys) {
            WorkChapterSnapshot oldChapter = baseByKey.get(key);
            WorkChapterSnapshot newChapter = targetByKey.get(key);
            String status;
            if (oldChapter == null) {
                status = "added";
                addedCount += 1;
            } else if (newChapter == null) {
                status = "removed";
                removedCount += 1;
            } else if (sameChapterSnapshot(oldChapter, newChapter)) {
                status = "unchanged";
                unchangedCount += 1;
            } else {
                status = "changed";
                changedCount += 1;
            }
            diffs.add(toChapterDiff(key, status, oldChapter, newChapter));
        }

        WorkVersionCompareResponse response = new WorkVersionCompareResponse();
        response.setBaseVersionId(base.getId());
        response.setTargetVersionId(target.getId());
        response.setWordDelta(wordCount(targetChapters) - wordCount(baseChapters));
        response.setChapterDelta(targetChapters.size() - baseChapters.size());
        response.setAddedCount(addedCount);
        response.setRemovedCount(removedCount);
        response.setChangedCount(changedCount);
        response.setUnchangedCount(unchangedCount);
        response.setChapterDiffs(diffs);
        return response;
    }

    private Map<String, WorkChapterSnapshot> indexChapters(List<WorkChapterSnapshot> chapters) {
        Map<String, WorkChapterSnapshot> result = new LinkedHashMap<>();
        for (WorkChapterSnapshot chapter : chapters) {
            result.put(chapterKey(chapter), chapter);
        }
        return result;
    }

    private String chapterKey(WorkChapterSnapshot chapter) {
        if (chapter == null) {
            return "chapter:unknown";
        }
        if (chapter.getBackendChapterId() != null) {
            return "backend:" + chapter.getBackendChapterId();
        }
        if (!isBlank(chapter.getFrontendChapterId())) {
            return "frontend:" + chapter.getFrontendChapterId();
        }
        return "number:" + chapter.getChapterNumber();
    }

    private boolean sameChapterSnapshot(WorkChapterSnapshot oldChapter, WorkChapterSnapshot newChapter) {
        return Objects.equals(blankToDefault(oldChapter.getTitle(), ""), blankToDefault(newChapter.getTitle(), ""))
                && Objects.equals(blankToDefault(oldChapter.getContent(), ""), blankToDefault(newChapter.getContent(), ""))
                && Objects.equals(blankToDefault(oldChapter.getStatus(), ""), blankToDefault(newChapter.getStatus(), ""));
    }

    private WorkVersionChapterDiff toChapterDiff(String key, String status, WorkChapterSnapshot oldChapter, WorkChapterSnapshot newChapter) {
        String oldContent = oldChapter == null ? "" : blankToDefault(oldChapter.getContent(), "");
        String newContent = newChapter == null ? "" : blankToDefault(newChapter.getContent(), "");
        WorkVersionChapterDiff diff = new WorkVersionChapterDiff();
        diff.setKey(key);
        diff.setStatus(status);
        diff.setTitle(firstNonBlank(
                newChapter == null ? "" : newChapter.getTitle(),
                oldChapter == null ? "" : oldChapter.getTitle(),
                "未命名章节"
        ));
        diff.setOldWords(countWords(oldContent));
        diff.setNewWords(countWords(newContent));
        diff.setOldContent(oldContent);
        diff.setNewContent(newContent);
        return diff;
    }

    private int wordCount(List<WorkChapterSnapshot> chapters) {
        return chapters.stream()
                .mapToInt(chapter -> countWords(chapter.getContent()))
                .sum();
    }

    private int countWords(String content) {
        return content == null ? 0 : content.replaceAll("\\s+", "").length();
    }

    private String writeJson(List<WorkChapterSnapshot> chapters) {
        try {
            return objectMapper.writeValueAsString(chapters);
        } catch (Exception e) {
            return "[]";
        }
    }

    private List<WorkChapterSnapshot> readChapters(String chaptersPayload) {
        if (isBlank(chaptersPayload)) {
            return List.of();
        }
        try {
            return objectMapper.readValue(chaptersPayload, new TypeReference<List<WorkChapterSnapshot>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private static class ChapterSnapshotNormalizer implements java.util.function.Function<WorkChapterSnapshot, WorkChapterSnapshot> {
        private int fallbackNumber = 1;

        @Override
        public WorkChapterSnapshot apply(WorkChapterSnapshot source) {
            WorkChapterSnapshot snapshot = new WorkChapterSnapshot();
            int chapterNumber = source.getChapterNumber() == null || source.getChapterNumber() < 1
                    ? fallbackNumber
                    : source.getChapterNumber();
            fallbackNumber = Math.max(fallbackNumber + 1, chapterNumber + 1);
            snapshot.setFrontendChapterId(source.getFrontendChapterId());
            snapshot.setBackendChapterId(source.getBackendChapterId());
            snapshot.setChapterNumber(chapterNumber);
            snapshot.setTitle(source.getTitle());
            snapshot.setContent(source.getContent());
            snapshot.setStatus(source.getStatus());
            return snapshot;
        }
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

    private String blankToDefault(String value, String fallback) {
        return isBlank(value) ? fallback : value.trim();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (!isBlank(value)) {
                return value.trim();
            }
        }
        return "";
    }
}
