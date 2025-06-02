import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppState, BacktestResults } from '../../store/types';
import { startBacktest, finishBacktest } from '../../store/actions';
import { formatDate, formatPrice, formatPercentage } from '../../utils/helpers';
import { mockBacktestResults } from '../../data/mockData';
import './BacktestPanel.css';

// 获取一年前的日期
const getOneYearAgo = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);
  return date.toISOString().split('T')[0]; // 返回YYYY-MM-DD格式
};

// 获取当前日期
const getCurrentDate = () => {
  return new Date().toISOString().split('T')[0]; // 返回YYYY-MM-DD格式
};

// 策略接口定义
interface Strategy {
  name: string;
  description: string;
  params: string;
}

interface StrategiesResponse {
  code: number;
  data: {
    [key: string]: Strategy;
  };
  message: string;
}

const BacktestPanel: React.FC = () => {
  const dispatch = useDispatch();
  const selectedPair = useSelector((state: AppState) => state.selectedPair);
  const timeframe = useSelector((state: AppState) => state.timeframe);
  const isBacktesting = useSelector((state: AppState) => state.isBacktesting);
  const backtestResults = useSelector((state: AppState) => state.backtestResults);

  const [startDate, setStartDate] = useState(getOneYearAgo());
  const [endDate, setEndDate] = useState(getCurrentDate());
  const [initialCapital, setInitialCapital] = useState('10000');
  const [strategy, setStrategy] = useState('');
  const [strategies, setStrategies] = useState<{[key: string]: Strategy}>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取可用策略列表
  useEffect(() => {
    const fetchStrategies = async () => {
      setLoading(true);
      setError(null);
      try {
        // 使用相对路径，通过React开发服务器的代理转发请求
        const response = await fetch('/api/api/backtest/ta4j/strategies');
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data: StrategiesResponse = await response.json();
        if (data.code === 200 && data.data) {
          setStrategies(data.data);
          // 设置默认策略为列表中的第一个
          if (Object.keys(data.data).length > 0 && !strategy) {
            setStrategy(Object.keys(data.data)[0]);
          }
        } else {
          throw new Error(data.message || '获取策略列表失败');
        }
      } catch (err) {
        console.error('获取策略列表失败:', err);
        setError(err instanceof Error ? err.message : '获取策略列表失败');
        
        // 添加模拟数据，以防API不可用
        const mockStrategies = {
          "SMA": {
            "name": "简单移动平均线策略",
            "description": "基于短期和长期移动平均线的交叉信号产生买卖信号",
            "params": "短期均线周期,长期均线周期 (例如：5,20)"
          },
          "MACD": {
            "name": "MACD策略",
            "description": "基于MACD线与信号线的交叉以及柱状图的变化产生买卖信号",
            "params": "短周期,长周期,信号周期 (例如：12,26,9)"
          },
          "RSI": {
            "name": "RSI相对强弱指标策略",
            "description": "基于RSI指标的超买超卖区域产生买卖信号",
            "params": "RSI周期,超卖阈值,超买阈值 (例如：14,30,70)"
          },
          "BOLLINGER": {
            "name": "布林带策略",
            "description": "基于价格突破布林带上下轨或回归中轨产生买卖信号",
            "params": "周期,标准差倍数 (例如：20,2.0)"
          }
        };
        setStrategies(mockStrategies);
        if (!strategy) {
          setStrategy(Object.keys(mockStrategies)[0]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStrategies();
  }, []);

  // 运行回测
  const runBacktest = () => {
    dispatch(startBacktest());
    
    // 模拟回测过程
    setTimeout(() => {
      dispatch(finishBacktest(mockBacktestResults as BacktestResults));
    }, 2000);
  };

  return (
    <div className="backtest-panel">
      <div className="backtest-panel-header">
        <h3>回测 - {selectedPair}</h3>
      </div>
      
      <div className="backtest-panel-content">
        {!backtestResults ? (
          <div className="backtest-form">
            <div className="input-group">
              <label>开始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div className="input-group">
              <label>结束日期</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            
            <div className="input-group">
              <label>初始资金 (USDT)</label>
              <input
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(e.target.value)}
                min="100"
                step="100"
              />
            </div>
            
            <div className="input-group">
              <label>交易策略</label>
              {loading ? (
                <div className="loading-strategies">加载策略中...</div>
              ) : error ? (
                <div className="error-message">{error}</div>
              ) : (
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                >
                  {Object.entries(strategies).map(([key, strategyData]) => (
                    <option key={key} value={key}>
                      {strategyData.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            {strategy && strategies[strategy] && (
              <div className="strategy-description">
                <p>{strategies[strategy].description}</p>
                <p className="params-hint">参数: {strategies[strategy].params}</p>
              </div>
            )}
            
            <div className="input-group">
              <label>交易对</label>
              <input type="text" value={selectedPair} disabled />
            </div>
            
            <div className="input-group">
              <label>时间周期</label>
              <input type="text" value={timeframe} disabled />
            </div>
            
            <button
              className="run-backtest-button"
              onClick={runBacktest}
              disabled={isBacktesting || loading || !strategy}
            >
              {isBacktesting ? '运行中...' : '运行回测'}
            </button>
          </div>
        ) : (
          <div className="backtest-results">
            <div className="results-summary">
              <div className="summary-item">
                <span className="label">初始资金</span>
                <span className="value">{backtestResults.initialCapital} USDT</span>
              </div>
              <div className="summary-item">
                <span className="label">最终资金</span>
                <span className="value">{backtestResults.finalCapital} USDT</span>
              </div>
              <div className="summary-item">
                <span className="label">净利润</span>
                <span className={`value ${backtestResults.profit >= 0 ? 'positive' : 'negative'}`}>
                  {backtestResults.profit >= 0 ? '+' : ''}{backtestResults.profit} USDT
                </span>
              </div>
              <div className="summary-item">
                <span className="label">收益率</span>
                <span className={`value ${backtestResults.profitPercentage >= 0 ? 'positive' : 'negative'}`}>
                  {formatPercentage(backtestResults.profitPercentage)}
                </span>
              </div>
              <div className="summary-item">
                <span className="label">总交易次数</span>
                <span className="value">{backtestResults.totalTrades}</span>
              </div>
              <div className="summary-item">
                <span className="label">胜率</span>
                <span className="value">{backtestResults.winRate}%</span>
              </div>
              <div className="summary-item">
                <span className="label">最大回撤</span>
                <span className="value">{backtestResults.maxDrawdown}%</span>
              </div>
              <div className="summary-item">
                <span className="label">夏普比率</span>
                <span className="value">{backtestResults.sharpeRatio}</span>
              </div>
            </div>
            
            <div className="trades-table">
              <h4>交易记录</h4>
              <table>
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>类型</th>
                    <th>价格</th>
                    <th>数量</th>
                    <th>盈亏</th>
                  </tr>
                </thead>
                <tbody>
                  {backtestResults.trades.map((trade) => (
                    <tr key={trade.id}>
                      <td>{formatDate(trade.entryTime)}</td>
                      <td className={trade.side}>{trade.side === 'buy' ? '买入' : '卖出'}</td>
                      <td>{formatPrice(trade.entryPrice)}</td>
                      <td>{trade.amount?.toFixed(4) || '0.0000'}</td>
                      <td className={trade.profit >= 0 ? 'positive' : 'negative'}>
                        {trade.profit >= 0 ? '+' : ''}{trade.profit?.toFixed(2) || '0.00'} USDT
                        <span className="percentage">
                          ({formatPercentage(trade.profitPercentage || 0)})
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <button
              className="reset-backtest-button"
              onClick={() => dispatch(finishBacktest(null as any))}
            >
              重新设置
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BacktestPanel; 