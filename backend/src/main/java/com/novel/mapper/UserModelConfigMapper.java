package com.novel.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.novel.entity.UserModelConfig;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.UUID;

@Mapper
public interface UserModelConfigMapper extends BaseMapper<UserModelConfig> {

    @Select("SELECT * FROM user_model_config WHERE user_id = #{userId} AND active = true ORDER BY update_time DESC LIMIT 1")
    UserModelConfig selectActiveByUserId(@Param("userId") UUID userId);
}
