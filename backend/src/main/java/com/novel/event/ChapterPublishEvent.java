package com.novel.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.util.UUID;

@Getter
public class ChapterPublishEvent extends ApplicationEvent {

    private final UUID chapterId;
    private final UUID novelId;
    private final Integer chapterNumber;
    private final String content;

    public ChapterPublishEvent(Object source, UUID chapterId, UUID novelId, Integer chapterNumber, String content) {
        super(source);
        this.chapterId = chapterId;
        this.novelId = novelId;
        this.chapterNumber = chapterNumber;
        this.content = content;
    }
}
