package com.novel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@TableName("memory_summary")
public class MemorySummary {

    @TableId(type = IdType.AUTO)
    private UUID id;

    private UUID novelId;

    private UUID chapterId;

    private String summaryContent;

    private String embedding;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
