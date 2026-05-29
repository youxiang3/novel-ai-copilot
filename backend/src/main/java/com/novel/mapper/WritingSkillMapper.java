package com.novel.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.novel.entity.WritingSkill;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.UUID;

@Mapper
public interface WritingSkillMapper extends BaseMapper<WritingSkill> {

    @Select("SELECT * FROM writing_skill WHERE novel_id = #{novelId} ORDER BY create_time DESC")
    List<WritingSkill> selectByNovelId(@Param("novelId") UUID novelId);

    @Select("SELECT * FROM writing_skill WHERE novel_id = #{novelId} AND status = 'active' ORDER BY apply_chapter")
    List<WritingSkill> selectActiveByNovelId(@Param("novelId") UUID novelId);
}
