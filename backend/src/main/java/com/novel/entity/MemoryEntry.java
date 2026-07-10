package com.novel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@TableName("memory_entry")
public class MemoryEntry {

    @TableId(type = IdType.AUTO)
    private UUID id;

    private UUID userId;
    private UUID novelId;
    private UUID sourceChapterId;
    private String memoryType;
    private String title;
    private String content;
    private String status;
    private BigDecimal confidence;
    private String sourceText;
    private String createdBy;
    private LocalDateTime reviewedAt;
    private LocalDateTime staleAt;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
