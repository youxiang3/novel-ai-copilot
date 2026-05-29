package com.novel.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.novel.entity.Chapter;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.UUID;

@Mapper
public interface ChapterMapper extends BaseMapper<Chapter> {

    @Select("SELECT * FROM chapter WHERE novel_id = #{novelId} ORDER BY chapter_number")
    List<Chapter> selectByNovelId(@Param("novelId") UUID novelId);

    @Select("SELECT * FROM chapter WHERE novel_id = #{novelId} AND chapter_number < #{chapterNumber} ORDER BY chapter_number DESC LIMIT #{limit}")
    List<Chapter> selectPreviousChapters(@Param("novelId") UUID novelId, @Param("chapterNumber") Integer chapterNumber, @Param("limit") Integer limit);
}
