package com.novel.agent.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class CreateNovelAgentTaskRequest {

    private UUID authorizationId;

    private String title;

    private String idea;

    private String genre;

    private String style;

    private Boolean autoGenerateFirstChapter;

    private Boolean autoGenerateStoryGraph;

    /**
     * AUTO, FIXED_WORKFLOW, RESPONSES_API, or AGENTS_SDK.
     * AGENTS_SDK is kept as a compatibility mode for future SDK wiring and currently falls back to FIXED_WORKFLOW in Java.
     */
    private String runnerMode;
}
