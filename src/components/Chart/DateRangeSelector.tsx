import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setDateRange } from '../../store/actions';
import { getDefaultDateRange, getYesterdayDateString } from '../../services/api';
import './DateRangeSelector.css';

const DateRangeSelector: React.FC = () => {
  // 使用统一的默认时间范围
  const defaultRange = getDefaultDateRange();
  const formattedToday = new Date().toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(defaultRange.startDate.split(' ')[0]);
  const [endDate, setEndDate] = useState(defaultRange.endDate.split(' ')[0]);
  
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
          max={getYesterdayDateString()}
        />
      </div>
      <div className="date-input-group">
        <label>结束日期:</label>
        <input
          type="date"
          value={endDate}
          onChange={handleEndDateChange}
          min={startDate}
          max={getYesterdayDateString()}
        />
      </div>
    </div>
  );
};

export default DateRangeSelector; 