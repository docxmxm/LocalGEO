import React, { useState } from 'react';
import './Dashboard.css';

// 模拟商户数据
const MOCK_BUSINESS = {
  name: "Bistrot 916",
  category: "French Restaurant",
  district: "Surry Hills",
  dominanceScore: 72,
  trend: +5,
  lastUpdated: "2 hours ago",
  
  aiIndexStatus: {
    chatgpt: { status: 'indexed', weight: 'High', detail: 'Mentioned in 8/10 queries' },
    perplexity: { status: 'indexed', weight: 'Medium', citations: 12 },
    gemini: { status: 'warning', issue: 'Google Maps data conflict detected' },
    claude: { status: 'indexed', weight: 'Medium', detail: 'Consistent recommendations' },
  },
  
  scenarioRanks: {
    'Best French Restaurant': { rank: 1, total: 23, trend: 0 },
    'Date Night Dinner': { rank: 3, total: 45, trend: +2 },
    'Business Lunch': { rank: 5, total: 38, trend: -1 },
    'Special Occasion': { rank: 2, total: 31, trend: +1 },
  },
  
  competitors: [
    { name: "Hubert", rank: 2, score: 68, trend: -2 },
    { name: "Restaurant Hubert", rank: 3, score: 65, trend: +1 },
    { name: "Bistro Rex", rank: 4, score: 61, trend: 0 },
  ]
};

function getScoreColor(score) {
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#eab308';
  return '#ef4444';
}

function getScoreLabel(score) {
  if (score >= 70) return 'Excellent';
  if (score >= 40) return 'Average';
  return 'At Risk';
}

export default function Dashboard() {
  const [business] = useState(MOCK_BUSINESS);

  return (
    <div className="dashboard-page">
      {/* Header */}
      <header className="dash-header">
        <div className="header-left">
          <h1>AI Visibility Dashboard</h1>
        </div>
        <div className="header-right">
          <span className="business-name">{business.name}</span>
          <span className="business-meta">{business.category} · {business.district}</span>
        </div>
      </header>

      <main className="dash-main">
        {/* 核心得分卡 */}
        <section className="score-section">
          <div className="dominance-card">
            <div className="card-header">
              <h2>AI Dominance Score</h2>
            </div>
            
            <div className="score-display">
              <div 
                className="big-score" 
                style={{ color: getScoreColor(business.dominanceScore) }}
              >
                {business.dominanceScore}
              </div>
              <div className="score-max">/ 100</div>
            </div>

            <div className="score-status">
              <span 
                className="status-badge"
                style={{ background: getScoreColor(business.dominanceScore) }}
              >
                {getScoreLabel(business.dominanceScore)}
              </span>
              <span className={`trend ${business.trend >= 0 ? 'up' : 'down'}`}>
                {business.trend >= 0 ? '+' : '-'} {Math.abs(business.trend)}% vs last week
              </span>
            </div>

            <p className="score-explanation">
              In <strong>{business.district}</strong> area, for all AI searches related to 
              "<strong>French cuisine</strong>", you have a <strong>{business.dominanceScore}%</strong> probability 
              of appearing in the Top 5 recommendations.
            </p>
          </div>

          {/* AI 索引状态 */}
          <div className="index-card">
            <div className="card-header">
              <h2>AI Index Status</h2>
            </div>

            <div className="index-list">
              {/* ChatGPT */}
              <div className="index-item">
                <div className="index-platform">
                  <span className="platform-name">ChatGPT</span>
                </div>
                <div className="index-status indexed">
                  <span>Indexed</span>
                </div>
                <div className="index-detail">
                  <span className="weight-badge high">High Weight</span>
                  <span className="detail-text">{business.aiIndexStatus.chatgpt.detail}</span>
                </div>
              </div>

              {/* Perplexity */}
              <div className="index-item">
                <div className="index-platform">
                  <span className="platform-name">Perplexity</span>
                </div>
                <div className="index-status indexed">
                  <span>Indexed</span>
                </div>
                <div className="index-detail">
                  <span className="weight-badge medium">Medium</span>
                  <span className="detail-text">{business.aiIndexStatus.perplexity.citations} citation sources</span>
                </div>
              </div>

              {/* Gemini - Warning */}
              <div className="index-item warning">
                <div className="index-platform">
                  <span className="platform-name">Gemini</span>
                </div>
                <div className="index-status warn">
                  <span>Warning</span>
                </div>
                <div className="index-detail">
                  <span className="issue-text">{business.aiIndexStatus.gemini.issue}</span>
                  <button className="fix-btn">Fix Now →</button>
                </div>
              </div>

              {/* Claude */}
              <div className="index-item">
                <div className="index-platform">
                  <span className="platform-name">Claude</span>
                </div>
                <div className="index-status indexed">
                  <span>Indexed</span>
                </div>
                <div className="index-detail">
                  <span className="weight-badge medium">Medium</span>
                  <span className="detail-text">{business.aiIndexStatus.claude.detail}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 场景排名 + 竞争对手 */}
        <section className="details-section">
          {/* 场景排名 */}
          <div className="scenario-card">
            <div className="card-header">
              <h2>Ranking by Scenario</h2>
            </div>
            <p className="card-subtitle">How you rank when users ask different questions</p>

            <div className="scenario-list">
              {Object.entries(business.scenarioRanks).map(([scenario, data]) => (
                <div key={scenario} className="scenario-item">
                  <div className="scenario-info">
                    <span className="scenario-name">"{scenario}"</span>
                    <span className="scenario-total">out of {data.total} restaurants</span>
                  </div>
                  <div className="scenario-rank-wrapper">
                    <span className={`scenario-rank ${data.rank <= 3 ? 'top' : data.rank <= 5 ? 'mid' : 'low'}`}>
                      #{data.rank}
                    </span>
                    {data.trend !== 0 && (
                      <span className={`mini-trend ${data.trend > 0 ? 'up' : 'down'}`}>
                        {data.trend > 0 ? '+' : '-'}{Math.abs(data.trend)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 竞争对手 */}
          <div className="competitor-card">
            <div className="card-header">
              <h2>Top Competitors</h2>
            </div>
            <p className="card-subtitle">Who's competing for the same AI recommendations</p>

            <div className="competitor-list">
              {/* 你的位置 */}
              <div className="competitor-item you">
                <span className="competitor-rank">#1</span>
                <div className="competitor-info">
                  <span className="competitor-name">{business.name}</span>
                  <span className="you-badge">You</span>
                </div>
                <div className="competitor-score">
                  <div className="score-bar" style={{ width: `${business.dominanceScore}%`, background: '#3b82f6' }}></div>
                  <span>{business.dominanceScore}</span>
                </div>
              </div>

              {business.competitors.map((comp) => (
                <div key={comp.name} className="competitor-item">
                  <span className="competitor-rank">#{comp.rank}</span>
                  <div className="competitor-info">
                    <span className="competitor-name">{comp.name}</span>
                  </div>
                  <div className="competitor-score">
                    <div className="score-bar" style={{ width: `${comp.score}%` }}></div>
                    <span>{comp.score}</span>
                  </div>
                  <span className={`mini-trend ${comp.trend >= 0 ? 'up' : 'down'}`}>
                    {comp.trend >= 0 ? '+' : '-'}{Math.abs(comp.trend)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 行动建议 */}
        <section className="actions-section">
          <div className="card-header">
            <h2>Recommended Actions</h2>
          </div>

          <div className="action-cards">
            <div className="action-card urgent">
              <div className="action-priority">Urgent</div>
              <h3>Fix Gemini Data Conflict</h3>
              <p>Your Google Maps hours don't match your website. This confuses Gemini.</p>
              <button className="action-btn">Resolve Now</button>
            </div>

            <div className="action-card important">
              <div className="action-priority">Important</div>
              <h3>Add More Menu Photos</h3>
              <p>Restaurants with 10+ photos get 2x more AI mentions.</p>
              <button className="action-btn secondary">Upload Photos</button>
            </div>

            <div className="action-card suggestion">
              <div className="action-priority">Suggestion</div>
              <h3>Respond to Recent Reviews</h3>
              <p>3 reviews from last week are unanswered. AI values engagement.</p>
              <button className="action-btn secondary">View Reviews</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
