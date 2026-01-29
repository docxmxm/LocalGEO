# GoldEater - AI Visibility Data Collectors

数据采集爬虫集合，负责从各 AI 平台和数据源获取原始数据。

## 架构

```
GoldEater/
├── chatgpt/        # OpenAI API 采集
├── perplexity/     # Perplexity API 采集
├── gemini/         # Google AI API 采集
├── claude/         # Anthropic API 采集
├── places/         # Google Places API 补全
├── shared/         # 共享工具和配置
└── orchestrator.py # 调度器
```

## 数据流

```
┌─────────────────────────────────────────────────────────────────┐
│                        ORCHESTRATOR                              │
│                    (调度 + H3 网格生成)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   ChatGPT     │   │  Perplexity   │   │    Gemini     │   ...
│   GoldEater   │   │   GoldEater   │   │   GoldEater   │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        └─────────────────────┼─────────────────────┘
                              ▼
                    ┌───────────────┐
                    │    Places     │
                    │   GoldEater   │
                    │ (补全位置信息) │
                    └───────┬───────┘
                              │
                              ▼
                    ┌───────────────┐
                    │   Database    │
                    │  raw.scan_*   │
                    └───────────────┘
```

## 各 GoldEater 职责

| GoldEater | 数据源 | 输出字段 |
|-----------|--------|----------|
| chatgpt | OpenAI API | raw_name, rank, reasoning, vibe_tags |
| perplexity | Perplexity API | raw_name, rank, reasoning, citation_urls |
| gemini | Google AI API | raw_name, rank, reasoning, vibe_tags |
| claude | Anthropic API | raw_name, rank, reasoning, vibe_tags |
| places | Google Places API | lat, lng, address, google_place_id |

## 运行

```bash
# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env

# 运行完整扫描
python orchestrator.py --district surry_hills --full-scan

# 运行单个 GoldEater
python -m chatgpt.eater --h3-index 8a384da6000ffff
```
