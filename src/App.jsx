import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import Landing from './pages/Landing';
import ScanResult from './pages/ScanResult';
import './index.css';

export default function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [scanResult, setScanResult] = useState(null);
  const [showSignupModal, setShowSignupModal] = useState(false);

  // 处理免费扫描结果
  const handleScanResult = (result) => {
    setScanResult(result);
    setCurrentPage('result');
  };

  // 返回首页
  const handleBackToLanding = () => {
    setScanResult(null);
    setCurrentPage('landing');
  };

  // 显示注册弹窗
  const handleSignup = () => {
    setShowSignupModal(true);
  };

  // Landing 页面不显示导航栏
  if (currentPage === 'landing') {
    return (
      <div className="app">
        <Landing 
          onSearch={handleScanResult}
          onViewMap={() => setCurrentPage('map')}
        />
      </div>
    );
  }

  // 扫描结果页面
  if (currentPage === 'result') {
    return (
      <div className="app">
        <ScanResult 
          result={scanResult}
          onBack={handleBackToLanding}
          onSignup={handleSignup}
        />
        {showSignupModal && (
          <SignupModal onClose={() => setShowSignupModal(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="app">
      {/* 导航栏 */}
      <nav className="nav-bar">
        <div className="nav-brand" onClick={() => setCurrentPage('landing')} style={{ cursor: 'pointer' }}>
          AI Visibility
        </div>
        <div className="nav-links">
          <button 
            className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentPage('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={`nav-link ${currentPage === 'map' ? 'active' : ''}`}
            onClick={() => setCurrentPage('map')}
          >
            Map View
          </button>
          <button 
            className="nav-link"
            onClick={() => setCurrentPage('landing')}
          >
            Home
          </button>
        </div>
      </nav>

      {/* 页面内容 */}
      <div className="page-content">
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'map' && <MapView />}
      </div>

      {showSignupModal && (
        <SignupModal onClose={() => setShowSignupModal(false)} />
      )}
    </div>
  );
}

// 注册弹窗组件
function SignupModal({ onClose }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Thanks for signing up! We\'ll be in touch soon.');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="signup-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="modal-header">
          <h2>Start Your Free Trial</h2>
          <p>Get full access to AI visibility reports and optimization tools</p>
        </div>

        <div className="modal-features">
          <div className="feature">✓ Weekly AI visibility reports</div>
          <div className="feature">✓ Competitor tracking across 4 AI platforms</div>
          <div className="feature">✓ Hallucination monitoring & alerts</div>
          <div className="feature">✓ Actionable optimization recommendations</div>
        </div>

        <form className="signup-form" onSubmit={handleSubmit}>
          <input type="text" placeholder="Business Name" required />
          <input type="email" placeholder="Email Address" required />
          <input type="text" placeholder="Business Address" required />
          <button type="submit" className="submit-btn">Start Free Trial</button>
        </form>

        <p className="modal-footer">14-day free trial · No credit card required</p>
      </div>
    </div>
  );
}
