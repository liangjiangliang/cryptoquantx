import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { startRealTimeStrategy, stopRealTimeStrategy, deleteRealTimeStrategy, copyRealTimeStrategy } from '../services/api';
import ConfirmModal from '../components/ConfirmModal/ConfirmModal';
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
  totalFees?: number;
  totalTrades?: number;
}

const RealTimeStrategyPage: React.FC = () => {
  const [strategies, setStrategies] = useState<RealTimeStrategy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [operationInProgress, setOperationInProgress] = useState<{[key: string]: boolean}>({});
  const navigate = useNavigate();

  // 添加确认对话框状态
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    strategyId: -1,
    strategyName: '',
  });

  // 获取实盘策略列表
  const fetchRealTimeStrategies = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/real-time-strategy/list');

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
    if (amount === null || amount === undefined) return '0';
    return amount.toLocaleString('zh-CN', { minimumFractionDigits: 8, maximumFractionDigits: 8 });
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

  // 启动策略
  const handleStartStrategy = async (strategyId: number) => {
    setOperationInProgress({...operationInProgress, [strategyId]: true});
    try {
      const result = await startRealTimeStrategy(strategyId);
      if (result.success) {
        // 刷新策略列表
        fetchRealTimeStrategies();
      } else {
        setError(result.message || '启动策略失败');
      }
    } catch (error) {
      console.error('启动策略失败:', error);
      setError(error instanceof Error ? error.message : '启动策略失败');
    } finally {
      setOperationInProgress({...operationInProgress, [strategyId]: false});
    }
  };

  // 停止策略
  const handleStopStrategy = async (strategyId: number) => {
    setOperationInProgress({...operationInProgress, [strategyId]: true});
    try {
      const result = await stopRealTimeStrategy(strategyId);
      if (result.success) {
        // 刷新策略列表
        fetchRealTimeStrategies();
      } else {
        setError(result.message || '停止策略失败');
      }
    } catch (error) {
      console.error('停止策略失败:', error);
      setError(error instanceof Error ? error.message : '停止策略失败');
    } finally {
      setOperationInProgress({...operationInProgress, [strategyId]: false});
    }
  };

  // 删除策略
  const handleDeleteStrategy = async (strategyId: number) => {
    setOperationInProgress({...operationInProgress, [strategyId]: true});
    try {
      const result = await deleteRealTimeStrategy(strategyId);
      if (result.success) {
        // 刷新策略列表
        fetchRealTimeStrategies();
      } else {
        setError(result.message || '删除策略失败');
      }
    } catch (error) {
      console.error('删除策略失败:', error);
      setError(error instanceof Error ? error.message : '删除策略失败');
    } finally {
      setOperationInProgress({...operationInProgress, [strategyId]: false});
    }
  };

  // 复制策略
  const handleCopyStrategy = async (strategyId: number) => {
    setOperationInProgress({...operationInProgress, [strategyId]: true});
    try {
      const result = await copyRealTimeStrategy(strategyId);
      if (result.success) {
        // 刷新策略列表
        fetchRealTimeStrategies();
      } else {
        setError(result.message || '复制策略失败');
      }
    } catch (error) {
      console.error('复制策略失败:', error);
      setError(error instanceof Error ? error.message : '复制策略失败');
    } finally {
      setOperationInProgress({...operationInProgress, [strategyId]: false});
    }
  };

  // 打开确认对话框
  const openConfirmModal = (strategy: RealTimeStrategy) => {
    setConfirmModal({
      isOpen: true,
      strategyId: strategy.id,
      strategyName: strategy.strategyName || strategy.strategyCode,
    });
  };

  // 关闭确认对话框
  const closeConfirmModal = () => {
    setConfirmModal({
      isOpen: false,
      strategyId: -1,
      strategyName: '',
    });
  };

  // 确认删除
  const confirmDelete = () => {
    handleDeleteStrategy(confirmModal.strategyId);
    closeConfirmModal();
  };

  return (
    <div className="real-time-strategy-page">
      {error && (
        <div className="error-message">
          <p>错误: {error}</p>
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
                    <th>ID</th>
                    <th>策略名称</th>

                    <th>交易对</th>
                    <th>时间周期</th>
                    <th>投资金额</th>

                    <th>总收益</th>
                    <th>总佣金</th>
                    <th>交易次数</th>
                    <th>创建时间</th>
                    <th>更新时间</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {strategies.map((strategy) => (
                    <tr key={strategy.id}>
                      <td>{strategy.id}</td>
                      <td>{strategy.strategyName || '-'}</td>

                      <td>{strategy.symbol}</td>
                      <td>{strategy.interval}</td>
                      <td>{formatAmount(strategy.tradeAmount)} </td>

                      <td className={strategy.totalProfit && strategy.totalProfit >= 0 ? 'positive' : 'negative'}>
                        {formatAmount(strategy.totalProfit)}
                      </td>
                      <td className={strategy.totalFees && strategy.totalFees >= 0 ? 'positive' : 'negative'}>
                        {formatAmount(strategy.totalFees)}
                      </td>
                      <td>{strategy.totalTrades || 0}</td>
                      <td>{formatDateTime(strategy.createTime)}</td>
                      <td>{formatDateTime(strategy.updateTime)}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(strategy.status)}`}>
                          {strategy.status || 'UNKNOWN'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="strategy-detail-btn"
                          onClick={() => navigate(`/real-time-strategy-detail/${strategy.id}`)}
                        >
                          详情
                        </button>
                        {strategy.status === 'RUNNING' ? (
                          <button
                            className="strategy-stop-btn"
                            onClick={() => handleStopStrategy(strategy.id)}
                            disabled={operationInProgress[strategy.id]}
                          >
                            {operationInProgress[strategy.id] ? '处理中...' : '停止'}
                          </button>
                        ) : (
                          <button
                            className="strategy-start-btn"
                            onClick={() => handleStartStrategy(strategy.id)}
                            disabled={operationInProgress[strategy.id]}
                          >
                            {operationInProgress[strategy.id] ? '处理中...' : '启动'}
                          </button>
                        )}
                        <button
                          className="strategy-delete-btn"
                          onClick={() => openConfirmModal(strategy)}
                          disabled={operationInProgress[strategy.id]}
                        >
                          删除
                        </button>
                        <button
                          className="strategy-copy-btn"
                          onClick={() => handleCopyStrategy(strategy.id)}
                          disabled={operationInProgress[strategy.id]}
                        >
                          复制
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 添加确认对话框 */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="删除策略确认"
        message={`确定要删除策略 <strong>${confirmModal.strategyName}</strong> 吗？<br/>此操作不可撤销，策略的所有关联数据将被清除。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={confirmDelete}
        onCancel={closeConfirmModal}
        type="danger"
      />
    </div>
  );
};

export default RealTimeStrategyPage;
