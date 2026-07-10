package com.novel.service;

import com.novel.dto.ChapterTaskRequest;
import com.novel.dto.ChapterTaskResponse;

import java.util.List;
import java.util.UUID;

public interface ChapterTaskService {
    List<ChapterTaskResponse> listCurrent(UUID novelId);
    ChapterTaskResponse getCurrent(UUID chapterId);
    List<ChapterTaskResponse> listVersions(UUID chapterId);
    ChapterTaskResponse create(ChapterTaskRequest request);
    ChapterTaskResponse createVersion(UUID taskId, ChapterTaskRequest request);
    void deleteForChapter(UUID chapterId);
}
