package com.novel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@TableName("work_snapshot_version")
public class WorkSnapshotVersion {

    @TableId(type = IdType.AUTO)
    private UUID id;

    private UUID userId;

    private UUID novelId;

    private String frontendWorkId;

    private String title;

    private String payload;

    private String chaptersPayload;

    private String globalOutline;

    private Integer chapterCount;

    private Integer wordCount;

    private LocalDateTime createdAt;
}
