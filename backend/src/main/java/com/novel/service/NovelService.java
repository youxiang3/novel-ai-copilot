package com.novel.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.novel.entity.Novel;

import java.util.List;
import java.util.UUID;

public interface NovelService extends IService<Novel> {

    List<Novel> listByUserId(UUID userId);

    Novel getDetailById(UUID id);
}
