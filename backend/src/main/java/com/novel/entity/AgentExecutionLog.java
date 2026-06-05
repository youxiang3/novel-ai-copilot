package com.novel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@TableName("agent_execution_log")
public class AgentExecutionLog {

    @TableId(type = IdType.AUTO)
    private UUID id;

    private UUID taskId;

    private String level;

    private String message;

    private String metadataJson;

    private LocalDateTime createdAt;
}
