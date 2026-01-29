/**
 * Surry Hills 模拟数据生成器
 * 生成真实的商户和热力图数据
 */

const h3 = require('h3-js');

// Surry Hills 边界 (大致范围)
const SURRY_HILLS_BOUNDS = {
  north: -33.875,
  south: -33.895,
  west: 151.205,
  east: 151.225
};

// 真实的 Surry Hills 商户 (示例)
const SURRY_HILLS_BUSINESSES = [
  { name: "Porteño", lat: -33.8842, lng: 151.2115, category: "restaurant", tier: "top" },
  { name: "Firedoor", lat: -33.8855, lng: 151.2108, category: "restaurant", tier: "top" },
  { name: "Chin Chin Sydney", lat: -33.8810, lng: 151.2095, category: "restaurant", tier: "top" },
  { name: "The Winery", lat: -33.8835, lng: 151.2125, category: "bar", tier: "mid" },
  { name: "Reuben Hills", lat: -33.8862, lng: 151.2118, category: "cafe", tier: "top" },
  { name: "Single O", lat: -33.8848, lng: 151.2102, category: "cafe", tier: "mid" },
  { name: "Paramount Coffee Project", lat: -33.8830, lng: 151.2088, category: "cafe", tier: "top" },
  { name: "Dead Ringer", lat: -33.8858, lng: 151.2095, category: "bar", tier: "mid" },
  { name: "Toko", lat: -33.8825, lng: 151.2110, category: "restaurant", tier: "mid" },
  { name: "Bar Reggio", lat: -33.8870, lng: 151.2130, category: "bar", tier: "low" },
  { name: "Messina", lat: -33.8838, lng: 151.2098, category: "dessert", tier: "top" },
  { name: "Bourke Street Bakery", lat: -33.8865, lng: 151.2122, category: "cafe", tier: "top" },
  { name: "Longrain", lat: -33.8815, lng: 151.2078, category: "restaurant", tier: "mid" },
  { name: "Nomad", lat: -33.8820, lng: 151.2105, category: "restaurant", tier: "top" },
  { name: "The Clock Hotel", lat: -33.8875, lng: 151.2135, category: "bar", tier: "low" },
  { name: "Belly Bao", lat: -33.8845, lng: 151.2090, category: "restaurant", tier: "mid" },
  { name: "Spice I Am", lat: -33.8868, lng: 151.2085, category: "restaurant", tier: "mid" },
  { name: "Bodega", lat: -33.8852, lng: 151.2112, category: "restaurant", tier: "mid" },
  { name: "121BC", lat: -33.8860, lng: 151.2100, category: "bar", tier: "mid" },
  { name: "Kawa Cafe", lat: -33.8840, lng: 151.2080, category: "cafe", tier: "low" },
];

// Prompt 类型
const PROMPT_TYPES = [
  "Generic_Best",
  "Date_Night", 
  "Business_Lunch",
  "Casual_Drinks",
  "Coffee_Spot"
];

// 根据商户 tier 和 prompt 类型计算可见度分数
function calculateVisibility(business, promptType) {
  const tierScores = { top: 85, mid: 55, low: 25 };
  let base = tierScores[business.tier] || 50;
  
  // 根据 prompt 类型调整
  const categoryBonus = {
    "Date_Night": { restaurant: 15, bar: 10, cafe: -10 },
    "Business_Lunch": { restaurant: 10, cafe: 5, bar: -15 },
    "Coffee_Spot": { cafe: 25, dessert: 10, restaurant: -20, bar: -30 },
    "Casual_Drinks": { bar: 20, restaurant: 5, cafe: -10 },
    "Generic_Best": { restaurant: 5, cafe: 5, bar: 5 }
  };
  
  const bonus = categoryBonus[promptType]?.[business.category] || 0;
  
  // 添加随机波动 (-10 到 +10)
  const noise = Math.floor(Math.random() * 21) - 10;
  
  return Math.max(0, Math.min(100, base + bonus + noise));
}

// 生成 H3 格子覆盖 Surry Hills
function generateH3Grid(resolution = 10) {
  const { north, south, west, east } = SURRY_HILLS_BOUNDS;
  const polygon = [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south]
  ];
  
  return h3.polygonToCells(polygon, resolution, true);
}

// 为每个格子生成热力图数据
function generateHeatmapData(promptType = "Generic_Best") {
  const h3Indexes = generateH3Grid(10);
  
  return h3Indexes.map(h3Index => {
    const [lat, lng] = h3.cellToLatLng(h3Index);
    
    // 找出这个格子附近的商户
    const nearbyBusinesses = SURRY_HILLS_BUSINESSES.filter(b => {
      const dist = Math.sqrt(
        Math.pow((b.lat - lat) * 111000, 2) + 
        Math.pow((b.lng - lng) * 111000 * Math.cos(lat * Math.PI / 180), 2)
      );
      return dist < 150; // 150米内 (H3 res10 格子约 66米边长)
    });
    
    // 如果没有商户，给一个基于位置的随机分数 (模拟整体区域热度)
    if (nearbyBusinesses.length === 0) {
      // 基于位置生成稳定的随机分数
      const seed = Math.abs(lat * 1000 + lng * 1000) % 100;
      const baseScore = Math.floor(seed * 0.6); // 0-60 的基础分
      
      return {
        h3Index,
        lat,
        lng,
        promptType,
        avgVisibility: baseScore,
        maxVisibility: baseScore,
        businessCount: 0,
        topBusinesses: [],
        competitionScore: 0
      };
    }
    
    if (nearbyBusinesses.length === 0) {
      return {
        h3Index,
        lat,
        lng,
        promptType,
        avgVisibility: 0,
        maxVisibility: 0,
        businessCount: 0,
        topBusinesses: [],
        competitionScore: 0
      };
    }
    
    // 计算每个商户的可见度
    const businessScores = nearbyBusinesses.map(b => ({
      name: b.name,
      score: calculateVisibility(b, promptType)
    })).sort((a, b) => b.score - a.score);
    
    const avgVisibility = Math.round(
      businessScores.reduce((sum, b) => sum + b.score, 0) / businessScores.length
    );
    
    return {
      h3Index,
      lat,
      lng,
      promptType,
      avgVisibility,
      maxVisibility: businessScores[0]?.score || 0,
      businessCount: businessScores.length,
      topBusinesses: businessScores.slice(0, 3).map(b => b.name),
      competitionScore: Math.min(100, businessScores.length * 15)
    };
  });
}

module.exports = {
  SURRY_HILLS_BOUNDS,
  SURRY_HILLS_BUSINESSES,
  PROMPT_TYPES,
  generateH3Grid,
  generateHeatmapData,
  generateBusinessList,
  calculateVisibility
};


// 生成商户列表 (带 H3 索引)
function generateBusinessList() {
  return SURRY_HILLS_BUSINESSES.map((b, idx) => ({
    id: idx + 1,
    ...b,
    h3Index: h3.latLngToCell(b.lat, b.lng, 10),
    district: "Surry Hills"
  }));
}

module.exports = {
  SURRY_HILLS_BOUNDS,
  SURRY_HILLS_BUSINESSES,
  PROMPT_TYPES,
  generateH3Grid,
  generateHeatmapData,
  generateBusinessList,
  calculateVisibility
};
