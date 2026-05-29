package com.novel.service.impl;

import com.novel.service.AiService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.ChatClient;
import org.springframework.ai.chat.ChatResponse;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.List;

@Slf4j
@Service
public class AiServiceImpl implements AiService {

    private final ChatClient chatClient;

    public AiServiceImpl(ChatClient chatClient) {
        this.chatClient = chatClient;
    }

    @Override
    public String call(String prompt) {
        log.info("Calling AI with prompt (sync): {}", prompt.length() > 100 ? prompt.substring(0, 100) + "..." : prompt);
        
        Message message = new UserMessage(prompt);
        Prompt aiPrompt = new Prompt(List.of(message));
        
        ChatResponse response = chatClient.call(aiPrompt);
        String result = response.getResult().getOutput().getContent();
        
        log.info("AI response received (sync), length: {}", result.length());
        return result;
    }

    @Override
    public Flux<String> streamCall(String prompt) {
        log.info("Calling AI with prompt (stream): {}", prompt.length() > 100 ? prompt.substring(0, 100) + "..." : prompt);
        
        Message message = new UserMessage(prompt);
        Prompt aiPrompt = new Prompt(List.of(message));
        
        return chatClient.stream(aiPrompt)
                .map(chatResponse -> chatResponse.getResult().getOutput().getContent());
    }
}
