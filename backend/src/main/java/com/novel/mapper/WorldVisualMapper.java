package com.novel.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.novel.entity.WorldVisual;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.UUID;

@Mapper
public interface WorldVisualMapper extends BaseMapper<WorldVisual> {

    @Select("SELECT * FROM world_visual WHERE novel_id = #{novelId} ORDER BY create_time DESC")
    List<WorldVisual> selectByNovelId(@Param("novelId") UUID novelId);

    @Select("SELECT * FROM world_visual WHERE novel_id = #{novelId} AND category = #{category}")
    List<WorldVisual> selectByNovelIdAndCategory(@Param("novelId") UUID novelId, @Param("category") String category);
}
