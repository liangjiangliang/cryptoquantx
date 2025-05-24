import React from 'react';
import { Provider } from 'react-redux';
import store from './store';
import CandlestickChart from './components/Chart/CandlestickChart';
import TimeframeSelector from './components/Chart/TimeframeSelector';
import TradingPanel from './components/TradingPanel/TradingPanel';
import BacktestPanel from './components/Backtest/BacktestPanel';
import StagewiseToolbarWrapper from './components/DevTools/StagewiseToolbarWrapper';
import DataLoader from './components/DataLoader';
import './App.css';

function App() {
  return (
    <Provider store={store}>
      <div className="app">
        <header className="app-header">
          <h1>OKX 加密货币交易平台</h1>
        </header>
        
        <main className="app-content-simplified">
          <div className="main-content">
            <div className="chart-container">
              <TimeframeSelector />
              <CandlestickChart />
            </div>
            
            <div className="panels-container">
              <div className="panel">
                <TradingPanel />
              </div>
              <div className="panel">
                <BacktestPanel />
              </div>
            </div>
          </div>
        </main>
        
        <footer className="app-footer">
          <p>© 2023 OKX 加密货币交易平台 - 模拟数据仅供演示</p>
        </footer>
      </div>
      {/* 数据加载器 */}
      <DataLoader />
      {/* 只在开发环境中加载Stagewise工具栏，使用错误边界处理可能的错误 */}
      {process.env.NODE_ENV === 'development' && <StagewiseToolbarWrapper />}
    </Provider>
  );
}

export default App;
