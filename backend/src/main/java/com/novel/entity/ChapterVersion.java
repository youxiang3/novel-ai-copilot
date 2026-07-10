package com.novel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@TableName("chapter_version")
public class ChapterVersion {

    @TableId(type = IdType.AUTO)
    private UUID id;

    private UUID userId;
    private UUID novelId;
    private UUID chapterId;
    private Integer versionNumber;
    private String title;
    private String content;
    private Integer wordCount;
    private String source;
    private String changeSummary;
    private UUID parentVersionId;
    private UUID aiGenerationLogId;
    private LocalDateTime createdAt;
}
