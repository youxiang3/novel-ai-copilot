package com.novel.service;

import reactor.core.publisher.Flux;

public interface WorkflowService {

    Flux<String> generateScreenplay(Long novelId, Long chapterId, String targetScene, Integer targetDuration);

    String generateChapterPlan(Long novelId, Integer startChapter, Integer endChapter);

    String analyzeChapter(Long novelId, Long chapterId, String analysisType);

    String editorInChiefReview(Long novelId, Long chapterId);
}
