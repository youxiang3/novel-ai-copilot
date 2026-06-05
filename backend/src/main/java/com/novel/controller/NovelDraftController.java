package com.novel.controller;

import com.novel.common.Result;
import com.novel.dto.NovelDraftRequest;
import com.novel.dto.NovelDraftResponse;
import com.novel.entity.Novel;
import com.novel.service.NovelDraftService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/novels")
@RequiredArgsConstructor
@Tag(name = "新建作品草稿", description = "新建作品确认流程相关接口")
public class NovelDraftController {

    private final NovelDraftService novelDraftService;

    @PostMapping("/draft")
    @Operation(summary = "生成作品资料草稿")
    public Result<NovelDraftResponse> draft(@RequestBody NovelDraftRequest request) {
        try {
            return Result.success(novelDraftService.createDraft(request));
        } catch (RuntimeException error) {
            return Result.error(400, error.getMessage());
        }
    }

    @PostMapping("/confirm")
    @Operation(summary = "确认创建作品")
    public Result<Novel> confirm(@RequestBody NovelDraftResponse draft) {
        try {
            return Result.success(novelDraftService.confirmDraft(draft));
        } catch (RuntimeException error) {
            String message = error.getMessage() == null ? "" : error.getMessage();
            int code = message.contains("未登录") ? 401 : 400;
            return Result.error(code, message);
        }
    }
}
