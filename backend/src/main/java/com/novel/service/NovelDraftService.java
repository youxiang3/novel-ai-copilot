package com.novel.service;

import com.novel.dto.NovelDraftRequest;
import com.novel.dto.NovelDraftResponse;
import com.novel.entity.Novel;

public interface NovelDraftService {

    NovelDraftResponse createDraft(NovelDraftRequest request);

    Novel confirmDraft(NovelDraftResponse draft);
}
