package com.novel.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.novel.config.UserContext;
import com.novel.entity.Chapter;
import com.novel.entity.Novel;
import com.novel.event.ChapterPublishEvent;
import com.novel.mapper.ChapterMapper;
import com.novel.mapper.NovelMapper;
import com.novel.service.ChapterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChapterServiceImpl extends ServiceImpl<ChapterMapper, Chapter> implements ChapterService {

    private final NovelMapper novelMapper;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    public List<Chapter> listByNovelId(UUID novelId) {
        validateNovelOwnership(novelId);
        return baseMapper.selectByNovelId(novelId);
    }

    @Override
    public Chapter getByNovelIdAndNumber(UUID novelId, Integer chapterNumber) {
        validateNovelOwnership(novelId);
        LambdaQueryWrapper<Chapter> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Chapter::getNovelId, novelId)
               .eq(Chapter::getChapterNumber, chapterNumber);
        return getOne(wrapper);
    }

    @Override
    public List<Chapter> getPreviousChapters(UUID novelId, Integer chapterNumber, Integer limit) {
        validateNovelOwnership(novelId);
        return baseMapper.selectPreviousChapters(novelId, chapterNumber, limit);
    }

    @Override
    @Transactional
    public void publishChapter(UUID chapterId) {
        Chapter chapter = getById(chapterId);
        if (chapter == null) {
            throw new RuntimeException("章节不存在");
        }
        validateNovelOwnership(chapter.getNovelId());

        chapter.setStatus("published");
        if (chapter.getContent() != null) {
            chapter.setWordCount(chapter.getContent().length());
        }
        updateById(chapter);

        log.info("[ChapterService] 章节 {} 发布成功，发布事件", chapter.getChapterNumber());

        ChapterPublishEvent event = new ChapterPublishEvent(
                this,
                chapter.getId(),
                chapter.getNovelId(),
                chapter.getChapterNumber(),
                chapter.getContent()
        );
        eventPublisher.publishEvent(event);
    }

    @Override
    public boolean save(Chapter entity) {
        validateNovelOwnership(entity.getNovelId());
        return super.save(entity);
    }

    @Override
    public boolean updateById(Chapter entity) {
        Chapter existing = getById(entity.getId());
        if (existing == null) {
            throw new RuntimeException("章节不存在");
        }
        validateNovelOwnership(existing.getNovelId());
        entity.setNovelId(existing.getNovelId());
        return super.updateById(entity);
    }

    @Override
    public boolean removeById(UUID id) {
        Chapter existing = getById(id);
        if (existing == null) {
            throw new RuntimeException("章节不存在");
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
