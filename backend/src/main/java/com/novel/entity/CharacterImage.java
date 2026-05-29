package com.novel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@TableName("character_image")
public class CharacterImage {

    @TableId(type = IdType.AUTO)
    private UUID id;

    private UUID novelId;

    private UUID characterId;

    private String imageUrl;

    private String style;

    private String pose;

    private Boolean isPrimary;

    private String embedding;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
