package com.novel.service;

import com.novel.dto.ChapterWorkflowTransitionRequest;
import com.novel.entity.ChapterWorkflowState;

import java.util.List;
import java.util.UUID;

public interface ChapterWorkflowStateService {
    ChapterWorkflowState current(UUID chapterId);
    List<ChapterWorkflowState> history(UUID chapterId);
    ChapterWorkflowState transition(ChapterWorkflowTransitionRequest request);
}
