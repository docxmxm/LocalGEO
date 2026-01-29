# 数据库架构设计 (Database Architecture)

## 架构概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SUPABASE POSTGRESQL                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    LAYER 3: PUBLIC (MARTS)                          │    │
│  │                    前端 API 直接访问层                                │    │
│  │  ┌──────────────────────┐  ┌──────────────────────┐                 │    │
│  │  │ mart_heatmap_snapshot│  │mart_district_leaderboard│              │    │
│  │  │  - business_id       │  │  - district           │                │    │
│  │  │  - business_name     │  │  - business_name      │                │    │
│  │  │  - lat, lng          │  │  - avg_rank_7d        │                │    │
│  │  │  - heat_score        │  │  - trend              │                │    │
│  │  │  - updated_at        │  │  - snapshot_date      │                │    │
│  │  └──────────────────────┘  └──────────────────────┘                 │    │
│  │                                                                      │    │
│  │  ┌──────────────────────┐  ┌──────────────────────┐                 │    │
│  │  │  mart_ai_index_status│  │mart_competitor_      │                 │    │
│  │  │  - platform          │  │analysis              │                 │    │
│  │  │  - status            │  │  - competitor_rank   │                 │    │
│  │  │  - weight            │  │  - competitor_score  │                 │    │
│  │  └──────────────────────┘  └──────────────────────┘                 │    │
│  │                                                                      │    │
│  │  ┌──────────────────────┐  ┌──────────────────────┐                 │    │
│  │  │    user_monitors     │  │mart_business_        │                 │    │
│  │  │  - user_id (FK)      │  │scenario_ranks        │                 │    │
│  │  │  - business_name     │  │  - scenario          │                 │    │
│  │  │  - created_at        │  │  - rank_position     │                 │    │
│  │  └──────────────────────┘  └──────────────────────┘                 │    │
│  │                              ▲ RLS Policy Applied                   │    │
│  └──────────────────────────────│──────────────────────────────────────┘    │
│                                 │                                            │
│                          dbt run │ (Upsert)                                  │
│                                 │                                            │
│  ┌──────────────────────────────│──────────────────────────────────────┐    │
│  │                    LAYER 2: STG (STAGING)                           │    │
│  │                    dbt 清洗转换层 (Views/Tables)                     │    │
│  │  ┌──────────────────────┐  ┌──────────────────────┐                 │    │
│  │  │ stg_unique_businesses│  │stg_rankings_flattened│                 │    │
│  │  │  - business_id       │  │  - scan_id           │                 │    │
│  │  │  - canonical_name    │  │  - business_name     │                 │    │
│  │  │  - aliases[]         │  │  - rank_position     │                 │    │
│  │  │  - cuisine, ai_tags  │  │  - platform          │                 │    │
│  │  │  - lat, lng          │  │  - scenario          │                 │    │
│  │  └──────────────────────┘  └──────────────────────┘                 │    │
│  │  ┌──────────────────────┐                                           │    │
│  │  │ stg_business_metrics │  ← 7天滚动平均计算                         │    │
│  │  │  - business_id       │                                           │    │
│  │  │  - scenario          │                                           │    │
│  │  │  - avg_rank_7d       │                                           │    │
│  │  │  - trend_direction   │                                           │    │
│  │  └──────────────────────┘                                           │    │
│  └──────────────────────────────▲──────────────────────────────────────┘    │
│                                 │                                            │
│                          dbt run │ (Transform)                               │
│                                 │                                            │
│  ┌──────────────────────────────│──────────────────────────────────────┐    │
│  │                    LAYER 1: RAW (原始数据)                          │    │
│  │                    Python Agent 写入层                               │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │                    raw.scan_results                          │   │    │
│  │  │  - id (PK, UUID)                                             │   │    │
│  │  │  - platform (chatgpt, perplexity, gemini, claude)            │   │    │
│  │  │  - district, scenario                                        │   │    │
│  │  │  - rankings (JSONB) -- [{name, rank, visibility_score}, ...] │   │    │
│  │  │  - scanned_at (TIMESTAMPTZ)                                  │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                 ▲                                            │
└─────────────────────────────────│────────────────────────────────────────────┘
                                  │
                           INSERT │ (Append Only)
                                  │
                    ┌─────────────┴─────────────┐
                    │      PYTHON AGENT         │
                    │   (Scheduled Scraper)     │
                    │  - ChatGPT API            │
                    │  - Perplexity API         │
                    │  - Gemini API             │
                    │  - Claude API             │
                    └───────────────────────────┘
```

## 三层架构设计原则

| 层级 | Schema | 职责 | 写入方 |
|------|--------|------|--------|
| Layer 1 | `raw` | 原始数据存储，只进不出 | Python Agent |
| Layer 2 | `stg` | 数据清洗、展开、聚合 | dbt |
| Layer 3 | `public` | 业务展示，前端直接访问 | dbt |

### 为什么用三层架构？

1. **可追溯性**: Raw 层保留原始 JSON，可随时重跑
2. **可测试性**: 每层可独立验证数据质量
3. **可维护性**: 逻辑分离，修改一层不影响其他层
4. **性能优化**: Mart 层预聚合，前端毫秒级响应

## 数据流转

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Python     │     │    dbt       │     │   Supabase   │     │   Frontend   │
│   Agent      │────▶│   Transform  │────▶│   API        │────▶│   (React)    │
│              │     │              │     │              │     │              │
│ 1. Scrape    │     │ 2. Clean     │     │ 3. Serve     │     │ 4. Render    │
│ 2. INSERT    │     │ 3. Aggregate │     │ 4. RLS Check │     │ 5. Display   │
│    raw_*     │     │ 4. Upsert    │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
     │                     │                    │                    │
     ▼                     ▼                    ▼                    ▼
  Cron Job            GitHub Actions       PostgREST API        Deck.gl Map
  (每小时)             (每6小时)            (毫秒响应)           (热力图)
```

## 表结构总览

### Layer 1: Raw

| 表名 | 用途 |
|------|------|
| `raw.scan_results` | AI 平台扫描原始结果 (按月分区) |

### Layer 2: Staging

| 表名 | 用途 |
|------|------|
| `stg.unique_businesses` | 商户主数据 (去重、标准化) |
| `stg.rankings_flattened` | 排名数据展开 (JSON → 行) |
| `stg.business_metrics` | 商户 7 天滚动指标 |

### Layer 3: Marts

| 表名 | 用途 | 前端组件 |
|------|------|----------|
| `mart_heatmap_snapshot` | 热力图数据 | MapView.jsx |
| `mart_district_leaderboard` | 区域排行榜 | MapView.jsx |
| `mart_ai_index_status` | AI 平台索引状态 | Dashboard.jsx |
| `mart_competitor_analysis` | 竞争对手分析 | Dashboard.jsx |
| `mart_business_scenario_ranks` | 场景排名 | Dashboard.jsx |
| `user_monitors` | 用户订阅 | 全局 |

## 安全策略 (RLS)

所有 `public` 表启用行级安全：

- `user_monitors`: 用户只能访问自己的数据
- `mart_heatmap_snapshot`: 认证用户可读
- `mart_district_leaderboard`: 公开可读
- `mart_competitor_analysis`: 只能看自己商户的竞争对手
