import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setDateRange } from '../../store/actions';
import './DateRangeSelector.css';

const DateRangeSelector: React.FC = () => {
  // 获取当前日期作为默认结束日期
  const today = new Date();
  const formattedToday = today.toISOString().split('T')[0];
  
  // 默认开始日期为一年前
  const defaultStartDate = new Date();
  defaultStartDate.setFullYear(today.getFullYear() - 1);
  const formattedDefaultStart = defaultStartDate.toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(formattedDefaultStart);
  const [endDate, setEndDate] = useState(formattedToday);
  
  const dispatch = useDispatch();
  
  // 处理开始日期变化
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    setStartDate(newStartDate);
    dispatch(setDateRange(newStartDate, endDate));
  };
  
  // 处理结束日期变化
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value;
    setEndDate(newEndDate);
    dispatch(setDateRange(startDate, newEndDate));
  };
  
  return (
    <div className="date-range-selector">
      <div className="date-input-group">
        <label>开始日期:</label>
        <input
          type="date"
          value={startDate}
          onChange={handleStartDateChange}
          max={endDate}
        />
      </div>
      <div className="date-input-group">
        <label>结束日期:</label>
        <input
          type="date"
          value={endDate}
          onChange={handleEndDateChange}
          min={startDate}
          max={formattedToday}
        />
      </div>
    </div>
  );
};

export default DateRangeSelector; 