package com.novel.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.novel.entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.UUID;

@Mapper
public interface UserMapper extends BaseMapper<User> {

    @Select("SELECT * FROM \"user\" WHERE username = #{username}")
    User selectByUsername(@Param("username") String username);
}
