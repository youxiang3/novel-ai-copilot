package com.novel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@TableName("emotion_curve")
public class EmotionCurve {

    @TableId(type = IdType.AUTO)
    private UUID id;

    private UUID novelId;

    private UUID chapterId;

    private Integer tension;

    private Integer satisfaction;

    private Integer mystery;

    private Integer despair;

    private Integer warmth;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
