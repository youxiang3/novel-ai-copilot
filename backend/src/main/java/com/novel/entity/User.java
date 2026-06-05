package com.novel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@TableName("\"user\"")
public class User {

    @TableId(type = IdType.AUTO)
    private UUID id;

    private String username;

    private String password;

    private String avatar;

    private String role;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
