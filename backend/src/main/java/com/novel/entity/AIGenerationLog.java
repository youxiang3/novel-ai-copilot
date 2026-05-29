package com.novel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@TableName("ai_generation_log")
public class AIGenerationLog {

    @TableId(type = IdType.AUTO)
    private UUID id;

    private UUID novelId;

    private UUID chapterId;

    private String workflowType;

    private String promptSnapshot;

    private String responseSnapshot;

    private String modelName;

    private Integer tokenUsage;

    private LocalDateTime createTime;
}
