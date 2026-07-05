package com.novel.dto;

import lombok.Data;

@Data
public class AssistantChatRequest {
    private String message;
    private String workContext;
}
