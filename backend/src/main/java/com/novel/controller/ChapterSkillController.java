package com.novel.controller;

import com.novel.common.Result;
import com.novel.dto.ChapterExpansionRequest;
import com.novel.dto.ChapterExpansionResult;
import com.novel.dto.ChapterRescueRequest;
import com.novel.dto.ChapterRescueResult;
import com.novel.skill.novel.ChapterExpansionSkill;
import com.novel.skill.novel.ChapterRescueSkill;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chapters")
@RequiredArgsConstructor
@Tag(name = "章节 Skill", description = "章节扩写、卡文急救等 Skill 接口")
public class ChapterSkillController {

    private final ChapterExpansionSkill chapterExpansionSkill;
    private final ChapterRescueSkill chapterRescueSkill;

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
}
