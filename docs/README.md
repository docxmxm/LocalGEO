# AI Visibility Platform - 文档目录

## 📁 文档结构

```
docs/
├── README.md                          # 本文件 - 文档索引
│
├── database/                          # 数据库设计
│   ├── architecture.md                # 三层架构设计
│   └── schema.sql                     # 完整建表 SQL
│
├── data-pipeline/                     # 数据管道
│   └── raw-data-requirements.md       # Raw 数据采集需求
│
├── guides/                            # 操作指南
│   └── setup-guide.md                 # 数据库建立步骤
│
└── operations/                        # 运维相关
    └── production-enhancements.md     # 生产级别增强
```

---

## 🚀 快速开始

1. **了解架构**: 阅读 [database/architecture.md](database/architecture.md)
2. **建立数据库**: 按照 [guides/setup-guide.md](guides/setup-guide.md) 操作
3. **配置采集**: 参考 [data-pipeline/raw-data-requirements.md](data-pipeline/raw-data-requirements.md)
4. **生产部署**: 应用 [operations/production-enhancements.md](operations/production-enhancements.md)

---

## 📊 架构概览

```
Python Agent → raw.scan_results → dbt → mart_* tables → Supabase API → Frontend
```

### 三层架构

| 层级 | Schema | 职责 |
|------|--------|------|
| Layer 1 | `raw` | 原始数据存储 |
| Layer 2 | `stg` | 数据清洗转换 |
| Layer 3 | `public` | 业务展示层 |

---

## 📋 表清单

### Raw 层
- `raw.scan_results` - AI 平台扫描原始结果

### Staging 层
- `stg.unique_businesses` - 商户主数据
- `stg.rankings_flattened` - 排名展开
- `stg.business_metrics` - 商户指标

### Marts 层
- `mart_heatmap_snapshot` - 热力图
- `mart_district_leaderboard` - 排行榜
- `mart_ai_index_status` - AI 索引状态
- `mart_competitor_analysis` - 竞争对手
- `mart_business_scenario_ranks` - 场景排名
- `user_monitors` - 用户订阅

---

## 🔗 相关资源

- [Supabase 文档](https://supabase.com/docs)
- [dbt 文档](https://docs.getdbt.com)
- [H3 地理索引](https://h3geo.org)
