package com.novel.controller;

import com.novel.common.Result;
import com.novel.entity.Inspiration;
import com.novel.mapper.InspirationMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/inspiration")
@RequiredArgsConstructor
@Tag(name = "灵感点管理", description = "灵感点相关接口")
public class InspirationController {

    private final InspirationMapper inspirationMapper;

    @GetMapping("/list")
    @Operation(summary = "获取灵感点列表")
    public Result<List<Inspiration>> list(@RequestParam UUID novelId,
                                          @RequestParam(required = false) String category,
                                          @RequestParam(required = false) String status) {
        List<Inspiration> list;
        if (category != null) {
            list = inspirationMapper.selectByNovelIdAndCategory(novelId, category);
        } else if (status != null) {
            list = inspirationMapper.selectByNovelIdAndStatus(novelId, status);
        } else {
            list = inspirationMapper.selectByNovelId(novelId);
        }
        return Result.success(list);
    }

    @PostMapping
    @Operation(summary = "创建灵感点")
    public Result<Inspiration> create(@RequestBody Inspiration inspiration) {
        inspirationMapper.insert(inspiration);
        return Result.success(inspiration);
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新灵感点")
    public Result<Void> update(@PathVariable UUID id, @RequestBody Inspiration inspiration) {
        inspiration.setId(id);
        inspirationMapper.updateById(inspiration);
        return Result.success();
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "更新灵感点状态")
    public Result<Void> updateStatus(@PathVariable UUID id, @RequestParam String status) {
        Inspiration inspiration = inspirationMapper.selectById(id);
        inspiration.setStatus(status);
        inspirationMapper.updateById(inspiration);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除灵感点")
    public Result<Void> delete(@PathVariable UUID id) {
        inspirationMapper.deleteById(id);
        return Result.success();
    }
}
