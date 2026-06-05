package com.novel.agent;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.dto.AgentTaskLogResponse;
import com.novel.agent.dto.AgentTaskResponse;
import com.novel.agent.dto.AgentTaskStepResponse;
import com.novel.config.UserContext;
import com.novel.entity.AgentExecutionLog;
import com.novel.entity.AgentTask;
import com.novel.entity.AgentTaskStep;
import com.novel.mapper.AgentExecutionLogMapper;
import com.novel.mapper.AgentTaskMapper;
import com.novel.mapper.AgentTaskStepMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AgentTaskService {

    private final AgentTaskMapper taskMapper;
    private final AgentTaskStepMapper stepMapper;
    private final AgentExecutionLogMapper logMapper;
    private final ObjectMapper objectMapper;

    public AgentTask createTask(AgentType agentType, String title, Map<String, Object> input) {
        AgentTask task = new AgentTask();
        task.setId(UUID.randomUUID());
        task.setUserId(requireUserId());
        task.setAgentType(agentType.name());
        task.setTitle(title);
        task.setStatus(AgentTaskStatus.PENDING.name());
        task.setInputJson(toJson(input));
        taskMapper.insert(task);
        return task;
    }

    public AgentTask getOwnedTask(UUID taskId) {
        AgentTask task = taskMapper.selectById(taskId);
        if (task == null) {
            throw new RuntimeException("任务不存在");
        }
        UUID userId = requireUserId();
        if (!userId.equals(task.getUserId())) {
            throw new RuntimeException("无权访问该任务");
        }
        return task;
    }

    public void updateStatus(AgentTask task, AgentTaskStatus status) {
        task.setStatus(status.name());
        if (status == AgentTaskStatus.SUCCEEDED || status == AgentTaskStatus.FAILED || status == AgentTaskStatus.CANCELLED) {
            task.setFinishedAt(LocalDateTime.now());
        }
        taskMapper.updateById(task);
    }

    public void finishSuccess(AgentTask task, Map<String, Object> result) {
        task.setResultJson(toJson(result));
        updateStatus(task, AgentTaskStatus.SUCCEEDED);
    }

    public void finishFailed(AgentTask task, String errorMessage) {
        task.setErrorMessage(errorMessage);
        updateStatus(task, AgentTaskStatus.FAILED);
    }

    public AgentTaskStep startStep(AgentTask task, String stepKey, String stepName, Object input) {
        AgentTaskStep step = new AgentTaskStep();
        step.setId(UUID.randomUUID());
        step.setTaskId(task.getId());
        step.setStepKey(stepKey);
        step.setStepName(stepName);
        step.setStatus(AgentTaskStepStatus.RUNNING.name());
        step.setInputJson(toJson(input));
        step.setStartedAt(LocalDateTime.now());
        stepMapper.insert(step);
        return step;
    }

    public void finishStep(AgentTaskStep step, Object output) {
        step.setStatus(AgentTaskStepStatus.SUCCEEDED.name());
        step.setOutputJson(toJson(output));
        step.setFinishedAt(LocalDateTime.now());
        stepMapper.updateById(step);
    }

    public void failStep(AgentTaskStep step, String errorMessage) {
        step.setStatus(AgentTaskStepStatus.FAILED.name());
        step.setErrorMessage(errorMessage);
        step.setFinishedAt(LocalDateTime.now());
        stepMapper.updateById(step);
    }

    public void skipStep(AgentTask task, String stepKey, String stepName, String reason) {
        AgentTaskStep step = new AgentTaskStep();
        step.setId(UUID.randomUUID());
        step.setTaskId(task.getId());
        step.setStepKey(stepKey);
        step.setStepName(stepName);
        step.setStatus(AgentTaskStepStatus.SKIPPED.name());
        step.setOutputJson(toJson(Map.of("reason", reason)));
        step.setStartedAt(LocalDateTime.now());
        step.setFinishedAt(LocalDateTime.now());
        stepMapper.insert(step);
    }

    public void log(AgentTask task, AgentLogLevel level, String message, Object metadata) {
        AgentExecutionLog log = new AgentExecutionLog();
        log.setId(UUID.randomUUID());
        log.setTaskId(task.getId());
        log.setLevel(level.name());
        log.setMessage(message);
        log.setMetadataJson(metadata == null ? null : toJson(metadata));
        logMapper.insert(log);
    }

    public AgentTaskResponse getTaskResponse(UUID taskId) {
        AgentTask task = getOwnedTask(taskId);
        return toResponse(task);
    }

    public List<AgentTaskLogResponse> getLogs(UUID taskId) {
        AgentTask task = getOwnedTask(taskId);
        LambdaQueryWrapper<AgentExecutionLog> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AgentExecutionLog::getTaskId, task.getId()).orderByAsc(AgentExecutionLog::getCreatedAt);
        return logMapper.selectList(wrapper).stream().map(this::toLogResponse).toList();
    }

    public AgentTaskResponse cancel(UUID taskId) {
        AgentTask task = getOwnedTask(taskId);
        if (isTerminal(task.getStatus())) {
            AgentTaskResponse response = toResponse(task);
            response.setMessage("任务已经结束，无法取消");
            return response;
        }
        updateStatus(task, AgentTaskStatus.CANCELLED);
        log(task, AgentLogLevel.WARN, "任务已被用户取消", null);
        AgentTaskResponse response = toResponse(task);
        response.setMessage("任务已标记为 CANCELLED");
        return response;
    }

    public boolean isCancelled(AgentTask task) {
        AgentTask latest = taskMapper.selectById(task.getId());
        return latest != null && AgentTaskStatus.CANCELLED.name().equals(latest.getStatus());
    }

    public AgentTaskResponse toResponse(AgentTask task) {
        AgentTaskResponse response = new AgentTaskResponse();
        response.setTaskId(task.getId());
        response.setAgentType(task.getAgentType());
        response.setStatus(task.getStatus());
        response.setInput(parseMap(task.getInputJson()));
        response.setResult(parseMap(task.getResultJson()));
        response.setErrorMessage(task.getErrorMessage());

        LambdaQueryWrapper<AgentTaskStep> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(AgentTaskStep::getTaskId, task.getId()).orderByAsc(AgentTaskStep::getCreatedAt);
        response.setSteps(stepMapper.selectList(wrapper).stream().map(this::toStepResponse).toList());
        return response;
    }

    public String toJson(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException error) {
            throw new RuntimeException("JSON 序列化失败");
        }
    }

    private Map<String, Object> parseMap(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ignored) {
            return Map.of("raw", json);
        }
    }

    private AgentTaskStepResponse toStepResponse(AgentTaskStep step) {
        AgentTaskStepResponse response = new AgentTaskStepResponse();
        response.setStepId(step.getId());
        response.setStepKey(step.getStepKey());
        response.setStepName(step.getStepName());
        response.setStatus(step.getStatus());
        response.setErrorMessage(step.getErrorMessage());
        response.setStartedAt(step.getStartedAt());
        response.setFinishedAt(step.getFinishedAt());
        return response;
    }

    private AgentTaskLogResponse toLogResponse(AgentExecutionLog log) {
        AgentTaskLogResponse response = new AgentTaskLogResponse();
        response.setLogId(log.getId());
        response.setLevel(log.getLevel());
        response.setMessage(log.getMessage());
        response.setMetadataJson(log.getMetadataJson());
        response.setCreatedAt(log.getCreatedAt());
        return response;
    }

    private boolean isTerminal(String status) {
        return AgentTaskStatus.SUCCEEDED.name().equals(status)
                || AgentTaskStatus.FAILED.name().equals(status)
                || AgentTaskStatus.CANCELLED.name().equals(status);
    }

    private UUID requireUserId() {
        UUID userId = UserContext.getUserId();
        if (userId == null) {
            throw new RuntimeException("未登录");
        }
        return userId;
    }
}
