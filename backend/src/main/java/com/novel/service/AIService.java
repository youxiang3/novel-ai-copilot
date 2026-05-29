package com.novel.service;

import reactor.core.publisher.Flux;

public interface AiService {

    String call(String prompt);

    Flux<String> streamCall(String prompt);
}
