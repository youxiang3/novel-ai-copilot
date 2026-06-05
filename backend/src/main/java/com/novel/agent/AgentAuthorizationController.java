package com.novel.agent;

import com.novel.agent.dto.AgentAuthorizationResponse;
import com.novel.agent.dto.CreateAgentAuthorizationRequest;
import com.novel.common.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/agent-authorizations")
@RequiredArgsConstructor
@Tag(name = "Agent 授权", description = "自动创作代理授权接口")
public class AgentAuthorizationController {

    private final AgentAuthorizationService authorizationService;

    @PostMapping
    @Operation(summary = "创建 Agent 授权")
    public Result<AgentAuthorizationResponse> create(@RequestBody CreateAgentAuthorizationRequest request) {
        try {
            return Result.success(authorizationService.create(request));
        } catch (RuntimeException error) {
            return Result.error(errorCode(error.getMessage()), error.getMessage());
        }
    }

    @DeleteMapping("/{authorizationId}")
    @Operation(summary = "撤销 Agent 授权")
    public Result<Void> revoke(@PathVariable UUID authorizationId) {
        try {
            authorizationService.revoke(authorizationId);
            return Result.success();
        } catch (RuntimeException error) {
            return Result.error(errorCode(error.getMessage()), error.getMessage());
        }
    }

    private int errorCode(String message) {
        if ("未登录".equals(message)) {
            return 401;
        }
        if (message != null && message.contains("无权")) {
            return 403;
        }
        if (message != null && message.contains("不存在")) {
            return 404;
        }
        return 400;
    }
}
