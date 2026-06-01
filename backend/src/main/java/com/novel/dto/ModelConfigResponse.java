package com.novel.dto;

import lombok.Data;

@Data
public class ModelConfigResponse {
    private String provider;
    private String baseUrl;
    private String model;
    private Boolean apiKeyConfigured;
}
