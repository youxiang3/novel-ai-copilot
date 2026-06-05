package com.novel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@TableName("agent_task_step")
public class AgentTaskStep {

    @TableId(type = IdType.AUTO)
    private UUID id;

    private UUID taskId;

    private String stepKey;

    private String stepName;

    private String status;

    private String inputJson;

    private String outputJson;

    private String errorMessage;

    private LocalDateTime startedAt;

    private LocalDateTime finishedAt;

    private LocalDateTime createdAt;
}
