import React, { useState } from 'react';
import './ScanResult.css';

// 平台图标映射
const PLATFORM_INFO = {
  chatgpt: { name: 'ChatGPT', color: '#10a37f' },
  perplexity: { name: 'Perplexity', color: '#20808d' },
  gemini: { name: 'Gemini', color: '#8e44ad' },
  claude: { name: 'Claude', color: '#d97706' }
};

export default function ScanResult({ result, onBack, onSignup }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!result) return null;

  const { business, competitors, citations, hallucinations, whyNotMe } = result;

  return (
    <div className="scan-result-page">
      {/* Header */}
      <header className="result-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="header-title">
          <h1>AI Visibility Report</h1>
          <p>{business.name} · {business.city}</p>
        </div>
      </header>

      {/* 核心警告卡片 */}
      <section className="alert-section">
        {result.isVisible ? (
          <div className="alert-card success">
            <div className="alert-icon">✓</div>
            <div className="alert-content">
              <h2>Good News!</h2>
              <p>Your business appears in AI recommendations, but there's room for improvement.</p>
            </div>
          </div>
        ) : (
          <div className="alert-card danger">
            <div className="alert-icon">⚠</div>
            <div className="alert-content">
              <h2>Warning: Low AI Visibility</h2>
              <p>
                In {result.totalScans} AI searches for "{business.category}" near {business.city}, 
                your business was mentioned only {result.mentionCount} times.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Tab 导航 */}
      <nav className="result-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'whynot' ? 'active' : ''}`}
          onClick={() => setActiveTab('whynot')}
        >
          Why Not Me?
        </button>
        <button 
          className={`tab-btn ${activeTab === 'citations' ? 'active' : ''}`}
          onClick={() => setActiveTab('citations')}
        >
          Citation Audit
        </button>
        <button 
          className={`tab-btn ${activeTab === 'hallucinations' ? 'active' : ''}`}
          onClick={() => setActiveTab('hallucinations')}
        >
          Hallucinations
        </button>
      </nav>

      {/* Tab 内容 */}
      <main className="result-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="tab-panel">
            {/* 平台分数 */}
            <div className="card">
              <h3>AI Platform Visibility</h3>
              <div className="platform-scores">
                {Object.entries(result.platformScores).map(([platform, data]) => (
                  <div key={platform} className="platform-row">
                    <div className="platform-name" style={{ color: PLATFORM_INFO[platform]?.color }}>
                      {PLATFORM_INFO[platform]?.name || platform}
                    </div>
                    <div className="platform-bar-wrap">
                      <div 
                        className="platform-bar" 
                        style={{ 
                          width: `${data.score}%`,
                          background: PLATFORM_INFO[platform]?.color 
                        }}
                      />
                    </div>
                    <div className="platform-score">{data.score}%</div>
                    <div className={`platform-status ${data.status}`}>
                      {data.status === 'indexed' ? 'Indexed' : data.status === 'warning' ? 'Warning' : 'Not Found'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 竞争对手对比 */}
            <div className="card">
              <h3>Your Competitors Are Winning</h3>
              <p className="card-desc">These businesses appear more often in AI recommendations</p>
              <div className="competitor-list">
                {competitors.slice(0, 5).map((comp, idx) => (
                  <div key={idx} className="competitor-row">
                    <span className="comp-rank">#{idx + 1}</span>
                    <span className="comp-name">{comp.name}</span>
                    <span className="comp-mentions">{comp.mentions} mentions</span>
                    <span className={`comp-diff ${comp.diff > 0 ? 'ahead' : ''}`}>
                      {comp.diff > 0 ? `+${comp.diff}` : comp.diff} vs you
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Why Not Me Tab */}
        {activeTab === 'whynot' && (
          <div className="tab-panel">
            <div className="card">
              <h3>Why Competitors Rank Higher</h3>
              <div className="whynot-list">
                {whyNotMe.map((reason, idx) => (
                  <div key={idx} className="whynot-item">
                    <div className="whynot-header">
                      <span className="whynot-competitor">{reason.competitor}</span>
                      <span className="whynot-platform">{reason.platform}</span>
                    </div>
                    <p className="whynot-reason">{reason.reason}</p>
                    <div className="whynot-action">
                      <span className="action-label">Fix:</span>
                      <span className="action-text">{reason.action}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 锁定的高级分析 */}
            <div className="card locked">
              <div className="lock-overlay">
                <div className="lock-icon">🔒</div>
                <p>Sign up to unlock detailed competitive analysis</p>
                <button className="unlock-btn" onClick={onSignup}>Unlock Full Report</button>
              </div>
              <h3>Detailed Gap Analysis</h3>
              <div className="locked-content">
                <div className="locked-item"></div>
                <div className="locked-item"></div>
                <div className="locked-item short"></div>
              </div>
            </div>
          </div>
        )}

        {/* Citation Audit Tab */}
        {activeTab === 'citations' && (
          <div className="tab-panel">
            <div className="card">
              <h3>Where AI Gets Its Data</h3>
              <p className="card-desc">AI platforms pull information from these sources</p>
              <div className="citation-grid">
                {citations.map((source, idx) => (
                  <div key={idx} className={`citation-card ${source.status}`}>
                    <div className="citation-source">{source.name}</div>
                    <div className="citation-status-badge">
                      {source.status === 'good' ? '✓ Indexed' : 
                       source.status === 'warning' ? '⚠ Issues' : '✗ Missing'}
                    </div>
                    <p className="citation-detail">{source.detail}</p>
                    {source.status !== 'good' && (
                      <button className="citation-fix-btn">Fix Now</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3>Citation Impact</h3>
              <p className="card-desc">How each data source affects your AI visibility</p>
              <div className="impact-list">
                <div className="impact-row">
                  <span className="impact-source">Google Business Profile</span>
                  <div className="impact-bar-wrap">
                    <div className="impact-bar" style={{ width: '85%' }}></div>
                  </div>
                  <span className="impact-pct">85%</span>
                </div>
                <div className="impact-row">
                  <span className="impact-source">Yelp</span>
                  <div className="impact-bar-wrap">
                    <div className="impact-bar" style={{ width: '62%' }}></div>
                  </div>
                  <span className="impact-pct">62%</span>
                </div>
                <div className="impact-row">
                  <span className="impact-source">Foursquare</span>
                  <div className="impact-bar-wrap">
                    <div className="impact-bar" style={{ width: '45%' }}></div>
                  </div>
                  <span className="impact-pct">45%</span>
                </div>
                <div className="impact-row">
                  <span className="impact-source">TripAdvisor</span>
                  <div className="impact-bar-wrap">
                    <div className="impact-bar" style={{ width: '38%' }}></div>
                  </div>
                  <span className="impact-pct">38%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hallucinations Tab */}
        {activeTab === 'hallucinations' && (
          <div className="tab-panel">
            {hallucinations.length > 0 ? (
              <div className="card danger-card">
                <h3>⚠ AI Is Spreading Misinformation</h3>
                <p className="card-desc">We found {hallucinations.length} incorrect statements about your business</p>
                <div className="hallucination-list">
                  {hallucinations.map((h, idx) => (
                    <div key={idx} className="hallucination-item">
                      <div className="hall-header">
                        <span className="hall-platform">{h.platform}</span>
                        <span className="hall-type">{h.type}</span>
                      </div>
                      <div className="hall-comparison">
                        <div className="hall-wrong">
                          <span className="hall-label">AI Says:</span>
                          <span className="hall-value">{h.aiSays}</span>
                        </div>
                        <div className="hall-correct">
                          <span className="hall-label">Reality:</span>
                          <span className="hall-value">{h.reality}</span>
                        </div>
                      </div>
                      <p className="hall-impact">{h.impact}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card success-card">
                <h3>✓ No Hallucinations Detected</h3>
                <p>AI platforms are reporting accurate information about your business.</p>
              </div>
            )}

            <div className="card locked">
              <div className="lock-overlay">
                <div className="lock-icon">🔒</div>
                <p>Get weekly hallucination monitoring</p>
                <button className="unlock-btn" onClick={onSignup}>Start Monitoring</button>
              </div>
              <h3>Continuous Monitoring</h3>
              <div className="locked-content">
                <div className="locked-item"></div>
                <div className="locked-item short"></div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom CTA */}
      <footer className="result-footer">
        <div className="footer-content">
          <div className="footer-text">
            <h3>Want to improve your AI visibility?</h3>
            <p>Get weekly reports, competitor tracking, and optimization tips.</p>
          </div>
          <button className="footer-cta" onClick={onSignup}>
            Start Free Trial →
          </button>
        </div>
      </footer>
    </div>
  );
}
