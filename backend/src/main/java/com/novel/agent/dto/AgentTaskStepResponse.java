package com.novel.agent.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class AgentTaskStepResponse {

    private UUID stepId;

    private String stepKey;

    private String stepName;

    private String status;

    private String errorMessage;

    private LocalDateTime startedAt;

    private LocalDateTime finishedAt;
}
