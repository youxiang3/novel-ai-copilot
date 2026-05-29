package com.novel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@TableName("chapter")
public class Chapter {

    @TableId(type = IdType.AUTO)
    private UUID id;

    private UUID novelId;

    private Integer chapterNumber;

    private String title;

    private String content;

    private Integer wordCount;

    private String status;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
