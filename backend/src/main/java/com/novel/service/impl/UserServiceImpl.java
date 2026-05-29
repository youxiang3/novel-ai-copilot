package com.novel.service.impl;

import com.novel.config.JwtUtils;
import com.novel.dto.AuthResponse;
import com.novel.dto.LoginRequest;
import com.novel.dto.RegisterRequest;
import com.novel.entity.User;
import com.novel.mapper.UserMapper;
import com.novel.service.UserService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserServiceImpl implements UserService {

    private final UserMapper userMapper;
    private final JwtUtils jwtUtils;
    private final BCryptPasswordEncoder passwordEncoder;

    public UserServiceImpl(UserMapper userMapper, JwtUtils jwtUtils) {
        this.userMapper = userMapper;
        this.jwtUtils = jwtUtils;
        this.passwordEncoder = new BCryptPasswordEncoder();
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        User user = userMapper.selectByUsername(request.getUsername());
        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("用户名或密码错误");
        }

        String token = jwtUtils.generateToken(user.getId(), user.getUsername());
        return buildResponse(user, token);
    }

    @Override
    public AuthResponse register(RegisterRequest request) {
        User existing = userMapper.selectByUsername(request.getUsername());
        if (existing != null) {
            throw new RuntimeException("用户名已存在");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setAvatar(request.getAvatar());
        user.setRole("author");

        userMapper.insert(user);

        String token = jwtUtils.generateToken(user.getId(), user.getUsername());
        return buildResponse(user, token);
    }

    private AuthResponse buildResponse(User user, String token) {
        AuthResponse response = new AuthResponse();
        response.setUserId(user.getId());
        response.setUsername(user.getUsername());
        response.setAvatar(user.getAvatar());
        response.setRole(user.getRole());
        response.setToken(token);
        return response;
    }
}
