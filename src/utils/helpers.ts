/**
 * 格式化价格，保留指定小数位数
 */
export const formatPrice = (price: number, decimals: number = 2): string => {
  return price.toFixed(decimals);
};

/**
 * 格式化日期时间
 */
export const formatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp * 1000); // 将秒转换为毫秒
  return date.toLocaleString();
};

/**
 * 格式化日期
 */
export const formatDate = (timestamp: number): string => {
  // 检查时间戳是否已经是毫秒级别
  const isMilliseconds = timestamp > 10000000000;
  // 根据时间戳级别进行转换
  const date = new Date(isMilliseconds ? timestamp : timestamp * 1000);

  // 检查日期是否有效
  if (isNaN(date.getTime())) {
    console.error('Invalid date timestamp:', timestamp);
    return 'Invalid Date';
  }

  // 使用更明确的日期格式
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * 格式化时间
 */
export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp * 1000); // 将秒转换为毫秒
  return date.toLocaleTimeString();
};

/**
 * 格式化数量，添加千位分隔符
 */
export const formatAmount = (amount: number, decimals: number = 4): string => {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  const formattedValue = absAmount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  
  return isNegative ? `-${formattedValue}` : formattedValue;
};

/**
 * 格式化百分比
 */
export const formatPercentage = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

/**
 * 生成随机ID
 */
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

/**
 * 计算价格变化百分比
 */
export const calculatePriceChange = (currentPrice: number, previousPrice: number): number => {
  return ((currentPrice - previousPrice) / previousPrice) * 100;
};

/**
 * 生成随机颜色
 */
export const getRandomColor = (): string => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};
