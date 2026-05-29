package com.novel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@TableName("lore")
public class Lore {

    @TableId(type = IdType.AUTO)
    private UUID id;

    private UUID novelId;

    private String category;

    private String name;

    private String content;

    private String embedding;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
