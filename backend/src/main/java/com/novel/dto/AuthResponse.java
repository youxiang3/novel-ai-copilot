package com.novel.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class AuthResponse {
    private UUID userId;
    private String username;
    private String avatar;
    private String role;
    private String token;
}
