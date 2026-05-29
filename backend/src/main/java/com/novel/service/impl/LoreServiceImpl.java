package com.novel.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.novel.entity.Lore;
import com.novel.mapper.LoreMapper;
import com.novel.service.LoreService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class LoreServiceImpl extends ServiceImpl<LoreMapper, Lore> implements LoreService {

    @Override
    public List<Lore> listByNovelId(UUID novelId) {
        return baseMapper.selectByNovelId(novelId);
    }

    @Override
    public List<Lore> listByNovelIdAndCategory(UUID novelId, String category) {
        return baseMapper.selectByNovelIdAndCategory(novelId, category);
    }
}
