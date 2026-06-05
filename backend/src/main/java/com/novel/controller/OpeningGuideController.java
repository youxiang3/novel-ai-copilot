package com.novel.controller;

import com.novel.common.Result;
import com.novel.dto.FirstChapterGenerationRequest;
import com.novel.dto.FirstChapterGenerationResult;
import com.novel.dto.OpeningGuideRequest;
import com.novel.dto.OpeningGuideResponse;
import com.novel.skill.novel.FirstChapterGenerationSkill;
import com.novel.skill.novel.OpeningGuideSkill;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/novels/opening-guide")
@RequiredArgsConstructor
@Tag(name = "开篇向导", description = "动态开篇问答与首章生成")
public class OpeningGuideController {

    private final OpeningGuideSkill openingGuideSkill;
    private final FirstChapterGenerationSkill firstChapterGenerationSkill;

    @PostMapping("/next-question")
    @Operation(summary = "生成开篇向导下一题")
    public Result<OpeningGuideResponse> nextQuestion(@RequestBody OpeningGuideRequest request) {
        try {
            return Result.success(openingGuideSkill.execute(request));
        } catch (RuntimeException error) {
            return Result.error(mapCode(error), error.getMessage());
        }
    }

    @PostMapping("/generate-first-chapter")
    @Operation(summary = "根据开篇问答生成第一章正文")
    public Result<FirstChapterGenerationResult> generateFirstChapter(@RequestBody FirstChapterGenerationRequest request) {
        try {
            return Result.success(firstChapterGenerationSkill.execute(request));
        } catch (RuntimeException error) {
            return Result.error(mapCode(error), error.getMessage());
        }
    }

    private int mapCode(RuntimeException error) {
        String message = error.getMessage() == null ? "" : error.getMessage();
        if (message.contains("未登录")) return 401;
        if (message.contains("无权访问")) return 403;
        if (message.contains("不存在")) return 404;
        return 400;
    }
}
