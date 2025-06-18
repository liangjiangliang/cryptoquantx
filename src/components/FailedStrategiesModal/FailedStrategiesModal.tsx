import React from 'react';
import './FailedStrategiesModal.css';

export interface FailedStrategy {
  strategy_code: string;
  strategy_name: string;
  error: string;
}

interface FailedStrategiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  failedStrategies: FailedStrategy[];
  loading?: boolean;
}

const FailedStrategiesModal: React.FC<FailedStrategiesModalProps> = ({
  isOpen,
  onClose,
  failedStrategies,
  loading = false
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="failed-strategies-modal-overlay" onClick={handleOverlayClick}>
      <div className="failed-strategies-modal">
        <div className="failed-strategies-modal-header">
          <h3>失败的策略列表</h3>
          <button 
            className="failed-strategies-modal-close" 
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        <div className="failed-strategies-modal-body">
          {loading ? (
            <div className="loading-indicator">加载中...</div>
          ) : failedStrategies.length === 0 ? (
            <div className="no-data-message">暂无失败的策略</div>
          ) : (
            <div className="failed-strategies-table-container">
              <table className="failed-strategies-table">
                <thead>
                  <tr>
                    <th>策略代码</th>
                    <th>策略名称</th>
                    <th>错误信息</th>
                  </tr>
                </thead>
                <tbody>
                  {failedStrategies.map((strategy, index) => (
                    <tr key={index}>
                      <td>{strategy.strategy_code}</td>
                      <td>{strategy.strategy_name}</td>
                      <td className="error-cell" title={strategy.error}>
                        {strategy.error}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="failed-strategies-modal-footer">
          <button 
            type="button" 
            className="confirm-modal-btn confirm-modal-btn-cancel" 
            onClick={onClose}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default FailedStrategiesModal; 