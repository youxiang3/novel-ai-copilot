package com.novel.service;

public interface ModelConfigCryptoService {

    String encrypt(String plainText);

    String decrypt(String encryptedText);
}
