package com.novel.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.novel.entity.MemorySummary;

import java.util.List;
import java.util.UUID;

public interface MemorySummaryService extends IService<MemorySummary> {

    List<MemorySummary> listByNovelId(UUID novelId);

    List<MemorySummary> getPreviousSummaries(UUID novelId, Integer chapterNumber, Integer limit);
}
