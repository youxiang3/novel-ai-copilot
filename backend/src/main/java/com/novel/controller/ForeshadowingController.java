package com.novel.controller;

import com.novel.common.Result;
import com.novel.entity.Foreshadowing;
import com.novel.mapper.ForeshadowingMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/foreshadowing")
@RequiredArgsConstructor
@Tag(name = "伏笔管理", description = "伏笔池相关接口")
public class ForeshadowingController {

    private final ForeshadowingMapper foreshadowingMapper;

    @GetMapping("/list")
    @Operation(summary = "获取伏笔列表")
    public Result<List<Foreshadowing>> list(@RequestParam UUID novelId,
                                            @RequestParam(required = false) String status) {
        List<Foreshadowing> list;
        if (status != null) {
            list = foreshadowingMapper.selectByNovelIdAndStatus(novelId, status);
        } else {
            list = foreshadowingMapper.selectByNovelId(novelId);
        }
        return Result.success(list);
    }

    @PostMapping
    @Operation(summary = "创建伏笔")
    public Result<Foreshadowing> create(@RequestBody Foreshadowing foreshadowing) {
        foreshadowingMapper.insert(foreshadowing);
        return Result.success(foreshadowing);
    }

    @PutMapping("/{id}/payoff")
    @Operation(summary = "标记伏笔已回收")
    public Result<Void> markPaidOff(@PathVariable UUID id, @RequestParam Integer payoffChapter) {
        Foreshadowing foreshadowing = foreshadowingMapper.selectById(id);
        foreshadowing.setStatus("paid_off");
        foreshadowing.setPayoffChapter(payoffChapter);
        foreshadowingMapper.updateById(foreshadowing);
        return Result.success();
    }

    @PutMapping("/{id}/forgotten")
    @Operation(summary = "标记伏笔已遗忘")
    public Result<Void> markForgotten(@PathVariable UUID id) {
        Foreshadowing foreshadowing = foreshadowingMapper.selectById(id);
        foreshadowing.setStatus("forgotten");
        foreshadowingMapper.updateById(foreshadowing);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除伏笔")
    public Result<Void> delete(@PathVariable UUID id) {
        foreshadowingMapper.deleteById(id);
        return Result.success();
    }
}
