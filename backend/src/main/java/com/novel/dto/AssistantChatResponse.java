package com.novel.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class AssistantChatResponse {
    private String reply;
    private List<AssistantAction> actions = new ArrayList<>();
    private List<String> warnings = new ArrayList<>();
    private String rawModelOutput;
}
