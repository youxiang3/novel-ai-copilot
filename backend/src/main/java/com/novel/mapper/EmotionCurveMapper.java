package com.novel.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.novel.entity.EmotionCurve;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.UUID;

@Mapper
public interface EmotionCurveMapper extends BaseMapper<EmotionCurve> {

    @Select("SELECT ec.* FROM emotion_curve ec " +
            "JOIN chapter c ON ec.chapter_id = c.id " +
            "WHERE ec.novel_id = #{novelId} " +
            "ORDER BY c.chapter_number")
    List<EmotionCurve> selectByNovelIdOrderByChapter(@Param("novelId") UUID novelId);

    @Select("SELECT * FROM emotion_curve WHERE chapter_id = #{chapterId}")
    EmotionCurve selectByChapterId(@Param("chapterId") UUID chapterId);
}
