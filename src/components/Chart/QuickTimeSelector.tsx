import React from 'react';
import './QuickTimeSelector.css';
import { getCurrentTimeString, getTodayDateString } from '../../services/api';

interface QuickTimeSelectorProps {
  onTimeRangeSelect: (startDate: string, endDate: string) => void;
}

const QuickTimeSelector: React.FC<QuickTimeSelectorProps> = ({ onTimeRangeSelect }) => {
  // 计算指定时间前的日期（仅日期部分）
  const getDateBefore = (months: number): string => {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date.toISOString().split('T')[0];
  };

  // 快捷时间选项
  const timeOptions: Array<{ label: string; months: number; isToday?: boolean }> = [
    { label: '今天', months: 0, isToday: true },
    { label: '1个月', months: 1 },
    { label: '3个月', months: 3 },
    { label: '半年', months: 6 },
    { label: '1年', months: 12 },
    { label: '2年', months: 24 },
    { label: '3年', months: 36 },
    { label: '5年', months: 60 }
  ];

  const handleQuickSelect = (months: number, isToday = false) => {
    if (isToday) {
      // 今天：开始时间是今天00:00:00，结束时间是当前精确时间
      const startDate = `${getTodayDateString()} 00:00:00`;
      const endDate = getCurrentTimeString();
      onTimeRangeSelect(startDate, endDate);
    } else {
      // 其他时间范围：开始时间是指定日期00:00:00，结束时间是当前精确时间
      const startDate = `${getDateBefore(months)} 00:00:00`;
      const endDate = getCurrentTimeString();
      onTimeRangeSelect(startDate, endDate);
    }
  };

  return (
    <div className="quick-time-selector">
      <label>快捷选择:</label>
      <div className="quick-time-buttons">
        {timeOptions.map(option => (
          <button
            key={option.label}
            className="quick-time-button"
            onClick={() => handleQuickSelect(option.months, option.isToday)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickTimeSelector;