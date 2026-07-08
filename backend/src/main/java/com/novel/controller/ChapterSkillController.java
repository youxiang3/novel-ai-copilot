package com.novel.controller;

import com.novel.common.Result;
import com.novel.dto.ChapterExpansionRequest;
import com.novel.dto.ChapterExpansionResult;
import com.novel.dto.ChapterRewriteRequest;
import com.novel.dto.ChapterRewriteResult;
import com.novel.dto.ChapterRescueRequest;
import com.novel.dto.ChapterRescueResult;
import com.novel.entity.AIGenerationLog;
import com.novel.mapper.AIGenerationLogMapper;
import com.novel.skill.novel.ChapterExpansionSkill;
import com.novel.skill.novel.ChapterRewriteSkill;
import com.novel.skill.novel.ChapterRescueSkill;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

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

    @GetMapping("/rewrite/logs")
    @Operation(summary = "查询模型 API 改稿日志")
    public Result<List<AIGenerationLog>> rewriteLogs(@RequestParam UUID novelId) {
        return Result.success(aiGenerationLogMapper.selectByNovelIdAndWorkflow(novelId, "chapter_rewrite"));
    }
}
