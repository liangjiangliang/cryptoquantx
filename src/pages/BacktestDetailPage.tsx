import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchBacktestDetail } from '../services/api';
import { BacktestTradeDetail } from '../store/types';
import { formatPercentage } from '../utils/helpers';
import BacktestDetailChart from '../components/Chart/BacktestDetailChart';
import './BacktestDetailPage.css';

// 每页显示的交易记录数量
const TRADES_PER_PAGE = 14;

const BacktestDetailPage: React.FC = () => {
  const { backtestId } = useParams<{ backtestId: string }>();
  const [tradeDetails, setTradeDetails] = useState<BacktestTradeDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 添加分页状态
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (backtestId) {
      loadBacktestDetail(backtestId);
    }
  }, [backtestId]);

  const loadBacktestDetail = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const details = await fetchBacktestDetail(id);
      setTradeDetails(details);
      // 重置到第一页
      setCurrentPage(1);
    } catch (err) {
      setError('获取回测详情数据失败，请稍后重试');
      console.error('获取回测详情数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number): string => {
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount);
    const formattedValue = absAmount.toFixed(2);
    return isNegative ? `-${formattedValue}` : formattedValue;
  };

  const formatDateTime = (dateTimeStr: string): string => {
    return dateTimeStr.replace(' ', ' ');
  };

  // 获取回测的开始和结束时间
  const getBacktestTimeRange = () => {
    if (tradeDetails.length === 0) {
      return { startTime: '', endTime: '', symbol: '' };
    }

    // 找出最早的入场时间和最晚的出场时间
    let earliestEntryTime = tradeDetails[0].entryTime;
    let latestExitTime = tradeDetails[0].exitTime;
    let symbol = tradeDetails[0].symbol;

    tradeDetails.forEach(trade => {
      if (new Date(trade.entryTime) < new Date(earliestEntryTime)) {
        earliestEntryTime = trade.entryTime;
      }
      if (new Date(trade.exitTime) > new Date(latestExitTime)) {
        latestExitTime = trade.exitTime;
      }
    });

    return { startTime: earliestEntryTime, endTime: latestExitTime, symbol };
  };

  // 计算总页数
  const getTotalPages = () => {
    return Math.ceil(tradeDetails.length / TRADES_PER_PAGE);
  };

  // 获取当前页的交易记录
  const getCurrentPageTrades = () => {
    const startIndex = (currentPage - 1) * TRADES_PER_PAGE;
    const endIndex = startIndex + TRADES_PER_PAGE;
    return tradeDetails.slice(startIndex, endIndex);
  };

  // 处理页面变更
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const { startTime, endTime, symbol } = getBacktestTimeRange();

  return (
    <div className="backtest-detail-page">
      <div className="backtest-detail-header">
        <div className="header-actions">
          <Link to="/backtest-summaries" className="back-to-summary-button">
            回测汇总
          </Link>
          <button onClick={() => loadBacktestDetail(backtestId || '')} className="refresh-button">
            {loading ? '加载中...' : '刷新数据'}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-indicator">加载中...</div>
      ) : tradeDetails.length === 0 ? (
        <div className="no-data-message">暂无交易详情数据</div>
      ) : (
        <div className="detail-info">
          <div className="strategy-info">
            <div className="info-item">
              <span className="label">策略名称:</span>
              <span className="value">{tradeDetails[0].strategyName}</span>
            </div>
            <div className="info-item">
              <span className="label">策略参数:</span>
              <span className="value">{tradeDetails[0].strategyParams}</span>
            </div>
            <div className="info-item">
              <span className="label">交易对:</span>
              <span className="value">{tradeDetails[0].symbol}</span>
            </div>
            <div className="info-item">
              <span className="label">回测ID:</span>
              <span className="value">{tradeDetails[0].backtestId}</span>
            </div>
          </div>

          {/* 添加K线图 */}
          {symbol && startTime && endTime && (
            <BacktestDetailChart
              symbol={symbol}
              startTime={startTime}
              endTime={endTime}
              tradeDetails={tradeDetails}
            />
          )}

          <div className="detail-table-container">
            <table className="detail-table">
              <thead>
                <tr>
                  <th>序号</th>
                  <th>类型</th>
                  <th>入场时间</th>
                  <th>入场价格</th>
                  <th>入场金额</th>
                  <th>出场时间</th>
                  <th>出场价格</th>
                  <th>出场金额</th>
                  <th>手续费</th>
                  <th>盈亏</th>
                  <th>收益率</th>
                  <th>总资产</th>
                  <th>最大回撤</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentPageTrades().map((trade) => (
                  <tr key={trade.id}>
                    <td>{trade.index}</td>
                    <td className={trade.type === 'BUY' ? 'buy' : 'sell'}>
                      {trade.type === 'BUY' ? '买入' : '卖出'}
                    </td>
                    <td>{formatDateTime(trade.entryTime)}</td>
                    <td>{formatAmount(trade.entryPrice)}</td>
                    <td>{formatAmount(trade.entryAmount)}</td>
                    <td>{formatDateTime(trade.exitTime)}</td>
                    <td>{formatAmount(trade.exitPrice)}</td>
                    <td>{formatAmount(trade.exitAmount)}</td>
                    <td>{trade.fee ? formatAmount(trade.fee) : '0.00'}</td>
                    <td className={trade.profit >= 0 ? 'positive' : 'negative'}>
                      {trade.profit >= 0 ? '+' : ''}{formatAmount(trade.profit)}
                    </td>
                    <td className={trade.profitPercentage >= 0 ? 'positive' : 'negative'}>
                      {formatPercentage(trade.profitPercentage*100)}
                    </td>
                    <td>{formatAmount(trade.totalAssets)}</td>
                    <td>{formatPercentage(trade.maxDrawdown)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 添加分页控制 */}
            {tradeDetails.length > TRADES_PER_PAGE && (
              <div className="pagination-container">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="pagination-button"
                >
                  首页
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-button"
                >
                  上一页
                </button>
                <div className="pagination-info">
                  {currentPage} / {getTotalPages()} 页 (共 {tradeDetails.length} 条记录)
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === getTotalPages()}
                  className="pagination-button"
                >
                  下一页
                </button>
                <button
                  onClick={() => handlePageChange(getTotalPages())}
                  disabled={currentPage === getTotalPages()}
                  className="pagination-button"
                >
                  末页
                </button>
                <div className="page-size-selector">
                  每页 {TRADES_PER_PAGE} 条
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BacktestDetailPage;
