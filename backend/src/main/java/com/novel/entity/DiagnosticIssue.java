package com.novel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@TableName("diagnostic_issue")
public class DiagnosticIssue {
    @TableId(type = IdType.AUTO)
    private UUID id;
    private UUID runId;
    private UUID userId;
    private UUID novelId;
    private UUID chapterId;
    private String issueType;
    private String severity;
    private String issueStatus;
    private String positionText;
    private String title;
    private String description;
    private String evidence;
    private String reason;
    private String suggestion;
    private String dimension;
    private Integer priority;
    private BigDecimal confidence;
    private String source;
    private LocalDateTime resolvedAt;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
