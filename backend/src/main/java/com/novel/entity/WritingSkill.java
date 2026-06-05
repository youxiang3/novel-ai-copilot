package com.novel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@TableName("writing_skill")
public class WritingSkill {

    @TableId(type = IdType.AUTO)
    private UUID id;

    private UUID novelId;

    private String skillType;

    private Integer applyChapter;

    private String parameters;

    private String status;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
