package com.novel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@TableName("plot_arc")
public class PlotArc {

    @TableId(type = IdType.AUTO)
    private UUID id;

    private UUID novelId;

    private String arcName;

    private Integer startChapter;

    private Integer endChapter;

    private String emotionalTarget;

    private String coreConflict;

    private String villainGoal;

    private String protagonistGrowth;

    private String climaxEvent;

    private String resolutionType;

    private String status;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
