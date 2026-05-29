package com.novel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@TableName("foreshadowing")
public class Foreshadowing {

    @TableId(type = IdType.AUTO)
    private UUID id;

    private UUID novelId;

    private Integer setupChapter;

    private Integer payoffChapter;

    private String content;

    private String status;

    private Integer importance;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
