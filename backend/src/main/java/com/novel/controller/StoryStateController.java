package com.novel.controller;

import com.novel.common.Result;
import com.novel.entity.StoryState;
import com.novel.service.StoryStateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/story-state")
@RequiredArgsConstructor
@Tag(name = "故事状态管理", description = "全局动态状态相关接口")
public class StoryStateController {

    private final StoryStateService storyStateService;

    @GetMapping
    @Operation(summary = "获取故事状态")
    public Result<StoryState> getByNovelId(@RequestParam UUID novelId) {
        return Result.success(storyStateService.getByNovelId(novelId));
    }

    @PostMapping
    @Operation(summary = "创建故事状态")
    public Result<StoryState> create(@RequestBody StoryState state) {
        storyStateService.save(state);
        return Result.success(state);
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新故事状态")
    public Result<Void> update(@PathVariable UUID id, @RequestBody StoryState state) {
        state.setId(id);
        storyStateService.updateById(state);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除故事状态")
    public Result<Void> delete(@PathVariable UUID id) {
        storyStateService.removeById(id);
        return Result.success();
    }
}
