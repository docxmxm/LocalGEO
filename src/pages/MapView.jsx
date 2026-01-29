import React, { useState, useEffect } from 'react';
import Map from 'react-map-gl/maplibre';
import { WebMercatorViewport } from '@deck.gl/core';
import { DeckGL } from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers';
import { H3HexagonLayer } from '@deck.gl/geo-layers';
import 'maplibre-gl/dist/maplibre-gl.css';
import './MapView.css';

// 区域配置
const SUBURBS = [
  { id: 'surry_hills', name: 'Surry Hills', center: { lng: 151.215, lat: -33.885 }, zoom: 15 },
  { id: 'newtown', name: 'Newtown', center: { lng: 151.179, lat: -33.897 }, zoom: 15 },
  { id: 'paddington', name: 'Paddington', center: { lng: 151.226, lat: -33.884 }, zoom: 15 },
  { id: 'darlinghurst', name: 'Darlinghurst', center: { lng: 151.222, lat: -33.877 }, zoom: 15 },
  { id: 'potts_point', name: 'Potts Point', center: { lng: 151.228, lat: -33.869 }, zoom: 15 },
];

// 场景配置
const SCENARIOS = [
  { id: 'overall', label: 'Overall' },
  { id: 'date_night', label: 'Date Night' },
  { id: 'business_lunch', label: 'Business Lunch' },
  { id: 'avoid_tourist', label: 'Avoid Tourist Traps' },
  { id: 'coffee_spot', label: 'Coffee Spot' },
];

// French Restaurants 数据
const FRENCH_RESTAURANTS = [
  { 
    id: 1, name: "Hubert", 
    lat: -33.8675, lng: 151.2090,
    address: "15 Bligh St, Sydney",
    description: "Underground French brasserie with live jazz, classic cocktails and an extensive wine list.",
    cuisine: "French Brasserie",
    priceRange: "$$$",
    rankings: { overall: 1, date_night: 1, business_lunch: 2, avoid_tourist: 3, coffee_spot: 8 },
    scores: { overall: 96, date_night: 98, business_lunch: 88, avoid_tourist: 72, coffee_spot: 25 },
    aiTags: ["Classic", "Live Jazz", "Institution", "Romantic"],
    suburb: "Sydney CBD"
  },
  { 
    id: 2, name: "Bistrot 916", 
    lat: -33.8855, lng: 151.2115,
    address: "916 Bourke St, Waterloo",
    description: "Neighbourhood French bistro known for fresh seafood and relaxed atmosphere.",
    cuisine: "French Bistro",
    priceRange: "$$",
    rankings: { overall: 3, date_night: 4, business_lunch: 5, avoid_tourist: 2, coffee_spot: 6 },
    scores: { overall: 72, date_night: 68, business_lunch: 61, avoid_tourist: 85, coffee_spot: 42 },
    aiTags: ["Trendy", "Seafood", "Neighbourhood", "Local gem"],
    suburb: "Surry Hills",
    isYou: true
  },
  { 
    id: 3, name: "Felix", 
    lat: -33.8612, lng: 151.2085,
    address: "2 Ash St, Sydney",
    description: "Elegant French restaurant in a heritage laneway with upscale dining experience.",
    cuisine: "French Fine Dining",
    priceRange: "$$$$",
    rankings: { overall: 2, date_night: 2, business_lunch: 1, avoid_tourist: 6, coffee_spot: 9 },
    scores: { overall: 88, date_night: 92, business_lunch: 95, avoid_tourist: 45, coffee_spot: 18 },
    aiTags: ["Upscale", "Romantic", "CBD", "Special occasion"],
    suburb: "Sydney CBD"
  },
  { 
    id: 4, name: "Bistro Rex", 
    lat: -33.8780, lng: 151.2135,
    address: "50 Reservoir St, Surry Hills",
    description: "Classic French bistro with Art Deco interiors and traditional dishes.",
    cuisine: "French Bistro",
    priceRange: "$$",
    rankings: { overall: 5, date_night: 6, business_lunch: 4, avoid_tourist: 4, coffee_spot: 7 },
    scores: { overall: 61, date_night: 55, business_lunch: 68, avoid_tourist: 70, coffee_spot: 35 },
    aiTags: ["Classic", "Art Deco", "Traditional", "Cozy"],
    suburb: "Surry Hills"
  },
  { 
    id: 5, name: "Brasserie Bread", 
    lat: -33.8920, lng: 151.1785,
    address: "1-3 Botany Rd, Waterloo",
    description: "French-inspired bakery and cafe with artisan breads and pastries.",
    cuisine: "French Bakery",
    priceRange: "$",
    rankings: { overall: 7, date_night: 9, business_lunch: 8, avoid_tourist: 1, coffee_spot: 2 },
    scores: { overall: 52, date_night: 28, business_lunch: 35, avoid_tourist: 92, coffee_spot: 88 },
    aiTags: ["Bakery", "Casual", "Local favourite", "Breakfast"],
    suburb: "Waterloo"
  },
  { 
    id: 6, name: "Restaurant Hubert", 
    lat: -33.8842, lng: 151.2108,
    address: "15 Bligh St, Sydney",
    description: "Sister venue offering French classics in an intimate setting.",
    cuisine: "French Classic",
    priceRange: "$$$",
    rankings: { overall: 4, date_night: 3, business_lunch: 3, avoid_tourist: 5, coffee_spot: 10 },
    scores: { overall: 65, date_night: 78, business_lunch: 75, avoid_tourist: 58, coffee_spot: 15 },
    aiTags: ["Intimate", "Wine bar", "Late night", "Sophisticated"],
    suburb: "Surry Hills"
  },
];

// 根据排名返回颜色
function getRankColor(rank) {
  if (rank <= 3) return [34, 197, 94, 230];
  if (rank <= 5) return [250, 204, 21, 230];
  return [239, 68, 68, 200];
}

function getHexColor(score) {
  if (score >= 70) return [34, 197, 94, 150];
  if (score >= 50) return [134, 239, 172, 150];
  if (score >= 30) return [250, 204, 21, 150];
  return [239, 68, 68, 120];
}

export default function MapView() {
  const [selectedSuburb, setSelectedSuburb] = useState(SUBURBS[0]);
  const [viewState, setViewState] = useState({
    longitude: SUBURBS[0].center.lng,
    latitude: SUBURBS[0].center.lat,
    zoom: SUBURBS[0].zoom,
    pitch: 0,
    bearing: 0
  });
  const [heatmapData, setHeatmapData] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState('overall');
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [selectedHex, setSelectedHex] = useState(null);
  const [popupInfo, setPopupInfo] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const mapContainerRef = React.useRef(null);
  const [viewportDimensions, setViewportDimensions] = useState({ width: 1, height: 1 });

  useEffect(() => {
    if (mapContainerRef.current) {
      const updateDimensions = () => {
        setViewportDimensions({
          width: mapContainerRef.current.offsetWidth,
          height: mapContainerRef.current.offsetHeight
        });
      };
      
      updateDimensions();
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    }
  }, []);

  const getPopupPosition = () => {
    if (!popupInfo) return null;
    const viewport = new WebMercatorViewport({
      ...viewState,
      width: viewportDimensions.width,
      height: viewportDimensions.height
    });
    const [x, y] = viewport.project([popupInfo.lng, popupInfo.lat]);
    return { x, y };
  };

  // 切换区域
  const handleSuburbChange = (suburb) => {
    setSelectedSuburb(suburb);
    setViewState(prev => ({
      ...prev,
      longitude: suburb.center.lng,
      latitude: suburb.center.lat,
      zoom: suburb.zoom
    }));
    setSelectedRestaurant(null);
    setSelectedHex(null);
  };

  // 加载热力图数据
  useEffect(() => {
    fetch(`/api/heatmap?prompt_type=Generic_Best`)
      .then(res => res.json())
      .then(data => {
        const withScenarios = (data.data || []).map(hex => ({
          ...hex,
          scenarioScores: {
            overall: hex.avgVisibility,
            date_night: Math.floor(Math.random() * 40) + (hex.avgVisibility * 0.6),
            business_lunch: Math.floor(Math.random() * 30) + (hex.avgVisibility * 0.5),
            avoid_tourist: Math.floor(Math.random() * 50) + (hex.avgVisibility * 0.4),
            coffee_spot: Math.floor(Math.random() * 35) + (hex.avgVisibility * 0.5),
          },
          // 为每个格子生成推荐列表
          recommendations: generateRecommendations()
        }));
        setHeatmapData(withScenarios);
      })
      .catch(console.error);
  }, []);

  // 生成推荐列表
  function generateRecommendations() {
    const shuffled = [...FRENCH_RESTAURANTS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5).map((r, idx) => ({
      ...r,
      localRank: idx + 1,
      localScore: Math.floor(Math.random() * 30) + 60
    }));
  }

  // 获取当前场景下的排行榜
  function getLeaderboard() {
    return [...FRENCH_RESTAURANTS]
      .sort((a, b) => a.rankings[selectedScenario] - b.rankings[selectedScenario])
      .map((r, idx) => ({ ...r, displayRank: idx + 1 }));
  }

  const layers = [
    showHeatmap && new H3HexagonLayer({
      id: 'h3-heatmap',
      data: heatmapData,
      pickable: true,
      filled: true,
      extruded: false,
      getHexagon: d => d.h3Index,
      getFillColor: d => getHexColor(d.scenarioScores?.[selectedScenario] || d.avgVisibility),
      opacity: 0.8,
      onClick: (info) => {
        if (info.object) {
          setSelectedHex(info.object);
          setSelectedRestaurant(null);
          // 阻止事件冒泡
          return true;
        }
      },
      updateTriggers: { getFillColor: [selectedScenario] }
    }),

    new ScatterplotLayer({
      id: 'restaurants',
      data: FRENCH_RESTAURANTS,
      pickable: true,
      getPosition: d => [d.lng, d.lat],
      getRadius: d => selectedRestaurant?.id === d.id ? 16 : 12,
      getFillColor: d => {
        if (d.isYou) return [59, 130, 246, 255]; // 蓝色 - 你的店
        return getRankColor(d.rankings[selectedScenario]);
      },
      getLineColor: d => d.isYou ? [255, 255, 255, 255] : [255, 255, 255, 200],
      lineWidthMinPixels: d => d.isYou ? 3 : 2,
      stroked: true,
      radiusMinPixels: 10,
      radiusMaxPixels: 20,
      onClick: (info) => {
        if (info.object) {
          setPopupInfo(info.object);
          setSelectedRestaurant(null);
          setSelectedHex(null);
          // 阻止事件冒泡防止触发 DeckGL 的背景点击
          return true;
        }
      },
      updateTriggers: {
        getFillColor: [selectedScenario, selectedRestaurant],
        getRadius: [selectedRestaurant]
      }
    })
  ].filter(Boolean);

  return (
    <div className="map-page">
      {/* 左侧边栏 */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Strategic Map</h2>
          <p>French Restaurants · AI Visibility</p>
        </div>

        {/* 场景切换 */}
        <div className="scenario-toggles">
          <label className="toggle-label">Filter by Scenario</label>
          <div className="toggle-buttons">
            {SCENARIOS.map(scenario => (
              <button
                key={scenario.id}
                className={`toggle-btn ${selectedScenario === scenario.id ? 'active' : ''}`}
                onClick={() => setSelectedScenario(scenario.id)}
              >
                <span className="toggle-text">{scenario.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 热力图开关 */}
        <div className="heatmap-toggle">
          <label>
            <input 
              type="checkbox" 
              checked={showHeatmap}
              onChange={e => setShowHeatmap(e.target.checked)}
            />
            Show Heatmap Overlay
          </label>
        </div>

        {/* 动态内容区域 */}
        <div className="sidebar-content">
          {/* 默认：排行榜 */}
          {!selectedRestaurant && !selectedHex && (
            <div className="leaderboard">
              <div className="leaderboard-header">
                <h3>AI Leaderboard</h3>
                <span className="leaderboard-subtitle">
                  {SCENARIOS.find(s => s.id === selectedScenario)?.label}
                </span>
              </div>
              <div className="leaderboard-list">
                {getLeaderboard().map((item) => (
                  <div 
                    key={item.id}
                    className={`leaderboard-item ${item.isYou ? 'is-you' : ''}`}
                    onClick={() => setSelectedRestaurant(item)}
                  >
                    <div className="rank-medal">
                      <span className="rank-num">{item.displayRank}</span>
                    </div>
                    <div className="item-info">
                      <div className="item-name">
                        {item.name}
                        {item.isYou && <span className="you-badge">You</span>}
                      </div>
                      <div className="item-tags">
                        {item.aiTags.slice(0, 2).map(tag => (
                          <span key={tag} className="tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className="item-score">
                      <span className="score-text">{item.scores[selectedScenario]}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 选中餐厅：商家信息卡片 */}
          {selectedRestaurant && (
            <div className="restaurant-card">
              <div className="card-header">
                <button className="back-btn" onClick={() => setSelectedRestaurant(null)}>← Back</button>
                {selectedRestaurant.isYou && <span className="your-business">Your Business</span>}
              </div>

              <h3 className="restaurant-name">{selectedRestaurant.name}</h3>
              <p className="restaurant-cuisine">{selectedRestaurant.cuisine} · {selectedRestaurant.priceRange}</p>
              <p className="restaurant-address">{selectedRestaurant.address}</p>
              <p className="restaurant-desc">{selectedRestaurant.description}</p>

              <div className="ai-perception">
                <h4>AI Perception</h4>
                <div className="perception-tags">
                  {selectedRestaurant.aiTags.map(tag => (
                    <span key={tag} className="perception-tag">"{tag}"</span>
                  ))}
                </div>
              </div>

              <div className="rankings-section">
                <h4>AI Rankings by Scenario</h4>
                <div className="rankings-list">
                  {SCENARIOS.map(scenario => (
                    <div key={scenario.id} className="ranking-row">
                      <span className="ranking-scenario">{scenario.label}</span>
                      <span className={`ranking-value ${selectedRestaurant.rankings[scenario.id] <= 3 ? 'top' : selectedRestaurant.rankings[scenario.id] <= 5 ? 'mid' : 'low'}`}>
                        #{selectedRestaurant.rankings[scenario.id]}
                      </span>
                      <span className="ranking-score">{selectedRestaurant.scores[scenario.id]}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Masked premium content */}
              <div className="premium-section">
                <div className="premium-mask">
                  <div className="mask-content">
                    <h4>Detailed Analytics</h4>
                    <div className="masked-items">
                      <div className="masked-item"></div>
                      <div className="masked-item"></div>
                      <div className="masked-item"></div>
                    </div>
                    <h4>Improvement Tips</h4>
                    <div className="masked-items">
                      <div className="masked-item short"></div>
                      <div className="masked-item"></div>
                    </div>
                  </div>
                  <div className="mask-overlay">
                    <p>Sign up to unlock detailed reports</p>
                    <button className="signup-btn" onClick={() => setShowSignupModal(true)}>
                      View More Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 选中格子：该位置的推荐 */}
          {selectedHex && (
            <div className="hex-recommendations">
              <div className="card-header">
                <button className="back-btn" onClick={() => setSelectedHex(null)}>← Back</button>
              </div>

              <div className="hex-info">
                <h3>Location Analysis</h3>
                <p className="hex-desc">
                  When someone at this location asks AI for French restaurant recommendations:
                </p>
              </div>

              <div className="hex-score-card">
                <div className="hex-big-score">
                  {Math.round(selectedHex.scenarioScores?.[selectedScenario] || selectedHex.avgVisibility)}
                </div>
                <div className="hex-score-label">AI Activity Score</div>
              </div>

              <div className="recommendations-list">
                <h4>AI Would Recommend:</h4>
                {selectedHex.recommendations?.map((rec, idx) => (
                  <div key={rec.id} className="rec-item">
                    <span className="rec-rank">#{idx + 1}</span>
                    <div className="rec-info">
                      <span className="rec-name">
                        {rec.name}
                        {rec.isYou && <span className="you-badge small">You</span>}
                      </span>
                      <span className="rec-tags">{rec.aiTags.slice(0, 2).join(', ')}</span>
                    </div>
                    <span className="rec-score">{rec.localScore}%</span>
                  </div>
                ))}
              </div>

              <div className="hex-insight">
                <h4>Insight</h4>
                <p>
                  {selectedHex.recommendations?.find(r => r.isYou) 
                    ? `Your restaurant ranks #${selectedHex.recommendations.findIndex(r => r.isYou) + 1} for users searching from this location.`
                    : "Your restaurant doesn't appear in top recommendations for this location. Consider improving your local SEO."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 地图区域 */}
      <div className="map-section" ref={mapContainerRef}>
        {/* 区域选择器 */}
        <div className="suburb-selector">
          {SUBURBS.map(suburb => (
            <button
              key={suburb.id}
              className={`suburb-btn ${selectedSuburb.id === suburb.id ? 'active' : ''}`}
              onClick={() => handleSuburbChange(suburb)}
            >
              {suburb.name}
            </button>
          ))}
        </div>

        <DeckGL
          viewState={viewState}
          onViewStateChange={({ viewState: vs }) => setViewState(vs)}
          controller={true}
          layers={layers}
          onClick={(info) => {
            if (!info.object) {
              setPopupInfo(null);
            }
          }}
        >
          <Map
            mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
            attributionControl={false}
          />
        </DeckGL>

        {/* Custom Popup Overlay */}
        {popupInfo && (() => {
          const pos = getPopupPosition();
          if (!pos) return null;
          return (
            <div 
              className="custom-popup"
              style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                transform: 'translate(-50%, -100%)',
                zIndex: 10000,
                pointerEvents: 'none' // Allow clicks to pass through wrapper
              }}
            >
              <div className="popup-content" style={{ 
                pointerEvents: 'auto', // Re-enable clicks for content
                background: 'white',
                padding: '16px',
                borderRadius: '12px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
                marginBottom: '10px',
                position: 'relative',
                width: '280px'
              }}>
                <button 
                  className="close-popup-btn"
                  onClick={() => setPopupInfo(null)}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    border: 'none',
                    background: 'none',
                    fontSize: '18px',
                    color: '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>
                <div 
                  className="popup-arrow" 
                  style={{
                    position: 'absolute',
                    bottom: '-8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderTop: '8px solid white'
                  }} 
                />
                
                <h3 className="popup-title">{popupInfo.name}</h3>
                <p className="popup-type">{popupInfo.cuisine}</p>
                <p className="popup-desc">{popupInfo.description}</p>
                
                <div className="popup-rankings">
                  <div className="popup-rank-row">
                    <span>Overall Rank:</span>
                    <span className="popup-rank-val">#{popupInfo.rankings.overall}</span>
                  </div>
                  <div className="popup-rank-row">
                    <span>{SCENARIOS.find(s => s.id === selectedScenario)?.label}:</span>
                    <span className="popup-rank-val">#{popupInfo.rankings[selectedScenario]}</span>
                  </div>
                </div>

                <button 
                  className="popup-btn"
                  onClick={() => {
                    setShowSignupModal(true);
                    setPopupInfo(null);
                  }}
                >
                  View More Details
                </button>
              </div>
            </div>
          );
        })()}

        {/* 图例 */}
        <div className="map-legend">
          <h4>Restaurant Ranking</h4>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#22c55e' }}></span>
              <span>Top 3</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#facc15' }}></span>
              <span>Rank 4-5</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#ef4444' }}></span>
              <span>Rank 6+</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#3b82f6' }}></span>
              <span>Your Business</span>
            </div>
          </div>
        </div>

        {/* 当前场景提示 */}
        <div className="scenario-indicator">
          <span>{SCENARIOS.find(s => s.id === selectedScenario)?.label}</span>
        </div>
      </div>

      {/* Sign Up Modal */}
      {showSignupModal && (
        <div className="modal-overlay" onClick={() => setShowSignupModal(false)}>
          <div className="signup-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowSignupModal(false)}>×</button>
            
            <div className="modal-header">
              <h2>Unlock Full AI Visibility Reports</h2>
              <p>Get detailed analytics and actionable insights to improve your AI rankings</p>
            </div>

            <div className="modal-features">
              <div className="feature">Detailed competitor analysis</div>
              <div className="feature">Weekly ranking reports</div>
              <div className="feature">AI improvement recommendations</div>
              <div className="feature">Multi-platform tracking (ChatGPT, Gemini, Perplexity)</div>
            </div>

            <form className="signup-form" onSubmit={e => { e.preventDefault(); alert('Thanks for signing up!'); setShowSignupModal(false); }}>
              <input type="text" placeholder="Restaurant Name" required />
              <input type="email" placeholder="Email Address" required />
              <button type="submit" className="submit-btn">Get Started Free</button>
            </form>

            <p className="modal-footer">Free 14-day trial · No credit card required</p>
          </div>
        </div>
      )}
    </div>
  );
}
