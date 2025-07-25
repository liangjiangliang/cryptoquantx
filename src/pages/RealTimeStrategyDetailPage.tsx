import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import RealTimeStrategyChart from '../components/Chart/RealTimeStrategyChart';
import './RealTimeStrategyDetailPage.css';

// 定义排序字段和排序方向类型
type OrderSortField = 'id' | 'symbol' | 'side' | 'price' | 'executedQty' | 'executedAmount' |
                     'fee' | 'profit' | 'profitRate' | 'signalPrice' | 'status' | 'createTime';
type SortDirection = 'asc' | 'desc';

interface RealTimeOrder {
  id: number;
  strategyCode: string;
  symbol: string;
  side: string;
  price: number;
  amount: number;
  status: string;
  createTime: string;
  updateTime: string;
  profit?: number;
  profitRate?: number;     // 添加利润率字段
  executedAmount?: number;  // 成交金额
  executedQty?: number;     // 成交数量
  signalPrice?: number;     // 信号价格
  fee?: number;             // 手续费
  feeCurrency?: string;     // 手续费币种
}

interface RealTimeStrategyInfo {
  id: number;
  strategyCode: string;
  strategyName: string;
  symbol: string;
  interval: string;
  tradeAmount: number;
  status: string;
  createTime: string;
  updateTime: string;
  startTime: string;
  endTime?: string;
  totalProfit: number;
  totalProfitRate: number;
  totalTrades: number;
  totalFees: number;
  successfulTrades: number;
  lastTradeTime?: string;
  lastTradeType?: string;
  lastTradePrice?: number;
  lastTradeQuantity?: number;
  lastTradeAmount?: number;
  lastTradeFee?: number;
  lastTradeProfit?: number;
  isActive: boolean;
  isInPosition: boolean;
  message?: string;
}

const RealTimeStrategyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [orders, setOrders] = useState<RealTimeOrder[]>([]);
  const [strategyInfo, setStrategyInfo] = useState<RealTimeStrategyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [strategyLoading, setStrategyLoading] = useState(true);
  const [error, setError] = useState('');
  const [strategyError, setStrategyError] = useState('');

  // 添加分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);  // 修改默认显示条数，确保显示全部数据

  // 添加排序状态
  const [sortField, setSortField] = useState<OrderSortField>('createTime'); // 默认按成交时间排序
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc'); // 默认倒序排列

  // 图表引用
  const chartRef = useRef<any>(null);

  // 获取策略信息
  const fetchStrategyInfo = async (strategyId: number) => {
    setStrategyLoading(true);
    setStrategyError('');

    try {
      const response = await fetch(`/api/real-time-strategy/id/${strategyId}`);
      const data = await response.json();

      if (data.code === 200 && data.data) {
        setStrategyInfo(data.data);
      } else {
        setStrategyError(data.message || '获取策略信息失败');
      }
    } catch (err) {
      setStrategyError(err instanceof Error ? err.message : '获取策略信息失败');
    } finally {
      setStrategyLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');

    // 确保id是数字，如果不是数字则可能是策略代码
    const strategyId = parseInt(id, 10);
    if (isNaN(strategyId)) {
      setError('无效的策略ID');
      setLoading(false);
      return;
    }

    // 同时获取策略信息和订单数据
    fetchStrategyInfo(strategyId);

    // 添加时间戳参数，防止浏览器缓存
    fetch(`/api/real-time-strategy/real-time/orders?id=${strategyId}&_t=${new Date().getTime()}`)
      .then(res => res.json())
      .then(data => {
        if (data.code === 200) {
          setOrders(data.data || []);
        } else {
          setError(data.message || '获取订单失败');
        }
      })
      .catch(err => setError(err.message || '获取订单失败'))
      .finally(() => setLoading(false));
  }, [id]);

  const formatDateTime = (dateTimeStr: string): string => {
    if (!dateTimeStr) return '-';
    try {
      const date = new Date(dateTimeStr);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return dateTimeStr;
    }
  };

  // 计算运行持续时间
  const calculateDuration = (startTime: string, endTime?: string): string => {
    if (!startTime) return '-';

    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}天${hours}小时${minutes}分钟`;
    } else if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else {
      return `${minutes}分钟`;
    }
  };

  const formatAmount = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '-';
    return amount.toLocaleString('zh-CN', { minimumFractionDigits: 12, maximumFractionDigits: 12 });
  };

  // 处理排序
  const handleSort = (field: OrderSortField) => {
    // 如果点击的是当前排序字段，则切换排序方向
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 否则设置新的排序字段，默认降序
      setSortField(field);
      setSortDirection('desc');
    }
    // 重置到第一页
    setCurrentPage(1);
  };

  // 获取排序图标
  const getSortIcon = (field: OrderSortField) => {
    if (sortField !== field) return '⇅';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // 对订单数据进行排序
  const getSortedOrders = (data: RealTimeOrder[]) => {
    return [...data].sort((a, b) => {
      let aValue: any = a[sortField as keyof RealTimeOrder];
      let bValue: any = b[sortField as keyof RealTimeOrder];

      // 无论升序还是降序，null/undefined值都排在最后
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // 处理字符串类型的排序
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        // 日期字符串特殊处理
        if (sortField === 'createTime') {
          const dateA = aValue ? new Date(aValue).getTime() : 0;
          const dateB = bValue ? new Date(bValue).getTime() : 0;
          return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
        }

        // 普通字符串
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // 普通数值比较
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });
  };

  // 先对数据进行排序
  const sortedOrders = getSortedOrders(orders);

  // 分页相关计算
  const totalPages = Math.ceil(sortedOrders.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPageData = sortedOrders.slice(startIndex, endIndex);

  // 处理页码变化
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 处理每页显示数量变化
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // 重置到第一页
  };

  // 处理订单行点击事件
  const handleOrderRowClick = (order: RealTimeOrder) => {
    // 如果图表组件提供了引用，可以调用其方法高亮时间点
    if (chartRef.current && order.createTime) {
      console.log('高亮订单时间点:', order.createTime);
      // 高亮单个时间点
      chartRef.current.highlightTimeRange(order.createTime, order.createTime);
    }
  };

  return (
    <div className="real-time-strategy-detail-page">
      {/* 策略信息展示 */}
      {strategyError && <div className="error-message">{strategyError}</div>}
      {strategyLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>正在加载策略信息...</p>
        </div>
      ) : strategyInfo && (
        <div className="strategy-info-container">
          <div className="strategy-info" style={{
            background: 'linear-gradient(135deg, #2a2e39 0%, #1e222d 100%)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '15px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            border: '1px solid #3a3f4c'
          }}>
            {/* 基本信息和统计信息都放在一行 */}
            <div className="info-item-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', fontSize: '13px' }}>
              <div className="info-item" style={{ display: 'flex', alignItems: 'center', color: '#d9d9d9' }}>
                <span className="label" style={{ color: '#9ca3af', marginRight: '8px', fontWeight: 500, whiteSpace: 'nowrap' }}>策略名称:</span>
                <span className="value" style={{ color: '#d9d9d9', fontWeight: 500 }}>{strategyInfo.strategyName || strategyInfo.strategyCode}</span>
              </div>
              <div className="info-item" style={{ display: 'flex', alignItems: 'center', color: '#d9d9d9' }}>
                <span className="label" style={{ color: '#9ca3af', marginRight: '8px', fontWeight: 500, whiteSpace: 'nowrap' }}>交易对:</span>
                <span className="value" style={{ color: '#d9d9d9', fontWeight: 500 }}>{strategyInfo.symbol}</span>
              </div>
              <div className="info-item" style={{ display: 'flex', alignItems: 'center', color: '#d9d9d9' }}>
                <span className="label" style={{ color: '#9ca3af', marginRight: '8px', fontWeight: 500, whiteSpace: 'nowrap' }}>时间周期:</span>
                <span className="value" style={{ color: '#d9d9d9', fontWeight: 500 }}>{strategyInfo.interval}</span>
              </div>
              <div className="info-item" style={{ display: 'flex', alignItems: 'center', color: '#d9d9d9' }}>
                <span className="label" style={{ color: '#9ca3af', marginRight: '8px', fontWeight: 500, whiteSpace: 'nowrap' }}>投资金额:</span>
                <span className="value" style={{ color: '#d9d9d9', fontWeight: 500 }}>{strategyInfo.tradeAmount} USDT</span>
              </div>
              <div className="info-item" style={{ display: 'flex', alignItems: 'center', color: '#d9d9d9' }}>
                <span className="label" style={{ color: '#9ca3af', marginRight: '8px', fontWeight: 500, whiteSpace: 'nowrap' }}>运行时长:</span>
                <span className="value" style={{ color: '#d9d9d9', fontWeight: 500 }}>
                  {calculateDuration(strategyInfo.startTime, strategyInfo.endTime)}
                </span>
              </div>
              <div className="info-item" style={{ display: 'flex', alignItems: 'center', color: '#d9d9d9' }}>
                <span className="label" style={{ color: '#9ca3af', marginRight: '8px', fontWeight: 500, whiteSpace: 'nowrap' }}>总收益:</span>
                <span className="value" style={{ color: strategyInfo.totalProfit >= 0 ? '#ff4444' : '#00aa00', fontWeight: 600 }}>{formatAmount(strategyInfo.totalProfit)} USDT</span>
              </div>
              <div className="info-item" style={{ display: 'flex', alignItems: 'center', color: '#d9d9d9' }}>
                <span className="label" style={{ color: '#9ca3af', marginRight: '8px', fontWeight: 500, whiteSpace: 'nowrap' }}>收益率:</span>
                <span className="value" style={{ color: strategyInfo.totalProfitRate >= 0 ? '#ff4444' : '#00aa00', fontWeight: 600 }}>{(strategyInfo.totalProfitRate * 100).toFixed(2)}%</span>
              </div>
              <div className="info-item" style={{ display: 'flex', alignItems: 'center', color: '#d9d9d9' }}>
                <span className="label" style={{ color: '#9ca3af', marginRight: '8px', fontWeight: 500, whiteSpace: 'nowrap' }}>总交易次数:</span>
                <span className="value" style={{ color: '#d9d9d9', fontWeight: 500 }}>{strategyInfo.totalTrades}</span>
              </div>
              <div className="info-item" style={{ display: 'flex', alignItems: 'center', color: '#d9d9d9' }}>
                <span className="label" style={{ color: '#9ca3af', marginRight: '8px', fontWeight: 500, whiteSpace: 'nowrap' }}>成功交易:</span>
                <span className="value" style={{ color: '#ff4444', fontWeight: 500 }}>{strategyInfo.successfulTrades}</span>
              </div>
              <div className="info-item" style={{ display: 'flex', alignItems: 'center', color: '#d9d9d9' }}>
                <span className="label" style={{ color: '#9ca3af', marginRight: '8px', fontWeight: 500, whiteSpace: 'nowrap' }}>总手续费:</span>
                <span className="value" style={{ color: '#00aa00', fontWeight: 500 }}>{formatAmount(strategyInfo.totalFees)} USDT</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* K线图 */}
      {strategyInfo && strategyInfo.symbol && strategyInfo.startTime && (
        <RealTimeStrategyChart
          symbol={strategyInfo.symbol}
          interval={strategyInfo.interval}
          startTime={strategyInfo.startTime}
          endTime={strategyInfo.endTime}
          orders={orders}
          selectedOrder={null}
          ref={chartRef}
        />
      )}

      {/* 订单列表 */}
      {error && <div className="error-message">{error}</div>}
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>正在加载订单数据...</p>
        </div>
      ) : (
        <div className="orders-table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('id')} className="sortable-header" style={{ cursor: 'pointer' }}>
                  ID {getSortIcon('id')}
                </th>
                <th onClick={() => handleSort('symbol')} className="sortable-header" style={{ cursor: 'pointer' }}>
                  交易对 {getSortIcon('symbol')}
                </th>
                <th onClick={() => handleSort('side')} className="sortable-header" style={{ cursor: 'pointer' }}>
                  方向 {getSortIcon('side')}
                </th>
                <th onClick={() => handleSort('price')} className="sortable-header" style={{ cursor: 'pointer' }}>
                  成交价格 {getSortIcon('price')}
                </th>
                <th onClick={() => handleSort('executedQty')} className="sortable-header" style={{ cursor: 'pointer' }}>
                  成交数量 {getSortIcon('executedQty')}
                </th>
                <th onClick={() => handleSort('executedAmount')} className="sortable-header" style={{ cursor: 'pointer' }}>
                  成交金额 {getSortIcon('executedAmount')}
                </th>
                <th onClick={() => handleSort('fee')} className="sortable-header" style={{ cursor: 'pointer' }}>
                  手续费 {getSortIcon('fee')}
                </th>
                <th onClick={() => handleSort('profit')} className="sortable-header" style={{ cursor: 'pointer' }}>
                  利润 {getSortIcon('profit')}
                </th>
                <th onClick={() => handleSort('profitRate')} className="sortable-header" style={{ cursor: 'pointer' }}>
                  利润率 {getSortIcon('profitRate')}
                </th>
                <th onClick={() => handleSort('signalPrice')} className="sortable-header" style={{ cursor: 'pointer' }}>
                  信号价格 {getSortIcon('signalPrice')}
                </th>
                <th onClick={() => handleSort('status')} className="sortable-header" style={{ cursor: 'pointer' }}>
                  状态 {getSortIcon('status')}
                </th>
                <th onClick={() => handleSort('createTime')} className="sortable-header" style={{ cursor: 'pointer' }}>
                  成交时间 {getSortIcon('createTime')}
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={14} style={{ textAlign: 'center', color: '#888' }}>暂无订单数据</td></tr>
              ) : currentPageData.map((order, index) => (
                <tr
                  key={order.id}
                  onClick={() => handleOrderRowClick(order)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2e39'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td>{order.id}</td>
                  <td>{order.symbol}</td>
                  <td style={{ color: order.side === 'BUY' ? '#4caf50' : '#f44336', fontWeight: 'bold' }}>{order.side}</td>
                  <td>{formatAmount(order.price)}</td>
                  <td>{formatAmount(order.executedQty)}</td>
                  <td>{formatAmount(order.executedAmount)}</td>
                  <td>{formatAmount(order.fee)}</td>
                  <td className={order.profit && order.profit >= 0 ? 'profit-positive' : 'profit-negative'}>{order.profit !== undefined ? formatAmount(order.profit) : '-'}</td>
                  <td className={order.profitRate && order.profitRate >= 0 ? 'profit-positive' : 'profit-negative'}>
                    {order.side?.toLowerCase() === 'buy' ? '-' : (order.profitRate !== undefined ? `${(order.profitRate * 100).toFixed(2)}%` : '-')}
                  </td>

                  <td>{formatAmount(order.signalPrice)}</td>

                  {/* <td>{order.feeCurrency || '-'}</td> */}
                  <td>{order.status}</td>

                  <td>{formatDateTime(order.createTime)}</td>
                  {/* <td>{formatDateTime(order.updateTime)}</td> */}
                </tr>
              ))}
            </tbody>
          </table>

          {/* 分页控制 */}
          {orders.length > 0 && (
            <div className="pagination-container">
              <div className="pagination-buttons">
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
                  {currentPage} / {totalPages} 页 (共 {orders.length} 条记录)
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="pagination-button"
                >
                  下一页
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="pagination-button"
                >
                  末页
                </button>
              </div>
              <div className="page-size-selector">
                每页
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50} selected>50</option>
                  <option value={100}>100</option>
                </select>
                条
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RealTimeStrategyDetailPage;
