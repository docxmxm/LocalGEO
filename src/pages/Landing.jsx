import React, { useState, useEffect } from 'react';
import Map from 'react-map-gl/maplibre';
import { DeckGL } from '@deck.gl/react';
import { H3HexagonLayer } from '@deck.gl/geo-layers';
import 'maplibre-gl/dist/maplibre-gl.css';
import './Landing.css';

const INITIAL_VIEW = {
  longitude: 151.215,
  latitude: -33.885,
  zoom: 14,
  pitch: 0,
  bearing: 0
};

function getHexColor(score) {
  if (score >= 70) return [34, 197, 94, 150];
  if (score >= 50) return [134, 239, 172, 150];
  if (score >= 30) return [250, 204, 21, 150];
  return [239, 68, 68, 120];
}

export default function Landing({ onSearch, onViewMap }) {
  const [businessName, setBusinessName] = useState('');
  const [city, setCity] = useState('Sydney');
  const [isSearching, setIsSearching] = useState(false);
  const [heatmapData, setHeatmapData] = useState([]);
  const [viewState, setViewState] = useState(INITIAL_VIEW);

  useEffect(() => {
    fetch('/api/heatmap?prompt_type=Generic_Best')
      .then(res => res.json())
      .then(data => setHeatmapData(data.data || []))
      .catch(console.error);
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!businessName.trim()) return;
    
    setIsSearching(true);
    try {
      const res = await fetch('/api/free-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, city })
      });
      const result = await res.json();
      onSearch(result);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const layers = [
    new H3HexagonLayer({
      id: 'h3-preview',
      data: heatmapData,
      pickable: false,
      filled: true,
      extruded: false,
      getHexagon: d => d.h3Index,
      getFillColor: d => getHexColor(d.avgVisibility),
      opacity: 0.7,
    })
  ];

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Is AI Recommending Your Business?</h1>
          <p className="hero-subtitle">
            When customers ask ChatGPT, Gemini, or Perplexity for recommendations, 
            are you showing up — or are your competitors stealing the spotlight?
          </p>

          {/* 免费搜索表单 */}
          <form className="search-form" onSubmit={handleSearch}>
            <div className="search-inputs">
              <input
                type="text"
                placeholder="Your business name"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                className="search-input"
                required
              />
              <select 
                value={city} 
                onChange={e => setCity(e.target.value)}
                className="city-select"
              >
                <option value="Sydney">Sydney</option>
                <option value="Melbourne">Melbourne</option>
                <option value="Brisbane">Brisbane</option>
              </select>
              <button 
                type="submit" 
                className="search-btn"
                disabled={isSearching}
              >
                {isSearching ? 'Scanning...' : 'Free AI Scan'}
              </button>
            </div>
            <p className="search-hint">One free scan per business. No signup required.</p>
          </form>
        </div>

        {/* 背景热力图预览 */}
        <div className="hero-map">
          <DeckGL
            viewState={viewState}
            onViewStateChange={({ viewState: vs }) => setViewState(vs)}
            controller={false}
            layers={layers}
          >
            <Map
              mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
              attributionControl={false}
            />
          </DeckGL>
          <div className="map-overlay"></div>
        </div>
      </section>

      {/* 恐惧营销 Stats */}
      <section className="stats-section">
        <div className="stat-card warning">
          <div className="stat-number">73%</div>
          <div className="stat-label">of local businesses are invisible to AI assistants</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">4.2x</div>
          <div className="stat-label">more customers for AI-visible businesses</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-number">31%</div>
          <div className="stat-label">of AI responses contain hallucinations about business hours</div>
        </div>
      </section>

      {/* 功能介绍 */}
      <section className="features-section">
        <h2>What You'll Discover</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🗺️</div>
            <h3>AI Geo-Heatmap</h3>
            <p>See exactly where AI recommends your competitors instead of you, block by block.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h3>Citation Audit</h3>
            <p>Discover which data sources (Yelp, Google, Foursquare) AI is using — and ignoring.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">👻</div>
            <h3>Hallucination Hunter</h3>
            <p>Find out if AI is lying about your hours, menu, or services.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Why Not Me?</h3>
            <p>Get specific reasons why competitors rank higher and actionable fixes.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <h2>See the AI Visibility Map</h2>
        <p>Explore how AI recommendations vary across different neighborhoods</p>
        <button className="cta-btn" onClick={onViewMap}>
          View Live Heatmap →
        </button>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2026 AI Visibility Platform</p>
      </footer>
    </div>
  );
}
