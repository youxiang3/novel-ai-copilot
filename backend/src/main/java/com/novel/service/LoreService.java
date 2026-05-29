package com.novel.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.novel.entity.Lore;

import java.util.List;
import java.util.UUID;

public interface LoreService extends IService<Lore> {

    List<Lore> listByNovelId(UUID novelId);

    List<Lore> listByNovelIdAndCategory(UUID novelId, String category);
}
