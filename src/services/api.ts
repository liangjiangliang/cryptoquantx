import { CandlestickData } from '../store/types';
import { BacktestSummary } from '../store/types';

// 统一的时间处理工具函数
export const getDefaultDateRange = () => {
  const now = new Date();

  // 结束时间：当前精确时间
  const endDate = new Date(now);

  // 开始时间：一年前的当前时间
  const startDate = new Date(now);
  startDate.setFullYear(now.getFullYear() - 1);

  return {
    startDate: formatDateTimeString(startDate),
    endDate: formatDateTimeString(endDate)
  };
};

// 统一的时间格式化函数：yyyy-MM-dd HH:mm:ss
export const formatDateTimeString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// 将日期字符串转换为标准格式
export const normalizeTimeString = (timeStr: string): string => {
  // 如果已经包含时间部分，直接返回
  if (timeStr.includes(':')) {
    return timeStr;
  }

  // 如果只有日期部分，添加 00:00:00
  return `${timeStr} 00:00:00`;
};

// 获取今天的日期字符串（yyyy-MM-dd格式），用于限制日期选择器的最大值
export const getTodayDateString = (): string => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

// 获取当前时间的字符串格式（yyyy-MM-dd HH:mm:ss）
export const getCurrentTimeString = (): string => {
  return formatDateTimeString(new Date());
};

// 从时间字符串中提取日期部分（yyyy-MM-dd）
export const extractDatePart = (timeStr: string): string => {
  if (!timeStr) return '';
  // 如果包含空格，说明有时间部分，只取日期部分
  if (timeStr.includes(' ')) {
    return timeStr.split(' ')[0];
  }
  // 如果已经是日期格式，直接返回
  return timeStr;
};

// 规范化为完整的时间格式（yyyy-MM-dd HH:mm:ss）
export const normalizeToFullTimeFormat = (timeStr: string): string => {
  if (!timeStr) return '';

  // 如果已经包含时间部分，直接返回（但要处理重复格式问题）
  if (timeStr.includes(' ')) {
    // 处理类似 "2025-06-23 22:55:02 00:00:00" 的重复格式
    const parts = timeStr.split(' ');
    if (parts.length >= 2) {
      // 只取前两部分：日期和时间
      return `${parts[0]} ${parts[1]}`;
    }
    return timeStr;
  }

  // 如果只有日期部分，添加 00:00:00
  return `${timeStr} 00:00:00`;
};

// 保持向后兼容，使用getTodayDateString
export const getYesterdayDateString = getTodayDateString;

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
  console.log('开始转换API数据:', {
    inputLength: apiData.length,
    firstItem: apiData.length > 0 ? apiData[0] : null
  });

  const result = apiData.map((item, index) => {
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

    const convertedItem = {
      time: openTime,
      open,
      high,
      low,
      close,
      volume
    };

    if (index === 0) {
      console.log('转换第一个数据项:', { original: item, converted: convertedItem });
    }

    return convertedItem;
  });

  console.log('数据转换完成:', {
    inputLength: apiData.length,
    outputLength: result.length,
    firstConverted: result.length > 0 ? result[0] : null
  });

  return result;
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

// 格式化日期字符串为API所需格式（保持向后兼容）
const formatDateString = (dateStr: string): string => {
  return normalizeTimeString(dateStr);
};



// 获取K线数据
export const fetchCandlestickData = async (
  symbol: string = 'BTC-USDT',
  interval: string = '1D',
  startDate?: string,
  endDate?: string
): Promise<CandlestickData[]> => {
  // 如果没有提供时间范围，使用默认时间范围（昨天开始往前一年）
  const defaultRange = getDefaultDateRange();
  const normalizedStartDate = startDate ? normalizeTimeString(startDate) : defaultRange.startDate;
  const normalizedEndDate = endDate ? normalizeTimeString(endDate) : defaultRange.endDate;

  try {
    // 构建API URL，包含日期范围参数
    let url = `/market/fetch_history_with_integrity_check?symbol=${symbol}&interval=${interval}`;
    url += `&startTimeStr=${encodeURIComponent(normalizedStartDate)}`;
    url += `&endTimeStr=${encodeURIComponent(normalizedEndDate)}`;

    // console.log('从API获取K线数据:', { symbol, interval, startDate: normalizedStartDate, endDate: normalizedEndDate });

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
  startDate?: string,
  endDate?: string
): Promise<{
  data: CandlestickData[];
  message: string;
}> => {
  // 如果没有提供时间范围，使用默认时间范围
  const defaultRange = getDefaultDateRange();

  // startDate 需要完整的时间格式（yyyy-MM-dd HH:mm:ss）
  const normalizedStartDate = startDate ? normalizeToFullTimeFormat(startDate) : defaultRange.startDate;

  // endDate 需要完整的时间格式（yyyy-MM-dd HH:mm:ss）
  const normalizedEndDate = endDate ? normalizeToFullTimeFormat(endDate) : getCurrentTimeString();

  try {
    // 构建API URL
    const url = `/market/fetch_history_with_integrity_check?symbol=${symbol}&interval=${interval}&startTimeStr=${encodeURIComponent(normalizedStartDate)}&endTimeStr=${encodeURIComponent(normalizedEndDate)}`;

    console.log('从API获取历史数据:', { symbol, interval, startDate: normalizedStartDate, endDate: normalizedEndDate });
    console.log('请求URL:', url); // 调试日志

    const response = await fetch(url);
    const responseText = await response.text();
    // console.log('API响应:', responseText); // 调试日志

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

    // 如果API返回了数据，转换数据
    let convertedData: CandlestickData[] = [];
    if (apiResponse.code === 200 && apiResponse.data && Array.isArray(apiResponse.data)) {
      convertedData = convertApiDataToCandlestickData(apiResponse.data);
    }

    // 格式化API响应为可读格式
    const formattedResponse = JSON.stringify(apiResponse, null, 2);
    // console.log('格式化的API响应:', formattedResponse); // 调试日志

    return {
      data: convertedData,
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
    const url = `/api/backtest/ta4j/summaries`;

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
    const url = `/api/backtest/ta4j/detail/${backtestId}`;

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

// 获取单个回测摘要信息
export const fetchBacktestSummary = async (backtestId: string): Promise<any> => {
  try {
    const url = `/api/backtest/ta4j/summary/${backtestId}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`获取回测摘要失败: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.code !== 200) {
      console.warn(`API错误: ${data.message}`);
      return null;
    }

    if (!data.data) {
      console.warn('API返回的回测摘要数据为空');
      return null;
    }

    return data.data;
  } catch (error) {
    console.error('获取回测摘要数据失败:', error);
    return null;
  }
};

// 获取回测策略列表
export const fetchBacktestStrategies = async (): Promise<any> => {
  try {
    const url = `/api/backtest/ta4j/strategies`;

    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`获取回测策略失败: ${response.status}`);
      return { data: {} };
    }

    const result = await response.json();

    if (result.code !== 200) {
      console.warn(`API错误: ${result.message}`);
      return { data: {} };
    }

    if (!result.data) {
      console.warn('API返回的回测策略数据为空');
      return { data: {} };
    }

    return result;
  } catch (error) {
    console.error('获取回测策略数据失败:', error);
    return { data: {} };
  }
};

// 创建回测
export const createBacktest = async (
  symbol: string = 'BTC-USDT',
  interval: string = '1D',
  strategyCode: string,
  params: any,
  startDate?: string,
  endDate?: string,
  initialAmount: number = 10000
): Promise<any> => {
  try {
    const url = `/api/backtest/ta4j/create`;

    // 构建请求体
    const requestBody = {
      symbol,
      interval,
      strategyCode,
      strategyParams: JSON.stringify(params),
      startTime: startDate || getDefaultDateRange().startDate,
      endTime: endDate || getCurrentTimeString(),
      initialAmount
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.warn(`创建回测失败: ${response.status}`);
      return { success: false, message: `创建回测失败，状态码: ${response.status}` };
    }

    const result = await response.json();

    if (result.code !== 200) {
      console.warn(`API错误: ${result.message}`);
      return { success: false, message: result.message || '创建回测失败' };
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error('创建回测失败:', error);
    return { success: false, message: '创建回测请求发生错误' };
  }
};

// 获取批量回测统计数据
export const fetchBatchBacktestStatistics = async (): Promise<any> => {
  try {
    const url = `/api/backtest/ta4j/summaries/batch-statistics`;

    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`获取批量回测统计失败: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (data.code !== 200) {
      console.warn(`API错误: ${data.message}`);
      return [];
    }

    if (!data.data || data.data.length === 0) {
      console.warn('API返回的批量回测统计数据为空');
      return [];
    }

    return data.data;
  } catch (error) {
    console.error('获取批量回测统计数据失败:', error);
    return [];
  }
};

// 执行批量回测
export const runAllBacktests = async (
  symbol: string = 'BTC-USDT',
  interval: string = '1D',
  startDate?: string,
  endDate?: string,
  initialAmount: number = 10000,
  feeRatio: number = 0.001
): Promise<any> => {
  try {
    // 直接使用传入的时间，这些时间应该已经是正确的格式
    const formattedStartTime = startDate || getDefaultDateRange().startDate;
    const formattedEndTime = endDate || getCurrentTimeString();

    // 构建API URL
    const url = `/api/backtest/ta4j/run-all?startTime=${encodeURIComponent(formattedStartTime)}&endTime=${encodeURIComponent(formattedEndTime)}&initialAmount=${initialAmount}&symbol=${symbol}&interval=${interval}&saveResult=True&feeRatio=${feeRatio}`;

    console.log('发送批量回测请求:', url);

    // 发送请求
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('批量回测API返回数据:', data);

    if (data.code === 200 && data.data) {
      // 保存最近一次的批次ID到静态属性，以便其他组件可以访问
      const batchBacktestId = data.data.batch_backtest_id || '';
      (runAllBacktests as any).lastBatchId = batchBacktestId;

      return {
        success: true,
        data: data.data
      };
    } else {
      throw new Error(data.message || '批量回测失败');
    }
  } catch (error) {
    console.error('批量回测失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '批量回测请求发生错误'
    };
  }
};

// 获取批量回测汇总
export const fetchBatchBacktestSummariesBatch = async (batchBacktestId: string): Promise<BacktestSummary[]> => {
  try {
    const url = `/api/backtest/ta4j/summaries/batch/${batchBacktestId}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`批量回测汇总API请求失败: ${response.status}`);
      return [];
    }
    const data = await response.json();
    if (data.code !== 200) {
      console.warn(`API错误: ${data.message}`);
      return [];
    }
    if (!data.data || data.data.length === 0) {
      console.warn('API返回的批量回测汇总数据为空');
      return [];
    }
    return data.data;
  } catch (error) {
    console.error('获取批量回测汇总数据失败:', error);
    return [];
  }
};

// 删除策略
export const deleteStrategy = async (strategyCode: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const url = `/api/backtest/ta4j/delete-strategy/${strategyCode}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('删除策略API返回数据:', data);

    if (data.code === 200) {
      return {
        success: true,
        message: data.message || '策略删除成功'
      };
    } else {
      throw new Error(data.message || '删除策略失败');
    }
  } catch (error) {
    console.error('删除策略失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '删除策略请求发生错误'
    };
  }
};

// 生成AI策略
export const generateStrategy = async (description: string): Promise<{ success: boolean; data?: any; message?: string }> => {
  try {
    // 使用相对路径，由React开发服务器代理到目标API
    const url = '/api/backtest/ta4j/generate-strategy';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: description
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('生成策略API返回数据:', data);

    if (data.code === 200) {
      return {
        success: true,
        data: data.data,
        message: data.message || '策略生成成功'
      };
    } else {
      return {
        success: false,
        message: data.message || '生成策略失败'
      };
    }
  } catch (error) {
    console.error('生成策略失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '生成策略请求发生错误'
    };
  }
};

// 修改策略
export const updateStrategy = async (id :number,description: string): Promise<{ success: boolean; data?: any; message?: string }> => {
  try {
    const url = '/api/backtest/ta4j/update-strategy';
    const formData = new URLSearchParams();
    formData.append('id', id.toString());
    formData.append('description', description);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('修改策略API返回数据:', data);

    if (data.code === 200) {
      return {
        success: true,
        data: data.data,
        message: data.message || '策略修改成功'
      };
    } else {
      return {
        success: false,
        message: data.message || '修改策略失败'
      };
    }
  } catch (error) {
    console.error('修改策略失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '修改策略请求发生错误'
    };
  }
};

// 获取每个策略的最高收益率
export const fetchStrategyMaxReturns = async (): Promise<Record<string, number>> => {
  try {
    // 获取所有回测汇总数据
    const summariesResponse = await fetchBacktestSummaries();

    if (!summariesResponse || !Array.isArray(summariesResponse)) {
      console.warn('获取回测汇总数据失败或数据格式不正确');
      return {};
    }

    const summaries = summariesResponse;
    const maxReturnsByStrategy: Record<string, number> = {};

    // 遍历所有回测记录，找出每个策略的最高收益率
    summaries.forEach(summary => {
      const { strategyName, totalReturn } = summary;

      if (!strategyName || typeof totalReturn !== 'number') {
        return;
      }

      // 如果当前策略尚未记录或当前收益率更高，则更新
      if (!(strategyName in maxReturnsByStrategy) || totalReturn > maxReturnsByStrategy[strategyName]) {
        maxReturnsByStrategy[strategyName] = totalReturn;
      }
    });

    return maxReturnsByStrategy;
  } catch (error) {
    console.error('计算策略最高收益率数据失败:', error);
    return {};
  }
};

// 获取指标分布详情
export const fetchIndicatorDistributions = async (): Promise<{ success: boolean; data?: any; message?: string }> => {
  try {
    const url = '/api/indicator-distribution/current';

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('获取指标分布详情API返回数据:', data);

    if (data.code === 200) {
      return {
        success: true,
        data: data.data,
        message: data.message || '获取指标分布详情成功'
      };
    } else {
      return {
        success: false,
        message: data.message || '获取指标分布详情失败'
      };
    }
  } catch (error) {
    console.error('获取指标分布详情失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取指标分布详情请求发生错误'
    };
  }
};

// 更新指标分布
export const updateIndicatorDistributions = async (): Promise<{ success: boolean; message?: string }> => {
  try {
    const url = '/api/indicator-distribution/update';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('更新指标分布API返回数据:', data);

    if (data.code === 200) {
      return {
        success: true,
        message: data.message || '指标分布更新成功'
      };
    } else {
      return {
        success: false,
        message: data.message || '更新指标分布失败'
      };
    }
  } catch (error) {
    console.error('更新指标分布失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '更新指标分布请求发生错误'
    };
  }
};

// 获取失败的策略列表
export const fetchFailedStrategies = async (batchBacktestId?: string): Promise<any[]> => {
  try {
    // 如果有批次ID，先尝试从批量回测结果中获取失败策略
    if (batchBacktestId) {
      const url = `/api/backtest/ta4j/run-all-results?batch_backtest_id=${batchBacktestId}`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        if (data.code === 200 && data.data && Array.isArray(data.data.results)) {
          // 从结果中筛选出失败的策略
          const failedStrategies = data.data.results.filter((strategy: any) =>
            strategy.success === false || strategy.error
          ).map((strategy: any) => ({
            strategy_code: strategy.strategy_code,
            strategy_name: strategy.strategy_name,
            error: strategy.error || '未知错误'
          }));

          if (failedStrategies.length > 0) {
            return failedStrategies;
          }
        }
      }
    }

    // 如果上面的方法没有获取到数据，使用专门的失败策略API
    let url = `/api/backtest/ta4j/failed-strategies`;
    if (batchBacktestId) {
      url += `?batch_backtest_id=${batchBacktestId}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`获取失败策略失败: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (data.code !== 200) {
      console.warn(`API错误: ${data.message}`);
      return [];
    }

    if (!data.data || data.data.length === 0) {
      console.warn('API返回的失败策略数据为空');
      return [];
    }

    return data.data;
  } catch (error) {
    console.error('获取失败策略数据失败:', error);
    return [];
  }
};

// 创建实时策略
export const createRealTimeStrategy = async (
  strategyCode: string,
  symbol: string,
  interval: string,
  tradeAmount: number
): Promise<{ success: boolean; data?: any; message?: string }> => {
  try {
    const url = '/api/real-time-strategy/real-time';

    // 构建参数
    const params = new URLSearchParams();
    params.append('strategyCode', strategyCode);
    params.append('symbol', symbol);
    params.append('interval', interval);
    params.append('tradeAmount', tradeAmount.toString());

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('创建实时策略API返回数据:', data);

    if (data.code === 200) {
      return {
        success: true,
        data: data.data,
        message: data.message || '实时策略创建成功'
      };
    } else {
      return {
        success: false,
        message: data.message || '创建实时策略失败'
      };
    }
  } catch (error) {
    console.error('创建实时策略失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '创建实时策略请求发生错误'
    };
  }
};

// 启动实时策略
export const startRealTimeStrategy = async (strategyId: number): Promise<{ success: boolean; message?: string }> => {
  try {
    const url = `/api/real-time-strategy/start/${strategyId}`;

    // 构建参数，使用表单格式
    const params = new URLSearchParams();
    params.append('id', strategyId.toString());

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('启动策略API返回数据:', data);

    if (data.code === 200) {
      return {
        success: true,
        message: data.message || '策略启动成功'
      };
    } else {
      return {
        success: false,
        message: data.message || '启动策略失败'
      };
    }
  } catch (error) {
    console.error('启动策略失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '启动策略请求发生错误'
    };
  }
};

// 停止实时策略
export const stopRealTimeStrategy = async (strategyId: number): Promise<{ success: boolean; message?: string }> => {
  try {
    const url = `/api/real-time-strategy/stop/${strategyId}`;

    // 构建参数，使用表单格式
    const params = new URLSearchParams();
    params.append('id', strategyId.toString());

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('停止策略API返回数据:', data);

    if (data.code === 200) {
      return {
        success: true,
        message: data.message || '策略停止成功'
      };
    } else {
      return {
        success: false,
        message: data.message || '停止策略失败'
      };
    }
  } catch (error) {
    console.error('停止策略失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '停止策略请求发生错误'
    };
  }
};

// 删除实时策略
export const deleteRealTimeStrategy = async (strategyId: number): Promise<{ success: boolean; message?: string }> => {
  try {
    const url = `/api/real-time-strategy/delete/${strategyId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('删除实时策略API返回数据:', data);

    if (data.code === 200) {
      return {
        success: true,
        message: data.message || '策略删除成功'
      };
    } else {
      return {
        success: false,
        message: data.message || '删除策略失败'
      };
    }
  } catch (error) {
    console.error('删除策略失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '删除策略请求发生错误'
    };
  }
};

// 获取账户余额
export const fetchAccountBalance = async (): Promise<{ success: boolean; data?: any; message?: string }> => {
  try {
    const url = '/account/balance';

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('获取账户余额API返回数据:', data);

    if (data.code === 200) {
      return {
        success: true,
        data: data.data,
        message: data.message || '获取账户余额成功'
      };
    } else {
      return {
        success: false,
        message: data.message || '获取账户余额失败'
      };
    }
  } catch (error) {
    console.error('获取账户余额失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取账户余额请求发生错误'
    };
  }
};

// 获取所有币种的最新行情
export const fetchAllTickers = async (filter: string = 'all', limit: number = 2000): Promise<{ success: boolean; data?: any; message?: string }> => {
  try {
    const url = `/market/all_tickers?filter=${filter}&limit=${limit}`;
    
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('获取所有币种行情API返回数据:', data);

    if (data.code === 200) {
      return {
        success: true,
        data: data.data,
        message: data.message || '获取所有币种行情成功'
      };
    } else {
      return {
        success: false,
        message: data.message || '获取所有币种行情失败'
      };
    }
  } catch (error) {
    console.error('获取所有币种行情失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取所有币种行情请求发生错误'
    };
  }
};
