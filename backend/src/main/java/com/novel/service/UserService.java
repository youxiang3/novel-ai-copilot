package com.novel.service;

import com.novel.dto.AuthResponse;
import com.novel.dto.LoginRequest;
import com.novel.dto.RegisterRequest;

public interface UserService {

    AuthResponse login(LoginRequest request);

    AuthResponse register(RegisterRequest request);
}
