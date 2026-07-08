package com.novel.dto;

import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class ChapterRewriteRequest {

    private UUID novelId;

    private UUID chapterId;

    private String workTitle;

    private String genre;

    private String sellingPoint;

    private String chapterTitle;

    private String chapterText;

    private String selectedText;

    private String instruction;

    private List<String> loreContext;

    private List<String> memoryContext;
}
