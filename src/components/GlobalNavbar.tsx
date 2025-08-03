import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';
import './GlobalNavbar.css';

// 行情数据接口
interface TickerData {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
}

const GlobalNavbar: React.FC = () => {
  const location = useLocation();

  // 行情数据状态
  const [tickers, setTickers] = useState<TickerData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 主流币种列表
  const mainCoins = ['BTC-USDT', 'ETH-USDT', 'XRP-USDT', 'SOL-USDT', 'DOGE-USDT', 'SUI-USDT'];

  // 获取行情数据
  const fetchMarketData = async () => {
    try {
      const response = await fetch('/api/market/all_tickers?filter=all&limit=2000');
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      if (data.code === 200 && data.data) {
        // 按指定顺序筛选主流币种
        const mainCoinTickers: TickerData[] = mainCoins.map(coinSymbol => {
          const ticker = data.data.find((t: any) => t.symbol === coinSymbol);
          return ticker ? {
            symbol: ticker.symbol,
            lastPrice: ticker.lastPrice,
            priceChange: ticker.priceChange,
            priceChangePercent: ticker.priceChangePercent
          } : null;
        }).filter((ticker): ticker is TickerData => ticker !== null); // 类型守卫过滤

        setTickers(mainCoinTickers);
      }
    } catch (error) {
      console.error('获取行情数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时获取数据，并设置定时器
  useEffect(() => {
    fetchMarketData();

    // 每30秒更新一次
    const interval = setInterval(fetchMarketData, 30000);

    return () => clearInterval(interval);
  }, []);

  // 格式化价格显示
  const formatPrice = (price: string): string => {
    const num = parseFloat(price);
    if (num >= 1000) {
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (num >= 1) {
      return num.toFixed(4);
    } else {
      return num.toFixed(6);
    }
  };

  // 格式化涨跌幅
  const formatChangePercent = (percent: string): string => {
    const num = parseFloat(percent);
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  return (
    <div className="global-navbar">
      <div className="navbar-left">
        <Logo />
        <Link to="/backtest-summaries" className="nav-link backtest-nav-link">
          历史回测
        </Link>
        <Link to="/backtest-factory" className="nav-link backtest-nav-link">
          策略工厂
        </Link>
        <Link to="/batch-backtest" className="nav-link backtest-nav-link batch-backtest-link">
          批量回测
        </Link>
        <Link to="/real-time-strategy" className="nav-link backtest-nav-link real-time-strategy-link">
          实盘策略
        </Link>
        <Link to="/fund-center" className="nav-link backtest-nav-link fund-center-link">
          资金中心
        </Link>
        <Link to="/indicator-distribution" className="nav-link backtest-nav-link indicator-distribution-link">
          指标分布
        </Link>
      </div>
      <div className="navbar-right">
        <div className="market-ticker">
          {loading ? (
            <div className="ticker-loading">加载行情中...</div>
          ) : (
            <div className="ticker-list">
              {tickers.map((ticker) => (
                <div key={ticker.symbol} className="ticker-item">
                  <span className="ticker-symbol">
                    {ticker.symbol.replace('-USDT', '')}
                  </span>
                  <span className="ticker-price">
                    ${formatPrice(ticker.lastPrice)}
                  </span>
                  <span className={`ticker-change ${parseFloat(ticker.priceChangePercent) >= 0 ? 'positive' : 'negative'}`}>
                    {formatChangePercent(ticker.priceChangePercent)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalNavbar;