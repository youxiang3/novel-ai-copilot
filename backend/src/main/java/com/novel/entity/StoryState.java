package com.novel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@TableName("story_state")
public class StoryState {

    @TableId(type = IdType.AUTO)
    private UUID id;

    private UUID novelId;

    private String currentTimeline;

    private String keyEvents;

    private String protagonistStatus;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
