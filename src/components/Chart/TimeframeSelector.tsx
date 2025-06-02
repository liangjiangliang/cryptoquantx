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
  { value: '1H', label: '1小时' },
  { value: '2H', label: '2小时' },
  { value: '4H', label: '4小时' },
  { value: '6H', label: '6小时' },
  { value: '12H', label: '12小时' },
  { value: '1D', label: '1天' },
  { value: '1W', label: '1周' },
  { value: '1M', label: '1个月' },
];

// 定义时间周期类型
type TimeframeType = '1m' | '5m' | '15m' | '30m' | '1H' | '2H' | '4H' | '6H' | '12H' | '1D' | '1W' | '1M';

const TimeframeSelector: React.FC = () => {
  const dispatch = useDispatch();
  const currentTimeframe = useSelector((state: AppState) => state.timeframe);

  const handleTimeframeChange = (value: TimeframeType) => {
    dispatch(setTimeframe(value));
  };

  return (
    <div className="timeframe-container">
      <div className="timeframe-selector">
        {timeframeOptions.map((option) => (
          <button
            key={option.value}
            className={`timeframe-button ${currentTimeframe === option.value ? 'active' : ''}`}
            onClick={() => handleTimeframeChange(option.value as TimeframeType)}
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