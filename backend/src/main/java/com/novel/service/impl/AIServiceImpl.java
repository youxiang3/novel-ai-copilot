package com.novel.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.config.UserContext;
import com.novel.entity.UserModelConfig;
import com.novel.mapper.UserModelConfigMapper;
import com.novel.service.AiService;
import com.novel.service.ModelConfigCryptoService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.ChatClient;
import org.springframework.ai.chat.ChatResponse;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.scheduler.Schedulers;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
public class AiServiceImpl implements AiService {

    private final ChatClient chatClient;
    private final UserModelConfigMapper modelConfigMapper;
    private final ModelConfigCryptoService cryptoService;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public AiServiceImpl(ChatClient chatClient, UserModelConfigMapper modelConfigMapper, ModelConfigCryptoService cryptoService, ObjectMapper objectMapper) {
        this.chatClient = chatClient;
        this.modelConfigMapper = modelConfigMapper;
        this.cryptoService = cryptoService;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(20))
                .build();
    }

    @Override
    public String call(String prompt) {
        log.info("Calling AI with prompt (sync): {}", prompt.length() > 100 ? prompt.substring(0, 100) + "..." : prompt);

        UserModelConfig config = currentModelConfig();
        if (hasUsableCustomConfig(config)) {
            return callOpenAiCompatible(prompt, config);
        }
        
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

        UserModelConfig config = currentModelConfig();
        if (hasUsableCustomConfig(config)) {
            return streamOpenAiCompatible(prompt, config);
        }
        
        Message message = new UserMessage(prompt);
        Prompt aiPrompt = new Prompt(List.of(message));
        
        return chatClient.stream(aiPrompt)
                .map(chatResponse -> chatResponse.getResult().getOutput().getContent());
    }

    private UserModelConfig currentModelConfig() {
        UUID userId = UserContext.getUserId();
        if (userId == null) {
            return null;
        }
        return modelConfigMapper.selectActiveByUserId(userId);
    }

    private boolean hasUsableCustomConfig(UserModelConfig config) {
        return config != null
                && config.getBaseUrl() != null
                && !config.getBaseUrl().isBlank()
                && config.getModel() != null
                && !config.getModel().isBlank()
                && config.getApiKeyEncrypted() != null
                && !config.getApiKeyEncrypted().isBlank();
    }

    private String callOpenAiCompatible(String prompt, UserModelConfig config) {
        try {
            String apiKey = cryptoService.decrypt(config.getApiKeyEncrypted());
            String body = objectMapper.writeValueAsString(Map.of(
                    "model", config.getModel(),
                    "messages", List.of(Map.of("role", "user", "content", prompt)),
                    "temperature", 0.7,
                    "stream", false
            ));

            HttpRequest request = baseRequest(config, apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new RuntimeException("模型调用失败: HTTP " + response.statusCode() + " " + response.body());
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode content = root.path("choices").path(0).path("message").path("content");
            if (content.isMissingNode() || content.isNull()) {
                throw new RuntimeException("模型返回格式异常");
            }
            return content.asText();
        } catch (Exception e) {
            throw new RuntimeException("模型调用失败: " + e.getMessage(), e);
        }
    }

    private Flux<String> streamOpenAiCompatible(String prompt, UserModelConfig config) {
        return Flux.<String>create(sink -> {
            try {
                String apiKey = cryptoService.decrypt(config.getApiKeyEncrypted());
                String body = objectMapper.writeValueAsString(Map.of(
                        "model", config.getModel(),
                        "messages", List.of(Map.of("role", "user", "content", prompt)),
                        "temperature", 0.7,
                        "stream", true
                ));

                HttpRequest request = baseRequest(config, apiKey)
                        .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
                if (response.statusCode() < 200 || response.statusCode() >= 300) {
                    sink.error(new RuntimeException("模型调用失败: HTTP " + response.statusCode() + " " + response.body()));
                    return;
                }

                for (String line : response.body().split("\\R")) {
                    if (!line.startsWith("data:")) {
                        continue;
                    }
                    String data = line.substring(5).trim();
                    if ("[DONE]".equals(data)) {
                        break;
                    }
                    String chunk = extractStreamChunk(data);
                    if (!chunk.isEmpty()) {
                        sink.next(chunk);
                    }
                }
                sink.complete();
            } catch (Exception e) {
                sink.error(e);
            }
        }).subscribeOn(Schedulers.boundedElastic());
    }

    private HttpRequest.Builder baseRequest(UserModelConfig config, String apiKey) {
        String baseUrl = config.getBaseUrl().replaceAll("/+$", "");
        return HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/chat/completions"))
                .timeout(Duration.ofMinutes(2))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey);
    }

    private String extractStreamChunk(String data) {
        try {
            JsonNode root = objectMapper.readTree(data);
            JsonNode content = root.path("choices").path(0).path("delta").path("content");
            return content.isMissingNode() || content.isNull() ? "" : content.asText();
        } catch (Exception e) {
            log.debug("Ignoring malformed stream chunk: {}", data);
            return "";
        }
    }
}
