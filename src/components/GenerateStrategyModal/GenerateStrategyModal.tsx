import React from 'react';
import './GenerateStrategyModal.css';

interface GenerateStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  isGenerating: boolean;
  title?: string;
  confirmText?: string;
  loadingText?: string;
}

const GenerateStrategyModal: React.FC<GenerateStrategyModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  description,
  onDescriptionChange,
  isGenerating,
  title = '🤖 AI生成策略',
  confirmText = '生成策略',
  loadingText = '生成中...'
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm();
  };

  return (
    <div className="generate-strategy-modal-overlay" onClick={handleOverlayClick}>
      <div className="generate-strategy-modal">
        <div className="generate-strategy-modal-header">
          <h3>{title}</h3>
          <button
            className="generate-strategy-modal-close"
            onClick={onClose}
            disabled={isGenerating}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="generate-strategy-modal-body">
            <div className="description-input-section">
              <label htmlFor="strategy-description">策略描述:</label>
              <textarea
                id="strategy-description"
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder="请描述您想要的交易策略，例如：基于成交量的交易指标、双均线交叉策略等..."
                rows={4}
                disabled={isGenerating}
                required
              />
            </div>

            <div className="strategy-tips">
              <h4>💡 提示:</h4>
              <ul>
                <li>请详细描述您的策略逻辑和指标要求</li>
                <li>可以包含技术指标名称，如：RSI、MACD、布林带等，AI将根据您的描述生成相应的策略代码</li>
                <li>支持批量生成策略，每行生成一个，但是数量太多返回内容会截断，建议每次不超过10个</li>
              </ul>
            </div>
          </div>

          <div className="generate-strategy-modal-footer">
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={isGenerating}
            >
              取消
            </button>
            <button
              type="submit"
              className="generate-btn"
              disabled={isGenerating || !description.trim()}
            >
              {isGenerating ? loadingText : confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GenerateStrategyModal;
