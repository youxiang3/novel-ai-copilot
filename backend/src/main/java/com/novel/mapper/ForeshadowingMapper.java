package com.novel.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.novel.entity.Foreshadowing;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.UUID;

@Mapper
public interface ForeshadowingMapper extends BaseMapper<Foreshadowing> {

    @Select("SELECT * FROM foreshadowing WHERE novel_id = #{novelId} ORDER BY setup_chapter")
    List<Foreshadowing> selectByNovelId(@Param("novelId") UUID novelId);

    @Select("SELECT * FROM foreshadowing WHERE novel_id = #{novelId} AND status = #{status}")
    List<Foreshadowing> selectByNovelIdAndStatus(@Param("novelId") UUID novelId, @Param("status") String status);
}
