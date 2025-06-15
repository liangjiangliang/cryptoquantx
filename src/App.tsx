import React, {useState, useEffect, lazy, Suspense} from 'react';
import {Provider, useDispatch} from 'react-redux';
import {BrowserRouter as Router, Routes, Route, useLocation} from 'react-router-dom';
import store from './store';
import CandlestickChart from './components/Chart/CandlestickChart';
import BacktestPanel from './components/Backtest/BacktestPanel';
import BacktestSummaryPage from './pages/BacktestSummaryPage';
import BacktestDetailPage from './pages/BacktestDetailPage';
import BacktestFactoryPage from './pages/BacktestFactoryPage';
import BacktestCreatePage from './pages/BacktestCreatePage';
import BatchBacktestPage from './pages/BatchBacktestPage';
import BatchBacktestDetailPage from './pages/BatchBacktestDetailPage';
import DataLoader from './components/DataLoader';
import GlobalNavbar from './components/GlobalNavbar';
import {clearBacktestResults} from './store/actions';
import './App.css';

// 懒加载StagewiseToolbar组件
const StagewiseToolbar = lazy(() => 
  import('@stagewise/toolbar-react').then(module => ({
    default: module.StagewiseToolbar
  }))
);

// 首页组件，用于包装首页内容
const HomePage = () => {
    const [showPanels, setShowPanels] = useState<boolean>(true);
    const location = useLocation();
    const dispatch = useDispatch();

    // 从URL参数中获取策略代码
    const searchParams = new URLSearchParams(location.search);
    const strategyCode = searchParams.get('strategy');

    // 在页面加载时清除回测结果
    useEffect(() => {
        // 确保页面加载时清除任何之前的回测结果
        dispatch(clearBacktestResults());
    }, [dispatch]);

    // 监听自定义事件以响应面板切换
    useEffect(() => {
        const handleTogglePanels = (event: CustomEvent<{ show: boolean }>) => {
            setShowPanels(event.detail.show);
        };

        window.addEventListener('togglePanels', handleTogglePanels as EventListener);

        return () => {
            window.removeEventListener('togglePanels', handleTogglePanels as EventListener);
        };
    }, []);

    // 如果有策略代码，设置自定义事件通知BacktestPanel使用此策略
    useEffect(() => {
        if (strategyCode) {
            const event = new CustomEvent('setStrategy', {
                detail: {strategyCode}
            });
            window.dispatchEvent(event);
        }
    }, [strategyCode]);

    return (
        <div className="app">
            <main className={`app-content-simplified ${showPanels ? '' : 'panels-hidden'}`}>
                <div className="main-content">
                    <div className="chart-container">
                        <CandlestickChart/>
                    </div>
                </div>

                {showPanels && (
                    <div className="right-sidebar">
                        <div className="sidebar-panel">
                            <BacktestPanel/>
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
    // 只在开发环境下显示工具栏
    const [showToolbar, setShowToolbar] = useState(process.env.NODE_ENV === 'development');

    return (
        <Provider store={store}>
            <Router>
                <RouteChangeHandler/>
                <GlobalNavbar/>
                <div className="app-container">
                    <Routes>
                        <Route path="/backtest-summaries" element={<BacktestSummaryPage/>}/>
                        <Route path="/backtest-detail/:backtestId" element={<BacktestDetailPage/>}/>
                        <Route path="/backtest-factory" element={<BacktestFactoryPage/>}/>
                        <Route path="/backtest-create/:strategyCode" element={<BacktestCreatePage/>}/>
                        <Route path="/batch-backtest" element={<BatchBacktestPage/>}/>
                        <Route path="/batch-backtest-detail/:batchId" element={<BatchBacktestDetailPage/>}/>
                        <Route path="/" element={<HomePage/>}/>
                    </Routes>
                </div>
                {/* 数据加载器 */}
                <DataLoader/>
                
                {/* Stagewise工具栏 - 只在开发环境下显示 */}
                {showToolbar && (
                    <Suspense fallback={<div>Loading toolbar...</div>}>
                        <StagewiseToolbar />
                    </Suspense>
                )}
            </Router>
        </Provider>
    );
}

export default App;
