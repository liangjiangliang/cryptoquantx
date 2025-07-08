import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './RealTimeStrategyDetailPage.css';

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

const RealTimeStrategyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [orders, setOrders] = useState<RealTimeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 添加分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(26);  // 修改默认显示条数，确保显示全部数据

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

  const formatAmount = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '-';
    return amount.toLocaleString('zh-CN', { minimumFractionDigits: 8, maximumFractionDigits: 8 });
  };

  // 分页相关计算
  const totalPages = Math.ceil(orders.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPageData = orders.slice(startIndex, endIndex);

  // 处理页码变化
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 处理每页显示数量变化
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // 重置到第一页
  };

  return (
    <div className="real-time-strategy-detail-page">
      <div className="detail-header">
        {/* <h2>策略订单详情</h2>
        <div className="strategy-code">策略代码: {strategyCode}</div> */}
      </div>
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
                <th>ID</th>
                <th>交易对</th>
                <th>方向</th>
                <th>成交价格</th>
                <th>成交数量</th>
                <th>成交金额</th>
                <th>手续费</th>
                <th>利润</th>
                <th>利润率</th>
        
                <th>信号价格</th>
           
                {/* <th>手续费币种</th> */}
                <th>状态</th>
           
                <th>成交时间</th>
                {/* <th>更新时间</th> */}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={14} style={{ textAlign: 'center', color: '#888' }}>暂无订单数据</td></tr>
              ) : currentPageData.map(order => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.symbol}</td>
                  <td>{order.side}</td>
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
