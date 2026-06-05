package com.novel.agent;

import com.novel.agent.dto.AgentTaskLogResponse;
import com.novel.agent.dto.AgentTaskResponse;
import com.novel.agent.dto.CreateNovelAgentTaskRequest;
import com.novel.common.Result;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/agent-tasks")
@RequiredArgsConstructor
@Tag(name = "Agent 任务", description = "自动创作代理任务接口")
public class AgentTaskController {

    private final AgentRunnerService agentRunnerService;
    private final AgentTaskService taskService;

    @PostMapping("/novel-creation")
    @Operation(summary = "创建小说代理任务")
    public Result<AgentTaskResponse> createNovelTask(@RequestBody CreateNovelAgentTaskRequest request) {
        try {
            return Result.success(agentRunnerService.startNovelCreation(request));
        } catch (RuntimeException error) {
            return Result.error(errorCode(error.getMessage()), error.getMessage());
        }
    }

    @GetMapping("/{taskId}")
    @Operation(summary = "查询 Agent 任务状态")
    public Result<AgentTaskResponse> getTask(@PathVariable UUID taskId) {
        try {
            return Result.success(taskService.getTaskResponse(taskId));
        } catch (RuntimeException error) {
            return Result.error(errorCode(error.getMessage()), error.getMessage());
        }
    }

    @GetMapping("/{taskId}/logs")
    @Operation(summary = "查询 Agent 任务日志")
    public Result<List<AgentTaskLogResponse>> getLogs(@PathVariable UUID taskId) {
        try {
            return Result.success(taskService.getLogs(taskId));
        } catch (RuntimeException error) {
            return Result.error(errorCode(error.getMessage()), error.getMessage());
        }
    }

    @PostMapping("/{taskId}/cancel")
    @Operation(summary = "取消 Agent 任务")
    public Result<AgentTaskResponse> cancel(@PathVariable UUID taskId) {
        try {
            return Result.success(taskService.cancel(taskId));
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
