package com.novel.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.novel.config.UserContext;
import com.novel.dto.MemoryEntryRequest;
import com.novel.entity.Chapter;
import com.novel.entity.MemoryEntry;
import com.novel.entity.Novel;
import com.novel.mapper.ChapterMapper;
import com.novel.mapper.MemoryEntryMapper;
import com.novel.mapper.NovelMapper;
import com.novel.service.MemoryEntryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MemoryEntryServiceImpl extends ServiceImpl<MemoryEntryMapper, MemoryEntry> implements MemoryEntryService {

    private static final Set<String> MEMORY_TYPES = Set.of(
            "event", "character-state", "world-fact", "open-foreshadow", "chapter-summary", "rule"
    );
    private static final Set<String> STATUSES = Set.of("draft", "confirmed", "rejected", "stale");
    private static final Set<String> CREATED_BY = Set.of("user", "local", "web-ai", "model-api");

    private final NovelMapper novelMapper;
    private final ChapterMapper chapterMapper;

    @Override
    public List<MemoryEntry> listOwned(UUID novelId, String status, String memoryType) {
        validateNovelOwnership(novelId);
        LambdaQueryWrapper<MemoryEntry> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(MemoryEntry::getNovelId, novelId)
                .eq(status != null && !status.isBlank(), MemoryEntry::getStatus, normalizeStatus(status))
                .eq(memoryType != null && !memoryType.isBlank(), MemoryEntry::getMemoryType, normalizeType(memoryType))
                .orderByAsc(MemoryEntry::getStatus)
                .orderByDesc(MemoryEntry::getUpdateTime);
        return list(wrapper);
    }

    @Override
    public MemoryEntry getOwnedById(UUID id) {
        MemoryEntry entry = getById(id);
        if (entry == null) {
            throw new RuntimeException("记忆条目不存在");
        }
        validateEntryOwnership(entry);
        return entry;
    }

    @Override
    @Transactional
    public MemoryEntry create(MemoryEntryRequest request) {
        if (request == null || request.getNovelId() == null) {
            throw new RuntimeException("作品 ID 不能为空");
        }
        validateNovelOwnership(request.getNovelId());
        validateSourceChapter(request.getNovelId(), request.getSourceChapterId());

        LocalDateTime now = LocalDateTime.now();
        MemoryEntry entry = new MemoryEntry();
        entry.setId(UUID.randomUUID());
        entry.setUserId(requireUserId());
        entry.setNovelId(request.getNovelId());
        applyRequest(entry, request, now);
        entry.setCreateTime(now);
        entry.setUpdateTime(now);
        save(entry);
        return entry;
    }

    @Override
    @Transactional
    public MemoryEntry update(UUID id, MemoryEntryRequest request) {
        MemoryEntry entry = getOwnedById(id);
        validateSourceChapter(entry.getNovelId(), request == null ? null : request.getSourceChapterId());
        applyRequest(entry, request, LocalDateTime.now());
        entry.setUpdateTime(LocalDateTime.now());
        updateById(entry);
        return entry;
    }

    @Override
    public boolean removeOwnedById(UUID id) {
        getOwnedById(id);
        return super.removeById(id);
    }

    private void applyRequest(MemoryEntry entry, MemoryEntryRequest request, LocalDateTime now) {
        if (request == null) {
            throw new RuntimeException("记忆内容不能为空");
        }
        String previousStatus = entry.getStatus();
        String nextStatus = normalizeStatus(request.getStatus());
        entry.setSourceChapterId(request.getSourceChapterId());
        entry.setMemoryType(normalizeType(request.getMemoryType()));
        entry.setTitle(requiredText(request.getTitle(), "记忆标题不能为空", 255));
        entry.setContent(requiredText(request.getContent(), "记忆内容不能为空", 20000));
        entry.setStatus(nextStatus);
        entry.setConfidence(normalizeConfidence(request.getConfidence()));
        entry.setSourceText(trimToLength(request.getSourceText(), 20000));
        entry.setCreatedBy(normalizeCreatedBy(request.getCreatedBy()));
        if (!nextStatus.equals(previousStatus)) {
            entry.setReviewedAt("draft".equals(nextStatus) ? null : now);
            entry.setStaleAt("stale".equals(nextStatus) ? now : null);
        }
    }

    private void validateEntryOwnership(MemoryEntry entry) {
        UUID userId = requireUserId();
        if (!userId.equals(entry.getUserId())) {
            throw new RuntimeException("无权访问记忆条目");
        }
        validateNovelOwnership(entry.getNovelId());
    }

    private void validateNovelOwnership(UUID novelId) {
        Novel novel = novelMapper.selectById(novelId);
        if (novel == null) {
            throw new RuntimeException("小说不存在");
        }
        if (!requireUserId().equals(novel.getUserId())) {
            throw new RuntimeException("无权访问");
        }
    }

    private void validateSourceChapter(UUID novelId, UUID chapterId) {
        if (chapterId == null) return;
        Chapter chapter = chapterMapper.selectById(chapterId);
        if (chapter == null || !novelId.equals(chapter.getNovelId())) {
            throw new RuntimeException("来源章节不存在或不属于当前作品");
        }
    }

    private UUID requireUserId() {
        UUID userId = UserContext.getUserId();
        if (userId == null) throw new RuntimeException("未登录");
        return userId;
    }

    private String normalizeType(String value) {
        String normalized = value == null ? "event" : value.trim();
        if (!MEMORY_TYPES.contains(normalized)) throw new RuntimeException("不支持的记忆类型");
        return normalized;
    }

    private String normalizeStatus(String value) {
        String normalized = value == null ? "draft" : value.trim();
        if (!STATUSES.contains(normalized)) throw new RuntimeException("不支持的记忆状态");
        return normalized;
    }

    private String normalizeCreatedBy(String value) {
        String normalized = value == null ? "user" : value.trim();
        if (!CREATED_BY.contains(normalized)) throw new RuntimeException("不支持的记忆来源");
        return normalized;
    }

    private BigDecimal normalizeConfidence(BigDecimal value) {
        if (value == null) return BigDecimal.ONE;
        return value.max(BigDecimal.ZERO).min(BigDecimal.ONE);
    }

    private String requiredText(String value, String message, int maxLength) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.isEmpty()) throw new RuntimeException(message);
        return trimToLength(normalized, maxLength);
    }

    private String trimToLength(String value, int maxLength) {
        if (value == null) return "";
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
