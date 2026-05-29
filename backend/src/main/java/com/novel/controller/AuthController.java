package com.novel.controller;

import com.novel.common.Result;
import com.novel.dto.AuthResponse;
import com.novel.dto.LoginRequest;
import com.novel.dto.RegisterRequest;
import com.novel.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "认证管理", description = "用户登录/注册接口")
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/login")
    @Operation(summary = "用户登录")
    public Result<AuthResponse> login(@RequestBody LoginRequest request) {
        AuthResponse response = userService.login(request);
        return Result.success(response);
    }

    @PostMapping("/register")
    @Operation(summary = "用户注册")
    public Result<AuthResponse> register(@RequestBody RegisterRequest request) {
        AuthResponse response = userService.register(request);
        return Result.success(response);
    }
}
