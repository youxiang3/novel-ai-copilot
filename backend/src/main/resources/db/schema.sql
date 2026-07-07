﻿-- ============================================
-- NovelAI Copilot - PostgreSQL Database Schema
-- ============================================

-- 创建数据库（如需要）
-- CREATE DATABASE novel_ai_copilot;

-- 启用 UUID 扩展。embedding 字段当前按 TEXT 保存，后续接入 pgvector 时再迁移为 vector 类型。
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. user (用户表)
-- ============================================
CREATE TABLE IF NOT EXISTS "user" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    avatar VARCHAR(500),
    role VARCHAR(20) DEFAULT 'author' CHECK (role IN ('author', 'admin')),
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE "user" IS '用户表';
COMMENT ON COLUMN "user".id IS '主键UUID';
COMMENT ON COLUMN "user".username IS '用户名';
COMMENT ON COLUMN "user".password IS '密码（加密）';
COMMENT ON COLUMN "user".avatar IS '头像URL';
COMMENT ON COLUMN "user".role IS '角色：author/管理员';
COMMENT ON COLUMN "user".create_time IS '创建时间';
COMMENT ON COLUMN "user".update_time IS '更新时间';

CREATE INDEX idx_user_username ON "user"(username);

-- ============================================
-- 1.1 user_model_config (用户模型配置)
-- ============================================
CREATE TABLE IF NOT EXISTS user_model_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'deepseek',
    base_url VARCHAR(500) NOT NULL,
    model VARCHAR(100) NOT NULL,
    api_key_encrypted TEXT,
    active BOOLEAN DEFAULT true,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_model_config_user FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_model_config_user ON user_model_config(user_id, active);

-- ============================================
-- 2. novel (小说总表)
-- ============================================
CREATE TABLE IF NOT EXISTS novel (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    frontend_work_id VARCHAR(120),
    saved_work_payload TEXT,
    global_outline TEXT,
    author_style_prompt TEXT,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_novel_user FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

ALTER TABLE novel ADD COLUMN IF NOT EXISTS frontend_work_id VARCHAR(120);
ALTER TABLE novel ADD COLUMN IF NOT EXISTS saved_work_payload TEXT;

COMMENT ON TABLE novel IS '小说总表';
COMMENT ON COLUMN novel.id IS '主键UUID';
COMMENT ON COLUMN novel.user_id IS '所属用户ID';
COMMENT ON COLUMN novel.title IS '小说标题';
COMMENT ON COLUMN novel.frontend_work_id IS '前端作品库本地ID，用于渐进式同步';
COMMENT ON COLUMN novel.saved_work_payload IS '前端 SavedWork 快照JSON，用于迁移期保留完整作品库字段';
COMMENT ON COLUMN novel.global_outline IS '全局大纲';
COMMENT ON COLUMN novel.author_style_prompt IS '作者文风Prompt';
COMMENT ON COLUMN novel.create_time IS '创建时间';
COMMENT ON COLUMN novel.update_time IS '更新时间';

CREATE INDEX idx_novel_user_id ON novel(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_novel_user_frontend_work ON novel(user_id, frontend_work_id) WHERE frontend_work_id IS NOT NULL;

-- ============================================
-- 3. chapter (章节表)
-- ============================================
CREATE TABLE IF NOT EXISTS chapter (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    novel_id UUID NOT NULL,
    chapter_number INTEGER NOT NULL,
    title VARCHAR(255),
    content TEXT,
    word_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chapter_novel FOREIGN KEY (novel_id) REFERENCES novel(id) ON DELETE CASCADE,
    CONSTRAINT uk_chapter_novel_number UNIQUE (novel_id, chapter_number)
);

COMMENT ON TABLE chapter IS '章节表';
COMMENT ON COLUMN chapter.id IS '主键UUID';
COMMENT ON COLUMN chapter.novel_id IS '所属小说ID';
COMMENT ON COLUMN chapter.chapter_number IS '章节序号';
COMMENT ON COLUMN chapter.title IS '章节标题';
COMMENT ON COLUMN chapter.content IS '章节正文内容';
COMMENT ON COLUMN chapter.word_count IS '字数统计';
COMMENT ON COLUMN chapter.status IS '状态：draft草稿/published已发布';
COMMENT ON COLUMN chapter.create_time IS '创建时间';
COMMENT ON COLUMN chapter.update_time IS '更新时间';

CREATE INDEX idx_chapter_novel_id ON chapter(novel_id);
CREATE INDEX idx_chapter_novel_number ON chapter(novel_id, chapter_number);

-- ============================================
-- 4. lore (世界观设定库)
-- ============================================
CREATE TABLE IF NOT EXISTS lore (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    novel_id UUID NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('character', 'location', 'item', 'sect', 'world_rule')),
    name VARCHAR(255) NOT NULL,
    content TEXT,
    embedding TEXT,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lore_novel FOREIGN KEY (novel_id) REFERENCES novel(id) ON DELETE CASCADE
);

COMMENT ON TABLE lore IS '世界观设定库';
COMMENT ON COLUMN lore.id IS '主键UUID';
COMMENT ON COLUMN lore.novel_id IS '所属小说ID';
COMMENT ON COLUMN lore.category IS '类别：character人物/location地点/item物品/sect宗门/world_rule世界规则';
COMMENT ON COLUMN lore.name IS '设定名称';
COMMENT ON COLUMN lore.content IS '设定详情';
COMMENT ON COLUMN lore.embedding IS '向量嵌入（用于RAG检索）';
COMMENT ON COLUMN lore.create_time IS '创建时间';
COMMENT ON COLUMN lore.update_time IS '更新时间';

CREATE INDEX idx_lore_novel_id ON lore(novel_id);
CREATE INDEX idx_lore_category ON lore(novel_id, category);

-- ============================================
-- 5. memory_summary (章节记忆摘要)
-- ============================================
CREATE TABLE IF NOT EXISTS memory_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    novel_id UUID NOT NULL,
    chapter_id UUID NOT NULL,
    summary_content VARCHAR(500),
    embedding TEXT,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_summary_novel FOREIGN KEY (novel_id) REFERENCES novel(id) ON DELETE CASCADE,
    CONSTRAINT fk_summary_chapter FOREIGN KEY (chapter_id) REFERENCES chapter(id) ON DELETE CASCADE,
    CONSTRAINT uk_summary_chapter UNIQUE (chapter_id)
);

COMMENT ON TABLE memory_summary IS '章节记忆摘要表';
COMMENT ON COLUMN memory_summary.id IS '主键UUID';
COMMENT ON COLUMN memory_summary.novel_id IS '所属小说ID';
COMMENT ON COLUMN memory_summary.chapter_id IS '对应章节ID';
COMMENT ON COLUMN memory_summary.summary_content IS '200字剧情摘要';
COMMENT ON COLUMN memory_summary.embedding IS '向量嵌入（用于RAG检索）';
COMMENT ON COLUMN memory_summary.create_time IS '创建时间';
COMMENT ON COLUMN memory_summary.update_time IS '更新时间';

CREATE INDEX idx_summary_novel_id ON memory_summary(novel_id);
CREATE INDEX idx_summary_chapter_id ON memory_summary(chapter_id);

-- ============================================
-- 6. story_state (全局动态状态)
-- ============================================
CREATE TABLE IF NOT EXISTS story_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    novel_id UUID NOT NULL UNIQUE,
    current_timeline VARCHAR(255),
    key_events JSONB,
    protagonist_status JSONB,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_state_novel FOREIGN KEY (novel_id) REFERENCES novel(id) ON DELETE CASCADE
);

COMMENT ON TABLE story_state IS '全局动态状态表';
COMMENT ON COLUMN story_state.id IS '主键UUID';
COMMENT ON COLUMN story_state.novel_id IS '所属小说ID';
COMMENT ON COLUMN story_state.current_timeline IS '当前时间线';
COMMENT ON COLUMN story_state.key_events IS '关键事件JSON';
COMMENT ON COLUMN story_state.protagonist_status IS '主角状态JSON';
COMMENT ON COLUMN story_state.create_time IS '创建时间';
COMMENT ON COLUMN story_state.update_time IS '更新时间';

CREATE INDEX idx_story_state_novel_id ON story_state(novel_id);

-- ============================================
-- 7. foreshadowing (伏笔池) - v5.0 新增
-- ============================================
CREATE TABLE IF NOT EXISTS foreshadowing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    novel_id UUID NOT NULL,
    setup_chapter INT,
    payoff_chapter INT,
    content TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'setup', 'paid_off', 'forgotten')),
    importance INT DEFAULT 1,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_foreshadowing_novel FOREIGN KEY (novel_id) REFERENCES novel(id) ON DELETE CASCADE
);

COMMENT ON TABLE foreshadowing IS '伏笔池';
COMMENT ON COLUMN foreshadowing.id IS '主键UUID';
COMMENT ON COLUMN foreshadowing.novel_id IS '所属小说ID';
COMMENT ON COLUMN foreshadowing.setup_chapter IS '埋设章节号';
COMMENT ON COLUMN foreshadowing.payoff_chapter IS '回收章节号';
COMMENT ON COLUMN foreshadowing.content IS '伏笔内容描述';
COMMENT ON COLUMN foreshadowing.status IS '状态：pending待埋/setup已埋/paid_off已回收/forgotten已遗忘';
COMMENT ON COLUMN foreshadowing.importance IS '重要程度1-5';
COMMENT ON COLUMN foreshadowing.create_time IS '创建时间';
COMMENT ON COLUMN foreshadowing.update_time IS '更新时间';

CREATE INDEX idx_foreshadowing_novel_id ON foreshadowing(novel_id);
CREATE INDEX idx_foreshadowing_status ON foreshadowing(novel_id, status);

-- ============================================
-- 8. character_relationship (人物关系动态数值) - v5.0 新增
-- ============================================
CREATE TABLE IF NOT EXISTS character_relationship (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    novel_id UUID NOT NULL,
    character_a UUID NOT NULL,
    character_b UUID NOT NULL,
    trust_value INT DEFAULT 50 CHECK (trust_value >= 0 AND trust_value <= 100),
    hatred_value INT DEFAULT 0 CHECK (hatred_value >= 0 AND hatred_value <= 100),
    intimacy_value INT DEFAULT 0 CHECK (intimacy_value >= 0 AND intimacy_value <= 100),
    fear_value INT DEFAULT 0 CHECK (fear_value >= 0 AND fear_value <= 100),
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_relationship_novel FOREIGN KEY (novel_id) REFERENCES novel(id) ON DELETE CASCADE
);

COMMENT ON TABLE character_relationship IS '人物关系动态数值表';
COMMENT ON COLUMN character_relationship.id IS '主键UUID';
COMMENT ON COLUMN character_relationship.novel_id IS '所属小说ID';
COMMENT ON COLUMN character_relationship.character_a IS '角色A的Lore ID';
COMMENT ON COLUMN character_relationship.character_b IS '角色B的Lore ID';
COMMENT ON COLUMN character_relationship.trust_value IS '信任值0-100';
COMMENT ON COLUMN character_relationship.hatred_value IS '仇恨值0-100';
COMMENT ON COLUMN character_relationship.intimacy_value IS '亲密度0-100';
COMMENT ON COLUMN character_relationship.fear_value IS '恐惧值0-100';
COMMENT ON COLUMN character_relationship.create_time IS '创建时间';
COMMENT ON COLUMN character_relationship.update_time IS '更新时间';

CREATE INDEX idx_relationship_novel_id ON character_relationship(novel_id);
CREATE INDEX idx_relationship_characters ON character_relationship(novel_id, character_a, character_b);

-- ============================================
-- 9. emotion_curve (情绪曲线) - v5.0 新增
-- ============================================
CREATE TABLE IF NOT EXISTS emotion_curve (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    novel_id UUID NOT NULL,
    chapter_id UUID NOT NULL,
    tension INT DEFAULT 50 CHECK (tension >= 0 AND tension <= 100),
    satisfaction INT DEFAULT 50 CHECK (satisfaction >= 0 AND satisfaction <= 100),
    mystery INT DEFAULT 50 CHECK (mystery >= 0 AND mystery <= 100),
    despair INT DEFAULT 50 CHECK (despair >= 0 AND despair <= 100),
    warmth INT DEFAULT 50 CHECK (warmth >= 0 AND warmth <= 100),
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_emotion_novel FOREIGN KEY (novel_id) REFERENCES novel(id) ON DELETE CASCADE,
    CONSTRAINT fk_emotion_chapter FOREIGN KEY (chapter_id) REFERENCES chapter(id) ON DELETE CASCADE,
    CONSTRAINT uk_emotion_chapter UNIQUE (chapter_id)
);

COMMENT ON TABLE emotion_curve IS '情绪曲线表';
COMMENT ON COLUMN emotion_curve.id IS '主键UUID';
COMMENT ON COLUMN emotion_curve.novel_id IS '所属小说ID';
COMMENT ON COLUMN emotion_curve.chapter_id IS '对应章节ID';
COMMENT ON COLUMN emotion_curve.tension IS '张力值0-100';
COMMENT ON COLUMN emotion_curve.satisfaction IS '爽感值0-100';
COMMENT ON COLUMN emotion_curve.mystery IS '悬念值0-100';
COMMENT ON COLUMN emotion_curve.despair IS '压抑值0-100';
COMMENT ON COLUMN emotion_curve.warmth IS '温情值0-100';
COMMENT ON COLUMN emotion_curve.create_time IS '创建时间';
COMMENT ON COLUMN emotion_curve.update_time IS '更新时间';

CREATE INDEX idx_emotion_novel_id ON emotion_curve(novel_id);
CREATE INDEX idx_emotion_chapter_id ON emotion_curve(chapter_id);

-- ============================================
-- 10. ai_generation_log (AI生成日志) - v5.0 新增
-- ============================================
CREATE TABLE IF NOT EXISTS ai_generation_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    novel_id UUID NOT NULL,
    chapter_id UUID,
    workflow_type VARCHAR(50),
    prompt_snapshot TEXT,
    response_snapshot TEXT,
    model_name VARCHAR(50),
    token_usage INT,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_log_novel FOREIGN KEY (novel_id) REFERENCES novel(id) ON DELETE CASCADE
);

COMMENT ON TABLE ai_generation_log IS 'AI生成日志表';
COMMENT ON COLUMN ai_generation_log.id IS '主键UUID';
COMMENT ON COLUMN ai_generation_log.novel_id IS '所属小说ID';
COMMENT ON COLUMN ai_generation_log.chapter_id IS '对应章节ID';
COMMENT ON COLUMN ai_generation_log.workflow_type IS '工作流类型：scene_expand/summarize/screenplay/analyze';
COMMENT ON COLUMN ai_generation_log.prompt_snapshot IS 'Prompt快照';
COMMENT ON COLUMN ai_generation_log.response_snapshot IS '响应快照';
COMMENT ON COLUMN ai_generation_log.model_name IS '使用的模型名称';
COMMENT ON COLUMN ai_generation_log.token_usage IS 'Token消耗量';
COMMENT ON COLUMN ai_generation_log.create_time IS '创建时间';

CREATE INDEX idx_ai_log_novel_id ON ai_generation_log(novel_id);
CREATE INDEX idx_ai_log_chapter_id ON ai_generation_log(chapter_id);
CREATE INDEX idx_ai_log_workflow ON ai_generation_log(workflow_type);

-- ============================================
-- 11. inspiration (灵感点) - v5.0 新增
-- ============================================
CREATE TABLE IF NOT EXISTS inspiration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    novel_id UUID NOT NULL,
    content TEXT,
    category VARCHAR(50) DEFAULT 'idea' CHECK (category IN ('idea', 'character', 'plot', 'world', 'dialogue')),
    embedding TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'expanded', 'used', 'archived')),
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inspiration_novel FOREIGN KEY (novel_id) REFERENCES novel(id) ON DELETE CASCADE
);

COMMENT ON TABLE inspiration IS '灵感点表';
COMMENT ON COLUMN inspiration.id IS '主键UUID';
COMMENT ON COLUMN inspiration.novel_id IS '所属小说ID';
COMMENT ON COLUMN inspiration.content IS '灵感内容';
COMMENT ON COLUMN inspiration.category IS '类别：idea灵感/character人物/plot剧情/world世界观/dialogue对白';
COMMENT ON COLUMN inspiration.embedding IS '向量嵌入（用于关联检索）';
COMMENT ON COLUMN inspiration.status IS '状态：pending待处理/expanded已扩写/used已使用/archived已归档';
COMMENT ON COLUMN inspiration.create_time IS '创建时间';
COMMENT ON COLUMN inspiration.update_time IS '更新时间';

CREATE INDEX idx_inspiration_novel_id ON inspiration(novel_id);
CREATE INDEX idx_inspiration_category ON inspiration(novel_id, category);
CREATE INDEX idx_inspiration_status ON inspiration(novel_id, status);

-- ============================================
-- 12. writing_skill (写作技巧配置) - v5.0 新增
-- ============================================
CREATE TABLE IF NOT EXISTS writing_skill (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    novel_id UUID NOT NULL,
    skill_type VARCHAR(50),
    apply_chapter INT,
    parameters JSONB,
    status VARCHAR(20) DEFAULT 'applied' CHECK (status IN ('active', 'applied', 'disabled')),
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_skill_novel FOREIGN KEY (novel_id) REFERENCES novel(id) ON DELETE CASCADE
);

COMMENT ON TABLE writing_skill IS '写作技巧配置表';
COMMENT ON COLUMN writing_skill.id IS '主键UUID';
COMMENT ON COLUMN writing_skill.novel_id IS '所属小说ID';
COMMENT ON COLUMN writing_skill.skill_type IS '技巧类型：flashback倒叙/suspense悬念/conflict冲突/detail细节/viewpoint视角/tension爽点';
COMMENT ON COLUMN writing_skill.apply_chapter IS '应用章节号';
COMMENT ON COLUMN writing_skill.parameters IS '技巧参数JSON';
COMMENT ON COLUMN writing_skill.status IS '状态：active生效/applied已应用/disabled禁用';
COMMENT ON COLUMN writing_skill.create_time IS '创建时间';
COMMENT ON COLUMN writing_skill.update_time IS '更新时间';

CREATE INDEX idx_skill_novel_id ON writing_skill(novel_id);
CREATE INDEX idx_skill_type ON writing_skill(novel_id, skill_type);

-- ============================================
-- 13. character_image (角色AI立绘) - v5.0 新增
-- ============================================
CREATE TABLE IF NOT EXISTS character_image (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    novel_id UUID NOT NULL,
    character_id UUID NOT NULL,
    image_url TEXT NOT NULL,
    style VARCHAR(50) DEFAULT 'chinese_anime' CHECK (style IN ('chinese_anime', 'japanese_anime', 'realistic', 'cartoon', 'ink')),
    pose VARCHAR(50) DEFAULT 'normal' CHECK (pose IN ('normal', 'combat', 'sad', 'happy', 'angry', 'thinking')),
    is_primary BOOLEAN DEFAULT false,
    embedding TEXT,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_character_image_novel FOREIGN KEY (novel_id) REFERENCES novel(id) ON DELETE CASCADE,
    CONSTRAINT fk_character_image_lore FOREIGN KEY (character_id) REFERENCES lore(id) ON DELETE CASCADE
);

COMMENT ON TABLE character_image IS '角色AI立绘表';
COMMENT ON COLUMN character_image.id IS '主键UUID';
COMMENT ON COLUMN character_image.novel_id IS '所属小说ID';
COMMENT ON COLUMN character_image.character_id IS '对应角色Lore ID';
COMMENT ON COLUMN character_image.image_url IS '图片URL';
COMMENT ON COLUMN character_image.style IS '风格：chinese_anime国漫/japanese_anime日漫/realistic写实/cartoon卡通/ink水墨';
COMMENT ON COLUMN character_image.pose IS '姿态：normal常规/combat战斗/sad悲伤/happy快乐/angry愤怒/thinking思考';
COMMENT ON COLUMN character_image.is_primary IS '是否主形象';
COMMENT ON COLUMN character_image.embedding IS '形象向量（保证一致性）';
COMMENT ON COLUMN character_image.create_time IS '创建时间';
COMMENT ON COLUMN character_image.update_time IS '更新时间';

CREATE INDEX idx_character_image_novel_id ON character_image(novel_id);
CREATE INDEX idx_character_image_character_id ON character_image(character_id);
CREATE INDEX idx_character_image_style ON character_image(novel_id, style);

-- ============================================
-- 14. world_visual (世界观场景/道具图片) - v5.0 新增
-- ============================================
CREATE TABLE IF NOT EXISTS world_visual (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    novel_id UUID NOT NULL,
    category VARCHAR(50) CHECK (category IN ('location', 'item', 'sect', 'scene')),
    name VARCHAR(100),
    description TEXT,
    image_url TEXT,
    lore_id UUID,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_world_visual_novel FOREIGN KEY (novel_id) REFERENCES novel(id) ON DELETE CASCADE
);

COMMENT ON TABLE world_visual IS '世界观场景/道具图片表';
COMMENT ON COLUMN world_visual.id IS '主键UUID';
COMMENT ON COLUMN world_visual.novel_id IS '所属小说ID';
COMMENT ON COLUMN world_visual.category IS '类别：location地点/item物品/sect宗门/scene场景';
COMMENT ON COLUMN world_visual.name IS '名称';
COMMENT ON COLUMN world_visual.description IS '描述';
COMMENT ON COLUMN world_visual.image_url IS '图片URL';
COMMENT ON COLUMN world_visual.lore_id IS '关联的Lore ID';
COMMENT ON COLUMN world_visual.create_time IS '创建时间';
COMMENT ON COLUMN world_visual.update_time IS '更新时间';

CREATE INDEX idx_world_visual_novel_id ON world_visual(novel_id);
CREATE INDEX idx_world_visual_category ON world_visual(novel_id, category);

-- ============================================
-- 15. plot_arc (剧情弧) - v5.0 新增
-- ============================================
CREATE TABLE IF NOT EXISTS plot_arc (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    novel_id UUID NOT NULL,
    arc_name VARCHAR(100),
    start_chapter INT,
    end_chapter INT,
    emotional_target VARCHAR(100),
    core_conflict TEXT,
    villain_goal TEXT,
    protagonist_growth TEXT,
    climax_event TEXT,
    resolution_type VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_plot_arc_novel FOREIGN KEY (novel_id) REFERENCES novel(id) ON DELETE CASCADE
);

COMMENT ON TABLE plot_arc IS '剧情弧表';
COMMENT ON COLUMN plot_arc.id IS '主键UUID';
COMMENT ON COLUMN plot_arc.novel_id IS '所属小说ID';
COMMENT ON COLUMN plot_arc.arc_name IS '弧线名称';
COMMENT ON COLUMN plot_arc.start_chapter IS '起始章节';
COMMENT ON COLUMN plot_arc.end_chapter IS '结束章节';
COMMENT ON COLUMN plot_arc.emotional_target IS '情绪目标';
COMMENT ON COLUMN plot_arc.core_conflict IS '核心冲突';
COMMENT ON COLUMN plot_arc.villain_goal IS '反派目标';
COMMENT ON COLUMN plot_arc.protagonist_growth IS '主角成长';
COMMENT ON COLUMN plot_arc.climax_event IS '高潮事件';
COMMENT ON COLUMN plot_arc.resolution_type IS '结局类型';
COMMENT ON COLUMN plot_arc.status IS '状态：planning规划中/active进行中/completed已完成/cancelled已取消';
COMMENT ON COLUMN plot_arc.create_time IS '创建时间';
COMMENT ON COLUMN plot_arc.update_time IS '更新时间';

CREATE INDEX idx_plot_arc_novel_id ON plot_arc(novel_id);
CREATE INDEX idx_plot_arc_status ON plot_arc(novel_id, status);

-- ============================================
-- 16. agent_authorization
-- ============================================
CREATE TABLE IF NOT EXISTS agent_authorization (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    agent_type VARCHAR(50) NOT NULL,
    scopes TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED', 'EXPIRED')),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_agent_authorization_user FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX idx_agent_authorization_user ON agent_authorization(user_id, agent_type, status);

-- ============================================
-- 17. agent_task
-- ============================================
CREATE TABLE IF NOT EXISTS agent_task (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    agent_type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    status VARCHAR(40) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'WAITING_USER_CONFIRMATION', 'SUCCEEDED', 'FAILED', 'CANCELLED')),
    input_json TEXT,
    result_json TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP,
    CONSTRAINT fk_agent_task_user FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX idx_agent_task_user ON agent_task(user_id, agent_type, status);

-- ============================================
-- 18. agent_task_step
-- ============================================
CREATE TABLE IF NOT EXISTS agent_task_step (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL,
    step_key VARCHAR(80) NOT NULL,
    step_name VARCHAR(120) NOT NULL,
    status VARCHAR(40) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED', 'CANCELLED')),
    input_json TEXT,
    output_json TEXT,
    error_message TEXT,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_agent_task_step_task FOREIGN KEY (task_id) REFERENCES agent_task(id) ON DELETE CASCADE
);

CREATE INDEX idx_agent_task_step_task ON agent_task_step(task_id, step_key);

-- ============================================
-- 19. agent_execution_log
-- ============================================
CREATE TABLE IF NOT EXISTS agent_execution_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL,
    level VARCHAR(20) DEFAULT 'INFO' CHECK (level IN ('INFO', 'WARN', 'ERROR')),
    message TEXT,
    metadata_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_agent_execution_log_task FOREIGN KEY (task_id) REFERENCES agent_task(id) ON DELETE CASCADE
);

CREATE INDEX idx_agent_execution_log_task ON agent_execution_log(task_id, created_at);

-- ============================================
-- 创建更新时间自动更新触发器函数
-- ============================================
CREATE OR REPLACE FUNCTION update_update_time_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.update_time = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为每个表创建触发器
DROP TRIGGER IF EXISTS update_user_update_time ON "user";
CREATE TRIGGER update_user_update_time
    BEFORE UPDATE ON "user"
    FOR EACH ROW
    EXECUTE FUNCTION update_update_time_column();

DROP TRIGGER IF EXISTS update_novel_update_time ON novel;
CREATE TRIGGER update_novel_update_time
    BEFORE UPDATE ON novel
    FOR EACH ROW
    EXECUTE FUNCTION update_update_time_column();

DROP TRIGGER IF EXISTS update_chapter_update_time ON chapter;
CREATE TRIGGER update_chapter_update_time
    BEFORE UPDATE ON chapter
    FOR EACH ROW
    EXECUTE FUNCTION update_update_time_column();

DROP TRIGGER IF EXISTS update_lore_update_time ON lore;
CREATE TRIGGER update_lore_update_time
    BEFORE UPDATE ON lore
    FOR EACH ROW
    EXECUTE FUNCTION update_update_time_column();

DROP TRIGGER IF EXISTS update_memory_summary_update_time ON memory_summary;
CREATE TRIGGER update_memory_summary_update_time
    BEFORE UPDATE ON memory_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_update_time_column();

DROP TRIGGER IF EXISTS update_story_state_update_time ON story_state;
CREATE TRIGGER update_story_state_update_time
    BEFORE UPDATE ON story_state
    FOR EACH ROW
    EXECUTE FUNCTION update_update_time_column();

DROP TRIGGER IF EXISTS update_foreshadowing_update_time ON foreshadowing;
CREATE TRIGGER update_foreshadowing_update_time
    BEFORE UPDATE ON foreshadowing
    FOR EACH ROW
    EXECUTE FUNCTION update_update_time_column();

DROP TRIGGER IF EXISTS update_character_relationship_update_time ON character_relationship;
CREATE TRIGGER update_character_relationship_update_time
    BEFORE UPDATE ON character_relationship
    FOR EACH ROW
    EXECUTE FUNCTION update_update_time_column();

DROP TRIGGER IF EXISTS update_emotion_curve_update_time ON emotion_curve;
CREATE TRIGGER update_emotion_curve_update_time
    BEFORE UPDATE ON emotion_curve
    FOR EACH ROW
    EXECUTE FUNCTION update_update_time_column();

DROP TRIGGER IF EXISTS update_inspiration_update_time ON inspiration;
CREATE TRIGGER update_inspiration_update_time
    BEFORE UPDATE ON inspiration
    FOR EACH ROW
    EXECUTE FUNCTION update_update_time_column();

DROP TRIGGER IF EXISTS update_writing_skill_update_time ON writing_skill;
CREATE TRIGGER update_writing_skill_update_time
    BEFORE UPDATE ON writing_skill
    FOR EACH ROW
    EXECUTE FUNCTION update_update_time_column();

DROP TRIGGER IF EXISTS update_character_image_update_time ON character_image;
CREATE TRIGGER update_character_image_update_time
    BEFORE UPDATE ON character_image
    FOR EACH ROW
    EXECUTE FUNCTION update_update_time_column();

DROP TRIGGER IF EXISTS update_world_visual_update_time ON world_visual;
CREATE TRIGGER update_world_visual_update_time
    BEFORE UPDATE ON world_visual
    FOR EACH ROW
    EXECUTE FUNCTION update_update_time_column();

DROP TRIGGER IF EXISTS update_plot_arc_update_time ON plot_arc;
CREATE TRIGGER update_plot_arc_update_time
    BEFORE UPDATE ON plot_arc
    FOR EACH ROW
    EXECUTE FUNCTION update_update_time_column();

DROP TRIGGER IF EXISTS update_agent_authorization_updated_at ON agent_authorization;
CREATE TRIGGER update_agent_authorization_updated_at
    BEFORE UPDATE ON agent_authorization
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_task_updated_at ON agent_task;
CREATE TRIGGER update_agent_task_updated_at
    BEFORE UPDATE ON agent_task
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
