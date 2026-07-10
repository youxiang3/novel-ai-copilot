package com.novel.service;

import com.novel.dto.AiCallResult;
import reactor.core.publisher.Flux;

public interface AiService {

    String call(String prompt);

    default AiCallResult callWithUsage(String prompt) {
        String content = call(prompt);
        AiCallResult result = new AiCallResult();
        result.setContent(content);
        result.setTotalTokens(estimateTokenUsage(prompt, content));
        result.setUsageSource("estimated");
        return result;
    }

    Flux<String> streamCall(String prompt);

    private static int estimateTokenUsage(String prompt, String response) {
        int promptLength = prompt == null ? 0 : prompt.length();
        int responseLength = response == null ? 0 : response.length();
        return Math.max(1, (promptLength + responseLength + 3) / 4);
    }
}
