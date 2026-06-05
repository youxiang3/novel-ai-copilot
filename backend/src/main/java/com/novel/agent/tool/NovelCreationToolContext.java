package com.novel.agent.tool;

import com.novel.dto.ChapterExpansionResult;
import com.novel.dto.NovelDraftResponse;
import com.novel.dto.StoryGraphResult;
import com.novel.entity.Chapter;
import com.novel.entity.Novel;
import lombok.Data;

import java.util.LinkedHashMap;
import java.util.Map;

@Data
public class NovelCreationToolContext {

    private String title;

    private String idea;

    private String genre;

    private String style;

    private Boolean autoGenerateFirstChapter;

    private Boolean autoGenerateStoryGraph;

    private NovelDraftResponse draft;

    private Novel novel;

    private Chapter firstChapter;

    private ChapterExpansionResult firstChapterExpansion;

    private String generatedFirstChapterTitle;

    private StoryGraphResult storyGraph;

    public Map<String, Object> resultSnapshot() {
        Map<String, Object> result = new LinkedHashMap<>();
        if (novel != null) {
            result.put("novelId", novel.getId());
            result.put("novelTitle", novel.getTitle());
        }
        if (firstChapter != null) {
            result.put("chapterId", firstChapter.getId());
            result.put("chapterTitle", firstChapter.getTitle());
        }
        if (storyGraph != null) {
            result.put("storyGraphGenerated", true);
            result.put("storyGraphNodeCount", storyGraph.getNodes() == null ? 0 : storyGraph.getNodes().size());
            result.put("storyGraphEdgeCount", storyGraph.getEdges() == null ? 0 : storyGraph.getEdges().size());
        } else {
            result.put("storyGraphGenerated", false);
        }
        return result;
    }
}
