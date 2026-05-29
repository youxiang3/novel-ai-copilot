package com.novel.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.novel.entity.Inspiration;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.UUID;

@Mapper
public interface InspirationMapper extends BaseMapper<Inspiration> {

    @Select("SELECT * FROM inspiration WHERE novel_id = #{novelId} ORDER BY create_time DESC")
    List<Inspiration> selectByNovelId(@Param("novelId") UUID novelId);

    @Select("SELECT * FROM inspiration WHERE novel_id = #{novelId} AND category = #{category}")
    List<Inspiration> selectByNovelIdAndCategory(@Param("novelId") UUID novelId, @Param("category") String category);

    @Select("SELECT * FROM inspiration WHERE novel_id = #{novelId} AND status = #{status}")
    List<Inspiration> selectByNovelIdAndStatus(@Param("novelId") UUID novelId, @Param("status") String status);
}
