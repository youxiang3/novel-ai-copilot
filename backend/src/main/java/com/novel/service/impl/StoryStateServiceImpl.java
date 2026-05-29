package com.novel.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.novel.entity.StoryState;
import com.novel.mapper.StoryStateMapper;
import com.novel.service.StoryStateService;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class StoryStateServiceImpl extends ServiceImpl<StoryStateMapper, StoryState> implements StoryStateService {

    @Override
    public StoryState getByNovelId(UUID novelId) {
        return baseMapper.selectByNovelId(novelId);
    }
}
