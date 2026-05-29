package com.novel.controller;

import com.novel.common.Result;
import com.novel.entity.EmotionCurve;
import com.novel.mapper.EmotionCurveMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/emotion-curve")
@RequiredArgsConstructor
@Tag(name = "情绪曲线管理", description = "情绪曲线相关接口")
public class EmotionCurveController {

    private final EmotionCurveMapper emotionCurveMapper;

    @GetMapping("/list")
    @Operation(summary = "获取情绪曲线列表")
    public Result<List<EmotionCurve>> list(@RequestParam UUID novelId) {
        return Result.success(emotionCurveMapper.selectByNovelIdOrderByChapter(novelId));
    }

    @GetMapping("/{chapterId}")
    @Operation(summary = "获取章节情绪曲线")
    public Result<EmotionCurve> getByChapterId(@PathVariable UUID chapterId) {
        return Result.success(emotionCurveMapper.selectByChapterId(chapterId));
    }
}
