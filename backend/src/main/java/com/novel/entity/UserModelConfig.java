package com.novel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@TableName("user_model_config")
public class UserModelConfig {

    @TableId(type = IdType.AUTO)
    private UUID id;

    private UUID userId;

    private String provider;

    private String baseUrl;

    private String model;

    private String apiKeyEncrypted;

    private Boolean active;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
