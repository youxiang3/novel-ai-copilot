package com.novel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@TableName(value = "story_state", autoResultMap = true)
public class StoryState {

    @TableId(type = IdType.AUTO)
    private UUID id;

    private UUID novelId;

    private String currentTimeline;

    @TableField(typeHandler = JacksonTypeHandler.class)
    private Map<String, Object> keyEvents;

    @TableField(typeHandler = JacksonTypeHandler.class)
    private Map<String, Object> protagonistStatus;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
