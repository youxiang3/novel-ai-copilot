package com.novel.dto;

import lombok.Data;

@Data
public class AiCallResult {
    private String content;
    private String modelName;
    private Integer promptTokens;
    private Integer completionTokens;
    private Integer totalTokens;
    private String usageSource;
}
