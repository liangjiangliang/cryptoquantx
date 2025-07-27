import React from 'react';
import './FundRecordModal.css';

interface FundRecordData {
  id: number;
  recordTime: string;
  totalFund: number;
  totalInvestment: number;
  totalProfit: number;
}

interface FundRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: FundRecordData | null;
}

const FundRecordModal: React.FC<FundRecordModalProps> = ({
  isOpen,
  onClose,
  data
}) => {
  if (!isOpen || !data) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // 格式化金额
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // 计算收益率
  const profitRate = ((data.totalProfit / data.totalInvestment) * 100).toFixed(2);

  return (
    <div className="fund-record-modal-overlay" onClick={handleOverlayClick}>
      <div className="fund-record-modal-content">
        <div className="fund-record-modal-header">
          <h3 className="fund-record-modal-title">资金数据记录成功</h3>
          <button 
            className="fund-record-modal-close" 
            onClick={onClose}
            aria-label="关闭"
          >
            ×
          </button>
        </div>
        
        <div className="fund-record-modal-body">
          <div className="fund-record-success-icon">
            ✓
          </div>
          <div className="fund-record-message">
            资金数据已成功记录到系统中
          </div>
          
          <div className="fund-record-details">
            <div className="fund-record-item">
              <span className="label">记录时间</span>
              <span className="value">{data.recordTime}</span>
            </div>
            <div className="fund-record-item">
              <span className="label">总资金</span>
              <span className="value total-fund">{formatCurrency(data.totalFund)}</span>
            </div>
            <div className="fund-record-item">
              <span className="label">总投资</span>
              <span className="value">{formatCurrency(data.totalInvestment)}</span>
            </div>
            <div className="fund-record-item">
              <span className="label">总收益</span>
              <span className={`value ${data.totalProfit >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(data.totalProfit)}
              </span>
            </div>
            <div className="fund-record-item">
              <span className="label">收益率</span>
              <span className={`value ${data.totalProfit >= 0 ? 'positive' : 'negative'}`}>
                {profitRate}%
              </span>
            </div>
          </div>
        </div>
        
        <div className="fund-record-modal-footer">
          <button 
            className="fund-record-modal-btn fund-record-modal-btn-confirm"
            onClick={onClose}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};

export default FundRecordModal;