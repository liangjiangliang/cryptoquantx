import { CandlestickData } from '../store/types';
import { BacktestSummary } from '../store/types';

interface ApiResponse {
  code: number;
  message: string;
  data: ApiCandlestickData[];
}

interface ApiCandlestickData {
  close: number;
  closeTime: string;
  fetchTime: string;
  high: number;
  id: number;
  intervalVal: string;
  low: number;
  open: number;
  openTime: string;
  quoteVolume: number;
  symbol: string;
  trades: number;
  volume: number;
}

// 将API返回的数据转换为应用中使用的格式
const convertApiDataToCandlestickData = (apiData: any[]): CandlestickData[] => {
  return apiData.map(item => {
    // 将日期字符串转换为时间戳（秒）
    let openTime: number;
    
    // 处理不同格式的日期字段
    if (item.openTime) {
      openTime = new Date(item.openTime).getTime() / 1000;
    } else if (item.time) {
      // 如果数据中有time字段
      if (typeof item.time === 'number') {
        openTime = item.time;
      } else {
        openTime = new Date(item.time).getTime() / 1000;
      }
    } else if (item.timestamp) {
      // 如果数据中有timestamp字段
      if (typeof item.timestamp === 'number') {
        openTime = item.timestamp;
      } else {
        openTime = new Date(item.timestamp).getTime() / 1000;
      }
    } else {
      // 如果没有时间字段，使用当前时间
      console.warn('数据中没有时间字段，使用当前时间');
      openTime = Math.floor(Date.now() / 1000);
    }
    
    // 确保所有必要的字段都有值
    const open = item.open !== undefined ? item.open : (item.o !== undefined ? item.o : 0);
    const high = item.high !== undefined ? item.high : (item.h !== undefined ? item.h : open);
    const low = item.low !== undefined ? item.low : (item.l !== undefined ? item.l : open);
    const close = item.close !== undefined ? item.close : (item.c !== undefined ? item.c : open);
    const volume = item.volume !== undefined ? item.volume : (item.v !== undefined ? item.v : 0);
    
    return {
      time: openTime,
      open,
      high,
      low,
      close,
      volume
    };
  });
};

// 模拟K线数据，用于API调用失败时的备用方案
const generateMockData = (): CandlestickData[] => {
  return Array.from({ length: 100 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 100 + i);
    
    const basePrice = 30000 + Math.random() * 5000;
    const open = basePrice;
    const high = open + Math.random() * 500;
    const low = open - Math.random() * 500;
    const close = low + Math.random() * (high - low);
    const volume = Math.random() * 100 + 10;
    
    return {
      time: date.getTime() / 1000,
      open,
      high,
      low,
      close,
      volume
    };
  });
};

// 格式化日期字符串为API所需格式
const formatDateString = (dateStr: string): string => {
  // 检查日期格式是否已经包含时间部分
  if (dateStr.includes(':')) {
    return dateStr;
  }
  
  // 将YYYY-MM-DD转换为"YYYY-MM-DD 00:00:00"格式
  return `${dateStr} 00:00:00`;
};

// 获取K线数据
export const fetchCandlestickData = async (
  symbol: string = 'BTC-USDT',
  interval: string = '1D',
  startDate?: string,
  endDate?: string
): Promise<CandlestickData[]> => {
  try {
    // 构建API URL，包含日期范围参数
    let url = `/api/market/query_saved_history?symbol=${symbol}&interval=${interval}`;
    
    if (startDate) {
      url += `&startTimeStr=${encodeURIComponent(formatDateString(startDate))}`;
    }
    
    if (endDate) {
      url += `&endTimeStr=${encodeURIComponent(formatDateString(endDate))}`;
    }
    
    // 使用相对路径，由React开发服务器代理到目标API
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`API请求失败: ${response.status}`);
      return []; // 返回空数组而不是模拟数据
    }
    
    const data: ApiResponse = await response.json();
    
    if (data.code !== 200) {
      console.warn(`API错误: ${data.message}`);
      return []; // 返回空数组而不是模拟数据
    }
    
    if (!data.data || data.data.length === 0) {
      console.warn('API返回的数据为空');
      return []; // 返回空数组而不是模拟数据
    }
    
    return convertApiDataToCandlestickData(data.data);
  } catch (error) {
    console.error('获取K线数据失败:', error);
    return []; // 返回空数组而不是模拟数据
  }
};

// 加载历史数据并进行完整性检查
export const fetchHistoryWithIntegrityCheck = async (
  symbol: string,
  interval: string,
  startDate: string,
  endDate: string
): Promise<{
  data: CandlestickData[];
  message: string;
}> => {
  try {
    // 构建API URL
    const formattedStartDate = formatDateString(startDate);
    const formattedEndDate = formatDateString(endDate);
    
    const url = `/api/market/fetch_history_with_integrity_check?symbol=${symbol}&interval=${interval}&startTimeStr=${encodeURIComponent(formattedStartDate)}&endTimeStr=${encodeURIComponent(formattedEndDate)}`;
    
    console.log('请求URL:', url); // 调试日志
    
    const response = await fetch(url);
    const responseText = await response.text();
    console.log('API响应:', responseText); // 调试日志
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }
    
    // 解析API响应
    let apiResponse: any;
    try {
      apiResponse = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`解析API响应失败: ${responseText.substring(0, 100)}...`);
    }
    
    // 格式化API响应为可读格式
    const formattedResponse = JSON.stringify(apiResponse, null, 2);
    console.log('格式化的API响应:', formattedResponse); // 调试日志
    
    return {
      data: [], // 返回空数组，因为我们只需要显示消息
      message: `API响应:\n${formattedResponse}`
    };
  } catch (error: any) {
    console.error('加载历史数据失败:', error);
    throw error;
  }
};

// 获取回测汇总列表
export const fetchBacktestSummaries = async (): Promise<BacktestSummary[]> => {
  try {
    const url = `/api/api/backtest/ta4j/summaries`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`获取回测汇总失败: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    if (data.code !== 200) {
      console.warn(`API错误: ${data.message}`);
      return [];
    }
    
    if (!data.data || data.data.length === 0) {
      console.warn('API返回的回测汇总数据为空');
      return [];
    }
    
    return data.data;
  } catch (error) {
    console.error('获取回测汇总数据失败:', error);
    return [];
  }
};

// 获取回测详情
export const fetchBacktestDetail = async (backtestId: string): Promise<any[]> => {
  try {
    const url = `/api/api/backtest/ta4j/detail/${backtestId}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`获取回测详情失败: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    if (data.code !== 200) {
      console.warn(`API错误: ${data.message}`);
      return [];
    }
    
    if (!data.data || data.data.length === 0) {
      console.warn('API返回的回测详情数据为空');
      return [];
    }
    
    return data.data;
  } catch (error) {
    console.error('获取回测详情数据失败:', error);
    return [];
  }
}; 