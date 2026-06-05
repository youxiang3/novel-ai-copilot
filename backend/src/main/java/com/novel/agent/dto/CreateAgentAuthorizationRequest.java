package com.novel.agent.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class CreateAgentAuthorizationRequest {

    private String agentType;

    private List<String> scopes = new ArrayList<>();

    private Integer expiresInHours;
}
