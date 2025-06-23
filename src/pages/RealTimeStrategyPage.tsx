import React, { useState, useEffect } from 'react';
import './RealTimeStrategyPage.css';

interface RealTimeStrategy {
  id: number;
  strategyCode: string;
  strategyName: string;
  symbol: string;
  interval: string;
  tradeAmount: number;
  status: string;
  createTime: string;
  updateTime: string;
  totalProfit?: number;
  totalTrades?: number;
}

const RealTimeStrategyPage: React.FC = () => {
  const [strategies, setStrategies] = useState<RealTimeStrategy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // 获取实盘策略列表
  const fetchRealTimeStrategies = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/api/real-time-strategy/list');
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('实盘策略API返回数据:', data);
      
      if (data.code === 200) {
        setStrategies(data.data || []);
      } else {
        setError(data.message || '获取实盘策略失败');
      }
    } catch (error) {
      console.error('获取实盘策略失败:', error);
      setError(error instanceof Error ? error.message : '获取实盘策略失败');
    } finally {
      setLoading(false);
    }
  };

  // 页面加载时获取数据
  useEffect(() => {
    fetchRealTimeStrategies();
  }, []);

  // 格式化时间
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

  // 格式化金额
  const formatAmount = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '-';
    return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // 获取状态样式
  const getStatusClass = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'running':
        return 'status-running';
      case 'stopped':
        return 'status-stopped';
      case 'error':
        return 'status-error';
      default:
        return 'status-unknown';
    }
  };

  // 刷新数据
  const handleRefresh = () => {
    fetchRealTimeStrategies();
  };

  return (
    <div className="real-time-strategy-page">
      <div className="page-header">
        <h1>实盘策略管理</h1>
        <div className="header-actions">
          <button 
            className="refresh-button" 
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? '刷新中...' : '刷新数据'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <p>错误: {error}</p>
          <button onClick={handleRefresh}>重试</button>
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>正在加载实盘策略数据...</p>
        </div>
      ) : (
        <div className="strategies-container">
          {strategies.length === 0 ? (
            <div className="empty-state">
              <p>暂无实盘策略数据</p>
              <p>您可以在首页创建实盘策略</p>
            </div>
          ) : (
            <div className="strategies-table-container">
              <table className="strategies-table">
                <thead>
                  <tr>
                    <th>策略名称</th>
                    <th>策略代码</th>
                    <th>交易对</th>
                    <th>时间周期</th>
                    <th>交易金额</th>
                    <th>状态</th>
                    <th>总收益</th>
                    <th>交易次数</th>
                    <th>创建时间</th>
                    <th>更新时间</th>
                  </tr>
                </thead>
                <tbody>
                  {strategies.map((strategy) => (
                    <tr key={strategy.id}>
                      <td>{strategy.strategyName || '-'}</td>
                      <td>{strategy.strategyCode}</td>
                      <td>{strategy.symbol}</td>
                      <td>{strategy.interval}</td>
                      <td>{formatAmount(strategy.tradeAmount)} USDT</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(strategy.status)}`}>
                          {strategy.status || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className={strategy.totalProfit && strategy.totalProfit >= 0 ? 'positive' : 'negative'}>
                        {formatAmount(strategy.totalProfit)} USDT
                      </td>
                      <td>{strategy.totalTrades || 0}</td>
                      <td>{formatDateTime(strategy.createTime)}</td>
                      <td>{formatDateTime(strategy.updateTime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RealTimeStrategyPage; 