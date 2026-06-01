# 2-Backend-Arch

# ⚙️ 后端技术栈与数据库设计

## 1. 核心技术栈

- **框架**：SpringBoot 3 (JDK 17及以上)
- **数据库**：PostgreSQL 15+
- **ORM**：MyBatis Plus (要求使用兼容 SpringBoot 3 的 `mybatis-plus-spring-boot3-starter`)
- **缓存与鉴权**：Redis + Spring Security + JWT
- **接口规范**：RESTful API 设计，统一定义通用返回结构 `Result<T>`，全局异常处理 `@RestControllerAdvice`，集成 Springdoc OpenAPI (Swagger 3)。
- **AI 接入层**：使用 `Spring AI` (使用 `spring-ai-openai-spring-boot-starter`)，配置需兼容 OpenAI 标准接口。
- **向量检索**：依赖 PostgreSQL 的 `pgvector` 扩展实现 RAG。
- **文件存储**：集成 MinIO 或阿里云 OSS，提供统一的 `FileController` 用于上传角色头像、漫剧参考图，返回外链。

## 2. 鉴权与安全规范 (Security)

- 实现全局 CORS 跨域配置。
- 实现 JWT 拦截器，除 `/api/auth/login` 外，所有接口都需要在 Header 携带 `Bearer Token`。
- 在 Controller/Service 层通过上下文获取当前登录的 `user_id`，实现小说数据的**行级隔离**（A作者无法访问B作者的数据）。

## 3. 核心数据表 (Schema)

*(要求：所有表主键为 UUID，全部包含 create\_time 和 update\_time 字段)*

- **user (用户表)**
  - `id` (UUID), `username`, `password`(加密), `avatar`, `role`(author/admin)
- **novel (小说总表)**
  - `id` (UUID), `user_id` (关联user表), `title`, `global_outline`(全局大纲), `author_style_prompt`(作者专属文风提示词)
- **chapter (章节表)**
  - `id` (UUID), `novel_id`, `chapter_number`(章节序号), `title`, `content`(长文本正文), `word_count`, `status`(draft/published)
- **lore (世界观设定库)**
  - `id` (UUID), `novel_id`, `category`(character/location/item), `name`, `content`(设定详情)
  - **`embedding`** (vector类型，配合 pgvector 存储向量)
- **memory\_summary (章节记忆摘要)**
  - `id` (UUID), `novel_id`, `chapter_id`, `summary_content`(200字后台总结)
  - **`embedding`** (vector类型，配合 pgvector 存储向量)
- **story\_state (全局动态状态)**
  - `id` (UUID), `novel_id`, `current_timeline`, `key_events`, `protagonist_status`

