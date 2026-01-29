# Raw 数据采集需求 (Raw Data Requirements) v2.0

本文档定义 Python Agent 需要采集的三大类核心数据，用于构建支持时间变化、多维度筛选的 AI Geo-Heatmap。

**核心原则：我们不只存"结果"，我们要存"上下文"。**

---

## 数据架构概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           三大类核心数据                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  第一类: 输入参数 (Input Metadata)                                           │
│  ├── 网格坐标: H3 Index, Center Lat/Lng, District                           │
│  ├── 语义场景: Prompt Type, System Prompt Version                           │
│  └── 扫描环境: Timestamp, Model Version, Platform                           │
│                                                                              │
│  第二类: AI 响应数据 (Raw Response)                                          │
│  ├── 商户实体: Raw Name, Rank, Mention Frequency                            │
│  └── 定性评价: Reasoning, Vibe Tags, Negative Flags                         │
│                                                                              │
│  第三类: 基准校对 (Ground Truth)                                             │
│  └── 商户档案: Official Name, Address, Google Place ID                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 第一类：输入参数数据 (Input Metadata)

决定数据在什么条件下产生，没有这些数据就无法被索引和比较。

### 网格坐标 (Grid Coordinates)

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `h3_index` | string | ✅ | H3 格子唯一 ID (如 `8a384da6000ffff`)，**索引键** |
| `grid_center_lat` | float | ✅ | 格子中心纬度 (Agent 模拟站立位置) |
| `grid_center_lng` | float | ✅ | 格子中心经度 |
| `district` | string | ✅ | 大区标签 (如 `surry_hills`)，用于筛选 |

### 语义场景 (Semantic Context)

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `prompt_type` | string | ✅ | 意图类型: `generic_best`, `date_night`, `business_lunch`, `avoid_tourist`, `coffee_spot` |
| `system_prompt_version` | string | ✅ | System Prompt 版本号 (如 `v1.2.0`)，用于追溯逻辑变更 |
| `user_prompt_template` | string | ⚪ | 实际使用的 Prompt 模板 |

### 扫描环境 (Scan Environment)

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `scanned_at` | timestamp | ✅ | 扫描时间 (精确到秒)，用于趋势图 |
| `platform` | string | ✅ | AI 平台: `chatgpt`, `perplexity`, `gemini`, `claude` |
| `model_version` | string | ✅ | 模型版本 (如 `gpt-4o-2024-08-06`)，模型更新会导致排名剧变 |
| `scan_run_id` | uuid | ✅ | 本次扫描批次 ID (用于 Double-Tap 关联) |
| `tap_number` | int | ✅ | 第几次重复扫描 (1 或 2)，用于计算稳定性 |

---

## 第二类：AI 响应数据 (Raw Response Data)

Agent 每次调用 API 抓回来的原始数据。

### 商户实体信息 (Extracted Entities)

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `raw_name` | string | ✅ | AI 返回的原始名称 (如 "The Winery Surry Hills") |
| `rank_position` | int | ✅ | 排名位置 (1-10)，决定权重 |
| `normalized_name` | string | ⚪ | 标准化后的名称 (关联 Ground Truth) |
| `business_id` | uuid | ⚪ | 关联到 businesses 表的 ID |

### 商户位置信息 (Location Data) - 需要外部补全

| 字段 | 类型 | 必需 | 说明 | 来源 |
|------|------|------|------|------|
| `business_lat` | float | ⚪ | 商户纬度 | Google Places API |
| `business_lng` | float | ⚪ | 商户经度 | Google Places API |
| `business_address` | string | ⚪ | 商户地址 | Google Places API |
| `google_place_id` | string | ⚪ | Google Place ID | Google Places API |
| `cuisine_type` | string | ⚪ | 菜系类型 | Google Places API |
| `price_level` | int | ⚪ | 价格等级 (1-4) | Google Places API |

### 定性评价数据 (Qualitative Insights)

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `reasoning` | string | ✅ | AI 推荐理由 (如 "Known for its leafy courtyard")，**黄金分析** |
| `vibe_tags` | string[] | ✅ | AI 给出的标签 (如 `["Lively", "Expensive", "Cozy"]`) |
| `negative_flags` | string[] | ⚪ | 负面词汇 (如 `["Busy", "Loud", "Small portions"]`) |
| `sentiment_score` | float | ⚪ | 情感分数 (-1 到 1) |

### 引用数据 (Citation Data) - Perplexity 专用

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `citation_urls` | string[] | ⚪ | 引用来源 URL 列表 |
| `citation_count` | int | ⚪ | 引用数量 |

---

## 第三类：基准校对数据 (Ground Truth)

让数据有用的外部数据，用于验证和标准化。

### 商户标准档案 (Golden Record)

存储在 `stg.businesses` 表，以 `google_place_id` 为核心标识：

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `business_id` | uuid | ✅ | 主键 |
| `google_place_id` | string | ✅ | Google Maps Place ID，**唯一标识** |
| `official_name` | string | ✅ | 官方名称 (来自 Google Places API) |
| `address` | string | ✅ | 地址 (用于验证 AI 是否产生幻觉) |
| `lat` | float | ✅ | 纬度 |
| `lng` | float | ✅ | 经度 |
| `cuisine` | string | ⚪ | 菜系 |
| `price_range` | string | ⚪ | 价格区间 |

**名称匹配流程**：
```
AI 返回 raw_name + H3 格子坐标
    ↓
Google Places Text Search (限定搜索范围)
    ↓
返回 google_place_id + 精确地址
    ↓
用 google_place_id 关联/创建 businesses 记录
    ↓
匹配失败 → business_id = NULL (标记为可能的 AI 幻觉)
```

---

## 数据库表结构设计

### 表 1: `raw.scan_jobs` (扫描任务表)

记录"谁、在什么时候、用什么模型、问了什么"。

```sql
CREATE TABLE raw.scan_jobs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 网格坐标
    h3_index                VARCHAR(20) NOT NULL,
    grid_center_lat         DECIMAL(10, 7) NOT NULL,
    grid_center_lng         DECIMAL(10, 7) NOT NULL,
    district                VARCHAR(100) NOT NULL,
    
    -- 语义场景
    prompt_type             VARCHAR(50) NOT NULL,
    system_prompt_version   VARCHAR(20) NOT NULL,
    user_prompt_template    TEXT,
    
    -- 扫描环境
    platform                VARCHAR(50) NOT NULL,
    model_version           VARCHAR(100) NOT NULL,
    scan_run_id             UUID NOT NULL,
    tap_number              INTEGER NOT NULL DEFAULT 1,
    
    -- 元数据
    scanned_at              TIMESTAMPTZ NOT NULL,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_platform CHECK (platform IN ('chatgpt', 'perplexity', 'gemini', 'claude')),
    CONSTRAINT chk_prompt_type CHECK (prompt_type IN ('generic_best', 'date_night', 'business_lunch', 'avoid_tourist', 'coffee_spot')),
    CONSTRAINT chk_tap_number CHECK (tap_number IN (1, 2))
);

CREATE INDEX idx_scan_jobs_h3 ON raw.scan_jobs(h3_index);
CREATE INDEX idx_scan_jobs_time ON raw.scan_jobs(scanned_at);
CREATE INDEX idx_scan_jobs_run ON raw.scan_jobs(scan_run_id);
```

### 表 2: `raw.scan_results` (结果详情表)

记录"AI 到底回答了什么"。

```sql
CREATE TABLE raw.scan_results (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id                  UUID NOT NULL REFERENCES raw.scan_jobs(id),
    
    -- 商户实体
    raw_name                VARCHAR(255) NOT NULL,
    rank_position           INTEGER NOT NULL,
    normalized_name         VARCHAR(255),
    business_id             UUID,
    
    -- 定性评价
    reasoning               TEXT,
    vibe_tags               TEXT[],
    negative_flags          TEXT[],
    sentiment_score         DECIMAL(3, 2),
    
    -- 引用数据 (Perplexity)
    citation_urls           TEXT[],
    citation_count          INTEGER,
    
    -- 原始响应备份
    raw_json_response       JSONB,
    
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_rank CHECK (rank_position BETWEEN 1 AND 20),
    CONSTRAINT chk_sentiment CHECK (sentiment_score IS NULL OR sentiment_score BETWEEN -1 AND 1)
);

CREATE INDEX idx_scan_results_job ON raw.scan_results(job_id);
CREATE INDEX idx_scan_results_business ON raw.scan_results(business_id);
```

### 表 3: `mart.visibility_snapshots` (热力图渲染表)

经过计算的表，前端直接读取，速度极快。

```sql
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
    mention_frequency       DECIMAL(3, 2),  -- 0.00 - 1.00 (Double-Tap 稳定性)
    
    -- 时间
    snapshot_date           DATE NOT NULL,
    
    UNIQUE(business_id, h3_index, prompt_type, platform, snapshot_date),
    CONSTRAINT chk_visibility CHECK (visibility_score BETWEEN 0 AND 100),
    CONSTRAINT chk_frequency CHECK (mention_frequency BETWEEN 0 AND 1)
);

CREATE INDEX idx_visibility_h3_date ON mart.visibility_snapshots(h3_index, snapshot_date);
CREATE INDEX idx_visibility_business ON mart.visibility_snapshots(business_id, snapshot_date);
```

---

## 采集场景矩阵

### H3 格子 × 平台 × 场景 × Double-Tap

```
H3 格子 (Surry Hills 约 50 个 res-10 格子):
├── 8a384da6000ffff (格子 1)
├── 8a384da6001ffff (格子 2)
├── ... (共约 50 个)

平台 (4):
├── chatgpt (gpt-4o-2024-08-06)
├── perplexity
├── gemini (gemini-1.5-pro)
└── claude (claude-3-opus)

场景 (5):
├── generic_best
├── date_night
├── business_lunch
├── avoid_tourist
└── coffee_spot

Double-Tap (2):
├── tap_1
└── tap_2
```

### 扫描频率

```
每次完整扫描 = 50 格子 × 4 平台 × 5 场景 × 2 taps = 2,000 次 API 调用

建议频率: 每天 1 次完整扫描
每日数据量 = 2,000 条 scan_jobs + ~10,000 条 scan_results (假设每次返回 5 个商户)

每月数据量 ≈ 60,000 条 scan_jobs + 300,000 条 scan_results
```

---

## 示例数据

### scan_jobs 示例

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "h3_index": "8a384da6000ffff",
  "grid_center_lat": -33.8855,
  "grid_center_lng": 151.2115,
  "district": "surry_hills",
  "prompt_type": "date_night",
  "system_prompt_version": "v1.2.0",
  "platform": "chatgpt",
  "model_version": "gpt-4o-2024-08-06",
  "scan_run_id": "run-2026-01-28-001",
  "tap_number": 1,
  "scanned_at": "2026-01-28T10:30:00Z"
}
```

### scan_results 示例

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "raw_name": "Bistrot 916",
  "rank_position": 2,
  "normalized_name": "Bistrot 916",
  "business_id": "biz-001",
  "reasoning": "A charming neighbourhood bistro known for its fresh seafood and relaxed atmosphere. Perfect for an intimate date night.",
  "vibe_tags": ["Romantic", "Casual", "Seafood", "Neighbourhood"],
  "negative_flags": [],
  "sentiment_score": 0.85,
  "citation_urls": null,
  "citation_count": null
}
```

### visibility_snapshots 示例 (计算后)

```json
{
  "business_id": "biz-001",
  "business_normalized_name": "Bistrot 916",
  "h3_index": "8a384da6000ffff",
  "district": "surry_hills",
  "prompt_type": "date_night",
  "platform": "chatgpt",
  "visibility_score": 72,
  "avg_rank": 2.5,
  "mention_frequency": 1.0,
  "snapshot_date": "2026-01-28"
}
```

---

## Visibility Score 计算公式

```python
def calculate_visibility_score(ranks: list[int], total_taps: int = 2) -> int:
    """
    计算可见度分数 (0-100)
    
    - 排名权重: #1 = 100分, #2 = 90分, ..., #10 = 10分
    - 稳定性加成: 出现在所有 taps 中 = 满分
    """
    if not ranks:
        return 0
    
    # 排名分数
    rank_scores = [max(0, 110 - rank * 10) for rank in ranks]
    avg_rank_score = sum(rank_scores) / len(rank_scores)
    
    # 稳定性系数 (mention_frequency)
    stability = len(ranks) / total_taps
    
    # 最终分数
    return int(avg_rank_score * stability)
```

---

## 数据质量要求

### 必需字段验证

```python
def validate_scan_job(data):
    assert data.get('h3_index') is not None, "H3 Index is required"
    assert data.get('platform') in ['chatgpt', 'perplexity', 'gemini', 'claude']
    assert data.get('prompt_type') in ['generic_best', 'date_night', 'business_lunch', 'avoid_tourist', 'coffee_spot']
    assert data.get('model_version') is not None, "Model version is required"
    assert data.get('system_prompt_version') is not None, "System prompt version is required"

def validate_scan_result(data):
    assert data.get('raw_name') is not None
    assert 1 <= data.get('rank_position', 0) <= 20
    assert data.get('reasoning') is not None, "Reasoning is required for analysis"
```

### 数据新鲜度

- 每个 H3 格子至少每 24 小时扫描一次
- 超过 48 小时未更新触发告警

---

## 总结对比

| 维度 | 旧设计 (v1) | 新设计 (v2) |
|------|-------------|-------------|
| 扫描单位 | District (区域) | H3 格子 (精确位置) |
| 位置记录 | 只有商户 lat/lng | 格子中心 + 商户位置 |
| 模型追踪 | ❌ 无 | ✅ model_version |
| Prompt 版本 | ❌ 无 | ✅ system_prompt_version |
| 稳定性验证 | ❌ 无 | ✅ Double-Tap + mention_frequency |
| 推荐理由 | 简单描述 | ✅ reasoning (完整分析) |
| 负面标签 | ❌ 无 | ✅ negative_flags |
| Ground Truth | 基础 | ✅ Google Place ID |
