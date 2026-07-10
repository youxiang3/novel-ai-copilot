package com.novel.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.novel.common.Result;
import com.novel.dto.ChapterExpansionRequest;
import com.novel.dto.ChapterExpansionResult;
import com.novel.dto.ChapterRewriteRequest;
import com.novel.dto.ChapterRewriteResult;
import com.novel.dto.ChapterRescueRequest;
import com.novel.dto.ChapterRescueResult;
import com.novel.dto.RewriteLogListResponse;
import com.novel.entity.AIGenerationLog;
import com.novel.mapper.AIGenerationLogMapper;
import com.novel.skill.novel.ChapterExpansionSkill;
import com.novel.skill.novel.ChapterRewriteSkill;
import com.novel.skill.novel.ChapterRescueSkill;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chapters")
@RequiredArgsConstructor
@Tag(name = "章节 Skill", description = "章节扩写、卡文急救等 Skill 接口")
public class ChapterSkillController {

    private final ChapterExpansionSkill chapterExpansionSkill;
    private final ChapterRescueSkill chapterRescueSkill;
    private final ChapterRewriteSkill chapterRewriteSkill;
    private final AIGenerationLogMapper aiGenerationLogMapper;

    @PostMapping("/expand")
    @Operation(summary = "短画面扩写")
    public Result<ChapterExpansionResult> expand(@RequestBody ChapterExpansionRequest request) {
        return Result.success(chapterExpansionSkill.execute(request));
    }

    @PostMapping("/rescue")
    @Operation(summary = "卡文急救")
    public Result<ChapterRescueResult> rescue(@RequestBody ChapterRescueRequest request) {
        return Result.success(chapterRescueSkill.execute(request));
    }

    @PostMapping("/rewrite")
    @Operation(summary = "模型 API 改写 / 扩写 / 精修")
    public Result<ChapterRewriteResult> rewrite(@RequestBody ChapterRewriteRequest request) {
        return Result.success(chapterRewriteSkill.execute(request));
    }

    @PostMapping(value = "/rewrite/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "模型 API 改写 / 扩写 / 精修流式返回")
    public Flux<String> rewriteStream(@RequestBody ChapterRewriteRequest request) {
        return chapterRewriteSkill.stream(request);
    }

    @GetMapping("/rewrite/logs")
    @Operation(summary = "查询模型 API 改稿日志")
    public Result<RewriteLogListResponse> rewriteLogs(
            @RequestParam UUID novelId,
            @RequestParam(required = false) UUID chapterId,
            @RequestParam(defaultValue = "0") Integer offset,
            @RequestParam(defaultValue = "12") Integer limit
    ) {
        int safeOffset = Math.max(0, offset == null ? 0 : offset);
        int safeLimit = Math.min(50, Math.max(1, limit == null ? 12 : limit));
        LambdaQueryWrapper<AIGenerationLog> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AIGenerationLog::getNovelId, novelId)
                .eq(AIGenerationLog::getWorkflowType, "chapter_rewrite")
                .orderByDesc(AIGenerationLog::getCreateTime);
        if (chapterId != null) {
            wrapper.eq(AIGenerationLog::getChapterId, chapterId);
        }
        List<AIGenerationLog> allLogs = aiGenerationLogMapper.selectList(wrapper);
        List<AIGenerationLog> pageLogs = allLogs.stream()
                .skip(safeOffset)
                .limit(safeLimit)
                .toList();

        RewriteLogListResponse response = new RewriteLogListResponse();
        response.setLogs(pageLogs);
        response.setTotal(allLogs.size());
        response.setOffset(safeOffset);
        response.setLimit(safeLimit);
        response.setTotalTokenUsage(allLogs.stream().mapToInt(log -> log.getTokenUsage() == null ? 0 : log.getTokenUsage()).sum());
        response.setLatestCreateTime(allLogs.stream()
                .map(AIGenerationLog::getCreateTime)
                .filter(time -> time != null)
                .max(Comparator.naturalOrder())
                .orElse(null));
        return Result.success(response);
    }

    @DeleteMapping("/rewrite/logs/{logId}")
    @Operation(summary = "删除单条模型 API 改稿日志")
    public Result<Void> deleteRewriteLog(@PathVariable UUID logId, @RequestParam UUID novelId) {
        AIGenerationLog log = aiGenerationLogMapper.selectById(logId);
        if (log == null) {
            return Result.error(404, "改稿日志不存在");
        }
        if (!novelId.equals(log.getNovelId()) || !"chapter_rewrite".equals(log.getWorkflowType())) {
            return Result.error(403, "不能删除非当前作品的改稿日志");
        }
        aiGenerationLogMapper.deleteById(logId);
        return Result.success();
    }
}
