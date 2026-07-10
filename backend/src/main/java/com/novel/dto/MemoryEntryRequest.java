package com.novel.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class MemoryEntryRequest {
    private UUID novelId;
    private UUID sourceChapterId;
    private String memoryType;
    private String title;
    private String content;
    private String status;
    private BigDecimal confidence;
    private String sourceText;
    private String createdBy;
}
