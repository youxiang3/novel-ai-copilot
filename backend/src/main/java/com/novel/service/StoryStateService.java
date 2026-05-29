package com.novel.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.novel.entity.StoryState;

import java.util.UUID;

public interface StoryStateService extends IService<StoryState> {

    StoryState getByNovelId(UUID novelId);
}
