package com.novel.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.novel.entity.MemorySummary;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.UUID;

@Mapper
public interface MemorySummaryMapper extends BaseMapper<MemorySummary> {

    @Select("SELECT * FROM memory_summary WHERE novel_id = #{novelId} ORDER BY create_time")
    List<MemorySummary> selectByNovelId(@Param("novelId") UUID novelId);

    @Select("SELECT ms.* FROM memory_summary ms " +
            "JOIN chapter c ON ms.chapter_id = c.id " +
            "WHERE ms.novel_id = #{novelId} AND c.chapter_number < #{chapterNumber} " +
            "ORDER BY c.chapter_number DESC LIMIT #{limit}")
    List<MemorySummary> selectPreviousSummaries(@Param("novelId") UUID novelId, @Param("chapterNumber") Integer chapterNumber, @Param("limit") Integer limit);
}
