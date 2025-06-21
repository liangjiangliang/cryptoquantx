import React, { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from '../store/types';
import { updateCandlestickData } from '../store/actions';
import { fetchCandlestickData } from '../services/api';

const DataLoader: React.FC = () => {
  const dispatch = useDispatch();
  const selectedPair = useSelector((state: AppState) => state.selectedPair);
  const timeframe = useSelector((state: AppState) => state.timeframe);
  const dateRange = useSelector((state: AppState) => state.dateRange);

  // 将Redux的timeframe格式转换为API所需的格式
  const convertTimeframeFormat = (timeframe: string): string => {
    switch (timeframe) {
      case '1m': return '1m';
      case '5m': return '5m';
      case '15m': return '15m';
      case '30m': return '30m';
      case '1h': return '1H';
      case '4h': return '4H';
      case '1d': return '1D';
      case '1w': return '1W';
      default: return '1D';
    }
  };

  // 将Redux的交易对格式转换为API所需的格式
  const convertPairFormat = (pair: string): string => {
    return pair.replace('/', '-');
  };

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      console.log('正在加载K线数据...');
      const apiPair = convertPairFormat(selectedPair);
      const apiTimeframe = convertTimeframeFormat(timeframe);
      
      const data = await fetchCandlestickData(
        apiPair, 
        apiTimeframe,
        dateRange.startDate,
        dateRange.endDate
      );
      dispatch(updateCandlestickData(data));
      // console.log(`已加载 ${data.length} 条K线数据`);
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  }, [selectedPair, timeframe, dateRange, dispatch]);

  // 在组件挂载时和selectedPair/timeframe/dateRange变化时加载数据
  useEffect(() => {
    loadData();
    
    // 设置定期刷新（每分钟）
    const intervalId = setInterval(loadData, 60000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [loadData]);

  // 添加对reload_data事件的监听
  useEffect(() => {
    const handleReloadData = () => {
      // console.log('接收到reload_data事件，重新加载数据');
      loadData();
    };

    window.addEventListener('reload_data', handleReloadData);
    
    return () => {
      window.removeEventListener('reload_data', handleReloadData);
    };
  }, [loadData]);

  // 此组件不渲染任何内容
  return null;
};

export default DataLoader; 