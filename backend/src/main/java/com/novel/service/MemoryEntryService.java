package com.novel.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.novel.dto.MemoryEntryRequest;
import com.novel.entity.MemoryEntry;

import java.util.List;
import java.util.UUID;

public interface MemoryEntryService extends IService<MemoryEntry> {
    List<MemoryEntry> listOwned(UUID novelId, String status, String memoryType);

    MemoryEntry getOwnedById(UUID id);

    MemoryEntry create(MemoryEntryRequest request);

    MemoryEntry update(UUID id, MemoryEntryRequest request);

    boolean removeOwnedById(UUID id);
}
