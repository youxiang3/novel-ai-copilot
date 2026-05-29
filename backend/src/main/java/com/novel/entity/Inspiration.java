package com.novel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@TableName("inspiration")
public class Inspiration {

    @TableId(type = IdType.AUTO)
    private UUID id;

    private UUID novelId;

    private String content;

    private String category;

    private String embedding;

    private String status;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
