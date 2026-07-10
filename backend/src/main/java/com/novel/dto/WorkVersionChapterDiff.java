package com.novel.dto;

import lombok.Data;

@Data
public class WorkVersionChapterDiff {
    private String key;
    private String status;
    private String title;
    private Integer oldWords;
    private Integer newWords;
    private String oldContent;
    private String newContent;
}
