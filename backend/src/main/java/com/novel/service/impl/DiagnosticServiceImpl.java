package com.novel.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.novel.config.UserContext;
import com.novel.dto.DiagnosticIssueRequest;
import com.novel.dto.DiagnosticRunCreateRequest;
import com.novel.dto.DiagnosticRunResponse;
import com.novel.entity.Chapter;
import com.novel.entity.DiagnosticIssue;
import com.novel.entity.DiagnosticRun;
import com.novel.entity.Novel;
import com.novel.mapper.ChapterMapper;
import com.novel.mapper.DiagnosticIssueMapper;
import com.novel.mapper.DiagnosticRunMapper;
import com.novel.mapper.NovelMapper;
import com.novel.service.DiagnosticService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DiagnosticServiceImpl implements DiagnosticService {
    private static final Set<String> RUN_TYPES = Set.of("consistency", "readthrough", "human-taste", "viral-potential", "web-ai", "model-api");
    private static final Set<String> MODES = Set.of("local-rules", "web-ai", "model-api");
    private static final Set<String> SEVERITIES = Set.of("high", "medium", "low");
    private static final Set<String> ISSUE_STATUSES = Set.of("open", "ignored", "resolved");

    private final DiagnosticRunMapper runMapper;
    private final DiagnosticIssueMapper issueMapper;
    private final NovelMapper novelMapper;
    private final ChapterMapper chapterMapper;

    @Override
    @Transactional
    public DiagnosticRunResponse create(DiagnosticRunCreateRequest request) {
        if (request == null || request.getNovelId() == null || request.getChapterId() == null) {
            throw new RuntimeException("作品和章节 ID 不能为空");
        }
        UUID userId = validateOwnership(request.getNovelId(), request.getChapterId());
        String runType = normalize(request.getRunType(), RUN_TYPES, "consistency", "不支持的诊断类型");
        String mode = normalize(request.getMode(), MODES, "local-rules", "不支持的诊断模式");
        LocalDateTime now = LocalDateTime.now();
        List<DiagnosticIssueRequest> requestedIssues = request.getIssues() == null ? List.of() : request.getIssues();

        DiagnosticRun run = new DiagnosticRun();
        run.setId(UUID.randomUUID());
        run.setUserId(userId);
        run.setNovelId(request.getNovelId());
        run.setChapterId(request.getChapterId());
        run.setRunType(runType);
        run.setMode(mode);
        run.setStatus("completed");
        run.setTitle(requiredText(request.getTitle(), "诊断标题不能为空", 255));
        run.setSummary(trim(request.getSummary(), 10000));
        run.setOverallScore(clamp(request.getOverallScore(), 0, 100));
        run.setIssueCount(requestedIssues.size());
        run.setHighCount(countSeverity(requestedIssues, "high"));
        run.setMediumCount(countSeverity(requestedIssues, "medium"));
        run.setLowCount(countSeverity(requestedIssues, "low"));
        run.setInputSnapshot(trim(request.getInputSnapshot(), 30000));
        run.setCreateTime(now);
        run.setUpdateTime(now);
        runMapper.insert(run);

        List<DiagnosticIssue> issues = new ArrayList<>();
        for (DiagnosticIssueRequest item : requestedIssues) {
            DiagnosticIssue issue = toIssue(item, run, userId, now);
            issueMapper.insert(issue);
            issues.add(issue);
        }
        return response(run, issues);
    }

    @Override
    public List<DiagnosticRun> list(UUID novelId, UUID chapterId, String runType, int limit) {
        validateOwnership(novelId, chapterId);
        LambdaQueryWrapper<DiagnosticRun> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(DiagnosticRun::getNovelId, novelId)
                .eq(chapterId != null, DiagnosticRun::getChapterId, chapterId)
                .eq(runType != null && !runType.isBlank(), DiagnosticRun::getRunType,
                        normalize(runType, RUN_TYPES, "consistency", "不支持的诊断类型"))
                .orderByDesc(DiagnosticRun::getCreateTime)
                .last("limit " + Math.min(50, Math.max(1, limit)));
        return runMapper.selectList(wrapper);
    }

    @Override
    public DiagnosticRunResponse detail(UUID runId) {
        DiagnosticRun run = requireOwnedRun(runId);
        LambdaQueryWrapper<DiagnosticIssue> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(DiagnosticIssue::getRunId, runId)
                .orderByAsc(DiagnosticIssue::getPriority)
                .orderByDesc(DiagnosticIssue::getCreateTime);
        return response(run, issueMapper.selectList(wrapper));
    }

    @Override
    @Transactional
    public DiagnosticIssue updateIssueStatus(UUID issueId, String status) {
        DiagnosticIssue issue = issueMapper.selectById(issueId);
        if (issue == null) throw new RuntimeException("诊断问题不存在");
        requireOwnedRun(issue.getRunId());
        String nextStatus = normalize(status, ISSUE_STATUSES, "open", "不支持的问题状态");
        issue.setIssueStatus(nextStatus);
        issue.setResolvedAt("resolved".equals(nextStatus) ? LocalDateTime.now() : null);
        issue.setUpdateTime(LocalDateTime.now());
        issueMapper.updateById(issue);
        return issue;
    }

    @Override
    @Transactional
    public void deleteRun(UUID runId) {
        requireOwnedRun(runId);
        issueMapper.delete(new LambdaQueryWrapper<DiagnosticIssue>().eq(DiagnosticIssue::getRunId, runId));
        runMapper.deleteById(runId);
    }

    private DiagnosticRun requireOwnedRun(UUID runId) {
        DiagnosticRun run = runMapper.selectById(runId);
        UUID userId = UserContext.getUserId();
        if (run == null) throw new RuntimeException("诊断运行不存在");
        if (userId == null || !userId.equals(run.getUserId())) throw new RuntimeException("无权访问诊断运行");
        validateOwnership(run.getNovelId(), run.getChapterId());
        return run;
    }

    private UUID validateOwnership(UUID novelId, UUID chapterId) {
        if (novelId == null) throw new RuntimeException("作品 ID 不能为空");
        UUID userId = UserContext.getUserId();
        Novel novel = novelMapper.selectById(novelId);
        if (userId == null) throw new RuntimeException("未登录");
        if (novel == null) throw new RuntimeException("小说不存在");
        if (!userId.equals(novel.getUserId())) throw new RuntimeException("无权访问");
        if (chapterId != null) {
            Chapter chapter = chapterMapper.selectById(chapterId);
            if (chapter == null || !novelId.equals(chapter.getNovelId())) throw new RuntimeException("章节不存在或不属于当前作品");
        }
        return userId;
    }

    private DiagnosticIssue toIssue(DiagnosticIssueRequest item, DiagnosticRun run, UUID userId, LocalDateTime now) {
        DiagnosticIssue issue = new DiagnosticIssue();
        issue.setId(UUID.randomUUID());
        issue.setRunId(run.getId());
        issue.setUserId(userId);
        issue.setNovelId(run.getNovelId());
        issue.setChapterId(run.getChapterId());
        issue.setIssueType(requiredText(item.getIssueType(), "问题类型不能为空", 80));
        issue.setSeverity(normalize(item.getSeverity(), SEVERITIES, "low", "不支持的风险级别"));
        issue.setIssueStatus(normalize(item.getStatus(), ISSUE_STATUSES, "open", "不支持的问题状态"));
        issue.setPositionText(trim(item.getPosition(), 500));
        issue.setTitle(trim(item.getTitle(), 255));
        issue.setDescription(requiredText(item.getDescription(), "问题说明不能为空", 10000));
        issue.setEvidence(trim(item.getEvidence(), 10000));
        issue.setReason(trim(item.getReason(), 10000));
        issue.setSuggestion(requiredText(item.getSuggestion(), "修改建议不能为空", 10000));
        issue.setDimension(trim(item.getDimension(), 255));
        issue.setPriority(clamp(item.getPriority(), 0, 999));
        issue.setConfidence(normalizeConfidence(item.getConfidence()));
        issue.setSource(trim(item.getSource(), 100));
        issue.setResolvedAt("resolved".equals(issue.getIssueStatus()) ? now : null);
        issue.setCreateTime(now);
        issue.setUpdateTime(now);
        return issue;
    }

    private int countSeverity(List<DiagnosticIssueRequest> issues, String severity) {
        return (int) issues.stream().filter(item -> severity.equals(normalize(item.getSeverity(), SEVERITIES, "low", "不支持的风险级别"))).count();
    }

    private DiagnosticRunResponse response(DiagnosticRun run, List<DiagnosticIssue> issues) {
        DiagnosticRunResponse response = new DiagnosticRunResponse();
        response.setRun(run);
        response.setIssues(issues);
        return response;
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

    private Integer clamp(Integer value, int min, int max) {
        if (value == null) return null;
        return Math.max(min, Math.min(max, value));
    }

    private BigDecimal normalizeConfidence(BigDecimal value) {
        if (value == null) return BigDecimal.ONE;
        return value.max(BigDecimal.ZERO).min(BigDecimal.ONE);
    }
}
