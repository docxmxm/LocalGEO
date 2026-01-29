import { useState } from 'react';
import './ScanResult.css';

// 平台图标映射
const PLATFORM_INFO = {
  chatgpt: { name: 'ChatGPT', color: '#10a37f', icon: '🤖' },
  perplexity: { name: 'Perplexity', color: '#20808d', icon: '🔍' },
  gemini: { name: 'Gemini', color: '#8e44ad', icon: '✨' },
  claude: { name: 'Claude', color: '#d97706', icon: '🧠' }
};

// 严重程度配置
const SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: '#dc2626', bg: '#fee2e2' },
  high: { label: 'High', color: '#ea580c', bg: '#ffedd5' },
  medium: { label: 'Medium', color: '#ca8a04', bg: '#fef3c7' },
  low: { label: 'Low', color: '#65a30d', bg: '#ecfccb' }
};

export default function ScanResult({ result, onBack, onSignup }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!result) return null;

  const { business, competitors, citations, hallucinations, whyNotMe } = result;

  // 计算幻觉统计
  const hallucinationStats = {
    total: hallucinations?.length || 0,
    critical: hallucinations?.filter(h => h.severity === 'critical').length || 0,
    high: hallucinations?.filter(h => h.severity === 'high').length || 0
  };

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
          {hallucinationStats.total > 0 && (
            <span className="tab-badge danger">{hallucinationStats.total}</span>
          )}
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
                      <span className="platform-icon">{PLATFORM_INFO[platform]?.icon}</span>
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
                      {data.status === 'indexed' ? '✓ Indexed' : data.status === 'warning' ? '⚠ Warning' : '✗ Not Found'}
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

        {/* Why Not Me Tab - 增强版 */}
        {activeTab === 'whynot' && (
          <div className="tab-panel">
            <div className="card">
              <h3>Why Competitors Rank Higher</h3>
              <p className="card-desc">Detailed analysis of what your competitors are doing better</p>
              
              <div className="whynot-list-enhanced">
                {whyNotMe.map((reason, idx) => (
                  <div key={idx} className={`whynot-item-enhanced ${reason.impact || 'medium'}`}>
                    <div className="whynot-top">
                      <div className="whynot-meta">
                        <span className="whynot-competitor">{reason.competitor}</span>
                        <span className="whynot-platform">{reason.platform}</span>
                        {reason.category && (
                          <span className="whynot-category">{reason.category}</span>
                        )}
                      </div>
                      {reason.impact && (
                        <span className={`impact-badge ${reason.impact}`}>
                          {reason.impact.toUpperCase()} IMPACT
                        </span>
                      )}
                    </div>
                    
                    <p className="whynot-reason">{reason.reason}</p>
                    
                    {/* 对比展示 */}
                    {(reason.yourStatus || reason.competitorStatus) && (
                      <div className="status-comparison">
                        <div className="status-you">
                          <span className="status-label">You</span>
                          <span className="status-value bad">{reason.yourStatus}</span>
                        </div>
                        <div className="status-vs">vs</div>
                        <div className="status-competitor">
                          <span className="status-label">{reason.competitor}</span>
                          <span className="status-value good">{reason.competitorStatus}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="whynot-action-box">
                      <span className="action-icon">💡</span>
                      <div className="action-content">
                        <span className="action-label">Recommended Fix:</span>
                        <span className="action-text">{reason.action}</span>
                      </div>
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

        {/* Hallucinations Tab - 增强版 */}
        {activeTab === 'hallucinations' && (
          <div className="tab-panel">
            {/* 幻觉统计概览 */}
            {hallucinations && hallucinations.length > 0 && (
              <div className="hallucination-stats">
                <div className="stat-item total">
                  <span className="stat-number">{hallucinationStats.total}</span>
                  <span className="stat-label">Total Issues</span>
                </div>
                <div className="stat-item critical">
                  <span className="stat-number">{hallucinationStats.critical}</span>
                  <span className="stat-label">Critical</span>
                </div>
                <div className="stat-item high">
                  <span className="stat-number">{hallucinationStats.high}</span>
                  <span className="stat-label">High Priority</span>
                </div>
              </div>
            )}

            {hallucinations && hallucinations.length > 0 ? (
              <div className="card danger-card">
                <h3>⚠ AI Is Spreading Misinformation</h3>
                <p className="card-desc">We found {hallucinations.length} incorrect statements about your business</p>
                
                <div className="hallucination-list-enhanced">
                  {hallucinations.map((h, idx) => (
                    <div key={idx} className={`hallucination-item-enhanced ${h.severity || 'medium'}`}>
                      <div className="hall-top">
                        <div className="hall-meta">
                          <span className="hall-platform">
                            {PLATFORM_INFO[h.platform.toLowerCase()]?.icon} {h.platform}
                          </span>
                          <span className="hall-type">{h.type}</span>
                        </div>
                        <span 
                          className="severity-badge"
                          style={{ 
                            background: SEVERITY_CONFIG[h.severity]?.bg,
                            color: SEVERITY_CONFIG[h.severity]?.color
                          }}
                        >
                          {SEVERITY_CONFIG[h.severity]?.label || h.severity}
                        </span>
                      </div>
                      
                      <div className="hall-comparison-enhanced">
                        <div className="hall-wrong">
                          <div className="hall-label">
                            <span className="label-icon">❌</span>
                            AI Says:
                          </div>
                          <div className="hall-value">{h.aiSays}</div>
                        </div>
                        <div className="hall-arrow">→</div>
                        <div className="hall-correct">
                          <div className="hall-label">
                            <span className="label-icon">✓</span>
                            Reality:
                          </div>
                          <div className="hall-value">{h.reality}</div>
                        </div>
                      </div>
                      
                      <div className="hall-details">
                        {h.source && (
                          <div className="hall-detail-item">
                            <span className="detail-label">Source:</span>
                            <span className="detail-value">{h.source}</span>
                          </div>
                        )}
                        {h.detectedAt && (
                          <div className="hall-detail-item">
                            <span className="detail-label">Detected:</span>
                            <span className="detail-value">{h.detectedAt}</span>
                          </div>
                        )}
                        {h.occurrences && (
                          <div className="hall-detail-item">
                            <span className="detail-label">Occurrences:</span>
                            <span className="detail-value">{h.occurrences}x in last week</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="hall-impact-box">
                        <span className="impact-icon">⚡</span>
                        <p className="hall-impact">{h.impact}</p>
                      </div>
                      
                      <button className="report-btn">Report to {h.platform}</button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card success-card">
                <div className="success-content">
                  <span className="success-icon">✓</span>
                  <h3>No Hallucinations Detected</h3>
                  <p>AI platforms are reporting accurate information about your business.</p>
                </div>
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
