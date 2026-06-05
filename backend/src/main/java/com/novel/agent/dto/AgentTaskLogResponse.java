package com.novel.agent.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class AgentTaskLogResponse {

    private UUID logId;

    private String level;

    private String message;

    private String metadataJson;

    private LocalDateTime createdAt;
}
