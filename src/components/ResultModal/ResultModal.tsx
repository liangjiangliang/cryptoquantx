import React from 'react';
import './ResultModal.css';

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const ResultModal: React.FC<ResultModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="result-modal-overlay" onClick={handleOverlayClick}>
      <div className="result-modal">
        <div className="result-modal-header">
          <h3>{getIcon()} {title}</h3>
          <button 
            className="result-modal-close" 
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        <div className="result-modal-body">
          <div className="result-message">
            <pre>{message}</pre>
          </div>
        </div>
        
        <div className="result-modal-footer">
          <button 
            type="button" 
            className="confirm-btn" 
            onClick={onClose}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultModal;