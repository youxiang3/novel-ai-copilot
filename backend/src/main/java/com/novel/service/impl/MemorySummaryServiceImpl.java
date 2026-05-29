package com.novel.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.novel.entity.MemorySummary;
import com.novel.mapper.MemorySummaryMapper;
import com.novel.service.MemorySummaryService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class MemorySummaryServiceImpl extends ServiceImpl<MemorySummaryMapper, MemorySummary> implements MemorySummaryService {

    @Override
    public List<MemorySummary> listByNovelId(UUID novelId) {
        return baseMapper.selectByNovelId(novelId);
    }

    @Override
    public List<MemorySummary> getPreviousSummaries(UUID novelId, Integer chapterNumber, Integer limit) {
        return baseMapper.selectPreviousSummaries(novelId, chapterNumber, limit);
    }
}
