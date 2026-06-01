package com.novel.dto;

import lombok.Data;

@Data
public class ModelConfigRequest {
    private String provider;
    private String baseUrl;
    private String model;
    private String apiKey;
}
