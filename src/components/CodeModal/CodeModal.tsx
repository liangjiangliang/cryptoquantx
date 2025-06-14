import React, { useState } from 'react';
import './CodeModal.css';

interface CodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  code: string;
  language?: string;
  loadError?: string;
}

const CodeModal: React.FC<CodeModalProps> = ({
  isOpen,
  onClose,
  title,
  code,
  language = 'java',
  loadError
}) => {
  const [isErrorExpanded, setIsErrorExpanded] = useState(true);
  
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code).then(() => {
      // 可以添加复制成功的提示
      alert('代码已复制到剪贴板');
    }).catch(err => {
      console.error('复制失败:', err);
    });
  };

  // 渲染错误信息
  const renderErrorInfo = () => {
    if (!loadError || !isErrorExpanded) return null;
    
    // 处理错误信息：去掉每行前面的空格，保持左对齐
    const processedError = loadError
      .split('\n')
      .map(line => line.trimStart()) // 去掉每行开头的空格
      .join('\n');
    
    return (
      <div className="error-container">
        <pre className="error-block">
          <code>{processedError}</code>
        </pre>
      </div>
    );
  };

  // 将代码分行并添加行号
  const renderCodeWithLineNumbers = () => {
    if (!code) return null;
    
    const lines = code.split('\n');
    
    return (
      <div className="code-container">
        <div className="line-numbers">
          {lines.map((_, index) => (
            <div key={index} className="line-number">
              {index + 1}
            </div>
          ))}
        </div>
        <div className="code-content">
          <pre className={`code-block ${language}`}>
            <code>{code}</code>
          </pre>
        </div>
      </div>
    );
  };

  return (
    <div className="code-modal-overlay" onClick={handleOverlayClick}>
      <div className="code-modal">
        <div className="code-modal-header">
          <h3>{title}</h3>
          <div className="code-modal-actions">
            {loadError && (
              <button 
                className="toggle-error-btn" 
                onClick={() => setIsErrorExpanded(!isErrorExpanded)}
              >
                {isErrorExpanded ? '收起报错' : '展开报错'}
              </button>
            )}
            <button className="copy-btn" onClick={handleCopyCode}>
              复制代码
            </button>
            <button className="close-btn" onClick={onClose}>
              ×
            </button>
          </div>
        </div>
        <div className="code-modal-content">
          {renderErrorInfo()}
          {renderCodeWithLineNumbers()}
        </div>
      </div>
    </div>
  );
};

export default CodeModal; 