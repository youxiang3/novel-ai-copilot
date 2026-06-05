package com.novel.agent.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
public class AgentAuthorizationResponse {

    private UUID authorizationId;

    private String agentType;

    private String status;

    private List<String> scopes = new ArrayList<>();

    private LocalDateTime expiresAt;
}
