package com.novel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@TableName("novel")
public class Novel {

    @TableId(type = IdType.AUTO)
    private UUID id;

    private UUID userId;

    private String title;

    private String globalOutline;

    private String authorStylePrompt;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
