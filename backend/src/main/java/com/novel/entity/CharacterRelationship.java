package com.novel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@TableName("character_relationship")
public class CharacterRelationship {

    @TableId(type = IdType.AUTO)
    private UUID id;

    private UUID novelId;

    private UUID characterA;

    private UUID characterB;

    private Integer trustValue;

    private Integer hatredValue;

    private Integer intimacyValue;

    private Integer fearValue;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
