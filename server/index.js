const express = require('express');
const cors = require('cors');
const h3 = require('h3-js');
const { 
  generateHeatmapData, 
  generateBusinessList, 
  PROMPT_TYPES,
  SURRY_HILLS_BOUNDS 
} = require('./mock-data');

const app = express();
app.use(cors());
app.use(express.json());

// 缓存生成的数据
let heatmapCache = {};
let businessList = generateBusinessList();

// 初始化热力图缓存
PROMPT_TYPES.forEach(type => {
  heatmapCache[type] = generateHeatmapData(type);
});

/**
 * GET /api/heatmap
 * 获取热力图数据
 * Query: min_lat, max_lat, min_lng, max_lng, zoom, prompt_type
 */
app.get('/api/heatmap', (req, res) => {
  const { 
    min_lat, max_lat, min_lng, max_lng, 
    zoom = 14, 
    prompt_type = 'Generic_Best' 
  } = req.query;

  const data = heatmapCache[prompt_type] || heatmapCache['Generic_Best'];
  
  // 如果有边界参数，过滤数据
  let filtered = data;
  if (min_lat && max_lat && min_lng && max_lng) {
    filtered = data.filter(d => 
      d.lat >= parseFloat(min_lat) && 
      d.lat <= parseFloat(max_lat) &&
      d.lng >= parseFloat(min_lng) && 
      d.lng <= parseFloat(max_lng)
    );
  }

  res.json({
    promptType: prompt_type,
    count: filtered.length,
    bounds: SURRY_HILLS_BOUNDS,
    data: filtered
  });
});

/**
 * GET /api/businesses
 * 获取商户列表
 */
app.get('/api/businesses', (req, res) => {
  const { district, category } = req.query;
  
  let filtered = businessList;
  if (district) {
    filtered = filtered.filter(b => b.district === district);
  }
  if (category) {
    filtered = filtered.filter(b => b.category === category);
  }

  res.json({
    count: filtered.length,
    data: filtered
  });
});

/**
 * GET /api/business/:id/visibility
 * 获取单个商户在各场景下的可见度
 */
app.get('/api/business/:id/visibility', (req, res) => {
  const business = businessList.find(b => b.id === parseInt(req.params.id));
  if (!business) {
    return res.status(404).json({ error: 'Business not found' });
  }

  // 计算该商户在各 prompt 下的可见度
  const visibility = {};
  PROMPT_TYPES.forEach(type => {
    const gridData = heatmapCache[type].find(g => g.h3Index === business.h3Index);
    visibility[type] = gridData?.topBusinesses.includes(business.name) 
      ? gridData.maxVisibility 
      : Math.floor(Math.random() * 40) + 20;
  });

  res.json({
    business,
    visibility,
    promptTypes: PROMPT_TYPES
  });
});

/**
 * GET /api/prompt-types
 * 获取所有 prompt 类型
 */
app.get('/api/prompt-types', (req, res) => {
  res.json(PROMPT_TYPES);
});

/**
 * POST /api/free-scan
 * 免费单次扫描 - 模拟 AI 可见度检测
 */
app.post('/api/free-scan', (req, res) => {
  const { businessName, city } = req.body;
  
  if (!businessName || !city) {
    return res.status(400).json({ error: 'Business name and city are required' });
  }

  // 模拟扫描结果
  const isVisible = Math.random() > 0.6; // 40% 概率不可见
  const mentionCount = isVisible ? Math.floor(Math.random() * 8) + 2 : Math.floor(Math.random() * 2);
  
  const result = {
    business: {
      name: businessName,
      city: city,
      category: 'Restaurant'
    },
    isVisible,
    totalScans: 50,
    mentionCount,
    
    // 各平台分数
    platformScores: {
      chatgpt: { 
        score: Math.floor(Math.random() * 40) + (isVisible ? 40 : 10), 
        status: isVisible ? 'indexed' : 'missing' 
      },
      perplexity: { 
        score: Math.floor(Math.random() * 30) + (isVisible ? 50 : 15), 
        status: isVisible ? 'indexed' : 'warning' 
      },
      gemini: { 
        score: Math.floor(Math.random() * 35) + (isVisible ? 35 : 5), 
        status: Math.random() > 0.5 ? 'warning' : 'indexed' 
      },
      claude: { 
        score: Math.floor(Math.random() * 25) + (isVisible ? 45 : 20), 
        status: isVisible ? 'indexed' : 'missing' 
      }
    },
    
    // 竞争对手
    competitors: [
      { name: "Joe's Pizza", mentions: 12, diff: 12 - mentionCount },
      { name: "Mario's Kitchen", mentions: 9, diff: 9 - mentionCount },
      { name: "The Local Bistro", mentions: 8, diff: 8 - mentionCount },
      { name: "Corner Cafe", mentions: 6, diff: 6 - mentionCount },
      { name: "Downtown Diner", mentions: 5, diff: 5 - mentionCount }
    ],
    
    // Why Not Me 分析
    whyNotMe: [
      {
        competitor: "Joe's Pizza",
        platform: "ChatGPT",
        reason: "Competitor has 'family-friendly' and 'kid-friendly' semantic tags on Yelp, which matches common search intents.",
        action: "Add family-friendly attributes to your Yelp and Google Business Profile."
      },
      {
        competitor: "Mario's Kitchen",
        platform: "Perplexity",
        reason: "Competitor's Foursquare data was updated 2 weeks ago, while yours hasn't been updated in 6 months.",
        action: "Update your Foursquare business listing with current hours and photos."
      },
      {
        competitor: "The Local Bistro",
        platform: "Gemini",
        reason: "Competitor has 47 Google reviews with 4.6 average, you have 12 reviews with 4.2 average.",
        action: "Encourage customers to leave Google reviews to improve your rating signal."
      }
    ],
    
    // Citation 审计
    citations: [
      { name: "Google Business", status: "good", detail: "Profile is claimed and verified" },
      { name: "Yelp", status: "warning", detail: "Missing business hours and 3 photos" },
      { name: "Foursquare", status: "missing", detail: "No listing found - AI cannot reference your business" },
      { name: "TripAdvisor", status: "warning", detail: "Listing exists but not claimed" }
    ],
    
    // 幻觉检测
    hallucinations: Math.random() > 0.5 ? [
      {
        platform: "ChatGPT",
        type: "Business Hours",
        aiSays: "Open until 10 PM on Sundays",
        reality: "Closed on Sundays",
        impact: "Customers may arrive when you're closed, leading to negative reviews."
      },
      {
        platform: "Gemini",
        type: "Menu Item",
        aiSays: "Known for their lobster bisque",
        reality: "You don't serve lobster bisque",
        impact: "Customers expecting this dish will be disappointed."
      }
    ] : []
  };

  // 模拟延迟
  setTimeout(() => {
    res.json(result);
  }, 1500);
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🗺️  Heatmap API running at http://localhost:${PORT}`);
  console.log(`   Endpoints:`);
  console.log(`   - GET /api/heatmap?prompt_type=Date_Night`);
  console.log(`   - GET /api/businesses`);
  console.log(`   - GET /api/business/:id/visibility`);
  console.log(`   - GET /api/prompt-types`);
});
