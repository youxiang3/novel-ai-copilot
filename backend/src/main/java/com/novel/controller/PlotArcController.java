package com.novel.controller;

import com.novel.common.Result;
import com.novel.entity.PlotArc;
import com.novel.mapper.PlotArcMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/plot-arc")
@RequiredArgsConstructor
@Tag(name = "剧情弧管理", description = "剧情弧相关接口")
public class PlotArcController {

    private final PlotArcMapper plotArcMapper;

    @GetMapping("/list")
    @Operation(summary = "获取剧情弧列表")
    public Result<List<PlotArc>> list(@RequestParam UUID novelId,
                                      @RequestParam(required = false) String status) {
        List<PlotArc> list;
        if (status != null) {
            list = plotArcMapper.selectByNovelIdAndStatus(novelId, status);
        } else {
            list = plotArcMapper.selectByNovelId(novelId);
        }
        return Result.success(list);
    }

    @PostMapping
    @Operation(summary = "创建剧情弧")
    public Result<PlotArc> create(@RequestBody PlotArc plotArc) {
        plotArcMapper.insert(plotArc);
        return Result.success(plotArc);
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新剧情弧")
    public Result<Void> update(@PathVariable UUID id, @RequestBody PlotArc plotArc) {
        plotArc.setId(id);
        plotArcMapper.updateById(plotArc);
        return Result.success();
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "更新剧情弧状态")
    public Result<Void> updateStatus(@PathVariable UUID id, @RequestParam String status) {
        PlotArc plotArc = plotArcMapper.selectById(id);
        plotArc.setStatus(status);
        plotArcMapper.updateById(plotArc);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除剧情弧")
    public Result<Void> delete(@PathVariable UUID id) {
        plotArcMapper.deleteById(id);
        return Result.success();
    }
}
