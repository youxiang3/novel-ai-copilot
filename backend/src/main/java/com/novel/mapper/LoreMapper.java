package com.novel.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.novel.entity.Lore;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.UUID;

@Mapper
public interface LoreMapper extends BaseMapper<Lore> {

    @Select("SELECT * FROM lore WHERE novel_id = #{novelId}")
    List<Lore> selectByNovelId(@Param("novelId") UUID novelId);

    @Select("SELECT * FROM lore WHERE novel_id = #{novelId} AND category = #{category}")
    List<Lore> selectByNovelIdAndCategory(@Param("novelId") UUID novelId, @Param("category") String category);
}
