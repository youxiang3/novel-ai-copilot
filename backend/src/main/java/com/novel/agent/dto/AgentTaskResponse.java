package com.novel.agent.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
public class AgentTaskResponse {

    private UUID taskId;

    private String agentType;

    private String status;

    private String message;

    private Map<String, Object> input;

    private Map<String, Object> result;

    private List<AgentTaskStepResponse> steps = new ArrayList<>();

    private String errorMessage;
}
