package com.novel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@TableName("agent_task")
public class AgentTask {

    @TableId(type = IdType.AUTO)
    private UUID id;

    private UUID userId;

    private String agentType;

    private String title;

    private String status;

    private String inputJson;

    private String resultJson;

    private String errorMessage;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private LocalDateTime finishedAt;
}
