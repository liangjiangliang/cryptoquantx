import React from 'react';
import './QuickTimeSelector.css';
import { formatDateTimeString } from '../../services/api';

interface QuickTimeSelectorProps {
  onTimeRangeSelect: (startDate: string, endDate: string) => void;
}

const QuickTimeSelector: React.FC<QuickTimeSelectorProps> = ({ onTimeRangeSelect }) => {
  // 获取当前时间字符串（精确到秒）
  const getCurrentTimeString = (): string => {
    const now = new Date();
    return formatDateTimeString(now);
  };

  // 获取今天的日期字符串（仅日期部分）
  const getTodayDateString = (): string => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // 计算指定时间前的日期（精确到当前秒）
  const getDateTimeBefore = (months: number): string => {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return formatDateTimeString(date);
  };

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
      // 今天：从今天00:00:00到当前精确时间
      const today = new Date();
      today.setHours(0, 0, 0, 0); // 设置为今天的00:00:00
      const startDate = formatDateTimeString(today);
      const endDate = getCurrentTimeString();
      onTimeRangeSelect(startDate, endDate);
    } else {
      // 其他时间范围：使用精确时间
      const startDate = getDateTimeBefore(months);
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