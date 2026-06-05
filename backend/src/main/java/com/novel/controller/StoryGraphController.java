package com.novel.controller;

import com.novel.common.Result;
import com.novel.dto.StoryGraphRequest;
import com.novel.dto.StoryGraphResult;
import com.novel.skill.novel.StoryGraphSkill;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/story-graph")
@RequiredArgsConstructor
@Tag(name = "故事图谱", description = "世界观图谱与故事关系图谱接口")
public class StoryGraphController {

    private final StoryGraphSkill storyGraphSkill;

    @PostMapping("/generate")
    @Operation(summary = "生成或刷新故事图谱")
    public Result<StoryGraphResult> generate(@RequestBody StoryGraphRequest request) {
        return Result.success(storyGraphSkill.execute(request));
    }

    @GetMapping("/{novelId}")
    @Operation(summary = "获取故事图谱")
    public Result<StoryGraphResult> get(@PathVariable UUID novelId) {
        StoryGraphRequest request = new StoryGraphRequest();
        request.setNovelId(novelId);
        request.setMode("full");
        return Result.success(storyGraphSkill.execute(request));
    }
}
