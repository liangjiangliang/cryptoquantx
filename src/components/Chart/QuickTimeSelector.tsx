import React from 'react';
import './QuickTimeSelector.css';

interface QuickTimeSelectorProps {
  onTimeRangeSelect: (startDate: string, endDate: string) => void;
}

const QuickTimeSelector: React.FC<QuickTimeSelectorProps> = ({ onTimeRangeSelect }) => {
  // 获取昨天的日期字符串
  const getYesterdayDateString = (): string => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };

  // 计算指定时间前的日期
  const getDateBefore = (months: number): string => {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date.toISOString().split('T')[0];
  };

  // 快捷时间选项
  const timeOptions = [
    { label: '1个月', months: 1 },
    { label: '3个月', months: 3 },
    { label: '半年', months: 6 },
    { label: '1年', months: 12 },
    { label: '2年', months: 24 },
    { label: '3年', months: 36 },
    { label: '5年', months: 60 }
  ];

  const handleQuickSelect = (months: number) => {
    const startDate = getDateBefore(months);
    const endDate = getYesterdayDateString();
    onTimeRangeSelect(startDate, endDate);
  };

  return (
    <div className="quick-time-selector">
      <label>快捷选择:</label>
      <div className="quick-time-buttons">
        {timeOptions.map(option => (
          <button
            key={option.months}
            className="quick-time-button"
            onClick={() => handleQuickSelect(option.months)}
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