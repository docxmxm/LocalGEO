# 数据库建立指南 (Database Setup Guide)

本文档说明如何在 Supabase 上建立 AI Visibility Platform 数据库。

---

## 建立步骤

### Step 1: 创建 Supabase 项目

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 创建新项目
3. 记录连接信息:
   - Project URL
   - anon key
   - service_role key
   - Database password

### Step 2: 启用扩展

在 Supabase SQL Editor 中运行:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### Step 3: 创建 Schema

```sql
CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS stg;
CREATE SCHEMA IF NOT EXISTS monitoring;
```

### Step 4: 运行完整 Schema

```bash
# 方式 1: Supabase SQL Editor
# 复制 docs/database/schema.sql 内容并执行

# 方式 2: psql 命令行
psql $DATABASE_URL -f docs/database/schema.sql
```

### Step 5: 验证安装

```sql
-- 检查所有表
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname IN ('raw', 'stg', 'public', 'monitoring')
ORDER BY schemaname, tablename;

-- 检查 RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- 运行健康检查
SELECT * FROM monitoring.check_system_health();
```

### Step 6: 配置 dbt

```yaml
# dbt_project/profiles.yml
ai_visibility:
  target: prod
  outputs:
    prod:
      type: postgres
      host: "{{ env_var('SUPABASE_HOST') }}"
      port: 5432
      user: postgres
      password: "{{ env_var('SUPABASE_PASSWORD') }}"
      dbname: postgres
      schema: stg
      threads: 4
```

---

## 前端 API 映射

### MapView.jsx

```javascript
// 热力图数据
const { data } = await supabase
  .from('mart_heatmap_snapshot')
  .select('*')
  .eq('scenario', selectedScenario)
  .eq('district', selectedDistrict);

// 排行榜
const { data } = await supabase
  .from('mart_district_leaderboard')
  .select('*')
  .eq('district', selectedDistrict)
  .eq('scenario', selectedScenario)
  .order('rank_position', { ascending: true });
```

### Dashboard.jsx

```javascript
// AI 索引状态
const { data } = await supabase
  .from('mart_ai_index_status')
  .select('*')
  .eq('business_id', myBusinessId);

// 场景排名
const { data } = await supabase
  .from('mart_business_scenario_ranks')
  .select('*')
  .eq('business_id', myBusinessId);

// 竞争对手
const { data } = await supabase
  .from('mart_competitor_analysis')
  .select('*')
  .eq('business_id', myBusinessId)
  .order('competitor_rank', { ascending: true })
  .limit(5);
```

---

## 数据字段映射

| 前端字段 | 数据库表 | 数据库字段 |
|----------|----------|------------|
| `heat_score` | mart_heatmap_snapshot | heat_score |
| `h3Index` | mart_heatmap_snapshot | h3_index |
| `rankings.overall` | mart_business_scenario_ranks | rank_position |
| `aiIndexStatus.chatgpt` | mart_ai_index_status | status, weight |
| `competitors[].score` | mart_competitor_analysis | competitor_score |
| `dominanceScore` | mart_district_leaderboard | dominance_score |

---

## 常见问题

### Q: 为什么用三层架构？

A: 三层架构提供：
- **可追溯性**: Raw 层保留原始数据
- **可测试性**: 每层可独立验证
- **可维护性**: 逻辑分离

### Q: RLS 策略会影响性能吗？

A: 对于简单的 `auth.uid()` 检查，影响很小。

### Q: 如何处理商户名模糊匹配？

```sql
SELECT * FROM stg.unique_businesses 
WHERE canonical_name % 'Bistrot 916'
ORDER BY similarity(canonical_name, 'Bistrot 916') DESC;
```
