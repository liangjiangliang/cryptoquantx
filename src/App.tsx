import React, { useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import store from './store';
import CandlestickChart from './components/Chart/CandlestickChart';
import BacktestPanel from './components/Backtest/BacktestPanel';
import BacktestSummaries from './components/Backtest/BacktestSummaries';
import BacktestSummaryPage from './pages/BacktestSummaryPage';
import BacktestDetailPage from './pages/BacktestDetailPage';
import BacktestFactoryPage from './pages/BacktestFactoryPage';
import BacktestCreatePage from './pages/BacktestCreatePage';
import DataLoader from './components/DataLoader';
import GlobalNavbar from './components/GlobalNavbar';
import Logo from './components/Logo';
import './App.css';

// 首页组件，用于包装首页内容
const HomePage = () => {
  const [showPanels, setShowPanels] = useState<boolean>(true);
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
    <div className="app">
      <main className={`app-content-simplified ${showPanels ? '' : 'panels-hidden'}`}>
        <div className="main-content">
          <div className="chart-container">
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
  );
};

// 路由监听组件，用于在路由变化时触发数据加载
const RouteChangeHandler = () => {
  const location = useLocation();
  
  useEffect(() => {
    // 当路由变化到首页时，触发数据重新加载
    if (location.pathname === '/') {
      // 给DataLoader一个小延时，确保组件已经挂载
      setTimeout(() => {
        const event = new Event('reload_data');
        window.dispatchEvent(event);
      }, 100);
    }
  }, [location]);
  
  return null;
};

function App() {
  return (
    <Provider store={store}>
      <Router>
        <RouteChangeHandler />
        <GlobalNavbar />
        <div className="app-container">
          <Routes>
            <Route path="/backtest-summaries" element={<BacktestSummaryPage />} />
            <Route path="/backtest-detail/:backtestId" element={<BacktestDetailPage />} />
            <Route path="/backtest-factory" element={<BacktestFactoryPage />} />
            <Route path="/backtest-create/:strategyCode" element={<BacktestCreatePage />} />
            <Route path="/" element={<HomePage />} />
          </Routes>
        </div>
        {/* 数据加载器 */}
        <DataLoader />
      </Router>
    </Provider>
  );
}

export default App;
