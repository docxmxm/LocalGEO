-- ============================================
-- AI Visibility Heatmap - Database Schema
-- ============================================

-- 1. 商户基准表 (Golden Record)
CREATE TABLE businesses (
  id SERIAL PRIMARY KEY,
  normalized_name VARCHAR(255) NOT NULL UNIQUE,  -- "Bistrot 916"
  official_name VARCHAR(255),
  address TEXT,
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7),
  h3_index_res10 VARCHAR(20),  -- 商户所在的 H3 格子
  google_place_id VARCHAR(100),
  district VARCHAR(100),  -- "Surry Hills"
  category VARCHAR(50),   -- "restaurant", "cafe", "bar"
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. 扫描任务表
CREATE TABLE scan_jobs (
  id SERIAL PRIMARY KEY,
  h3_index VARCHAR(20) NOT NULL,      -- 扫描的格子
  prompt_type VARCHAR(50) NOT NULL,   -- "Generic_Best", "Date_Night"
  model_version VARCHAR(50),          -- "gpt-4o-2024-08-06"
  system_prompt_id VARCHAR(20),       -- "v1.2"
  scanned_at TIMESTAMP DEFAULT NOW(),
  tokens_used INT,
  cost_usd DECIMAL(10, 6)
);

-- 3. 扫描结果详情表 (原始 AI 响应)
CREATE TABLE scan_results (
  id SERIAL PRIMARY KEY,
  job_id INT REFERENCES scan_jobs(id),
  business_id INT REFERENCES businesses(id),
  raw_name VARCHAR(255),              -- AI 返回的原始名称
  rank INT,                           -- 排名 1-10
  mention_count INT DEFAULT 1,        -- 重复扫描中出现次数
  reasoning TEXT,                     -- AI 推荐理由
  vibe_tags TEXT[],                   -- ["Lively", "Cozy"]
  negative_flags TEXT[],              -- ["Loud", "Expensive"]
  raw_json JSONB                      -- 完整备份
);

-- 4. 可见度快照表 (商户维度 - 你设计的)
CREATE TABLE visibility_snapshots (
  id SERIAL PRIMARY KEY,
  business_id INT REFERENCES businesses(id),
  h3_index VARCHAR(20) NOT NULL,      -- 在哪个格子被推荐
  prompt_type VARCHAR(50) NOT NULL,
  visibility_score INT CHECK (visibility_score BETWEEN 0 AND 100),
  avg_rank DECIMAL(3, 1),             -- 平均排名
  appearance_rate DECIMAL(3, 2),      -- 出现率 0.00-1.00
  snapshot_date DATE NOT NULL,
  UNIQUE(business_id, h3_index, prompt_type, snapshot_date)
);

-- 5. ⭐ 格子热力图缓存表 (前端直接读取)
CREATE TABLE grid_heatmap_cache (
  h3_index VARCHAR(20) NOT NULL,
  prompt_type VARCHAR(50) NOT NULL,
  
  -- 热力图核心指标
  avg_visibility DECIMAL(5, 2),       -- 该格子平均可见度
  max_visibility INT,                 -- 最高分商户
  business_count INT,                 -- 该格子有多少商户被推荐
  top3_businesses TEXT[],             -- 前3名商户名
  
  -- 竞争分析
  competition_score INT,              -- 竞争激烈度 0-100
  dominance_ratio DECIMAL(3, 2),      -- 头部商户占比
  
  -- 元数据
  center_lat DECIMAL(10, 7),
  center_lng DECIMAL(10, 7),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  PRIMARY KEY (h3_index, prompt_type)
);

-- 索引优化
CREATE INDEX idx_heatmap_h3 ON grid_heatmap_cache(h3_index);
CREATE INDEX idx_visibility_h3 ON visibility_snapshots(h3_index);
CREATE INDEX idx_visibility_date ON visibility_snapshots(snapshot_date);
CREATE INDEX idx_businesses_district ON businesses(district);
