package com.novel.service.impl;

import com.novel.entity.Lore;
import com.novel.entity.MemorySummary;
import com.novel.mapper.LoreMapper;
import com.novel.mapper.MemorySummaryMapper;
import com.novel.service.AiService;
import com.novel.service.VectorSearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class VectorSearchServiceImpl implements VectorSearchService {

    private final AiService aiService;
    private final LoreMapper loreMapper;
    private final MemorySummaryMapper memorySummaryMapper;

    @Override
    public String generateEmbedding(String text) {
        return aiService.call("请将以下文本转换为向量描述（用于语义检索）：" + text);
    }

    @Override
    public List<LoreSearchResult> searchLoreByVector(UUID novelId, String query, int topK) {
        List<Lore> allLores = loreMapper.selectByNovelId(novelId);
        
        if (allLores.isEmpty()) {
            return Collections.emptyList();
        }

        String queryEmbedding = generateEmbedding(query);

        return allLores.stream()
                .map(lore -> {
                    float similarity = calculateSimilarity(queryEmbedding, lore.getContent());
                    return new LoreSearchResult(
                            lore.getId(),
                            lore.getCategory(),
                            lore.getName(),
                            lore.getContent(),
                            similarity
                    );
                })
                .sorted(Comparator.comparing(LoreSearchResult::similarity).reversed())
                .limit(topK)
                .collect(Collectors.toList());
    }

    @Override
    public List<MemorySummarySearchResult> searchMemoryByVector(UUID novelId, String query, int topK) {
        List<MemorySummary> allSummaries = memorySummaryMapper.selectByNovelId(novelId);
        
        if (allSummaries.isEmpty()) {
            return Collections.emptyList();
        }

        String queryEmbedding = generateEmbedding(query);

        return allSummaries.stream()
                .map(summary -> {
                    float similarity = calculateSimilarity(queryEmbedding, summary.getSummaryContent());
                    return new MemorySummarySearchResult(
                            summary.getId(),
                            null,
                            summary.getSummaryContent(),
                            similarity
                    );
                })
                .sorted(Comparator.comparing(MemorySummarySearchResult::similarity).reversed())
                .limit(topK)
                .collect(Collectors.toList());
    }

    private float calculateSimilarity(String queryEmbedding, String content) {
        if (content == null || content.isEmpty()) {
            return 0f;
        }

        String lowerQuery = queryEmbedding.toLowerCase();
        String lowerContent = content.toLowerCase();

        String[] queryTerms = lowerQuery.split("\\s+");
        int matchCount = 0;
        for (String term : queryTerms) {
            if (term.length() > 2 && (lowerContent.contains(term) || term.contains(lowerContent))) {
                matchCount++;
            }
        }

        return (float) matchCount / Math.max(queryTerms.length, 1);
    }
}
