package com.novel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@TableName("world_visual")
public class WorldVisual {

    @TableId(type = IdType.AUTO)
    private UUID id;

    private UUID novelId;

    private String category;

    private String name;

    private String description;

    private String imageUrl;

    private UUID loreId;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
