package com.novel.dto;

import com.novel.entity.AIGenerationLog;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class RewriteLogListResponse {
    private List<AIGenerationLog> logs;
    private Integer total;
    private Integer offset;
    private Integer limit;
    private Integer totalTokenUsage;
    private LocalDateTime latestCreateTime;
}
