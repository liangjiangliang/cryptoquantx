import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { fetchBacktestDetail, fetchBacktestSummary } from '../services/api';
import { BacktestTradeDetail, BacktestSummary } from '../store/types';
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
type SortField = 'type' | 'entryTime' | 'entryPrice' | 'entryAmount' | 'exitTime' | 'exitPrice' | 'exitAmount' | 'fee' | 'profit' | 'profitPercentage' | 'periods' | 'profitPercentagePerPeriod' | 'totalAssets' | 'maxDrawdown' | 'maxLoss' | 'maxDrawdownPeriod' | 'maxLossPeriod' | null;
type SortOrder = 'asc' | 'desc';

const BacktestDetailPage: React.FC = () => {
  const { backtestId } = useParams<{ backtestId: string }>();
  const [tradeDetails, setTradeDetails] = useState<BacktestTradeDetail[]>([]);
  const [backtestSummary, setBacktestSummary] = useState<BacktestSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 添加分页状态
  const [currentPage, setCurrentPage] = useState(1);
  // 添加时间周期状态
  const [intervalVal, setIntervalVal] = useState<string>('1D');
  // 添加排序状态
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  // 添加回测指标折叠状态
  const [isMetricsCollapsed, setIsMetricsCollapsed] = useState(true);
  // 添加选中的交易行状态
  const [selectedTradeIndex, setSelectedTradeIndex] = useState<number | null>(null);
  // 添加图表引用
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (backtestId) {
      loadBacktestDetail(backtestId);
      loadBacktestSummary(backtestId);
    }
  }, [backtestId]);

  const loadBacktestSummary = async (id: string) => {
    try {
      const summary = await fetchBacktestSummary(id);
      if (summary) {
        setBacktestSummary(summary);
        if (summary.intervalVal) {
          console.log('获取到回测周期:', summary.intervalVal);
          setIntervalVal(summary.intervalVal);
        } else {
          console.warn('未能获取回测周期，使用默认值1D');
        }
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
    if (tradeDetails.length === 0 || !tradeDetails[0]) {
      return { startTime: '', endTime: '', symbol: '' };
    }

    // 找出最早的入场时间和最晚的出场时间
    let earliestEntryTime = tradeDetails[0].entryTime;
    let latestExitTime = tradeDetails[0].exitTime;
    let symbol = tradeDetails[0].symbol;

    tradeDetails.forEach(trade => {
      if (trade && trade.entryTime && new Date(trade.entryTime) < new Date(earliestEntryTime)) {
        earliestEntryTime = trade.entryTime;
      }
      if (trade && trade.exitTime && new Date(trade.exitTime) > new Date(latestExitTime)) {
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
    // 过滤掉空值元素并创建交易记录的副本
    const sortedTrades = tradeDetails.filter(trade => trade != null);

    // 根据排序字段排序
    if (sortField) {
      sortedTrades.sort((a, b) => {
        let aValue: any = null;
        let bValue: any = null;

        switch(sortField) {
          case 'type':
            aValue = a.type || '';
            bValue = b.type || '';
            // 字符串比较需要特殊处理
            return sortOrder === 'asc'
              ? aValue.localeCompare(bValue)
              : bValue.localeCompare(aValue);

          case 'entryTime':
            aValue = a.entryTime ? new Date(a.entryTime).getTime() : 0;
            bValue = b.entryTime ? new Date(b.entryTime).getTime() : 0;
            break;

          case 'entryPrice':
            aValue = a.entryPrice || 0;
            bValue = b.entryPrice || 0;
            break;

          case 'entryAmount':
            aValue = a.entryAmount || 0;
            bValue = b.entryAmount || 0;
            break;

          case 'exitTime':
            aValue = a.exitTime ? new Date(a.exitTime).getTime() : 0;
            bValue = b.exitTime ? new Date(b.exitTime).getTime() : 0;
            break;

          case 'exitPrice':
            aValue = a.exitPrice || 0;
            bValue = b.exitPrice || 0;
            break;

          case 'exitAmount':
            aValue = a.exitAmount || 0;
            bValue = b.exitAmount || 0;
            break;

          case 'fee':
            aValue = a.fee || 0;
            bValue = b.fee || 0;
            break;

          case 'profit':
            aValue = ((a.exitAmount || 0) - (a.entryAmount || 0) - (a.fee || 0));
            bValue = ((b.exitAmount || 0) - (b.entryAmount || 0) - (b.fee || 0));
            break;

          case 'profitPercentage':
            const aProfit = ((a.exitAmount || 0) - (a.entryAmount || 0) - (a.fee || 0));
            const bProfit = ((b.exitAmount || 0) - (b.entryAmount || 0) - (b.fee || 0));
            aValue = a.entryAmount ? (aProfit / a.entryAmount) * 100 : 0;
            bValue = b.entryAmount ? (bProfit / b.entryAmount) * 100 : 0;
            break;

          case 'periods':
            aValue = a.periods || 0;
            bValue = b.periods || 0;
            break;

          case 'profitPercentagePerPeriod':
            aValue = a.profitPercentagePerPeriod || 0;
            bValue = b.profitPercentagePerPeriod || 0;
            break;

          case 'totalAssets':
            aValue = a.totalAssets || 0;
            bValue = b.totalAssets || 0;
            break;

          case 'maxDrawdown':
            aValue = a.maxDrawdown || 0;
            bValue = b.maxDrawdown || 0;
            break;

          case 'maxLoss':
            aValue = a.maxLoss || 0;
            bValue = b.maxLoss || 0;
            break;

          case 'maxDrawdownPeriod':
            aValue = a.maxDrawdownPeriod || 0;
            bValue = b.maxDrawdownPeriod || 0;
            break;

          case 'maxLossPeriod':
            aValue = a.maxLossPeriod || 0;
            bValue = b.maxLossPeriod || 0;
            break;

          default:
            return 0; // 默认不排序
        }

        // 对于非字符串类型的排序
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

  const { startTime, endTime, symbol } = tradeDetails.length > 0 ? getBacktestTimeRange() : { startTime: '', endTime: '', symbol: '' };

  // 处理行点击事件
  const handleTradeRowClick = (trade: BacktestTradeDetail, index: number) => {
    // 设置选中的交易行索引
    setSelectedTradeIndex(index);

    // 如果图表组件提供了引用，可以调用其方法高亮时间范围
    if (chartRef.current && trade.entryTime) {
      // 使用entryTime字段来高亮单个K线，而不是时间范围
      console.log('使用entryTime高亮K线:', trade.entryTime);
      // 只传入entryTime作为开始和结束时间，这样就只会高亮一根K线
      chartRef.current.highlightTimeRange(trade.entryTime, trade.entryTime);
    }
  };

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
            {/* 策略信息行 - 所有信息在一行 */}
            <div className="info-item-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <div className="info-item" style={{ flex: 1, minWidth: '180px', marginBottom: '5px', display: 'flex', alignItems: 'center', flexShrink: 0, color: '#b0b0b0' }}>
                <span className="label" style={{ color: '#8d8d8d', marginRight: '8px', fontWeight: 500, whiteSpace: 'nowrap' }}>策略名称:</span>
                <span className="value" style={{ color: '#b0b0b0', fontWeight: 500, wordBreak: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', maxWidth: '200px', whiteSpace: 'normal' }}>{tradeDetails[0]?.strategyName ? (strategyNameMap[tradeDetails[0].strategyName] || tradeDetails[0].strategyName) : '-'}</span>
              </div>
              <div className="info-item" style={{ flex: 1, minWidth: '180px', marginBottom: '5px', display: 'flex', alignItems: 'center', flexShrink: 0, color: '#b0b0b0' }}>
                <span className="label" style={{ color: '#8d8d8d', marginRight: '8px', fontWeight: 500, whiteSpace: 'nowrap' }}>策略参数:</span>
                <span className="value" style={{ color: '#b0b0b0', fontWeight: 500, wordBreak: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', maxWidth: '200px', whiteSpace: 'normal' }}>{tradeDetails[0]?.strategyName && tradeDetails[0]?.strategyParams ? formatStrategyParams(tradeDetails[0].strategyName, tradeDetails[0].strategyParams) : '-'}</span>
              </div>
              <div className="info-item" style={{ flex: 1, minWidth: '180px', marginBottom: '5px', display: 'flex', alignItems: 'center', flexShrink: 0, color: '#b0b0b0' }}>
                <span className="label" style={{ color: '#8d8d8d', marginRight: '8px', fontWeight: 500, whiteSpace: 'nowrap' }}>交易对:</span>
                <span className="value" style={{ color: '#b0b0b0', fontWeight: 500, wordBreak: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', maxWidth: '200px', whiteSpace: 'normal' }}>{tradeDetails[0]?.symbol || '-'}</span>
              </div>
              <div className="info-item" style={{ flex: 1, minWidth: '180px', marginBottom: '5px', display: 'flex', alignItems: 'center', flexShrink: 0, color: '#b0b0b0' }}>
                <span className="label" style={{ color: '#8d8d8d', marginRight: '8px', fontWeight: 500, whiteSpace: 'nowrap' }}>回测周期:</span>
                <span className="value" style={{ color: '#b0b0b0', fontWeight: 500, wordBreak: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', maxWidth: '200px', whiteSpace: 'normal' }}>{intervalVal || '-'}</span>
              </div>
              <div className="info-item" style={{ flex: 1, minWidth: '200px', marginBottom: '5px', display: 'flex', alignItems: 'center', flexShrink: 0, color: '#b0b0b0' }}>
                <span className="label" style={{ color: '#8d8d8d', marginRight: '8px', fontWeight: 500, whiteSpace: 'nowrap' }}>时间范围:</span>
                <span className="value" style={{ color: '#b0b0b0', fontWeight: 500, wordBreak: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', maxWidth: '300px', whiteSpace: 'normal' }}>
                  {startTime && endTime ? `${formatDateTime(startTime)} - ${formatDateTime(endTime)}` : '-'}
                </span>
              </div>
              {/* 回测指标按钮 */}
              {backtestSummary && (
                <button
                  style={{
                    backgroundColor: isMetricsCollapsed ? '#2a2e39' : '#4caf50',
                    color: '#b0b0b0',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    marginLeft: 'auto',
                    flexShrink: 0
                  }}
                  onClick={() => setIsMetricsCollapsed(!isMetricsCollapsed)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isMetricsCollapsed ? '#3a3e49' : '#5cbf60';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isMetricsCollapsed ? '#2a2e39' : '#4caf50';
                  }}
                >
                  <span>回测指标</span>
                  <span style={{ transform: isMetricsCollapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.2s ease', fontSize: '10px' }}>▶</span>
                </button>
              )}
            </div>
          </div>

          {/* 回测指标展示区域 */}
          {backtestSummary && !isMetricsCollapsed && (
            <div className="backtest-metrics" style={{ backgroundColor: '#1e222d', borderRadius: '8px', padding: '15px', marginBottom: '15px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>

              {/* 指标内容区域 */}
              <div className="metrics-content">
                  {/* 基础收益指标 */}
                  <div className="metrics-group" style={{ marginBottom: '15px' }}>
                <h4 style={{ color: '#8d8d8d', marginBottom: '10px', fontSize: '14px', fontWeight: 500 }}>收益指标</h4>
                <div className="metrics-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                  <div className="metric-item" style={{ flex: 1, minWidth: '180px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#2a2e39', borderRadius: '6px' }}>
                    <span style={{ color: '#8d8d8d', fontSize: '13px' }}>总收益:</span>
                    <span style={{ color: backtestSummary.totalProfit >= 0 ? '#4caf50' : '#f44336', fontWeight: 600, fontSize: '13px' }}>{formatAmount(backtestSummary.totalProfit)}</span>
                  </div>
                  <div className="metric-item" style={{ flex: 1, minWidth: '180px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#2a2e39', borderRadius: '6px' }}>
                    <span style={{ color: '#8d8d8d', fontSize: '13px' }}>收益率:</span>
                    <span style={{ color: backtestSummary.totalReturn >= 0 ? '#4caf50' : '#f44336', fontWeight: 600, fontSize: '13px' }}>{(backtestSummary.totalReturn * 100).toFixed(2)}%</span>
                  </div>
                  <div className="metric-item" style={{ flex: 1, minWidth: '180px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#2a2e39', borderRadius: '6px' }}>
                    <span style={{ color: '#8d8d8d', fontSize: '13px' }}>年化收益率:</span>
                    <span style={{ color: backtestSummary.annualizedReturn && backtestSummary.annualizedReturn >= 0 ? '#4caf50' : '#f44336', fontWeight: 600, fontSize: '13px' }}>{backtestSummary.annualizedReturn ? (backtestSummary.annualizedReturn * 100).toFixed(2) + '%' : '-'}</span>
                  </div>
                  <div className="metric-item" style={{ flex: 1, minWidth: '180px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#2a2e39', borderRadius: '6px' }}>
                    <span style={{ color: '#8d8d8d', fontSize: '13px' }}>平均收益:</span>
                    <span style={{ color: backtestSummary.averageProfit >= 0 ? '#4caf50' : '#f44336', fontWeight: 600, fontSize: '13px' }}>{(backtestSummary.averageProfit * 100).toFixed(2)}%</span>
                  </div>
                </div>
              </div>

              {/* 风险指标 */}
              <div className="metrics-group" style={{ marginBottom: '15px' }}>
                <h4 style={{ color: '#8d8d8d', marginBottom: '10px', fontSize: '14px', fontWeight: 500 }}>风险指标</h4>
                <div className="metrics-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                  <div className="metric-item" style={{ flex: 1, minWidth: '180px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#2a2e39', borderRadius: '6px' }}>
                    <span style={{ color: '#8d8d8d', fontSize: '13px' }}>最大回撤:</span>
                    <span style={{ color: '#f44336', fontWeight: 600, fontSize: '13px' }}>{(backtestSummary.maxDrawdown * 100).toFixed(2)}%</span>
                  </div>
                  <div className="metric-item" style={{ flex: 1, minWidth: '180px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#2a2e39', borderRadius: '6px' }}>
                    <span style={{ color: '#8d8d8d', fontSize: '13px' }}>最大损失:</span>
                    <span style={{ color: '#f44336', fontWeight: 600, fontSize: '13px' }}>{backtestSummary.maximumLoss ? (backtestSummary.maximumLoss * 100).toFixed(2) + '%' : '-'}</span>
                  </div>

                  <div className="metric-item" style={{ flex: 1, minWidth: '180px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#2a2e39', borderRadius: '6px' }}>
                    <span style={{ color: '#8d8d8d', fontSize: '13px' }}>溃疡指数:</span>
                    <span style={{ color: backtestSummary.ulcerIndex && backtestSummary.ulcerIndex <= 5 ? '#4caf50' : '#f44336', fontWeight: 600, fontSize: '13px' }}>{backtestSummary.ulcerIndex ? backtestSummary.ulcerIndex.toFixed(2) : '-'}</span>
                  </div>
                </div>
              </div>

              {/* 风险调整收益指标 */}
              <div className="metrics-group" style={{ marginBottom: '15px' }}>
                <h4 style={{ color: '#8d8d8d', marginBottom: '10px', fontSize: '14px', fontWeight: 500 }}>风险调整收益指标</h4>
                <div className="metrics-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                  <div className="metric-item" style={{ flex: 1, minWidth: '180px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#2a2e39', borderRadius: '6px' }}>
                    <span style={{ color: '#8d8d8d', fontSize: '13px' }}>夏普比率:</span>
                    <span style={{ color: backtestSummary.sharpeRatio >= 0 ? '#f44336' : '#4caf50', fontWeight: 600, fontSize: '13px' }}>{backtestSummary.sharpeRatio.toFixed(2)}</span>
                  </div>
                  <div className="metric-item" style={{ flex: 1, minWidth: '180px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#2a2e39', borderRadius: '6px' }}>
                    <span style={{ color: '#8d8d8d', fontSize: '13px' }}>卡玛比率:</span>
                    <span style={{ color: backtestSummary.calmarRatio && backtestSummary.calmarRatio >= 0 ? '#f44336' : '#4caf50', fontWeight: 600, fontSize: '13px' }}>{backtestSummary.calmarRatio ? backtestSummary.calmarRatio.toFixed(2) : '-'}</span>
                  </div>
                  <div className="metric-item" style={{ flex: 1, minWidth: '180px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#2a2e39', borderRadius: '6px' }}>
                    <span style={{ color: '#8d8d8d', fontSize: '13px' }}>索提诺比率:</span>
                    <span style={{ color: backtestSummary.sortinoRatio && backtestSummary.sortinoRatio >= 0 ? '#f44336' : '#4caf50', fontWeight: 600, fontSize: '13px' }}>{backtestSummary.sortinoRatio ? backtestSummary.sortinoRatio.toFixed(2) : '-'}</span>
                  </div>
                  <div className="metric-item" style={{ flex: 1, minWidth: '180px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#2a2e39', borderRadius: '6px' }}>
                    <span style={{ color: '#8d8d8d', fontSize: '13px' }}>特雷诺比率:</span>
                    <span style={{ color: backtestSummary.treynorRatio && backtestSummary.treynorRatio >= 0 ? '#f44336' : '#4caf50', fontWeight: 600, fontSize: '13px' }}>{backtestSummary.treynorRatio ? backtestSummary.treynorRatio.toFixed(4) : '-'}</span>
                  </div>
                </div>
              </div>

              {/* 市场相关指标 */}
              <div className="metrics-group" style={{ marginBottom: '15px' }}>
                <h4 style={{ color: '#8d8d8d', marginBottom: '10px', fontSize: '14px', fontWeight: 500 }}>市场相关指标</h4>
                <div className="metrics-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                  <div className="metric-item" style={{ flex: 1, minWidth: '180px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#2a2e39', borderRadius: '6px' }}>
                    <span style={{ color: '#8d8d8d', fontSize: '13px' }}>Alpha系数:</span>
                    <span style={{ color: backtestSummary.alpha && backtestSummary.alpha >= 0 ? '#f44336' : '#4caf50', fontWeight: 600, fontSize: '13px' }}>{backtestSummary.alpha ? backtestSummary.alpha.toFixed(4) : '-'}</span>
                  </div>
                  <div className="metric-item" style={{ flex: 1, minWidth: '180px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#2a2e39', borderRadius: '6px' }}>
                    <span style={{ color: '#8d8d8d', fontSize: '13px' }}>Beta系数:</span>
                    <span style={{ color: backtestSummary.beta && backtestSummary.beta >= 0 ? '#f44336' : '#4caf50', fontWeight: 600, fontSize: '13px' }}>{backtestSummary.beta ? backtestSummary.beta.toFixed(4) : '-'}</span>
                  </div>
                  <div className="metric-item" style={{ flex: 1, minWidth: '180px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#2a2e39', borderRadius: '6px' }}>
                    <span style={{ color: '#8d8d8d', fontSize: '13px' }}>偏度:</span>
                    <span style={{ color: backtestSummary.skewness && backtestSummary.skewness >= 0 ? '#f44336' : '#4caf50', fontWeight: 600, fontSize: '13px' }}>{backtestSummary.skewness ? backtestSummary.skewness.toFixed(4) : '-'}</span>
                  </div>
                </div>
              </div>

                  {/* 交易效率指标 */}
                  <div className="metrics-group">
                    <h4 style={{ color: '#8d8d8d', marginBottom: '10px', fontSize: '14px', fontWeight: 500 }}>交易效率指标</h4>
                    <div className="metrics-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                      <div className="metric-item" style={{ flex: 1, minWidth: '180px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#2a2e39', borderRadius: '6px' }}>
                        <span style={{ color: '#8d8d8d', fontSize: '13px' }}>盈利因子:</span>
                        <span style={{ color: backtestSummary.profitFactor && backtestSummary.profitFactor >= 1 ? '#f44336' : '#4caf50', fontWeight: 600, fontSize: '13px' }}>{backtestSummary.profitFactor ? backtestSummary.profitFactor.toFixed(4) : '-'}</span>
                      </div>
                      <div className="metric-item" style={{ flex: 1, minWidth: '180px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#2a2e39', borderRadius: '6px' }}>
                        <span style={{ color: '#8d8d8d', fontSize: '13px' }}>Omega比率:</span>
                        <span style={{ color: backtestSummary.omega && backtestSummary.omega >= 1 ? '#f44336' : '#4caf50', fontWeight: 600, fontSize: '13px' }}>{backtestSummary.omega ? backtestSummary.omega.toFixed(4) : '-'}</span>
                      </div>
                      <div className="metric-item" style={{ flex: 1, minWidth: '180px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#2a2e39', borderRadius: '6px' }}>
                        <span style={{ color: '#8d8d8d', fontSize: '13px' }}>盈利交易:</span>
                        <span style={{ color: '#4caf50', fontWeight: 600, fontSize: '13px' }}>{backtestSummary.profitableTrades}</span>
                      </div>
                      <div className="metric-item" style={{ flex: 1, minWidth: '180px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#2a2e39', borderRadius: '6px' }}>
                        <span style={{ color: '#8d8d8d', fontSize: '13px' }}>亏损交易:</span>
                        <span style={{ color: '#f44336', fontWeight: 600, fontSize: '13px' }}>{backtestSummary.unprofitableTrades}</span>
                      </div>
                    </div>
                   </div>
                 </div>
             </div>
           )}

          {/* 添加K线图 */}
          {symbol && startTime && endTime && backtestId && (
            <BacktestDetailChart
              symbol={symbol}
              startTime={startTime}
              endTime={endTime}
              tradeDetails={tradeDetails}
              selectedTrade={selectedTradeIndex !== null ? getCurrentPageTrades()[selectedTradeIndex] : null}
              backtestId={backtestId}
              ref={chartRef}
            />
          )}

          <div className="detail-table-container">
            <table className="detail-table">
              <thead>
                <tr>
                  <th>序号</th>
                  <th onClick={() => handleSort('type')} style={{ cursor: 'pointer' }}>
                    类型 {getSortIcon('type')}
                  </th>
                  <th onClick={() => handleSort('entryTime')} style={{ cursor: 'pointer' }}>
                    入场时间 {getSortIcon('entryTime')}
                  </th>
                  <th onClick={() => handleSort('entryPrice')} style={{ cursor: 'pointer' }}>
                    入场价格 {getSortIcon('entryPrice')}
                  </th>
                  <th onClick={() => handleSort('entryAmount')} style={{ cursor: 'pointer' }}>
                    入场金额 {getSortIcon('entryAmount')}
                  </th>
                  <th onClick={() => handleSort('exitTime')} style={{ cursor: 'pointer' }}>
                    出场时间 {getSortIcon('exitTime')}
                  </th>
                  <th onClick={() => handleSort('exitPrice')} style={{ cursor: 'pointer' }}>
                    出场价格 {getSortIcon('exitPrice')}
                  </th>
                  <th onClick={() => handleSort('exitAmount')} style={{ cursor: 'pointer' }}>
                    出场金额 {getSortIcon('exitAmount')}
                  </th>
                  <th onClick={() => handleSort('fee')} style={{ cursor: 'pointer' }}>
                    手续费 {getSortIcon('fee')}
                  </th>
                  <th onClick={() => handleSort('profit')} style={{ cursor: 'pointer' }}>
                    盈亏 {getSortIcon('profit')}
                  </th>
                  <th onClick={() => handleSort('profitPercentage')} style={{ cursor: 'pointer' }}>
                    收益率 {getSortIcon('profitPercentage')}
                  </th>
                  <th onClick={() => handleSort('periods')} style={{ cursor: 'pointer' }}>
                    周期数 {getSortIcon('periods')}
                  </th>
                  <th onClick={() => handleSort('profitPercentagePerPeriod')} style={{ cursor: 'pointer' }}>
                    每周期收益率 {getSortIcon('profitPercentagePerPeriod')}
                  </th>
                  <th onClick={() => handleSort('totalAssets')} style={{ cursor: 'pointer' }}>
                    总资产 {getSortIcon('totalAssets')}
                  </th>
                  <th onClick={() => handleSort('maxDrawdownPeriod')} style={{ cursor: 'pointer' }}>
                    价格最大回撤 {getSortIcon('maxDrawdownPeriod')}
                  </th>
                  <th onClick={() => handleSort('maxLossPeriod')} style={{ cursor: 'pointer' }}>
                    价格最大损失 {getSortIcon('maxLossPeriod')}
                  </th>
                  <th onClick={() => handleSort('maxDrawdown')} style={{ cursor: 'pointer' }}>
                    资金最大回撤 {getSortIcon('maxDrawdown')}
                  </th>
                  <th onClick={() => handleSort('maxLoss')} style={{ cursor: 'pointer' }}>
                    资金最大损失 {getSortIcon('maxLoss')}
                  </th>

                </tr>
              </thead>
              <tbody>
                {getCurrentPageTrades().map((trade, index) => {
                  // 安全检查：确保trade对象存在
                  if (!trade) {
                    return (
                      <tr key={index}>
                        <td colSpan={16} style={{ textAlign: 'center', color: '#8d8d8d' }}>数据异常</td>
                      </tr>
                    );
                  }

                  const actualIndex = (currentPage - 1) * TRADES_PER_PAGE + index + 1;
                  const isSelected = selectedTradeIndex === index;

                  return (
                    <tr
                      key={index}
                      onClick={() => handleTradeRowClick(trade, index)}
                      className={isSelected ? 'selected-trade-row' : ''}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>{actualIndex}</td>
                      <td className={trade.type === 'BUY' ? 'buy' : 'sell'}>{trade.type === 'BUY' ? '买入' : '卖出'}</td>
                      <td>{trade.entryTime || '-'}</td>
                      <td>{trade.entryPrice || '-'}</td>
                      <td>{formatAmount(trade.entryAmount || 0)}</td>
                      <td>{trade.exitTime || '-'}</td>
                      <td>{trade.exitPrice || '-'}</td>
                      <td>{formatAmount(trade.exitAmount || 0)}</td>
                      <td>{formatAmount(trade.fee || 0)}</td>
                      <td className={trade.profit >= 0 ? 'positive' : 'negative'}>{formatAmount(trade.profit)}</td>
                      <td className={trade.profitPercentage >= 0 ? 'positive' : 'negative'}>{formatPercentage(trade.profitPercentage*100)}</td>
                      <td>{trade.periods || '-'}</td>
                      <td>{formatPercentage((trade.profitPercentagePerPeriod || 0))}</td>
                      <td>{formatAmount(trade.totalAssets || 0)}</td>
                      <td>{formatPercentage((trade.maxDrawdownPeriod || 0) * 100)}</td>
                      <td>{formatPercentage((trade.maxLossPeriod || 0) * 100)}</td>
                      <td>{formatPercentage((trade.maxDrawdown || 0) * 100)}</td>
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
