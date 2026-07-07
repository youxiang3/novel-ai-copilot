package com.novel.controller;

import com.novel.common.Result;
import com.novel.dto.AnalysisRequest;
import com.novel.dto.ChapterPlanRequest;
import com.novel.dto.IpFactoryRequest;
import com.novel.dto.ScreenplayRequest;
import com.novel.service.WorkflowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.UUID;

@RestController
@RequestMapping("/api/workflow")
@RequiredArgsConstructor
@Tag(name = "AI工作流", description = "短剧生成、章节计划、自动分析、责编审稿")
public class WorkflowController {

    private final WorkflowService workflowService;

    @PostMapping(value = "/screenplay", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "短剧脚本生成", description = "基于章节内容生成短视频脚本（流式输出）")
    public Flux<String> generateScreenplay(@RequestBody ScreenplayRequest request) {
        return workflowService.generateScreenplay(
                toLong(request.getNovelId()),
                toLong(request.getChapterId()),
                request.getTargetScene(),
                request.getTargetDuration()
        );
    }

    @PostMapping("/chapter-plan")
    @Operation(summary = "生成章节计划", description = "为指定章节范围生成写作计划")
    public Result<String> generateChapterPlan(@RequestBody ChapterPlanRequest request) {
        String plan = workflowService.generateChapterPlan(
                toLong(request.getNovelId()),
                request.getStartChapter(),
                request.getEndChapter()
        );
        return Result.success(plan);
    }

    @PostMapping("/analyze")
    @Operation(summary = "章节自动分析", description = "对章节进行逻辑/节奏/人物分析")
    public Result<String> analyzeChapter(@RequestBody AnalysisRequest request) {
        String analysis = workflowService.analyzeChapter(
                toLong(request.getNovelId()),
                toLong(request.getChapterId()),
                request.getAnalysisType()
        );
        return Result.success(analysis);
    }

    @PostMapping("/editor-review")
    @Operation(summary = "责编审稿", description = "获取责编的审稿意见")
    public Result<String> editorInChiefReview(@RequestParam UUID novelId, @RequestParam UUID chapterId) {
        String review = workflowService.editorInChiefReview(toLong(novelId), toLong(chapterId));
        return Result.success(review);
    }

    @PostMapping("/ip/screenplay-draft")
    @Operation(summary = "IP Factory 短剧脚本草案", description = "基于前端传入的当前作品和章节内容生成竖屏短剧脚本")
    public Result<String> generateScreenplayDraft(@RequestBody IpFactoryRequest request) {
        String screenplay = workflowService.generateScreenplayDraft(
                request.getWorkTitle(),
                request.getChapterTitle(),
                request.getChapterContent(),
                request.getGenre(),
                request.getSellingPoint(),
                request.getSummary(),
                request.getCharacters(),
                request.getWorldRules(),
                request.getTargetScene(),
                request.getTargetDuration()
        );
        return Result.success(screenplay);
    }

    @PostMapping("/ip/game-package")
    @Operation(summary = "IP Factory 互动剧情游戏设定包", description = "基于前端传入的当前作品和章节内容生成结构化互动剧情游戏 JSON 草案")
    public Result<String> generateGamePackage(@RequestBody IpFactoryRequest request) {
        String gamePackage = workflowService.generateGamePackage(
                request.getWorkTitle(),
                request.getChapterTitle(),
                request.getChapterContent(),
                request.getGenre(),
                request.getSellingPoint(),
                request.getSummary(),
                request.getCharacters(),
                request.getWorldRules()
        );
        return Result.success(gamePackage);
    }

    private Long toLong(UUID uuid) {
        return uuid != null ? uuid.getMostSignificantBits() : null;
    }
}
