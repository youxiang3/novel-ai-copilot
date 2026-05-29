package com.novel.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.novel.entity.StoryState;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.UUID;

@Mapper
public interface StoryStateMapper extends BaseMapper<StoryState> {

    @Select("SELECT * FROM story_state WHERE novel_id = #{novelId}")
    StoryState selectByNovelId(@Param("novelId") UUID novelId);
}
