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
  const date = new Date(timestamp);
  return date.toLocaleString();
};

/**
 * 格式化日期
 */
export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString();
};

/**
 * 格式化时间
 */
export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

/**
 * 格式化数量，添加千位分隔符
 */
export const formatAmount = (amount: number, decimals: number = 4): string => {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
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