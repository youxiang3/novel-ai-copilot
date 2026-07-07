package com.novel.dto;

import lombok.Data;

import java.util.List;

@Data
public class IpFactoryRequest {
    private String workTitle;
    private String chapterTitle;
    private String chapterContent;
    private String genre;
    private String sellingPoint;
    private String summary;
    private List<String> characters;
    private List<String> worldRules;
    private String targetScene;
    private Integer targetDuration;
}
