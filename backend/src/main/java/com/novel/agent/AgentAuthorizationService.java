package com.novel.agent;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.dto.AgentAuthorizationResponse;
import com.novel.agent.dto.CreateAgentAuthorizationRequest;
import com.novel.config.UserContext;
import com.novel.entity.AgentAuthorization;
import com.novel.mapper.AgentAuthorizationMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AgentAuthorizationService {

    private final AgentAuthorizationMapper authorizationMapper;
    private final ObjectMapper objectMapper;

    public AgentAuthorizationResponse create(CreateAgentAuthorizationRequest request) {
        UUID userId = requireUserId();
        String agentType = blankToDefault(request.getAgentType(), AgentType.NOVEL_CREATION.name());
        List<String> scopes = request.getScopes() == null ? List.of() : request.getScopes();
        if (scopes.isEmpty()) {
            throw new RuntimeException("授权范围不能为空");
        }

        AgentAuthorization authorization = new AgentAuthorization();
        authorization.setId(UUID.randomUUID());
        authorization.setUserId(userId);
        authorization.setAgentType(agentType);
        authorization.setScopes(toJson(scopes));
        authorization.setStatus(AgentAuthorizationStatus.ACTIVE.name());
        int hours = request.getExpiresInHours() == null || request.getExpiresInHours() <= 0 ? 24 : request.getExpiresInHours();
        authorization.setExpiresAt(LocalDateTime.now().plusHours(hours));
        authorizationMapper.insert(authorization);
        return toResponse(authorization);
    }

    public void revoke(UUID authorizationId) {
        AgentAuthorization authorization = getOwnedAuthorization(authorizationId);
        authorization.setStatus(AgentAuthorizationStatus.REVOKED.name());
        authorizationMapper.updateById(authorization);
    }

    public AgentAuthorization validate(UUID authorizationId, AgentType agentType, List<String> requiredScopes) {
        AgentAuthorization authorization = getOwnedAuthorization(authorizationId);
        if (!agentType.name().equals(authorization.getAgentType())) {
            throw new RuntimeException("授权类型不匹配");
        }
        if (authorization.getExpiresAt() != null && authorization.getExpiresAt().isBefore(LocalDateTime.now())) {
            authorization.setStatus(AgentAuthorizationStatus.EXPIRED.name());
            authorizationMapper.updateById(authorization);
            throw new RuntimeException("授权已过期");
        }
        if (!AgentAuthorizationStatus.ACTIVE.name().equals(authorization.getStatus())) {
            throw new RuntimeException("授权不可用");
        }
        List<String> grantedScopes = parseScopes(authorization.getScopes());
        for (String scope : requiredScopes) {
            if (!grantedScopes.contains(scope)) {
                throw new RuntimeException("缺少授权范围：" + scope);
            }
        }
        return authorization;
    }

    public AgentAuthorizationResponse toResponse(AgentAuthorization authorization) {
        AgentAuthorizationResponse response = new AgentAuthorizationResponse();
        response.setAuthorizationId(authorization.getId());
        response.setAgentType(authorization.getAgentType());
        response.setStatus(authorization.getStatus());
        response.setScopes(parseScopes(authorization.getScopes()));
        response.setExpiresAt(authorization.getExpiresAt());
        return response;
    }

    private AgentAuthorization getOwnedAuthorization(UUID authorizationId) {
        if (authorizationId == null) {
            throw new RuntimeException("authorizationId 不能为空");
        }
        AgentAuthorization authorization = authorizationMapper.selectById(authorizationId);
        if (authorization == null) {
            throw new RuntimeException("授权不存在");
        }
        UUID userId = requireUserId();
        if (!userId.equals(authorization.getUserId())) {
            throw new RuntimeException("无权访问该授权");
        }
        return authorization;
    }

    private UUID requireUserId() {
        UUID userId = UserContext.getUserId();
        if (userId == null) {
            throw new RuntimeException("未登录");
        }
        return userId;
    }

    private String toJson(List<String> scopes) {
        try {
            return objectMapper.writeValueAsString(scopes);
        } catch (JsonProcessingException error) {
            throw new RuntimeException("授权范围序列化失败");
        }
    }

    private List<String> parseScopes(String scopes) {
        if (scopes == null || scopes.isBlank()) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(scopes, new TypeReference<List<String>>() {});
        } catch (Exception ignored) {
            return List.of(scopes.split(","));
        }
    }

    private String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
