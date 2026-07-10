package com.novel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@TableName("chapter_workflow_state")
public class ChapterWorkflowState {
    @TableId(type = IdType.AUTO)
    private UUID id;
    private UUID userId;
    private UUID novelId;
    private UUID chapterId;
    private Integer versionNumber;
    private UUID parentStateId;
    private String previousStage;
    private String stage;
    private String transitionSource;
    private String reason;
    private String referenceType;
    private UUID referenceId;
    @TableField("is_current")
    private Boolean current;
    private LocalDateTime createTime;
}
