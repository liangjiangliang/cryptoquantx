import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setTimeframe } from '../../store/actions';
import { AppState } from '../../store/types';
import DateRangeSelector from './DateRangeSelector';
import './TimeframeSelector.css';

const timeframeOptions = [
  { value: '1m', label: '1分钟' },
  { value: '5m', label: '5分钟' },
  { value: '15m', label: '15分钟' },
  { value: '30m', label: '30分钟' },
  { value: '1h', label: '1小时' },
  { value: '4h', label: '4小时' },
  { value: '1d', label: '日线' },
  { value: '1w', label: '周线' },
];

const TimeframeSelector: React.FC = () => {
  const dispatch = useDispatch();
  const currentTimeframe = useSelector((state: AppState) => state.timeframe);

  const handleTimeframeChange = (value: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w') => {
    dispatch(setTimeframe(value));
  };

  return (
    <div className="timeframe-container">
      <div className="timeframe-selector">
        {timeframeOptions.map((option) => (
          <button
            key={option.value}
            className={`timeframe-button ${currentTimeframe === option.value ? 'active' : ''}`}
            onClick={() => handleTimeframeChange(option.value as any)}
          >
            {option.label}
          </button>
        ))}
      </div>
      
      {/* 使用独立的日期范围选择器组件 */}
      <DateRangeSelector />
    </div>
  );
};

export default TimeframeSelector; 