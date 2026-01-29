-- ============================================================
-- AI Visibility Platform - Complete Database Schema v2.0
-- Version: 2.0.0
-- Last Updated: 2026-01-28
-- ============================================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 创建 Schema
CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS stg;
CREATE SCHEMA IF NOT EXISTS mart;
CREATE SCHEMA IF NOT EXISTS monitoring;

-- ============================================================
-- LAYER 1: RAW (原始数据层)
-- Python Agent 写入，只进不出
-- ============================================================

-- 表 1: scan_jobs (扫描任务表)
-- 记录"谁、在什么时候、用什么模型、问了什么"
CREATE TABLE raw.scan_jobs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 网格坐标 (Grid Coordinates)
    h3_index                VARCHAR(20) NOT NULL,
    grid_center_lat         DECIMAL(10, 7) NOT NULL,
    grid_center_lng         DECIMAL(10, 7) NOT NULL,
    district                VARCHAR(100) NOT NULL,
    
    -- 语义场景 (Semantic Context)
    prompt_type             VARCHAR(50) NOT NULL,
    system_prompt_version   VARCHAR(20) NOT NULL,
    user_prompt_template    TEXT,
    
    -- 扫描环境 (Scan Environment)
    platform                VARCHAR(50) NOT NULL,
    model_version           VARCHAR(100) NOT NULL,
    scan_run_id             UUID NOT NULL,
    tap_number              INTEGER NOT NULL DEFAULT 1,
    
    -- 成本追踪
    tokens_used             INTEGER,
    
    -- 元数据
    scanned_at              TIMESTAMPTZ NOT NULL,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_platform CHECK (platform IN ('chatgpt', 'perplexity', 'gemini', 'claude')),
    CONSTRAINT chk_prompt_type CHECK (prompt_type IN ('generic_best', 'date_night', 'business_lunch', 'avoid_tourist', 'coffee_spot')),
    CONSTRAINT chk_tap_number CHECK (tap_number IN (1, 2)),
    CONSTRAINT chk_lat CHECK (grid_center_lat BETWEEN -90 AND 90),
    CONSTRAINT chk_lng CHECK (grid_center_lng BETWEEN -180 AND 180)
);

CREATE INDEX idx_scan_jobs_h3 ON raw.scan_jobs(h3_index);
CREATE INDEX idx_scan_jobs_time ON raw.scan_jobs(scanned_at DESC);
CREATE INDEX idx_scan_jobs_run ON raw.scan_jobs(scan_run_id);
CREATE INDEX idx_scan_jobs_district ON raw.scan_jobs(district, scanned_at DESC);

-- 表 2: scan_results (结果详情表)
-- 记录"AI 到底回答了什么"
CREATE TABLE raw.scan_results (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id                  UUID NOT NULL REFERENCES raw.scan_jobs(id) ON DELETE CASCADE,
    
    -- 商户实体 (Extracted Entities)
    raw_name                VARCHAR(255) NOT NULL,
    rank_position           INTEGER NOT NULL,
    normalized_name         VARCHAR(255),
    business_id             UUID,
    
    -- 商户位置 (从 Google Places API 补全)
    business_lat            DECIMAL(10, 7),
    business_lng            DECIMAL(10, 7),
    business_address        TEXT,
    google_place_id         VARCHAR(100),
    cuisine_type            VARCHAR(100),
    price_level             INTEGER,
    
    -- 定性评价 (Qualitative Insights)
    reasoning               TEXT,
    vibe_tags               TEXT[],
    negative_flags          TEXT[],
    sentiment_score         DECIMAL(3, 2),
    
    -- 引用数据 (Citation Data - Perplexity)
    citation_urls           TEXT[],
    citation_count          INTEGER,
    
    -- 原始响应备份
    raw_json_response       JSONB,
    
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_rank CHECK (rank_position BETWEEN 1 AND 20),
    CONSTRAINT chk_sentiment CHECK (sentiment_score IS NULL OR sentiment_score BETWEEN -1 AND 1),
    CONSTRAINT chk_price_level CHECK (price_level IS NULL OR price_level BETWEEN 1 AND 4)
);

CREATE INDEX idx_scan_results_job ON raw.scan_results(job_id);
CREATE INDEX idx_scan_results_business ON raw.scan_results(business_id);
CREATE INDEX idx_scan_results_name ON raw.scan_results(raw_name);
CREATE INDEX idx_scan_results_place_id ON raw.scan_results(google_place_id);

-- ============================================================
-- LAYER 2: STG (Staging 清洗层)
-- dbt 转换生成
-- ============================================================

-- 商户标准档案 (Golden Record)
CREATE TABLE stg.businesses (
    business_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 标识
    official_name           VARCHAR(255) NOT NULL,
    aliases                 TEXT[],
    
    -- 位置
    address                 TEXT NOT NULL,
    district                VARCHAR(100) NOT NULL,
    lat                     DECIMAL(10, 7) NOT NULL,
    lng                     DECIMAL(10, 7) NOT NULL,
    h3_index                VARCHAR(20),
    
    -- 外部 ID
    google_place_id         VARCHAR(100),
    
    -- 商户详情
    cuisine                 VARCHAR(100),
    category                VARCHAR(50),
    price_range             VARCHAR(10),
    description             TEXT,
    
    -- AI 感知标签 (从 raw.scan_results.vibe_tags 聚合)
    ai_tags                 TEXT[],
    
    -- 元数据
    first_seen_at           TIMESTAMPTZ,
    last_seen_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_price_range CHECK (price_range IN ('$', '$$', '$$$', '$$$$')),
    CONSTRAINT chk_category CHECK (category IN ('restaurant', 'cafe', 'bar', 'bakery', 'dessert'))
);

CREATE INDEX idx_businesses_name_trgm ON stg.businesses USING GIN (official_name gin_trgm_ops);
CREATE INDEX idx_businesses_district ON stg.businesses(district);
CREATE INDEX idx_businesses_h3 ON stg.businesses(h3_index);
CREATE INDEX idx_businesses_place_id ON stg.businesses(google_place_id);

-- 商户指标聚合表
CREATE TABLE stg.business_metrics (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id             UUID NOT NULL REFERENCES stg.businesses(business_id),
    prompt_type             VARCHAR(50) NOT NULL,
    platform                VARCHAR(50) NOT NULL,
    
    -- 7天滚动指标
    avg_rank_7d             DECIMAL(4, 2),
    best_rank_7d            INTEGER,
    worst_rank_7d           INTEGER,
    appearance_count_7d     INTEGER,
    mention_frequency_7d    DECIMAL(3, 2),
    
    -- 趋势
    trend_direction         VARCHAR(10),
    trend_value             INTEGER,
    
    calculated_at           TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(business_id, prompt_type, platform),
    CONSTRAINT chk_trend CHECK (trend_direction IN ('up', 'down', 'stable', 'new')),
    CONSTRAINT chk_frequency CHECK (mention_frequency_7d BETWEEN 0 AND 1)
);

-- ============================================================
-- LAYER 3: MART (业务展示层)
-- 前端 API 直接访问
-- ============================================================

-- 热力图渲染表 (核心!)
CREATE TABLE mart.visibility_snapshots (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 商户标识
    business_id             UUID NOT NULL,
    business_normalized_name VARCHAR(255) NOT NULL,
    
    -- 位置
    h3_index                VARCHAR(20) NOT NULL,
    district                VARCHAR(100) NOT NULL,
    
    -- 场景
    prompt_type             VARCHAR(50) NOT NULL,
    platform                VARCHAR(50) NOT NULL,
    
    -- 核心分数
    visibility_score        INTEGER NOT NULL,
    avg_rank                DECIMAL(4, 2),
    mention_frequency       DECIMAL(3, 2),
    
    -- 时间
    snapshot_date           DATE NOT NULL,
    
    UNIQUE(business_id, h3_index, prompt_type, platform, snapshot_date),
    CONSTRAINT chk_visibility CHECK (visibility_score BETWEEN 0 AND 100),
    CONSTRAINT chk_frequency CHECK (mention_frequency BETWEEN 0 AND 1)
);

CREATE INDEX idx_visibility_h3_date ON mart.visibility_snapshots(h3_index, snapshot_date DESC);
CREATE INDEX idx_visibility_business ON mart.visibility_snapshots(business_id, snapshot_date DESC);
CREATE INDEX idx_visibility_district ON mart.visibility_snapshots(district, prompt_type, snapshot_date DESC);

-- H3 格子聚合热力图 (前端 Deck.gl 直接读取)
CREATE TABLE mart.heatmap_cells (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 位置
    h3_index                VARCHAR(20) NOT NULL,
    district                VARCHAR(100) NOT NULL,
    center_lat              DECIMAL(10, 7) NOT NULL,
    center_lng              DECIMAL(10, 7) NOT NULL,
    
    -- 场景
    prompt_type             VARCHAR(50) NOT NULL,
    
    -- 聚合分数
    heat_score              INTEGER NOT NULL,
    avg_visibility          INTEGER,
    max_visibility          INTEGER,
    business_count          INTEGER DEFAULT 0,
    competition_score       INTEGER DEFAULT 0,
    
    -- Top 商户
    top_businesses          JSONB,
    
    -- 时间
    snapshot_date           DATE NOT NULL,
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(h3_index, prompt_type, snapshot_date),
    CONSTRAINT chk_heat_score CHECK (heat_score BETWEEN 0 AND 100)
);

CREATE INDEX idx_heatmap_h3 ON mart.heatmap_cells(h3_index);
CREATE INDEX idx_heatmap_district ON mart.heatmap_cells(district, prompt_type, snapshot_date DESC);
CREATE INDEX idx_heatmap_geo ON mart.heatmap_cells USING GIST (ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326));

-- 区域排行榜
CREATE TABLE mart.district_leaderboard (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district                VARCHAR(100) NOT NULL,
    prompt_type             VARCHAR(50) NOT NULL,
    rank_position           INTEGER NOT NULL,
    
    -- 商户信息
    business_id             UUID NOT NULL,
    business_name           VARCHAR(255) NOT NULL,
    
    -- 分数和趋势
    dominance_score         INTEGER NOT NULL,
    avg_rank_7d             DECIMAL(4, 2),
    mention_frequency       DECIMAL(3, 2),
    trend                   VARCHAR(10),
    trend_value             INTEGER,
    
    snapshot_date           DATE NOT NULL,
    
    UNIQUE(district, prompt_type, rank_position, snapshot_date),
    CONSTRAINT chk_dominance CHECK (dominance_score BETWEEN 0 AND 100)
);

CREATE INDEX idx_leaderboard_lookup ON mart.district_leaderboard(district, prompt_type, snapshot_date DESC);

-- AI 平台索引状态表
CREATE TABLE mart.ai_index_status (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id             UUID NOT NULL REFERENCES stg.businesses(business_id),
    platform                VARCHAR(50) NOT NULL,
    
    -- 索引状态
    status                  VARCHAR(20) NOT NULL DEFAULT 'unknown',
    weight                  VARCHAR(20),
    
    -- 详情
    detail                  TEXT,
    citations               INTEGER,
    issue                   TEXT,
    
    -- 元数据
    last_checked_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(business_id, platform),
    CONSTRAINT chk_status CHECK (status IN ('indexed', 'warning', 'not_indexed', 'unknown')),
    CONSTRAINT chk_weight CHECK (weight IS NULL OR weight IN ('High', 'Medium', 'Low'))
);

-- 竞争对手分析表
CREATE TABLE mart.competitor_analysis (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id             UUID NOT NULL REFERENCES stg.businesses(business_id),
    competitor_id           UUID NOT NULL REFERENCES stg.businesses(business_id),
    
    district                VARCHAR(100) NOT NULL,
    prompt_type             VARCHAR(50) NOT NULL,
    
    competitor_rank         INTEGER NOT NULL,
    competitor_score        INTEGER NOT NULL,
    competitor_trend        VARCHAR(10),
    
    calculated_at           DATE NOT NULL,
    
    UNIQUE(business_id, competitor_id, prompt_type, calculated_at),
    CONSTRAINT chk_not_self CHECK (business_id != competitor_id)
);

-- 商户场景排名表
CREATE TABLE mart.business_scenario_ranks (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id             UUID NOT NULL REFERENCES stg.businesses(business_id),
    prompt_type             VARCHAR(50) NOT NULL,
    
    rank_position           INTEGER NOT NULL,
    total_in_category       INTEGER NOT NULL,
    visibility_score        INTEGER NOT NULL,
    
    trend_direction         VARCHAR(10),
    trend_value             INTEGER,
    
    snapshot_date           DATE NOT NULL,
    
    UNIQUE(business_id, prompt_type, snapshot_date),
    CONSTRAINT chk_score CHECK (visibility_score BETWEEN 0 AND 100)
);

-- 用户订阅表
CREATE TABLE mart.user_monitors (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL,
    business_id             UUID REFERENCES stg.businesses(business_id),
    business_name           VARCHAR(255) NOT NULL,
    
    alert_threshold         INTEGER DEFAULT 5,
    alert_enabled           BOOLEAN DEFAULT true,
    
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, business_name)
);

-- ============================================================
-- 监控表
-- ============================================================

CREATE TABLE monitoring.pipeline_runs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_name           VARCHAR(100) NOT NULL,
    status                  VARCHAR(20) NOT NULL,
    started_at              TIMESTAMPTZ NOT NULL,
    completed_at            TIMESTAMPTZ,
    rows_processed          INTEGER,
    error_message           TEXT,
    metadata                JSONB
);

CREATE TABLE monitoring.data_quality_metrics (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name             VARCHAR(100) NOT NULL,
    metric_value            DECIMAL(10, 2) NOT NULL,
    threshold_min           DECIMAL(10, 2),
    threshold_max           DECIMAL(10, 2),
    is_healthy              BOOLEAN GENERATED ALWAYS AS (
        metric_value BETWEEN COALESCE(threshold_min, metric_value) 
                         AND COALESCE(threshold_max, metric_value)
    ) STORED,
    measured_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS 安全策略
-- ============================================================

ALTER TABLE mart.user_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.heatmap_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.district_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.ai_index_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.competitor_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE mart.visibility_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own monitors" ON mart.user_monitors
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Authenticated can view heatmap" ON mart.heatmap_cells
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Public can view leaderboard" ON mart.district_leaderboard
    FOR SELECT USING (true);

CREATE POLICY "Authenticated can view ai status" ON mart.ai_index_status
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view own competitors" ON mart.competitor_analysis
    FOR SELECT USING (
        business_id IN (SELECT business_id FROM mart.user_monitors WHERE user_id = auth.uid())
    );

CREATE POLICY "Authenticated can view visibility" ON mart.visibility_snapshots
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- 辅助函数
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_business_updated_at
    BEFORE UPDATE ON stg.businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_ai_status_updated_at
    BEFORE UPDATE ON mart.ai_index_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 健康检查函数
CREATE OR REPLACE FUNCTION monitoring.check_system_health()
RETURNS TABLE (check_name TEXT, status TEXT, details JSONB) AS $$
BEGIN
    -- 数据新鲜度
    RETURN QUERY
    SELECT 
        'scan_jobs_freshness'::TEXT,
        CASE WHEN MAX(scanned_at) > NOW() - INTERVAL '24 hours' 
             THEN 'healthy' ELSE 'stale' END,
        jsonb_build_object('last_scan', MAX(scanned_at))
    FROM raw.scan_jobs;
    
    -- 热力图数据
    RETURN QUERY
    SELECT 
        'heatmap_data'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'healthy' ELSE 'empty' END,
        jsonb_build_object('total_cells', COUNT(*))
    FROM mart.heatmap_cells;
    
    -- 商户数据
    RETURN QUERY
    SELECT 
        'business_data'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'healthy' ELSE 'empty' END,
        jsonb_build_object('total_businesses', COUNT(*))
    FROM stg.businesses;
END;
$$ LANGUAGE plpgsql;
