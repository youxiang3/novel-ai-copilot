package com.novel.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.config.UserContext;
import com.novel.dto.ChapterTaskRequest;
import com.novel.dto.ChapterTaskResponse;
import com.novel.entity.Chapter;
import com.novel.entity.ChapterTask;
import com.novel.entity.Novel;
import com.novel.mapper.ChapterMapper;
import com.novel.mapper.ChapterTaskMapper;
import com.novel.mapper.NovelMapper;
import com.novel.service.ChapterTaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChapterTaskServiceImpl implements ChapterTaskService {
    private static final Set<String> STATUSES = Set.of("draft", "active", "completed");
    private static final Set<String> SOURCES = Set.of("user", "local", "model-api");

    private final ChapterTaskMapper taskMapper;
    private final NovelMapper novelMapper;
    private final ChapterMapper chapterMapper;
    private final ObjectMapper objectMapper;

    @Override
    public List<ChapterTaskResponse> listCurrent(UUID novelId) {
        validateNovelOwnership(novelId);
        return taskMapper.selectList(new LambdaQueryWrapper<ChapterTask>()
                        .eq(ChapterTask::getNovelId, novelId)
                        .eq(ChapterTask::getCurrent, true)
                        .orderByDesc(ChapterTask::getUpdateTime))
                .stream().map(this::toResponse).toList();
    }

    @Override
    public ChapterTaskResponse getCurrent(UUID chapterId) {
        Chapter chapter = validateChapterOwnership(chapterId);
        ChapterTask task = taskMapper.selectOne(new LambdaQueryWrapper<ChapterTask>()
                .eq(ChapterTask::getChapterId, chapterId)
                .eq(ChapterTask::getCurrent, true)
                .last("limit 1"));
        return task == null ? null : toResponse(task);
    }

    @Override
    public List<ChapterTaskResponse> listVersions(UUID chapterId) {
        validateChapterOwnership(chapterId);
        return taskMapper.selectList(new LambdaQueryWrapper<ChapterTask>()
                        .eq(ChapterTask::getChapterId, chapterId)
                        .orderByDesc(ChapterTask::getVersionNumber))
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public ChapterTaskResponse create(ChapterTaskRequest request) {
        validateRequest(request);
        ChapterTask current = findCurrent(request.getChapterId());
        if (current != null) return createVersion(current.getId(), request);
        return toResponse(insertVersion(request, null, 1));
    }

    @Override
    @Transactional
    public ChapterTaskResponse createVersion(UUID taskId, ChapterTaskRequest request) {
        ChapterTask parent = requireOwnedTask(taskId);
        if (!Boolean.TRUE.equals(parent.getCurrent())) throw new RuntimeException("只能从当前任务卡创建新版本");
        validateRequest(request);
        if (!parent.getNovelId().equals(request.getNovelId()) || !parent.getChapterId().equals(request.getChapterId())) {
            throw new RuntimeException("任务卡不能切换作品或章节");
        }
        parent.setCurrent(false);
        parent.setUpdateTime(LocalDateTime.now());
        taskMapper.updateById(parent);
        return toResponse(insertVersion(request, parent.getId(), parent.getVersionNumber() + 1));
    }

    @Override
    @Transactional
    public void deleteForChapter(UUID chapterId) {
        validateChapterOwnership(chapterId);
        taskMapper.delete(new LambdaQueryWrapper<ChapterTask>().eq(ChapterTask::getChapterId, chapterId));
    }

    private ChapterTask insertVersion(ChapterTaskRequest request, UUID parentId, int versionNumber) {
        LocalDateTime now = LocalDateTime.now();
        ChapterTask task = new ChapterTask();
        task.setId(UUID.randomUUID());
        task.setUserId(requireUserId());
        task.setNovelId(request.getNovelId());
        task.setChapterId(request.getChapterId());
        task.setVersionNumber(versionNumber);
        task.setParentTaskId(parentId);
        task.setTaskStatus(normalize(request.getStatus(), STATUSES, "draft", "不支持的任务状态"));
        task.setTitleCandidatesJson(writeList(request.getTitleCandidates()));
        task.setCoreGoal(requiredText(request.getCoreGoal(), "本章核心目标不能为空", 10000));
        task.setEmotionGoal(trim(request.getEmotionGoal(), 10000));
        task.setTargetWords(Math.max(0, request.getTargetWords() == null ? 2500 : request.getTargetWords()));
        task.setStoryline(trim(request.getStoryline(), 5000));
        task.setVolumeNode(trim(request.getVolumeNode(), 1000));
        task.setMustDoJson(writeList(request.getMustDo()));
        task.setForbiddenJson(writeList(request.getForbidden()));
        task.setRhythmStepsJson(writeList(request.getRhythmSteps()));
        task.setSource(normalize(request.getSource(), SOURCES, "user", "不支持的任务来源"));
        task.setSourceBasisJson(writeList(request.getSourceBasis()));
        task.setCurrent(true);
        task.setCreateTime(now);
        task.setUpdateTime(now);
        taskMapper.insert(task);
        return task;
    }

    private void validateRequest(ChapterTaskRequest request) {
        if (request == null || request.getNovelId() == null || request.getChapterId() == null) {
            throw new RuntimeException("作品和章节 ID 不能为空");
        }
        Chapter chapter = validateChapterOwnership(request.getChapterId());
        if (!request.getNovelId().equals(chapter.getNovelId())) throw new RuntimeException("章节不属于当前作品");
    }

    private ChapterTask findCurrent(UUID chapterId) {
        return taskMapper.selectOne(new LambdaQueryWrapper<ChapterTask>()
                .eq(ChapterTask::getChapterId, chapterId)
                .eq(ChapterTask::getCurrent, true)
                .last("limit 1"));
    }

    private ChapterTask requireOwnedTask(UUID taskId) {
        ChapterTask task = taskMapper.selectById(taskId);
        if (task == null) throw new RuntimeException("任务卡不存在");
        if (!requireUserId().equals(task.getUserId())) throw new RuntimeException("无权访问任务卡");
        validateChapterOwnership(task.getChapterId());
        return task;
    }

    private Chapter validateChapterOwnership(UUID chapterId) {
        Chapter chapter = chapterMapper.selectById(chapterId);
        if (chapter == null) throw new RuntimeException("章节不存在");
        validateNovelOwnership(chapter.getNovelId());
        return chapter;
    }

    private void validateNovelOwnership(UUID novelId) {
        Novel novel = novelMapper.selectById(novelId);
        if (novel == null) throw new RuntimeException("小说不存在");
        if (!requireUserId().equals(novel.getUserId())) throw new RuntimeException("无权访问");
    }

    private UUID requireUserId() {
        UUID userId = UserContext.getUserId();
        if (userId == null) throw new RuntimeException("未登录");
        return userId;
    }

    private ChapterTaskResponse toResponse(ChapterTask task) {
        ChapterTaskResponse response = new ChapterTaskResponse();
        response.setId(task.getId());
        response.setNovelId(task.getNovelId());
        response.setChapterId(task.getChapterId());
        response.setVersionNumber(task.getVersionNumber());
        response.setParentTaskId(task.getParentTaskId());
        response.setStatus(task.getTaskStatus());
        response.setTitleCandidates(readList(task.getTitleCandidatesJson()));
        response.setCoreGoal(task.getCoreGoal());
        response.setEmotionGoal(task.getEmotionGoal());
        response.setTargetWords(task.getTargetWords());
        response.setStoryline(task.getStoryline());
        response.setVolumeNode(task.getVolumeNode());
        response.setMustDo(readList(task.getMustDoJson()));
        response.setForbidden(readList(task.getForbiddenJson()));
        response.setRhythmSteps(readList(task.getRhythmStepsJson()));
        response.setSource(task.getSource());
        response.setSourceBasis(readList(task.getSourceBasisJson()));
        response.setCurrent(task.getCurrent());
        response.setCreateTime(task.getCreateTime());
        response.setUpdateTime(task.getUpdateTime());
        return response;
    }

    private String writeList(List<String> value) {
        try {
            return objectMapper.writeValueAsString(value == null ? List.of() : value.stream().filter(item -> item != null && !item.isBlank()).toList());
        } catch (JsonProcessingException e) {
            throw new RuntimeException("任务卡列表字段序列化失败");
        }
    }

    private List<String> readList(String value) {
        if (value == null || value.isBlank()) return new ArrayList<>();
        try {
            return objectMapper.readValue(value, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            return new ArrayList<>();
        }
    }

    private String normalize(String value, Set<String> allowed, String fallback, String message) {
        String normalized = value == null || value.isBlank() ? fallback : value.trim();
        if (!allowed.contains(normalized)) throw new RuntimeException(message);
        return normalized;
    }

    private String requiredText(String value, String message, int maxLength) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.isEmpty()) throw new RuntimeException(message);
        return trim(normalized, maxLength);
    }

    private String trim(String value, int maxLength) {
        if (value == null) return "";
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
