package com.novel.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.novel.entity.Chapter;

import java.util.List;
import java.util.UUID;

public interface ChapterService extends IService<Chapter> {

    List<Chapter> listByNovelId(UUID novelId);

    Chapter getByNovelIdAndNumber(UUID novelId, Integer chapterNumber);

    Chapter getOwnedById(UUID id);

    List<Chapter> getPreviousChapters(UUID novelId, Integer chapterNumber, Integer limit);

    void publishChapter(UUID chapterId);

    boolean removeById(UUID id);
}
