// 常用交易对列表
export const COMMON_PAIRS = [
  'BTC-USDT',
  'ETH-USDT',
  'BNB-USDT',
  'SOL-USDT',
  'ADA-USDT',
  'XRP-USDT',
  'DOT-USDT',
  'DOGE-USDT',
  'AVAX-USDT',
  'MATIC-USDT'
];

// 时间周期列表
export const TIMEFRAMES = [
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
  { value: '1M', label: '1月' }
];

// 获取一年前的日期（带时间）
export const getDefaultStartDate = (): string => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);
  // 设置为当天的00:00:00
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day} 00:00:00`;
};

// 获取当前时间（精确到秒）
export const getDefaultEndDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}; 