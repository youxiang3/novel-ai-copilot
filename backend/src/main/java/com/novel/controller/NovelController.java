package com.novel.controller;

import com.novel.common.Result;
import com.novel.config.UserContext;
import com.novel.dto.SceneExpandRequest;
import com.novel.entity.*;
import com.novel.service.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/novel")
@RequiredArgsConstructor
@Tag(name = "小说管理", description = "小说相关接口")
public class NovelController {

    private final NovelService novelService;
    private final AiService aiService;
    private final MemorySummaryService memorySummaryService;
    private final LoreService loreService;

    @GetMapping("/list")
    @Operation(summary = "获取小说列表")
    public Result<List<Novel>> list() {
        UUID userId = UserContext.getUserId();
        if (userId == null) {
            return Result.error(401, "未登录");
        }
        return Result.success(novelService.listByUserId(userId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "获取小说详情")
    public Result<Novel> getById(@PathVariable UUID id) {
        Novel novel = novelService.getDetailById(id);
        if (novel != null) {
            validateOwnership(novel.getUserId());
        }
        return Result.success(novel);
    }

    @PostMapping
    @Operation(summary = "创建小说")
    public Result<Novel> create(@RequestBody Novel novel) {
        UUID userId = UserContext.getUserId();
        if (userId == null) {
            return Result.error(401, "未登录");
        }
        novel.setUserId(userId);
        novelService.save(novel);
        return Result.success(novel);
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新小说")
    public Result<Void> update(@PathVariable UUID id, @RequestBody Novel novel) {
        Novel existing = novelService.getById(id);
        validateOwnership(existing.getUserId());
        novel.setId(id);
        novelService.updateById(novel);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除小说")
    public Result<Void> delete(@PathVariable UUID id) {
        Novel novel = novelService.getById(id);
        validateOwnership(novel.getUserId());
        novelService.removeById(id);
        return Result.success();
    }

    @PostMapping(value = "/expand-scene", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "短画面扩写正文", description = "根据短画面描述，结合小说上下文，扩写为完整章节（流式输出）")
    public Flux<String> expandScene(@RequestBody SceneExpandRequest request) {
        Novel novel = novelService.getById(request.getNovelId());
        if (novel == null) {
            return Flux.error(new RuntimeException("小说不存在"));
        }
        validateOwnership(novel.getUserId());

        List<MemorySummary> recentSummaries = memorySummaryService.getPreviousSummaries(
                request.getNovelId(),
                request.getTargetChapterNumber(),
                3
        );

        List<Lore> allLores = loreService.listByNovelId(request.getNovelId());
        List<Lore> relevantLores = findRelevantLores(request.getSceneDescription(), allLores);

        StringBuilder promptBuilder = new StringBuilder();
        
        promptBuilder.append("背景信息：");
        if (relevantLores.isEmpty()) {
            promptBuilder.append("无特定设定。");
        } else {
            for (Lore lore : relevantLores) {
                promptBuilder.append(lore.getName()).append("：").append(lore.getContent()).append("；");
            }
        }

        promptBuilder.append(" 之前剧情：");
        if (recentSummaries.isEmpty()) {
            promptBuilder.append("这是小说开篇。");
        } else {
            for (MemorySummary summary : recentSummaries) {
                promptBuilder.append(summary.getSummaryContent()).append("；");
            }
        }

        promptBuilder.append(" 请将以下短画面扩写为约 1500 字的小说正文，注意细节描写和对话");
        
        if (novel.getAuthorStylePrompt() != null && !novel.getAuthorStylePrompt().isEmpty()) {
            promptBuilder.append("，保持文风：").append(novel.getAuthorStylePrompt());
        }
        
        promptBuilder.append("：[").append(request.getSceneDescription()).append("]");

        String fullPrompt = promptBuilder.toString();
        
        log.info("Scene expand prompt: {}", fullPrompt.length() > 200 ? fullPrompt.substring(0, 200) + "..." : fullPrompt);
        
        return aiService.streamCall(fullPrompt);
    }

    private List<Lore> findRelevantLores(String sceneDescription, List<Lore> allLores) {
        String lowerScene = sceneDescription.toLowerCase();
        return allLores.stream()
                .filter(lore -> {
                    String name = lore.getName().toLowerCase();
                    String content = lore.getContent() != null ? lore.getContent().toLowerCase() : "";
                    return lowerScene.contains(name) || name.contains(lowerScene);
                })
                .limit(5)
                .collect(Collectors.toList());
    }

    private void validateOwnership(UUID novelUserId) {
        UUID currentUserId = UserContext.getUserId();
        if (!novelUserId.equals(currentUserId)) {
            throw new RuntimeException("无权访问");
        }
    }
}
