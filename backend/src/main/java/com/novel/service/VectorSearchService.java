package com.novel.service;

import java.util.List;
import java.util.UUID;

public interface VectorSearchService {

    String generateEmbedding(String text);

    List<LoreSearchResult> searchLoreByVector(UUID novelId, String query, int topK);

    List<MemorySummarySearchResult> searchMemoryByVector(UUID novelId, String query, int topK);

    record LoreSearchResult(UUID id, String category, String name, String content, float similarity) {}
    record MemorySummarySearchResult(UUID id, Integer chapterNumber, String summaryContent, float similarity) {}
}
