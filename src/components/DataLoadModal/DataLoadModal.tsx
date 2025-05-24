import React, { useState, useEffect } from 'react';
import './DataLoadModal.css';
import { CandlestickData } from '../../store/types';

interface DataLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadData: (symbol: string, interval: string, startDate: string, endDate: string) => Promise<{
    data: CandlestickData[];
    message: string;
  }>;
}

// 可选币种列表
const SYMBOLS = [
  'BTC-USDT',
  'ETH-USDT',
  'BNB-USDT',
  'SOL-USDT',
  'ADA-USDT',
  'XRP-USDT'
];

// 可选时间周期
const INTERVALS = [
  { value: '1m', label: '1分钟' },
  { value: '5m', label: '5分钟' },
  { value: '15m', label: '15分钟' },
  { value: '30m', label: '30分钟' },
  { value: '1H', label: '1小时' },
  { value: '4H', label: '4小时' },
  { value: '1D', label: '日线' },
  { value: '1W', label: '周线' }
];

// 默认日期范围
const DEFAULT_START_DATE = '2020-01-01';
const DEFAULT_END_DATE = '2025-05-01';

const DataLoadModal: React.FC<DataLoadModalProps> = ({ isOpen, onClose, onLoadData }) => {
  const [symbol, setSymbol] = useState<string>('BTC-USDT');
  const [interval, setInterval] = useState<string>('1H');
  const [startDate, setStartDate] = useState<string>(DEFAULT_START_DATE);
  const [endDate, setEndDate] = useState<string>(DEFAULT_END_DATE);
  const [loading, setLoading] = useState<boolean>(false);
  const [responseMessage, setResponseMessage] = useState<string>('');

  // 重置表单状态
  useEffect(() => {
    if (isOpen) {
      setResponseMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    setStartDate(newStartDate);
    
    // 如果开始日期晚于结束日期，自动调整结束日期
    const startTimestamp = new Date(newStartDate).getTime();
    const endTimestamp = new Date(endDate).getTime();
    
    if (startTimestamp > endTimestamp) {
      setEndDate(newStartDate);
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
  };

  const handleLoadData = async () => {
    setLoading(true);
    setResponseMessage('');
    
    try {
      // 确保日期格式正确
      if (!isValidDate(startDate) || !isValidDate(endDate)) {
        throw new Error('日期格式不正确，请使用YYYY-MM-DD格式');
      }
      
      const result = await onLoadData(symbol, interval, startDate, endDate);
      
      // 显示API返回的消息
      if (result.message) {
        setResponseMessage(result.message);
      } else {
        setResponseMessage('数据加载成功');
      }
      
      // 不自动关闭弹窗，让用户查看API响应
    } catch (error: any) {
      console.error('加载数据失败:', error);
      setResponseMessage(`加载失败: ${error.message || '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  // 验证日期格式
  const isValidDate = (dateString: string): boolean => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>加载历史数据</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="form-group">
            <label>交易对:</label>
            <select 
              value={symbol} 
              onChange={(e) => setSymbol(e.target.value)}
              disabled={loading}
              className="form-control"
            >
              {SYMBOLS.map(sym => (
                <option key={sym} value={sym}>{sym}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>时间周期:</label>
            <select 
              value={interval} 
              onChange={(e) => setInterval(e.target.value)}
              disabled={loading}
              className="form-control"
            >
              {INTERVALS.map(int => (
                <option key={int.value} value={int.value}>{int.label}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>开始日期:</label>
            <div className="date-input-wrapper">
              <input 
                type="date" 
                value={startDate}
                onChange={handleStartDateChange}
                disabled={loading}
                className="form-control"
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>结束日期:</label>
            <div className="date-input-wrapper">
              <input 
                type="date" 
                value={endDate}
                onChange={handleEndDateChange}
                disabled={loading}
                min={startDate}
                className="form-control"
              />
            </div>
          </div>
          
          {responseMessage && (
            <div className="response-message">
              <pre>{responseMessage}</pre>
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button 
            className="load-button" 
            onClick={handleLoadData}
            disabled={loading}
          >
            {loading ? '加载中...' : '加载数据'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataLoadModal; 