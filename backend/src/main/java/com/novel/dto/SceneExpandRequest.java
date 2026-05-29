package com.novel.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class SceneExpandRequest {

    private UUID novelId;

    private Integer targetChapterNumber;

    private String sceneDescription;
}
