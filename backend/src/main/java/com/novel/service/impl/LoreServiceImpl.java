package com.novel.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.novel.config.UserContext;
import com.novel.entity.Lore;
import com.novel.entity.Novel;
import com.novel.mapper.LoreMapper;
import com.novel.mapper.NovelMapper;
import com.novel.service.LoreService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LoreServiceImpl extends ServiceImpl<LoreMapper, Lore> implements LoreService {

    private final NovelMapper novelMapper;

    @Override
    public List<Lore> listByNovelId(UUID novelId) {
        validateNovelOwnership(novelId);
        return baseMapper.selectByNovelId(novelId);
    }

    @Override
    public List<Lore> listByNovelIdAndCategory(UUID novelId, String category) {
        validateNovelOwnership(novelId);
        return baseMapper.selectByNovelIdAndCategory(novelId, category);
    }

    @Override
    public boolean save(Lore entity) {
        validateNovelOwnership(entity.getNovelId());
        return super.save(entity);
    }

    @Override
    public boolean updateById(Lore entity) {
        Lore existing = getById(entity.getId());
        if (existing == null) {
            throw new RuntimeException("设定不存在");
        }
        validateNovelOwnership(existing.getNovelId());
        entity.setNovelId(existing.getNovelId());
        return super.updateById(entity);
    }

    @Override
    public boolean removeById(UUID id) {
        Lore existing = getById(id);
        if (existing == null) {
            throw new RuntimeException("设定不存在");
        }
        validateNovelOwnership(existing.getNovelId());
        return super.removeById(id);
    }

    private void validateNovelOwnership(UUID novelId) {
        Novel novel = novelMapper.selectById(novelId);
        if (novel == null) {
            throw new RuntimeException("小说不存在");
        }
        UUID currentUserId = UserContext.getUserId();
        if (currentUserId == null || !novel.getUserId().equals(currentUserId)) {
            throw new RuntimeException("无权访问");
        }
    }
}
