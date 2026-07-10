package com.novel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@TableName("diagnostic_run")
public class DiagnosticRun {
    @TableId(type = IdType.AUTO)
    private UUID id;
    private UUID userId;
    private UUID novelId;
    private UUID chapterId;
    private String runType;
    private String mode;
    private String status;
    private String title;
    private String summary;
    private Integer overallScore;
    private Integer issueCount;
    private Integer highCount;
    private Integer mediumCount;
    private Integer lowCount;
    private String inputSnapshot;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
