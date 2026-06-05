package com.novel.skill;

public interface NovelSkill<I, O> {

    String getName();

    O execute(I input);
}
