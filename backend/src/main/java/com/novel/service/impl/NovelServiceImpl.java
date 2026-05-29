package com.novel.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.novel.config.UserContext;
import com.novel.entity.Novel;
import com.novel.mapper.NovelMapper;
import com.novel.service.NovelService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class NovelServiceImpl extends ServiceImpl<NovelMapper, Novel> implements NovelService {

    @Override
    public List<Novel> listByUserId(UUID userId) {
        LambdaQueryWrapper<Novel> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Novel::getUserId, userId);
        return list(wrapper);
    }

    @Override
    public Novel getDetailById(UUID id) {
        Novel novel = getById(id);
        if (novel != null) {
            validateOwnership(novel.getUserId());
        }
        return novel;
    }

    @Override
    public boolean save(Novel entity) {
        if (entity.getUserId() == null) {
            entity.setUserId(UserContext.getUserId());
        }
        return super.save(entity);
    }

    @Override
    public boolean updateById(Novel entity) {
        Novel existing = getById(entity.getId());
        validateOwnership(existing.getUserId());
        return super.updateById(entity);
    }

    @Override
    public boolean removeById(UUID id) {
        Novel existing = getById(id);
        validateOwnership(existing.getUserId());
        return super.removeById(id);
    }

    private void validateOwnership(UUID novelUserId) {
        UUID currentUserId = UserContext.getUserId();
        if (currentUserId != null && !novelUserId.equals(currentUserId)) {
            throw new RuntimeException("无权访问");
        }
    }
}
