User Workflow
Step 1: 恐惧营销 (The Hook)
用户在 Landing Page （免费）
- 按照地图看到自己区域内的热力图ai visibility分布情况
- 输入商家名称 + 城市。系统免费运行一次“单点扫描”。
  - 结果展示：“警告：在 ChatGPT 中，你的竞争对手 'Joe's Pizza' 被推荐了 5 次，而你被标记为‘永久停业’（幻觉）。” -> 触发注册。
Step2: 注册后可订阅
Step 3: 注册后可选择咨询visibility optimization 服务

---
产品主要功能
功能1:  首页AI 推荐热力图 (AI Geo-Heatmap) + 单次免费搜索
首页内容： 可视化商家在不同街区的 AI visibility（红/黄/绿）
内容细节：
1. GPT/Gemini/和其他llm搜索引擎的50次搜索结果/每周，对比以及简要分析
  - Example keywords：最好的餐馆/最好的日式餐馆
2. Uber H3 (六边形)（ 以商家本身经纬度为中心）范围搜索同类品的结果 -- 地图显示
3. 提供一次免费的搜索查询和对应的解释：Why not me？
  1. user输入自己的店铺搜索一次
  2. 返回搜索结果并指出引用源审计（Citation Audit）
    - “Competitor A 胜出是因为它在 Yelp 上有‘适合儿童’的语义标签，而你的评论中缺乏此类关键词。”
    - “Competitor B 胜出是因为它在 Foursquare 上的数据更新，被 Apple Intelligence 优先引用。”
4. Report文章：
Example: Do you know how much the following information affects your AI visibility?
功能2: AI GEO 订阅追踪
订阅Subscription服务
1. 用户订阅后，绑定商铺（店铺名称+address）
2. 对于这个specific店铺，可以
  1. Trace 他的AI Geo-Heatmap
  2. 在不同keywords搜索下的结果，可以选择15个关键词，
  3. 每周更新visibility/情感分析（用户的feedback大概是什么样的）
3. extra: 幻觉侦测器 (Hallucination Hunter): 自动检测 AI 是否在营业时间、菜单或服务项目上“撒谎”。
  1. 可视化的幻觉报告：直接告诉商家“ChatGPT 说你周日关门，但其实你开门”。
功能3. Fingerprint Optimization: 检查并修复 AI 的核心信源
This content is only supported in a Lark Docs

---
后端
热力图计算公式
Hall 的计算公式
1. AI Visibility (AI 可见性) 的计算逻辑
这是一个定量指标，衡量品牌在特定话题下被 AI “想起”的概率。
- 采样机制 (Sampling)：系统针对一个品牌预设一组 Prompt（通常包含 50-100 个查询，覆盖“品牌类”、“类别类”、“对比类”问题）。系统会向各大 LLM（ChatGPT, Gemini, Perplexity）发送这些 Prompt。由于 LLM 的输出具有随机性（Temperature 参数），同一 Prompt 可能会运行多次（例如 3-5 次）以取平均值 (1)。
  - 基础公式：
  $$Visibility = \frac{\text{Successful Mentions}}{\text{Total Prompts Run}} \times 100$$
  注：Successful Mentions 指品牌名称出现在回答正文中。
- 加权因子：UseHall 通常会引入权重（Weighted Score）：
  - 位置权重 (Position)：品牌出现在回答的前 20% 文本中，权重为 1.0；出现在末尾，权重衰减至 0.5 (3)。
  - 推荐强度 (Recommendation)：如果 AI 使用“Top Pick”或“Best”描述，得分为 1.0；如果仅在“Alternatives”列表中，得分为 0.3。
2. AI Appearance (AI 表现 / 份额) 的计算逻辑
这是一个定性与竞争结合的指标，类似于传统营销中的“声量份额”（Share of Voice, SOV）。
计算公式：

$$SOV = \frac{\text{Your Brand Mentions}}{\text{Total Mentions of All Brands in Category}} \times 100$$
- 情感校准 (Sentiment Calibration)：单纯的提及是不够的。UseHall 使用 NLP 模型分析提及时的上下文情感：
  - Appearance Score = $SOV \times \text{Sentiment Score}$
  - Sentiment Score：正面评价（+1），中性评价（0），负面评价（-1）。如果品牌被频繁提及但全是负面评价，其最终 Appearance 分数会大打折扣 (1)。
- 引用归因 (Citation)：追踪 AI 回答中脚注链接的来源。如果链接指向品牌官网，得分最高；指向权威第三方（如 Wikipedia, G2），得分次之 (1)。
虚天图 Local Business 专属算法（加入的额外因素）
增加物理坐标对 RAG（检索增强生成）的绝对控制权，引入以下四个维度的“地理修正因子”。
1. 地理围栏采样 (Geo-Fenced Sampling) —— 替代单纯的 Prompt
通用 LLM 是基于全网数据训练的，但当用户问“附近的咖啡馆”时，LLM 会调用实时地理数据。
- 核心差异：你不能只发 Prompt，你必须模拟坐标。
- 计算逻辑：引入 Grid Tracking (网格追踪)。以商家为中心，建立一个 3x3 或 5x5 的地理网格（例如每隔 500 米一个点）。
- 新公式 (Geo-Visibility)：

$$V_{local} = \frac{\sum (\text{Mentioned at Point}_i \times \text{Distance Weight}_i)}{\text{Total Grid Points}}$$
这能真实反映商户在不同街区的“统治力”。
2. 数据源一致性指数 (Source Consistency Index) —— 针对 RAG 幻觉
ChatGPT 的本地推荐极度依赖 Foursquare 和 Bing Places ；Apple Intelligence 依赖 Yelp ；Gemini 依赖 Google Maps。
- 计算逻辑：你的平台需要抓取商户在 Foursquare, Bing, Yelp, Google 上的 NAP (Name, Address, Phone) 数据。
- 算法修正：如果商户在 Foursquare 上的数据与 Google 不一致，AI 极大概率会因为“数据冲突”而拒绝推荐该商户。
- 指标设计：Trust Score (信任分)。如果四大平台数据完全一致，Trust Score = 1.0；每发现一个平台数据冲突，扣除 0.25 分。这个分数直接作为 Visibility 的乘数因子。
3. 语义属性匹配度 (Semantic Attribute Match)
AI 推荐不再基于关键词匹配（如“Pizza”），而是基于语义理解（如“适合约会的安静地方”）。
- Foursquare Tastes：Foursquare 有特定的 "Tastes" 标签系统（Cozy, Trendy, Late Night）(15)。
- 计算逻辑：分析目标 Prompt 的意图（例如“安静”），检查商户在 Foursquare/Yelp 上是否具备对应的结构化属性标签。
- 建议：在你的 Dashboard 中增加一个“属性覆盖率”指标，告诉商户：“你虽然卖 Pizza，但因为缺少‘适合儿童’的标签，导致在‘家庭聚餐’类的 AI 提问中丢失了 80% 的曝光。”
4. 营业时间幻觉率 (Opening Hour Hallucination Rate)
这是本地搜索中最痛的点。LLM 经常在商户关门时胡说它是“营业中”。
- 计算逻辑：
  1. 抓取商户真实的营业时间 schema（来自官网或 Google Maps）。
  2. 在商户即将关门前 30 分钟或特殊节假日，高频向 LLM 发起询问：“这家店现在开门吗？”
  3. 幻觉率公式：
  $$\text{Hallucination Rate} = \frac{\text{Incorrect Status Responses}}{\text{Total Status Checks}} \times 100$$
  这个指标对餐饮和零售商户具有极高的付费吸引力。

---
开发文档
1. Prompt
2. Database
  目标商户锚点数据 (Anchor Data)
  - 商户名称 (Target Name): 如 "Joe's Pizza"。
  - 核心经纬度 (Anchor Lat/Long): 店铺的确切物理坐标。
  - 官方 NAP (Name, Address, Phone): 用于后续验证 LLM 是否产生了幻觉。
  地理网格采样点 (Geo-Grid Points)
  - H3 六边形中心点 (Grid Centroids): 基于 Uber H3 算法，以商户为中心，生成周边 3x3 或 5x5 网格的经纬度列表。
  - 距离元数据 (Distance Metadata): 每个采样点距离商户中心的直线距离（用于计算权重 $Distance Weight$）。
  - 模拟位置上下文 (Context Injection): LLM API 通常不直接接受 GPS，你需要构建包含位置语义的 System Prompt。
    - 数据示例: "Current User Context: Located at [Lat, Long], near [Nearest Landmark]."
  语义查询库 (Semantic Query Bank)
  - 类别关键词 (Category Keywords): 如 "Best Pizza", "Italian Restaurant"。
  - 意图 Prompt (Intent-Based Prompts): 带有具体场景的查询，如 "适合约会的安静餐厅"、"现在还开着的披萨店"。
  - 竞品 Prompt (Comparison Prompts): 如 "Joe's Pizza vs Domino's"。