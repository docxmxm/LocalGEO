# Raw 数据采集需求 (Raw Data Requirements)

本文档定义 Python Agent 需要采集并写入 `raw.scan_results` 的数据结构。

---

## 前端功能 → 数据需求映射

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        前端功能需求分析                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  MapView.jsx                          需要的 Raw 数据                        │
│  ├── 热力图 (H3 格子)                 → 商户位置 (lat/lng)                   │
│  ├── 场景切换 (5种暂定)                   → 场景标签 (scenario)                  │
│  ├── 排行榜                           → 排名 + 分数                          │
│  └── 商户详情弹窗                     → 商户基础信息                         │
│                                                                              │
│  Dashboard.jsx                        需要的 Raw 数据                        │
│  ├── AI Dominance Score               → 各平台可见度分数                     │
│  ├── AI Index Status                  → 各 AI 平台的索引状态                 │
│  │   ├── ChatGPT                      → 是否被提及、权重                     │
│  │   ├── Perplexity                   → 引用次数                            │
│  │   ├── Gemini                       → 索引状态、问题                       │
│  │   └── Claude                       → 是否被推荐                          │
│  ├── Ranking by Scenario              → 各场景下的排名                       │
│  ├── Top Competitors                  → 竞争对手排名和分数                   │
│  └── AI Perception Tags               → AI 如何描述这家店                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Raw 数据结构定义

### 主表: `raw.scan_results`

每次 AI 平台扫描产生一条记录。

```sql
{
  "id": "uuid",
  "platform": "chatgpt | perplexity | gemini | claude",
  "district": "surry_hills | newtown | paddington | ...",
  "scenario": "overall | date_night | business_lunch | avoid_tourist | coffee_spot",
  "search_query": "Best French restaurant in Surry Hills for a date",
  "scanned_at": "2026-01-28T10:30:00Z",
  
  -- 核心数据: AI 返回的排名列表
  "rankings": [
    {
      "rank": 1,
      "name": "Hubert",
      "mentioned": true,
      "visibility_score": 96,
      "ai_description": "Underground French brasserie with live jazz",
      "ai_tags": ["Classic", "Live Jazz", "Romantic"],
      "citation_url": "https://...",
      "lat": -33.8675,
      "lng": 151.2090
    },
    {
      "rank": 2,
      "name": "Felix",
      ...
    }
  ],
  
  -- 可选: 完整 AI 响应 (用于调试和未来分析)
  "raw_response": { ... }
}
```

### Rankings 数组字段详解

| 字段 | 类型 | 必需 | 说明 | 用于 |
|------|------|------|------|------|
| `rank` | int | ✅ | 排名位置 (1-10) | 排行榜、热力图 |
| `name` | string | ✅ | 商户名称 | 商户识别 |
| `mentioned` | bool | ✅ | 是否被 AI 提及 | AI Index Status |
| `visibility_score` | int | ✅ | 可见度分数 (0-100) | Dominance Score |
| `ai_description` | string | ⚪ | AI 对商户的描述 | 商户详情 |
| `ai_tags` | string[] | ⚪ | AI 感知标签 | AI Perception |
| `citation_url` | string | ⚪ | 引用来源 URL | Perplexity citations |
| `lat` | float | ⚪ | 纬度 | 热力图定位 |
| `lng` | float | ⚪ | 经度 | 热力图定位 |
| `rating` | float | ⚪ | 评分 (如有) | 商户详情 |
| `review_count` | int | ⚪ | 评论数 | 商户详情 |
| `price_range` | string | ⚪ | 价格区间 ($-$$$$) | 商户详情 |
| `cuisine` | string | ⚪ | 菜系 | 商户分类 |
| `address` | string | ⚪ | 地址 | 商户详情 |

---

## 采集场景矩阵

Python Agent 需要按以下维度组合进行扫描：

### 平台 × 场景 × 区域

```
平台 (4):
├── chatgpt
├── perplexity  
├── gemini
└── claude

场景 (5):
├── overall          "Best French restaurant in {district}"
├── date_night       "Romantic French restaurant for date night in {district}"
├── business_lunch   "French restaurant for business lunch in {district}"
├── avoid_tourist    "Local French restaurant in {district}, avoid tourist traps"
└── coffee_spot      "Best French cafe for coffee in {district}"

区域 (5):
├── surry_hills
├── newtown
├── paddington
├── darlinghurst
└── potts_point
```

### 扫描频率

```
每小时扫描量 = 4 平台 × 5 场景 × 5 区域 = 100 次查询

每日扫描量 = 100 × 24 = 2,400 条记录

每月数据量 ≈ 72,000 条记录
```

---

## 示例 Raw 数据

### 示例 1: ChatGPT 扫描结果

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "platform": "chatgpt",
  "district": "surry_hills",
  "scenario": "date_night",
  "search_query": "Romantic French restaurant for date night in Surry Hills Sydney",
  "scanned_at": "2026-01-28T10:30:00Z",
  "rankings": [
    {
      "rank": 1,
      "name": "Hubert",
      "mentioned": true,
      "visibility_score": 98,
      "ai_description": "An underground French brasserie with live jazz, classic cocktails and an extensive wine list. Perfect for a romantic evening.",
      "ai_tags": ["Romantic", "Live Jazz", "Wine Bar", "Classic"],
      "lat": -33.8675,
      "lng": 151.2090,
      "price_range": "$$",
      "cuisine": "French Brasserie"
    },
    {
      "rank": 2,
      "name": "Felix",
      "mentioned": true,
      "visibility_score": 92,
      "ai_description": "Elegant French restaurant in a heritage laneway with upscale dining experience.",
      "ai_tags": ["Upscale", "Romantic", "Special Occasion"],
      "lat": -33.8612,
      "lng": 151.2085,
      "price_range": "$$",
      "cuisine": "French Fine Dining"
    },
    {
      "rank": 3,
      "name": "Bistrot 916",
      "mentioned": true,
      "visibility_score": 68,
      "ai_description": "Neighbourhood French bistro known for fresh seafood and relaxed atmosphere.",
      "ai_tags": ["Casual", "Seafood", "Neighbourhood"],
      "lat": -33.8855,
      "lng": 151.2115,
      "price_range": "$",
      "cuisine": "French Bistro"
    }
  ],
  "raw_response": {
    "model": "gpt-4",
    "finish_reason": "stop",
    "usage": { "prompt_tokens": 45, "completion_tokens": 320 }
  }
}
```

### 示例 2: Perplexity 扫描结果 (带引用)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "platform": "perplexity",
  "district": "surry_hills",
  "scenario": "overall",
  "search_query": "Best French restaurant in Surry Hills Sydney",
  "scanned_at": "2026-01-28T10:35:00Z",
  "rankings": [
    {
      "rank": 1,
      "name": "Hubert",
      "mentioned": true,
      "visibility_score": 95,
      "ai_description": "Award-winning French brasserie consistently ranked among Sydney's best.",
      "ai_tags": ["Award-winning", "Institution"],
      "citation_url": "https://www.timeout.com/sydney/restaurants/hubert",
      "lat": -33.8675,
      "lng": 151.2090
    },
    {
      "rank": 2,
      "name": "Bistrot 916",
      "mentioned": true,
      "visibility_score": 72,
      "ai_description": "Popular neighbourhood bistro with excellent seafood.",
      "ai_tags": ["Neighbourhood", "Seafood"],
      "citation_url": "https://www.broadsheet.com.au/sydney/food-and-drink/bistrot-916",
      "lat": -33.8855,
      "lng": 151.2115
    }
  ],
  "raw_response": {
    "citations": [
      "https://www.timeout.com/sydney/restaurants/hubert",
      "https://www.broadsheet.com.au/sydney/food-and-drink/bistrot-916"
    ],
    "citation_count": 2
  }
}
```

### 示例 3: Gemini 扫描结果 (带警告)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "platform": "gemini",
  "district": "surry_hills",
  "scenario": "business_lunch",
  "search_query": "French restaurant for business lunch in Surry Hills",
  "scanned_at": "2026-01-28T10:40:00Z",
  "rankings": [
    {
      "rank": 1,
      "name": "Felix",
      "mentioned": true,
      "visibility_score": 95,
      "ai_description": "Upscale French dining perfect for business meetings.",
      "ai_tags": ["Business", "Upscale", "Professional"],
      "lat": -33.8612,
      "lng": 151.2085
    },
    {
      "rank": 2,
      "name": "Bistrot 916",
      "mentioned": true,
      "visibility_score": 61,
      "ai_description": "Casual French bistro.",
      "ai_tags": ["Casual"],
      "lat": -33.8855,
      "lng": 151.2115,
      "data_conflict": {
        "type": "hours_mismatch",
        "google_maps_hours": "11:00-22:00",
        "website_hours": "12:00-23:00",
        "issue": "Opening hours don't match between Google Maps and website"
      }
    }
  ],
  "raw_response": {
    "grounding_sources": ["Google Maps", "Restaurant Website"],
    "confidence": 0.85
  }
}
```

---

## 数据质量要求

### 必需字段验证

```python
def validate_scan_result(data):
    assert data.get('platform') in ['chatgpt', 'perplexity', 'gemini', 'claude']
    assert data.get('district') is not None
    assert data.get('scenario') in ['overall', 'date_night', 'business_lunch', 'avoid_tourist', 'coffee_spot']
    assert data.get('scanned_at') is not None
    assert len(data.get('rankings', [])) > 0
    
    for ranking in data['rankings']:
        assert ranking.get('rank') is not None
        assert ranking.get('name') is not None
        assert ranking.get('mentioned') is not None
        assert 0 <= ranking.get('visibility_score', 0) <= 100
```

### 数据新鲜度

- 每个 (platform, district, scenario) 组合至少每 6 小时更新一次
- 超过 24 小时未更新的数据应触发告警

---

## Python Agent 伪代码

```python
import asyncio
from datetime import datetime
from supabase import create_client

PLATFORMS = ['chatgpt', 'perplexity', 'gemini', 'claude']
SCENARIOS = ['overall', 'date_night', 'business_lunch', 'avoid_tourist', 'coffee_spot']
DISTRICTS = ['surry_hills', 'newtown', 'paddington', 'darlinghurst', 'potts_point']

PROMPTS = {
    'overall': "Best French restaurant in {district} Sydney",
    'date_night': "Romantic French restaurant for date night in {district} Sydney",
    'business_lunch': "French restaurant for business lunch in {district} Sydney",
    'avoid_tourist': "Local French restaurant in {district} Sydney, avoid tourist traps",
    'coffee_spot': "Best French cafe for coffee in {district} Sydney"
}

async def scan_ai_platform(platform: str, district: str, scenario: str) -> dict:
    """调用 AI 平台 API 获取推荐"""
    prompt = PROMPTS[scenario].format(district=district.replace('_', ' ').title())
    
    if platform == 'chatgpt':
        response = await call_openai_api(prompt)
    elif platform == 'perplexity':
        response = await call_perplexity_api(prompt)
    elif platform == 'gemini':
        response = await call_gemini_api(prompt)
    elif platform == 'claude':
        response = await call_claude_api(prompt)
    
    # 解析响应，提取排名
    rankings = parse_ai_response(response, platform)
    
    return {
        'platform': platform,
        'district': district,
        'scenario': scenario,
        'search_query': prompt,
        'scanned_at': datetime.utcnow().isoformat(),
        'rankings': rankings,
        'raw_response': response
    }

async def run_hourly_scan():
    """每小时运行的扫描任务"""
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    tasks = []
    for platform in PLATFORMS:
        for district in DISTRICTS:
            for scenario in SCENARIOS:
                tasks.append(scan_ai_platform(platform, district, scenario))
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # 过滤成功的结果
    valid_results = [r for r in results if isinstance(r, dict)]
    
    # 批量写入 raw.scan_results
    if valid_results:
        supabase.table('raw.scan_results').insert(valid_results).execute()
        print(f"Inserted {len(valid_results)} scan results")

if __name__ == '__main__':
    asyncio.run(run_hourly_scan())
```

---

## 从 Raw 到 Mart 的转换逻辑

### dbt 转换示例

```sql
-- stg_rankings_flattened.sql
-- 将 rankings JSONB 数组展开为行

WITH raw_data AS (
    SELECT 
        id AS scan_id,
        platform,
        district,
        scenario,
        scanned_at,
        jsonb_array_elements(rankings) AS ranking_item
    FROM {{ source('raw', 'scan_results') }}
    WHERE scanned_at >= CURRENT_DATE - INTERVAL '30 days'
)

SELECT
    gen_random_uuid() AS id,
    scan_id,
    platform,
    district,
    scenario,
    scanned_at,
    (ranking_item->>'rank')::INTEGER AS rank_position,
    ranking_item->>'name' AS business_name,
    (ranking_item->>'mentioned')::BOOLEAN AS mentioned,
    (ranking_item->>'visibility_score')::INTEGER AS visibility_score,
    ranking_item->>'ai_description' AS ai_description,
    ranking_item->'ai_tags' AS ai_tags,
    ranking_item->>'citation_url' AS citation_url,
    (ranking_item->>'lat')::DECIMAL(10,7) AS lat,
    (ranking_item->>'lng')::DECIMAL(10,7) AS lng,
    ranking_item->>'price_range' AS price_range,
    ranking_item->>'cuisine' AS cuisine
FROM raw_data
```

---

## 总结

### Raw 数据核心要素

| 要素 | 说明 |
|------|------|
| **平台** | 4 个 AI 平台 (ChatGPT, Perplexity, Gemini, Claude) |
| **场景** | 5 种搜索场景 |
| **区域** | 5 个悉尼区域 |
| **排名** | 每次扫描返回 Top 5-10 商户 |
| **分数** | 每个商户的可见度分数 (0-100) |
| **标签** | AI 对商户的感知标签 |
| **位置** | 商户经纬度 (用于热力图) |

### 数据量预估

- 每小时: ~100 条记录
- 每天: ~2,400 条记录
- 每月: ~72,000 条记录
- 每年: ~864,000 条记录

建议 Raw 表按月分区，90 天后归档到冷存储。
