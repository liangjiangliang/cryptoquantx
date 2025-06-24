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
}

const RealTimeStrategyDetailPage: React.FC = () => {
  const { strategyCode } = useParams<{ strategyCode: string }>();
  const [orders, setOrders] = useState<RealTimeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!strategyCode) return;
    setLoading(true);
    setError('');
    fetch(`/api/api/backtest/ta4j/real-time/orders?strategyCode=${encodeURIComponent(strategyCode)}`)
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
  }, [strategyCode]);

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
    return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
                <th>价格</th>
                <th>数量</th>
                <th>状态</th>
                <th>收益</th>
                <th>创建时间</th>
                <th>更新时间</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: '#888' }}>暂无订单数据</td></tr>
              ) : orders.map(order => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.symbol}</td>
                  <td>{order.side}</td>
                  <td>{formatAmount(order.price)}</td>
                  <td>{formatAmount(order.amount)}</td>
                  <td>{order.status}</td>
                  <td className={order.profit && order.profit >= 0 ? 'positive' : 'negative'}>{order.profit !== undefined ? formatAmount(order.profit) : '-'}</td>
                  <td>{formatDateTime(order.createTime)}</td>
                  <td>{formatDateTime(order.updateTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RealTimeStrategyDetailPage; 