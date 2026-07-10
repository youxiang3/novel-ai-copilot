package com.novel.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.novel.config.UserContext;
import com.novel.dto.ChapterWorkflowTransitionRequest;
import com.novel.entity.Chapter;
import com.novel.entity.ChapterWorkflowState;
import com.novel.entity.Novel;
import com.novel.mapper.ChapterMapper;
import com.novel.mapper.ChapterWorkflowStateMapper;
import com.novel.mapper.NovelMapper;
import com.novel.service.ChapterWorkflowStateService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChapterWorkflowStateServiceImpl implements ChapterWorkflowStateService {
    private static final Set<String> STAGES = Set.of("planning", "writing", "diagnosing", "revising", "confirming", "memory", "publish-ready", "completed");
    private static final Set<String> SOURCES = Set.of("user", "task", "diagnostic", "rewrite", "version", "memory", "publish", "system");
    private static final Set<String> REFERENCE_TYPES = Set.of("none", "chapter-task", "diagnostic-run", "chapter-version", "memory-entry");
    private static final Map<String, Set<String>> ALLOWED = Map.of(
            "planning", Set.of("writing"),
            "writing", Set.of("diagnosing", "revising"),
            "diagnosing", Set.of("revising", "confirming"),
            "revising", Set.of("diagnosing", "confirming"),
            "confirming", Set.of("revising", "memory"),
            "memory", Set.of("publish-ready", "planning"),
            "publish-ready", Set.of("writing", "completed"),
            "completed", Set.of("writing")
    );

    private final ChapterWorkflowStateMapper stateMapper;
    private final ChapterMapper chapterMapper;
    private final NovelMapper novelMapper;

    @Override
    public ChapterWorkflowState current(UUID chapterId) {
        validateChapterOwnership(chapterId);
        return findCurrent(chapterId);
    }

    @Override
    public List<ChapterWorkflowState> history(UUID chapterId) {
        validateChapterOwnership(chapterId);
        return stateMapper.selectList(new LambdaQueryWrapper<ChapterWorkflowState>()
                .eq(ChapterWorkflowState::getChapterId, chapterId)
                .orderByDesc(ChapterWorkflowState::getVersionNumber)
                .last("limit 50"));
    }

    @Override
    @Transactional
    public ChapterWorkflowState transition(ChapterWorkflowTransitionRequest request) {
        if (request == null || request.getNovelId() == null || request.getChapterId() == null) {
            throw new RuntimeException("作品和章节 ID 不能为空");
        }
        Chapter chapter = validateChapterOwnership(request.getChapterId());
        if (!request.getNovelId().equals(chapter.getNovelId())) throw new RuntimeException("章节不属于当前作品");
        String nextStage = normalize(request.getStage(), STAGES, null, "不支持的创作阶段");
        ChapterWorkflowState current = findCurrent(request.getChapterId());
        String previousStage = current == null ? null : current.getStage();
        if (current == null && !"planning".equals(nextStage)) {
            current = insertState(request, null, null, "planning", 1, "system", "初始化章节创作阶段");
            previousStage = "planning";
        }
        if (nextStage.equals(previousStage)) return current;
        if (previousStage != null && !ALLOWED.getOrDefault(previousStage, Set.of()).contains(nextStage)) {
            throw new RuntimeException("不能从 " + previousStage + " 直接进入 " + nextStage);
        }
        if (current != null) {
            current.setCurrent(false);
            stateMapper.updateById(current);
        }
        return insertState(request, current == null ? null : current.getId(), previousStage, nextStage,
                current == null ? 1 : current.getVersionNumber() + 1,
                normalize(request.getSource(), SOURCES, "user", "不支持的阶段来源"), request.getReason());
    }

    private ChapterWorkflowState insertState(ChapterWorkflowTransitionRequest request, UUID parentId, String previousStage,
                                               String stage, int version, String source, String reason) {
        ChapterWorkflowState state = new ChapterWorkflowState();
        state.setId(UUID.randomUUID());
        state.setUserId(requireUserId());
        state.setNovelId(request.getNovelId());
        state.setChapterId(request.getChapterId());
        state.setVersionNumber(version);
        state.setParentStateId(parentId);
        state.setPreviousStage(previousStage);
        state.setStage(stage);
        state.setTransitionSource(source);
        state.setReason(trim(reason, 5000));
        state.setReferenceType(normalize(request.getReferenceType(), REFERENCE_TYPES, "none", "不支持的关联类型"));
        state.setReferenceId(request.getReferenceId());
        state.setCurrent(true);
        state.setCreateTime(LocalDateTime.now());
        stateMapper.insert(state);
        return state;
    }

    private ChapterWorkflowState findCurrent(UUID chapterId) {
        return stateMapper.selectOne(new LambdaQueryWrapper<ChapterWorkflowState>()
                .eq(ChapterWorkflowState::getChapterId, chapterId)
                .eq(ChapterWorkflowState::getCurrent, true)
                .last("limit 1"));
    }

    private Chapter validateChapterOwnership(UUID chapterId) {
        Chapter chapter = chapterMapper.selectById(chapterId);
        if (chapter == null) throw new RuntimeException("章节不存在");
        Novel novel = novelMapper.selectById(chapter.getNovelId());
        if (novel == null) throw new RuntimeException("小说不存在");
        if (!requireUserId().equals(novel.getUserId())) throw new RuntimeException("无权访问");
        return chapter;
    }

    private UUID requireUserId() {
        UUID userId = UserContext.getUserId();
        if (userId == null) throw new RuntimeException("未登录");
        return userId;
    }

    private String normalize(String value, Set<String> allowed, String fallback, String message) {
        String normalized = value == null || value.isBlank() ? fallback : value.trim();
        if (normalized == null || !allowed.contains(normalized)) throw new RuntimeException(message);
        return normalized;
    }

    private String trim(String value, int maxLength) {
        if (value == null) return "";
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
