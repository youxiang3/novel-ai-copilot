package com.novel.config;

import com.novel.common.Result;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Result<Void>> handleRuntimeException(RuntimeException e) {
        log.error("Runtime exception: ", e);
        int code = resolveCode(e.getMessage());
        return ResponseEntity.status(HttpStatus.OK)
                .body(Result.error(code, e.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result<Void>> handleException(Exception e) {
        log.error("Exception: ", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Result.error(500, "服务器内部错误"));
    }

    private int resolveCode(String message) {
        if ("未登录".equals(message)) {
            return 401;
        }
        if (message != null && message.contains("无权")) {
            return 403;
        }
        if (message != null && message.contains("不存在")) {
            return 404;
        }
        return 400;
    }
}
