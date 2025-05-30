import React, { useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import store from './store';
import CandlestickChart from './components/Chart/CandlestickChart';
import TimeframeSelector from './components/Chart/TimeframeSelector';
import BacktestPanel from './components/Backtest/BacktestPanel';
import BacktestSummaries from './components/Backtest/BacktestSummaries';
import BacktestSummaryPage from './pages/BacktestSummaryPage';
import BacktestDetailPage from './pages/BacktestDetailPage';
import DataLoader from './components/DataLoader';
import './App.css';

function App() {
  // 添加状态控制面板显示/隐藏
  const [showPanels, setShowPanels] = useState<boolean>(true);
  // 添加状态控制显示回测面板还是回测汇总面板
  const [showBacktestSummaries, setShowBacktestSummaries] = useState<boolean>(false);
  
  // 监听自定义事件以响应面板切换
  useEffect(() => {
    const handleTogglePanels = (event: CustomEvent<{show: boolean}>) => {
      setShowPanels(event.detail.show);
    };
    
    window.addEventListener('togglePanels', handleTogglePanels as EventListener);
    
    return () => {
      window.removeEventListener('togglePanels', handleTogglePanels as EventListener);
    };
  }, []);
  
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          <Route path="/backtest-summaries" element={<BacktestSummaryPage />} />
          <Route path="/backtest-detail/:backtestId" element={<BacktestDetailPage />} />
          <Route path="/" element={
            <div className="app">
              <header className="app-header">
                <h1>OKX 加密货币交易平台</h1>
                <div className="header-tabs">
                  <button 
                    className={`tab-button ${!showBacktestSummaries ? 'active' : ''}`}
                    onClick={() => setShowBacktestSummaries(false)}
                  >
                    回测
                  </button>
                  <Link 
                    to="/backtest-summaries" 
                    className="tab-button"
                  >
                    回测汇总
                  </Link>
                </div>
              </header>
              
              <main className={`app-content-simplified ${showPanels ? '' : 'panels-hidden'}`}>
                <div className="main-content">
                  <div className="chart-container">
                    <TimeframeSelector />
                    <CandlestickChart />
                  </div>
                </div>
                
                {showPanels && (
                  <div className="right-sidebar">
                    <div className="sidebar-panel">
                      <BacktestPanel />
                    </div>
                  </div>
                )}
              </main>
              
              <footer className="app-footer">
                <p>© 2023 OKX 加密货币交易平台 - 模拟数据仅供演示</p>
              </footer>
            </div>
          } />
        </Routes>
        {/* 数据加载器 */}
        <DataLoader />
      </Router>
    </Provider>
  );
}

export default App;
