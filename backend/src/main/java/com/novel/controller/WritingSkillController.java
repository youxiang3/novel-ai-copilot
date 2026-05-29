package com.novel.controller;

import com.novel.common.Result;
import com.novel.entity.WritingSkill;
import com.novel.mapper.WritingSkillMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/writing-skill")
@RequiredArgsConstructor
@Tag(name = "写作技巧管理", description = "写作技巧配置相关接口")
public class WritingSkillController {

    private final WritingSkillMapper writingSkillMapper;

    @GetMapping("/list")
    @Operation(summary = "获取写作技巧列表")
    public Result<List<WritingSkill>> list(@RequestParam UUID novelId,
                                           @RequestParam(required = false) String status) {
        List<WritingSkill> list;
        if ("active".equals(status)) {
            list = writingSkillMapper.selectActiveByNovelId(novelId);
        } else {
            list = writingSkillMapper.selectByNovelId(novelId);
        }
        return Result.success(list);
    }

    @PostMapping
    @Operation(summary = "创建写作技巧")
    public Result<WritingSkill> create(@RequestBody WritingSkill skill) {
        writingSkillMapper.insert(skill);
        return Result.success(skill);
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新写作技巧")
    public Result<Void> update(@PathVariable UUID id, @RequestBody WritingSkill skill) {
        skill.setId(id);
        writingSkillMapper.updateById(skill);
        return Result.success();
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "更新技巧状态")
    public Result<Void> updateStatus(@PathVariable UUID id, @RequestParam String status) {
        WritingSkill skill = writingSkillMapper.selectById(id);
        skill.setStatus(status);
        writingSkillMapper.updateById(skill);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除写作技巧")
    public Result<Void> delete(@PathVariable UUID id) {
        writingSkillMapper.deleteById(id);
        return Result.success();
    }
}
