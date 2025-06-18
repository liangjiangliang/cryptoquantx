import React from 'react';
import './ConfirmModal.css';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
  showDetailButton?: boolean;
  onViewDetail?: () => void;
  detailButtonText?: string;
  showFailedStrategiesButton?: boolean;
  onViewFailedStrategies?: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  type = 'danger',
  showDetailButton = false,
  onViewDetail,
  detailButtonText = '查看明细',
  showFailedStrategiesButton = false,
  onViewFailedStrategies
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div className="confirm-modal-overlay" onClick={handleOverlayClick}>
      <div className="confirm-modal-content">
        <div className="confirm-modal-header">
          <h3 className="confirm-modal-title">{title}</h3>
          <button 
            className="confirm-modal-close" 
            onClick={onCancel}
            aria-label="关闭"
          >
            ×
          </button>
        </div>
        
        <div className="confirm-modal-body">
          <div 
            className="confirm-modal-message"
            dangerouslySetInnerHTML={{ __html: message }}
          />
        </div>
        
        <div className="confirm-modal-footer">
          <button 
            className="confirm-modal-btn confirm-modal-btn-cancel"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          {showFailedStrategiesButton && onViewFailedStrategies && (
            <button 
              className="confirm-modal-btn confirm-modal-btn-failed"
              onClick={onViewFailedStrategies}
            >
              失败策略
            </button>
          )}
          {showDetailButton && onViewDetail && (
            <button 
              className="confirm-modal-btn confirm-modal-btn-confirm info"
              onClick={onViewDetail}
            >
              {detailButtonText}
            </button>
          )}
          <button 
            className={`confirm-modal-btn confirm-modal-btn-confirm ${type}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;