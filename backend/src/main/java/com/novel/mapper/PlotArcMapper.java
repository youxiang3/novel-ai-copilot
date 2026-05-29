package com.novel.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.novel.entity.PlotArc;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.UUID;

@Mapper
public interface PlotArcMapper extends BaseMapper<PlotArc> {

    @Select("SELECT * FROM plot_arc WHERE novel_id = #{novelId} ORDER BY start_chapter")
    List<PlotArc> selectByNovelId(@Param("novelId") UUID novelId);

    @Select("SELECT * FROM plot_arc WHERE novel_id = #{novelId} AND status = #{status}")
    List<PlotArc> selectByNovelIdAndStatus(@Param("novelId") UUID novelId, @Param("status") String status);
}
