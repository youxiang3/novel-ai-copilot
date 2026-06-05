package com.novel.controller;

import com.novel.common.Result;
import com.novel.config.UserContext;
import com.novel.dto.ModelConfigRequest;
import com.novel.dto.ModelConfigResponse;
import com.novel.entity.UserModelConfig;
import com.novel.mapper.UserModelConfigMapper;
import com.novel.service.AiService;
import com.novel.service.ModelConfigCryptoService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/model-config")
@RequiredArgsConstructor
public class ModelConfigController {

    private final UserModelConfigMapper modelConfigMapper;
    private final ModelConfigCryptoService cryptoService;
    private final AiService aiService;
    private final ObjectMapper objectMapper;

    @GetMapping
    public Result<ModelConfigResponse> getCurrent() {
        UUID userId = requireUser();
        UserModelConfig config = modelConfigMapper.selectActiveByUserId(userId);
        return Result.success(toResponse(config));
    }

    @PutMapping
    public Result<ModelConfigResponse> save(@RequestBody ModelConfigRequest request) {
        UUID userId = requireUser();
        UserModelConfig config = modelConfigMapper.selectActiveByUserId(userId);
        boolean isNew = config == null;
        LocalDateTime now = LocalDateTime.now();

        if (isNew) {
            config = new UserModelConfig();
            config.setId(UUID.randomUUID());
            config.setUserId(userId);
            config.setActive(true);
            config.setCreateTime(now);
        }

        config.setProvider(defaultIfBlank(request.getProvider(), "deepseek"));
        config.setBaseUrl(defaultIfBlank(request.getBaseUrl(), "https://api.deepseek.com/v1"));
        config.setModel(defaultIfBlank(request.getModel(), "deepseek-chat"));
        config.setUpdateTime(now);
        if (request.getApiKey() != null && !request.getApiKey().isBlank()) {
            config.setApiKeyEncrypted(cryptoService.encrypt(request.getApiKey()));
        }

        if (isNew) {
            modelConfigMapper.insert(config);
        } else {
            modelConfigMapper.updateById(config);
        }

        return Result.success(toResponse(config));
    }

    @PostMapping("/test")
    public Result<String> test(@RequestBody(required = false) ModelConfigRequest request) {
        if (request != null && request.getApiKey() != null && !request.getApiKey().isBlank()) {
            return Result.success(testTransient(request));
        }

        requireUser();
        String result = aiService.call("请只回复：模型连接成功");
        return Result.success(result);
    }

    private String testTransient(ModelConfigRequest request) {
        try {
            String baseUrl = defaultIfBlank(request.getBaseUrl(), "https://api.deepseek.com/v1").replaceAll("/+$", "");
            String model = defaultIfBlank(request.getModel(), "deepseek-chat");
            String body = objectMapper.writeValueAsString(Map.of(
                    "model", model,
                    "messages", List.of(Map.of("role", "user", "content", "请只回复：模型连接成功")),
                    "temperature", 0.2,
                    "stream", false
            ));

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/chat/completions"))
                    .timeout(Duration.ofSeconds(30))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + request.getApiKey())
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = HttpClient.newHttpClient().send(httpRequest, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return "测试失败：HTTP " + response.statusCode();
            }

            JsonNode content = objectMapper.readTree(response.body()).path("choices").path(0).path("message").path("content");
            return content.isMissingNode() || content.isNull() ? "模型连接成功，但返回格式不是标准 chat/completions" : content.asText();
        } catch (Exception e) {
            return "测试失败：" + e.getMessage();
        }
    }

    private UUID requireUser() {
        UUID userId = UserContext.getUserId();
        if (userId == null) {
            throw new RuntimeException("未登录");
        }
        return userId;
    }

    private ModelConfigResponse toResponse(UserModelConfig config) {
        ModelConfigResponse response = new ModelConfigResponse();
        if (config == null) {
            response.setProvider("deepseek");
            response.setBaseUrl("https://api.deepseek.com/v1");
            response.setModel("deepseek-chat");
            response.setApiKeyConfigured(false);
            return response;
        }
        response.setProvider(config.getProvider());
        response.setBaseUrl(config.getBaseUrl());
        response.setModel(config.getModel());
        response.setApiKeyConfigured(config.getApiKeyEncrypted() != null && !config.getApiKeyEncrypted().isBlank());
        return response;
    }

    private String defaultIfBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
