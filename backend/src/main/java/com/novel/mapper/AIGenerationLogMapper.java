package com.novel.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.novel.entity.AIGenerationLog;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.UUID;

@Mapper
public interface AIGenerationLogMapper extends BaseMapper<AIGenerationLog> {

    @Select("SELECT * FROM ai_generation_log WHERE novel_id = #{novelId} ORDER BY create_time DESC")
    List<AIGenerationLog> selectByNovelId(@Param("novelId") UUID novelId);

    @Select("SELECT * FROM ai_generation_log WHERE novel_id = #{novelId} AND workflow_type = #{workflowType} ORDER BY create_time DESC")
    List<AIGenerationLog> selectByNovelIdAndWorkflow(@Param("novelId") UUID novelId, @Param("workflowType") String workflowType);
}
