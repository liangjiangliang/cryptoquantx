import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppState, BacktestResults } from '../../store/types';
import { startBacktest, finishBacktest } from '../../store/actions';
import { formatDate, formatPrice, formatPercentage } from '../../utils/helpers';
import { mockBacktestResults } from '../../data/mockData';
import './BacktestPanel.css';

const BacktestPanel: React.FC = () => {
  const dispatch = useDispatch();
  const selectedPair = useSelector((state: AppState) => state.selectedPair);
  const timeframe = useSelector((state: AppState) => state.timeframe);
  const isBacktesting = useSelector((state: AppState) => state.isBacktesting);
  const backtestResults = useSelector((state: AppState) => state.backtestResults);

  const [startDate, setStartDate] = useState('2023-01-01');
  const [endDate, setEndDate] = useState('2023-12-31');
  const [initialCapital, setInitialCapital] = useState('10000');
  const [strategy, setStrategy] = useState('ma_crossover');

  // 策略选项
  const strategies = [
    { value: 'ma_crossover', label: '均线交叉策略' },
    { value: 'rsi_oversold', label: 'RSI超卖策略' },
    { value: 'bollinger_bands', label: '布林带策略' },
    { value: 'macd', label: 'MACD策略' },
  ];

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
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
              >
                {strategies.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            
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
              disabled={isBacktesting}
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
                      <td>{trade.amount.toFixed(4)}</td>
                      <td className={trade.profit >= 0 ? 'positive' : 'negative'}>
                        {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)} USDT
                        <span className="percentage">
                          ({formatPercentage(trade.profitPercentage)})
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