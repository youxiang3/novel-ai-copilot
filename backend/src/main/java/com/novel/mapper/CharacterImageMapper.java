package com.novel.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.novel.entity.CharacterImage;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.UUID;

@Mapper
public interface CharacterImageMapper extends BaseMapper<CharacterImage> {

    @Select("SELECT * FROM character_image WHERE novel_id = #{novelId} ORDER BY create_time DESC")
    List<CharacterImage> selectByNovelId(@Param("novelId") UUID novelId);

    @Select("SELECT * FROM character_image WHERE character_id = #{characterId} AND is_primary = true")
    CharacterImage selectPrimaryByCharacterId(@Param("characterId") UUID characterId);
}
