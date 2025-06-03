import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppState, BacktestSummary } from '../../store/types';
import { setBacktestSummaries } from '../../store/actions';
import { fetchBacktestSummaries } from '../../services/api';
import { formatDate, formatPercentage } from '../../utils/helpers';
import './BacktestSummaries.css';

const BacktestSummaries: React.FC = () => {
  const dispatch = useDispatch();
  const backtestSummaries = useSelector((state: AppState) => state.backtestSummaries);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBacktestSummaries();
  }, []);

  const loadBacktestSummaries = async () => {
    setLoading(true);
    setError(null);
    try {
      const summaries = await fetchBacktestSummaries();
      dispatch(setBacktestSummaries(summaries));
    } catch (err) {
      setError('获取回测汇总数据失败，请稍后重试');
      console.error('获取回测汇总数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number): string => {
    // 处理负数
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount);

    let formattedValue: string;
    if (absAmount >= 1000000000) {
      formattedValue = `${(absAmount / 1000000000).toFixed(2)}B`;
    } else if (absAmount >= 1000000) {
      formattedValue = `${(absAmount / 1000000).toFixed(2)}M`;
    } else if (absAmount >= 1000) {
      formattedValue = `${(absAmount / 1000).toFixed(2)}K`;
    } else {
      formattedValue = absAmount.toFixed(2);
    }

    return isNegative ? `-${formattedValue}` : formattedValue;
  };

  return (
    <div className="backtest-summaries">
      <div className="backtest-summaries-header">
        <h3>回测汇总</h3>
        <button
          className="refresh-button"
          onClick={loadBacktestSummaries}
          disabled={loading}
        >
          {loading ? '加载中...' : '刷新'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-indicator">加载中...</div>
      ) : backtestSummaries.length === 0 ? (
        <div className="no-data-message">暂无回测数据</div>
      ) : (
        <div className="summaries-table-container">
          <table className="summaries-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>交易对</th>
                <th>时间周期</th>
                <th>策略</th>
                <th>参数</th>
                <th>开始时间</th>
                <th>结束时间</th>
                <th>初始资金</th>
                <th>最终资金</th>
                <th>总收益</th>
                <th>收益率</th>
                <th>交易次数</th>
                <th>胜率</th>
                <th>最大回撤</th>
                <th>夏普比率</th>
                <th>创建时间</th>
              </tr>
            </thead>
            <tbody>
              {backtestSummaries.map((summary) => (
                <tr key={summary.id}>
                  <td>{summary.id}</td>
                  <td>{summary.symbol}</td>
                  <td>{summary.intervalVal}</td>
                  <td>{summary.strategyName}</td>
                  <td>{summary.strategyParams}</td>
                  <td>{summary.startTime.substring(0, 10)}</td>
                  <td>{summary.endTime.substring(0, 10)}</td>
                  <td>{formatAmount(summary.initialAmount)}</td>
                  <td>{formatAmount(summary.finalAmount)}</td>
                  <td>{formatAmount(summary.totalProfit)}</td>
                  <td className={summary.totalReturn >= 0 ? 'positive' : 'negative'}>
                    {formatPercentage(summary.totalReturn * 100)}
                  </td>
                  <td>{summary.numberOfTrades}</td>
                  <td>{(summary.winRate * 100).toFixed(2)}%</td>
                  <td>{(summary.maxDrawdown * 100).toFixed(2)}%</td>
                  <td>{summary.sharpeRatio.toFixed(2)}</td>
                  <td>{summary.createTime.substring(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BacktestSummaries;
