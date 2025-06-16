import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchBacktestDetail, fetchBacktestSummary } from '../services/api';
import { BacktestTradeDetail } from '../store/types';
import { formatPercentage } from '../utils/helpers';
import BacktestDetailChart from '../components/Chart/BacktestDetailChart';
import './BacktestDetailPage.css';

// 策略名称的中英文映射
const strategyNameMap: Record<string, string> = {
  'ICHIMOKU': '一目均衡表',
  'MACD': 'MACD指标',
  'RSI': '相对强弱指标',
  'BOLLINGER': '布林带',
  'SMA': '简单移动平均线',
  'EMA': '指数移动平均线',
  'SUPERTREND': '超级趋势',
  'STOCHASTIC': '随机指标',
  'ADX': '平均方向指数',
  'CCI': '商品通道指数',
  'KDJ': 'KDJ指标'
};

// 每页显示的交易记录数量
const TRADES_PER_PAGE = 14;

// 排序类型
type SortField = 'profit' | 'profitPercentage' | 'totalAssets' | 'maxDrawdown' | 'maxLoss' | null;
type SortOrder = 'asc' | 'desc';

const BacktestDetailPage: React.FC = () => {
  const { backtestId } = useParams<{ backtestId: string }>();
  const [tradeDetails, setTradeDetails] = useState<BacktestTradeDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 添加分页状态
  const [currentPage, setCurrentPage] = useState(1);
  // 添加时间周期状态
  const [intervalVal, setIntervalVal] = useState<string>('1D');
  // 添加排序状态
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    if (backtestId) {
      loadBacktestDetail(backtestId);
      loadBacktestSummary(backtestId);
    }
  }, [backtestId]);

  const loadBacktestSummary = async (id: string) => {
    try {
      const summary = await fetchBacktestSummary(id);
      if (summary && summary.intervalVal) {
        console.log('获取到回测周期:', summary.intervalVal);
        setIntervalVal(summary.intervalVal);
      } else {
        console.warn('未能获取回测周期，使用默认值1D');
      }
    } catch (err) {
      console.error('获取回测摘要失败:', err);
    }
  };

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

  // 处理排序
  const handleSort = (field: SortField) => {
    // 如果点击的是当前排序字段，则切换排序顺序
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // 否则设置新的排序字段，默认降序（从大到小）
      setSortField(field);
      setSortOrder('desc');
    }
    // 重置到第一页
    setCurrentPage(1);
  };

  // 获取排序图标
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '⇅';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  // 将策略参数格式化为中文显示，只显示值，用逗号拼接
  const formatStrategyParams = (strategyCode: string, paramsStr: string): string => {
    try {
      // 如果策略参数为空或无效，直接返回原始值
      if (!paramsStr) {
        return paramsStr;
      }

      // 解析参数字符串为对象
      const params = JSON.parse(paramsStr);
      
      // 返回参数值，用逗号拼接
      return Object.values(params).join(', ');
    } catch (err) {
      console.error('解析策略参数失败:', err);
      return paramsStr; // 解析失败时返回原始字符串
    }
  };

  const formatAmount = (amount: number | null): string => {
    if (amount === null) return '0.00';
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount);
    const formattedValue = absAmount.toFixed(2);
    return isNegative ? `-${formattedValue}` : formattedValue;
  };

  const formatDateTime = (dateTimeStr: string): string => {
    // 将日期时间格式化为更紧凑的形式：YYYY-MM-DD
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    return date.getFullYear() + '-' + 
           String(date.getMonth() + 1).padStart(2, '0') + '-' + 
           String(date.getDate()).padStart(2, '0');
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

  // 获取排序后的交易记录
  const getSortedTrades = () => {
    // 创建交易记录的副本
    const sortedTrades = [...tradeDetails];

    // 根据排序字段排序
    if (sortField) {
      sortedTrades.sort((a, b) => {
        let aValue: number = 0;
        let bValue: number = 0;

        if (sortField === 'profit') {
          aValue = (a.exitAmount - a.entryAmount - (a.fee || 0));
          bValue = (b.exitAmount - b.entryAmount - (b.fee || 0));
        } else if (sortField === 'profitPercentage') {
          const aProfit = (a.exitAmount - a.entryAmount - (a.fee || 0));
          const bProfit = (b.exitAmount - b.entryAmount - (b.fee || 0));
          aValue = (aProfit / a.entryAmount) * 100;
          bValue = (bProfit / b.entryAmount) * 100;
        } else if (sortField === 'totalAssets') {
          aValue = a.totalAssets || 0;
          bValue = b.totalAssets || 0;
        } else if (sortField === 'maxDrawdown') {
          aValue = a.maxDrawdown || 0;
          bValue = b.maxDrawdown || 0;
        } else if (sortField === 'maxLoss') {
          aValue = a.maxLoss || 0;
          bValue = b.maxLoss || 0;
        }

        // 根据排序顺序返回比较结果
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      });
    }

    return sortedTrades;
  };

  // 获取当前页的交易记录
  const getCurrentPageTrades = () => {
    const sortedTrades = getSortedTrades();
    const startIndex = (currentPage - 1) * TRADES_PER_PAGE;
    const endIndex = startIndex + TRADES_PER_PAGE;
    return sortedTrades.slice(startIndex, endIndex);
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
          {/* 按钮已移除 */}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-indicator">加载中...</div>
      ) : tradeDetails.length === 0 ? (
        <div className="no-data-message">暂无交易详情数据</div>
      ) : (
        <div className="detail-info">
          <div className="strategy-info" style={{ backgroundColor: '#1e222d', borderRadius: '8px', padding: '10px', marginBottom: '15px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
            <div className="info-item-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <div className="info-item" style={{ flex: 1, minWidth: '200px', marginBottom: '5px', display: 'flex', alignItems: 'center', flexShrink: 0, color: '#b0b0b0' }}>
                <span className="label" style={{ color: '#8d8d8d', marginRight: '8px', fontWeight: 500, whiteSpace: 'nowrap' }}>策略名称:</span>
                <span className="value" style={{ color: '#b0b0b0', fontWeight: 500, wordBreak: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', maxWidth: '250px', whiteSpace: 'normal' }}>{strategyNameMap[tradeDetails[0].strategyName] || tradeDetails[0].strategyName}</span>
              </div>
              <div className="info-item" style={{ flex: 1, minWidth: '200px', marginBottom: '5px', display: 'flex', alignItems: 'center', flexShrink: 0, color: '#b0b0b0' }}>
                <span className="label" style={{ color: '#8d8d8d', marginRight: '8px', fontWeight: 500, whiteSpace: 'nowrap' }}>策略参数:</span>
                <span className="value" style={{ color: '#b0b0b0', fontWeight: 500, wordBreak: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', maxWidth: '250px', whiteSpace: 'normal' }}>{formatStrategyParams(tradeDetails[0].strategyName, tradeDetails[0].strategyParams)}</span>
              </div>
              <div className="info-item" style={{ flex: 1, minWidth: '200px', marginBottom: '5px', display: 'flex', alignItems: 'center', flexShrink: 0, color: '#b0b0b0' }}>
                <span className="label" style={{ color: '#8d8d8d', marginRight: '8px', fontWeight: 500, whiteSpace: 'nowrap' }}>交易对:</span>
                <span className="value" style={{ color: '#b0b0b0', fontWeight: 500, wordBreak: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', maxWidth: '250px', whiteSpace: 'normal' }}>{tradeDetails[0].symbol}</span>
              </div>
              <div className="info-item" style={{ flex: 1, minWidth: '200px', marginBottom: '5px', display: 'flex', alignItems: 'center', flexShrink: 0, color: '#b0b0b0' }}>
                <span className="label" style={{ color: '#8d8d8d', marginRight: '8px', fontWeight: 500, whiteSpace: 'nowrap' }}>回测周期:</span>
                <span className="value" style={{ color: '#b0b0b0', fontWeight: 500, wordBreak: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', maxWidth: '250px', whiteSpace: 'normal' }}>{intervalVal}</span>
              </div>
              <div className="info-item" style={{ flex: 1, minWidth: '200px', marginBottom: '5px', display: 'flex', alignItems: 'center', flexShrink: 0, color: '#b0b0b0' }}>
                <span className="label" style={{ color: '#8d8d8d', marginRight: '8px', fontWeight: 500, whiteSpace: 'nowrap' }}>时间范围:</span>
                <span className="value" style={{ color: '#b0b0b0', fontWeight: 500, wordBreak: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', maxWidth: '250px', whiteSpace: 'normal' }}>{formatDateTime(startTime)} 至 {formatDateTime(endTime)}</span>
              </div>
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
                  <th onClick={() => handleSort('profit')} style={{ cursor: 'pointer' }}>
                    盈亏 {getSortIcon('profit')}
                  </th>
                  <th onClick={() => handleSort('profitPercentage')} style={{ cursor: 'pointer' }}>
                    收益率 {getSortIcon('profitPercentage')}
                  </th>
                  <th onClick={() => handleSort('totalAssets')} style={{ cursor: 'pointer' }}>
                    总资产 {getSortIcon('totalAssets')}
                  </th>
                  <th onClick={() => handleSort('maxDrawdown')} style={{ cursor: 'pointer' }}>
                    最大回撤 {getSortIcon('maxDrawdown')}
                  </th>
                  <th onClick={() => handleSort('maxLoss')} style={{ cursor: 'pointer' }}>
                    最大损失 {getSortIcon('maxLoss')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {getCurrentPageTrades().map((trade, index) => {
                  const actualIndex = (currentPage - 1) * TRADES_PER_PAGE + index + 1;
                  const profit = trade.exitAmount - trade.entryAmount - (trade.fee || 0);
                  const profitPercentage = (profit / trade.entryAmount) * 100;
                  
                  return (
                    <tr key={index}>
                      <td>{actualIndex}</td>
                      <td className={trade.type === 'BUY' ? 'buy' : 'sell'}>{trade.type === 'BUY' ? '买入' : '卖出'}</td>
                      <td>{trade.entryTime}</td>
                      <td>{trade.entryPrice}</td>
                      <td>{formatAmount(trade.entryAmount)}</td>
                      <td>{trade.exitTime}</td>
                      <td>{trade.exitPrice}</td>
                      <td>{formatAmount(trade.exitAmount)}</td>
                      <td>{formatAmount(trade.fee)}</td>
                      <td className={profit >= 0 ? 'positive' : 'negative'}>{formatAmount(profit)}</td>
                      <td className={profitPercentage >= 0 ? 'positive' : 'negative'}>{formatPercentage(profitPercentage)}</td>
                      <td>{formatAmount(trade.totalAssets)}</td>
                      <td>{formatPercentage(trade.maxDrawdown * 100)}</td>
                      <td>{trade.maxLoss ? formatPercentage(trade.maxLoss * 100) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 分页控件 */}
          {getTotalPages() > 1 && (
            <div className="pagination">
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
              <span className="page-info">{currentPage} / {getTotalPages()}</span>
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
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BacktestDetailPage;
