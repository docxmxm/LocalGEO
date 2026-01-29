import { useState } from 'react';
import './Dashboard.css';

// ============ Mock 数据 ============

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

// 情感分析 Mock 数据
const MOCK_SENTIMENT = {
  overallScore: 0.72,
  distribution: { positive: 65, neutral: 25, negative: 10 },
  keywords: [
    { text: "cozy atmosphere", sentiment: "positive", frequency: 12 },
    { text: "excellent wine selection", sentiment: "positive", frequency: 9 },
    { text: "friendly staff", sentiment: "positive", frequency: 8 },
    { text: "authentic French", sentiment: "positive", frequency: 7 },
    { text: "moderate prices", sentiment: "neutral", frequency: 5 },
    { text: "limited parking", sentiment: "negative", frequency: 3 },
    { text: "small portions", sentiment: "negative", frequency: 2 },
  ],
  weeklyTrend: [
    { week: "W1", score: 0.65 },
    { week: "W2", score: 0.68 },
    { week: "W3", score: 0.64 },
    { week: "W4", score: 0.71 },
    { week: "W5", score: 0.69 },
    { week: "W6", score: 0.73 },
    { week: "W7", score: 0.70 },
    { week: "W8", score: 0.72 },
  ]
};

// NAP 一致性 Mock 数据
const MOCK_NAP = {
  trustScore: 0.75,
  canonical: {
    name: "Bistrot 916",
    address: "916 Bourke St, Waterloo NSW 2017",
    phone: "+61 2 9000 1234",
    hours: "Tue-Sun 12:00-22:00"
  },
  platforms: [
    { 
      name: "Google", 
      icon: "🔍",
      nameMatch: true, 
      addressMatch: true, 
      phoneMatch: true, 
      hoursMatch: false, 
      hoursValue: "Mon-Sun 11:00-23:00" 
    },
    { 
      name: "Yelp", 
      icon: "⭐",
      nameMatch: true, 
      addressMatch: true, 
      phoneMatch: false, 
      phoneValue: "+61 2 9000 5678",
      hoursMatch: true 
    },
    { 
      name: "Foursquare", 
      icon: "📍",
      nameMatch: false, 
      nameValue: "Bistrot916",
      addressMatch: true, 
      phoneMatch: true, 
      hoursMatch: true 
    },
    { 
      name: "Bing Places", 
      icon: "🅱️",
      nameMatch: true, 
      addressMatch: false, 
      addressValue: "916 Bourke Street, Waterloo",
      phoneMatch: true, 
      hoursMatch: true 
    },
  ],
  conflicts: [
    { 
      field: "Phone", 
      platform1: "Google", 
      value1: "+61 2 9000 1234", 
      platform2: "Yelp", 
      value2: "+61 2 9000 5678",
      impact: "High - Yelp is primary source for Apple Intelligence"
    },
    { 
      field: "Hours", 
      platform1: "Your Website", 
      value1: "Tue-Sun 12:00-22:00", 
      platform2: "Google", 
      value2: "Mon-Sun 11:00-23:00",
      impact: "Critical - Causes hallucinations about opening times"
    }
  ]
};

// Fingerprint Mock 数据
const MOCK_FINGERPRINT = {
  coverageScore: 68,
  present: [
    { name: "Outdoor Seating", source: "Google", icon: "🪑" },
    { name: "Reservations", source: "Yelp", icon: "📅" },
    { name: "Wine Bar", source: "Foursquare", icon: "🍷" },
    { name: "French Cuisine", source: "All", icon: "🇫🇷" },
    { name: "Dinner", source: "Google", icon: "🍽️" },
    { name: "Cozy", source: "Yelp", icon: "🛋️" },
  ],
  missing: [
    { 
      name: "Kid-Friendly", 
      icon: "👨‍👩‍👧",
      potentialLift: 15, 
      reason: "23% of 'French restaurant' queries include family-related terms",
      suggestedPlatform: "Yelp"
    },
    { 
      name: "Late Night", 
      icon: "🌙",
      potentialLift: 12, 
      reason: "You're open until 10pm but this isn't tagged anywhere",
      suggestedPlatform: "Foursquare"
    },
    { 
      name: "Romantic", 
      icon: "💕",
      potentialLift: 18, 
      reason: "High-value keyword for date night searches",
      suggestedPlatform: "Google"
    },
  ],
  competitorGap: [
    { attribute: "Romantic", competitors: ["Hubert", "Felix"], icon: "💕" },
    { attribute: "Business Dining", competitors: ["Felix", "Bistro Rex"], icon: "💼" },
    { attribute: "Live Music", competitors: ["Hubert"], icon: "🎵" },
  ],
  scenarioMatches: [
    { query: "romantic dinner Sydney", matchScore: 45 },
    { query: "best french food Surry Hills", matchScore: 82 },
    { query: "family friendly restaurant", matchScore: 20 },
    { query: "late night dining Sydney", matchScore: 35 },
    { query: "business lunch CBD", matchScore: 58 },
  ]
};

// ============ 辅助函数 ============

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

function getSentimentColor(score) {
  if (score >= 0.5) return '#22c55e';
  if (score >= 0) return '#eab308';
  return '#ef4444';
}

// ============ 子组件 ============

// 情感分析卡片
function SentimentCard({ data }) {
  const maxFreq = Math.max(...data.keywords.map(k => k.frequency));
  
  return (
    <div className="insight-card sentiment-card">
      <div className="card-header">
        <h3>AI Sentiment Analysis</h3>
        <span className="card-badge">Weekly Report</span>
      </div>

      {/* 整体分数 */}
      <div className="sentiment-overview">
        <div className="sentiment-score-ring">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="8" />
            <circle 
              cx="50" cy="50" r="45" 
              fill="none" 
              stroke={getSentimentColor(data.overallScore)}
              strokeWidth="8"
              strokeDasharray={`${data.overallScore * 283} 283`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="score-center">
            <span className="score-value" style={{ color: getSentimentColor(data.overallScore) }}>
              {data.overallScore > 0 ? '+' : ''}{data.overallScore.toFixed(2)}
            </span>
            <span className="score-label">Sentiment</span>
          </div>
        </div>

        {/* 分布条 */}
        <div className="sentiment-distribution">
          <div className="dist-label">Distribution</div>
          <div className="dist-bar">
            <div className="dist-positive" style={{ width: `${data.distribution.positive}%` }}>
              {data.distribution.positive}%
            </div>
            <div className="dist-neutral" style={{ width: `${data.distribution.neutral}%` }}>
              {data.distribution.neutral}%
            </div>
            <div className="dist-negative" style={{ width: `${data.distribution.negative}%` }}>
              {data.distribution.negative}%
            </div>
          </div>
          <div className="dist-legend">
            <span><i className="dot positive"></i>Positive</span>
            <span><i className="dot neutral"></i>Neutral</span>
            <span><i className="dot negative"></i>Negative</span>
          </div>
        </div>
      </div>

      {/* AI 关键词 */}
      <div className="sentiment-keywords">
        <h4>How AI Describes You</h4>
        <div className="keywords-list">
          {data.keywords.map((kw, idx) => (
            <div key={idx} className={`keyword-item ${kw.sentiment}`}>
              <span className="keyword-text">"{kw.text}"</span>
              <div className="keyword-bar-wrap">
                <div 
                  className={`keyword-bar ${kw.sentiment}`}
                  style={{ width: `${(kw.frequency / maxFreq) * 100}%` }}
                />
              </div>
              <span className="keyword-freq">{kw.frequency}x</span>
            </div>
          ))}
        </div>
      </div>

      {/* 趋势图 */}
      <div className="sentiment-trend">
        <h4>8-Week Trend</h4>
        <div className="trend-chart">
          {data.weeklyTrend.map((point, idx) => (
            <div key={idx} className="trend-bar-container">
              <div 
                className="trend-bar"
                style={{ 
                  height: `${point.score * 100}%`,
                  background: getSentimentColor(point.score)
                }}
              />
              <span className="trend-label">{point.week}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// NAP 一致性卡片
function NAPCard({ data }) {
  const getMatchIcon = (match) => match ? '✓' : '✗';
  const getMatchClass = (match) => match ? 'match' : 'mismatch';

  return (
    <div className="insight-card nap-card">
      <div className="card-header">
        <h3>Data Consistency (NAP)</h3>
        <div className={`trust-badge ${data.trustScore >= 0.75 ? 'good' : data.trustScore >= 0.5 ? 'warning' : 'danger'}`}>
          Trust Score: {Math.round(data.trustScore * 100)}%
        </div>
      </div>

      <p className="card-intro">
        AI cross-references multiple platforms. Inconsistent data reduces your visibility.
      </p>

      {/* 官方信息 */}
      <div className="canonical-info">
        <h4>Your Official Information</h4>
        <div className="canonical-grid">
          <div className="canonical-item">
            <span className="label">Name</span>
            <span className="value">{data.canonical.name}</span>
          </div>
          <div className="canonical-item">
            <span className="label">Address</span>
            <span className="value">{data.canonical.address}</span>
          </div>
          <div className="canonical-item">
            <span className="label">Phone</span>
            <span className="value">{data.canonical.phone}</span>
          </div>
          <div className="canonical-item">
            <span className="label">Hours</span>
            <span className="value">{data.canonical.hours}</span>
          </div>
        </div>
      </div>

      {/* 平台对比表 */}
      <div className="nap-table-wrap">
        <table className="nap-table">
          <thead>
            <tr>
              <th>Platform</th>
              <th>Name</th>
              <th>Address</th>
              <th>Phone</th>
              <th>Hours</th>
            </tr>
          </thead>
          <tbody>
            {data.platforms.map((p, idx) => (
              <tr key={idx}>
                <td className="platform-cell">
                  <span className="platform-icon">{p.icon}</span>
                  <span>{p.name}</span>
                </td>
                <td className={getMatchClass(p.nameMatch)}>
                  <span className="match-icon">{getMatchIcon(p.nameMatch)}</span>
                  {!p.nameMatch && <span className="diff-value">{p.nameValue}</span>}
                </td>
                <td className={getMatchClass(p.addressMatch)}>
                  <span className="match-icon">{getMatchIcon(p.addressMatch)}</span>
                  {!p.addressMatch && <span className="diff-value">{p.addressValue}</span>}
                </td>
                <td className={getMatchClass(p.phoneMatch)}>
                  <span className="match-icon">{getMatchIcon(p.phoneMatch)}</span>
                  {!p.phoneMatch && <span className="diff-value">{p.phoneValue}</span>}
                </td>
                <td className={getMatchClass(p.hoursMatch)}>
                  <span className="match-icon">{getMatchIcon(p.hoursMatch)}</span>
                  {!p.hoursMatch && <span className="diff-value">{p.hoursValue}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 冲突列表 */}
      {data.conflicts.length > 0 && (
        <div className="conflicts-section">
          <h4>⚠ Conflicts to Fix</h4>
          {data.conflicts.map((conflict, idx) => (
            <div key={idx} className="conflict-item">
              <div className="conflict-header">
                <span className="conflict-field">{conflict.field}</span>
                <span className="conflict-impact">{conflict.impact}</span>
              </div>
              <div className="conflict-comparison">
                <div className="conflict-source">
                  <span className="source-name">{conflict.platform1}</span>
                  <span className="source-value">"{conflict.value1}"</span>
                </div>
                <span className="vs">≠</span>
                <div className="conflict-source">
                  <span className="source-name">{conflict.platform2}</span>
                  <span className="source-value">"{conflict.value2}"</span>
                </div>
              </div>
              <button className="fix-btn">Fix on {conflict.platform2}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Fingerprint 优化卡片
function FingerprintCard({ data }) {
  return (
    <div className="insight-card fingerprint-card">
      <div className="card-header">
        <h3>AI Fingerprint Optimization</h3>
        <div className={`coverage-badge ${data.coverageScore >= 70 ? 'good' : data.coverageScore >= 50 ? 'warning' : 'danger'}`}>
          Coverage: {data.coverageScore}%
        </div>
      </div>

      <p className="card-intro">
        AI uses structured attributes to match you with queries. Missing attributes = missed customers.
      </p>

      {/* 已有属性 */}
      <div className="attributes-section present">
        <h4>✓ Your Attributes ({data.present.length})</h4>
        <div className="attribute-tags">
          {data.present.map((attr, idx) => (
            <span key={idx} className="attr-tag present">
              <span className="attr-icon">{attr.icon}</span>
              <span className="attr-name">{attr.name}</span>
              <span className="attr-source">{attr.source}</span>
            </span>
          ))}
        </div>
      </div>

      {/* 缺失属性 */}
      <div className="attributes-section missing">
        <h4>✗ Missing (High Impact)</h4>
        <div className="missing-list">
          {data.missing.map((attr, idx) => (
            <div key={idx} className="missing-item">
              <div className="missing-header">
                <span className="missing-icon">{attr.icon}</span>
                <span className="missing-name">{attr.name}</span>
                <span className="missing-lift">+{attr.potentialLift}% visibility</span>
              </div>
              <p className="missing-reason">{attr.reason}</p>
              <button className="add-btn">Add to {attr.suggestedPlatform}</button>
            </div>
          ))}
        </div>
      </div>

      {/* 竞争对手差距 */}
      <div className="attributes-section competitor-gap">
        <h4>🎯 Competitor Advantage</h4>
        <p className="gap-intro">Top competitors have these attributes you're missing:</p>
        <div className="gap-list">
          {data.competitorGap.map((gap, idx) => (
            <div key={idx} className="gap-item">
              <span className="gap-icon">{gap.icon}</span>
              <span className="gap-attr">{gap.attribute}</span>
              <span className="gap-competitors">Used by: {gap.competitors.join(', ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 场景匹配度 */}
      <div className="scenario-match-section">
        <h4>Query Match Analysis</h4>
        <p className="match-intro">How well your attributes match common searches:</p>
        <div className="match-list">
          {data.scenarioMatches.map((scenario, idx) => (
            <div key={idx} className="match-item">
              <span className="match-query">"{scenario.query}"</span>
              <div className="match-bar-wrap">
                <div 
                  className="match-bar"
                  style={{ 
                    width: `${scenario.matchScore}%`,
                    background: scenario.matchScore >= 70 ? '#22c55e' : scenario.matchScore >= 40 ? '#eab308' : '#ef4444'
                  }}
                />
              </div>
              <span className="match-score">{scenario.matchScore}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ 主组件 ============

export default function Dashboard() {
  const [business] = useState(MOCK_BUSINESS);
  const [activeInsightTab, setActiveInsightTab] = useState('sentiment');

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
                {business.trend >= 0 ? '+' : ''}{business.trend}% vs last week
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
              {Object.entries(business.aiIndexStatus).map(([platform, info]) => (
                <div key={platform} className={`index-item ${info.status === 'warning' ? 'warning' : ''}`}>
                  <div className="index-platform">
                    <span className="platform-name">{platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
                  </div>
                  <div className={`index-status ${info.status === 'warning' ? 'warn' : 'indexed'}`}>
                    <span>{info.status === 'warning' ? 'Warning' : 'Indexed'}</span>
                  </div>
                  <div className="index-detail">
                    {info.weight && (
                      <span className={`weight-badge ${info.weight.toLowerCase()}`}>{info.weight}</span>
                    )}
                    {info.detail && <span className="detail-text">{info.detail}</span>}
                    {info.citations && <span className="detail-text">{info.citations} citation sources</span>}
                    {info.issue && (
                      <>
                        <span className="issue-text">{info.issue}</span>
                        <button className="fix-btn">Fix Now →</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 场景排名 + 竞争对手 */}
        <section className="details-section">
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
                        {data.trend > 0 ? '+' : ''}{data.trend}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="competitor-card">
            <div className="card-header">
              <h2>Top Competitors</h2>
            </div>
            <p className="card-subtitle">Who's competing for the same AI recommendations</p>

            <div className="competitor-list">
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
                    {comp.trend >= 0 ? '+' : ''}{comp.trend}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 新增：深度洞察 Tabs */}
        <section className="insights-section">
          <div className="insights-header">
            <h2>Deep Insights</h2>
            <div className="insights-tabs">
              <button 
                className={`tab-btn ${activeInsightTab === 'sentiment' ? 'active' : ''}`}
                onClick={() => setActiveInsightTab('sentiment')}
              >
                😊 Sentiment
              </button>
              <button 
                className={`tab-btn ${activeInsightTab === 'nap' ? 'active' : ''}`}
                onClick={() => setActiveInsightTab('nap')}
              >
                📋 Data Consistency
              </button>
              <button 
                className={`tab-btn ${activeInsightTab === 'fingerprint' ? 'active' : ''}`}
                onClick={() => setActiveInsightTab('fingerprint')}
              >
                🔍 Fingerprint
              </button>
            </div>
          </div>

          <div className="insights-content">
            {activeInsightTab === 'sentiment' && <SentimentCard data={MOCK_SENTIMENT} />}
            {activeInsightTab === 'nap' && <NAPCard data={MOCK_NAP} />}
            {activeInsightTab === 'fingerprint' && <FingerprintCard data={MOCK_FINGERPRINT} />}
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
              <h3>Add "Romantic" Attribute</h3>
              <p>Missing this tag costs you 18% visibility on date night searches.</p>
              <button className="action-btn secondary">Add Tag</button>
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
