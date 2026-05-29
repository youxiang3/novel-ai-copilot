package com.novel.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.novel.entity.CharacterRelationship;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.UUID;

@Mapper
public interface CharacterRelationshipMapper extends BaseMapper<CharacterRelationship> {

    @Select("SELECT * FROM character_relationship WHERE novel_id = #{novelId}")
    List<CharacterRelationship> selectByNovelId(@Param("novelId") UUID novelId);

    @Select("SELECT * FROM character_relationship WHERE novel_id = #{novelId} AND character_a = #{characterA} AND character_b = #{characterB}")
    CharacterRelationship selectByCharacters(@Param("novelId") UUID novelId, @Param("characterA") UUID characterA, @Param("characterB") UUID characterB);
}
