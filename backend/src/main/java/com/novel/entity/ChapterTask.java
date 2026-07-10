package com.novel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@TableName("chapter_task")
public class ChapterTask {
    @TableId(type = IdType.AUTO)
    private UUID id;
    private UUID userId;
    private UUID novelId;
    private UUID chapterId;
    private Integer versionNumber;
    private UUID parentTaskId;
    private String taskStatus;
    private String titleCandidatesJson;
    private String coreGoal;
    private String emotionGoal;
    private Integer targetWords;
    private String storyline;
    private String volumeNode;
    private String mustDoJson;
    private String forbiddenJson;
    private String rhythmStepsJson;
    private String source;
    private String sourceBasisJson;
    @TableField("is_current")
    private Boolean current;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
