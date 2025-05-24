import { CandlestickData } from "../store/types";

/**
 * 技术指标计算工具库
 */

// 检查数据是否有效 (非空且包含有效值)
export const hasValidData = (data: any[]): boolean => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return false;
  }
  
  // 检查是否至少有一个有效值
  return data.some(value => value !== null && value !== undefined && !isNaN(value));
};

// 填充数组中的null值，使用前后有效值的平均或最近的有效值
export const fillNullValues = (data: any[]): any[] => {
  if (!data || !Array.isArray(data)) {
    return [];
  }
  
  const result = [...data];
  
  // 从前向后填充
  let lastValidValue = null;
  for (let i = 0; i < result.length; i++) {
    if (result[i] === null || result[i] === undefined || isNaN(result[i])) {
      if (lastValidValue !== null) {
        result[i] = lastValidValue;
      }
    } else {
      lastValidValue = result[i];
    }
  }
  
  // 从后向前填充剩余的null值
  lastValidValue = null;
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i] === null || result[i] === undefined || isNaN(result[i])) {
      if (lastValidValue !== null) {
        result[i] = lastValidValue;
      } else {
        // 如果没有有效值，用0填充
        result[i] = 0;
      }
    } else {
      lastValidValue = result[i];
    }
  }
  
  return result;
};

// 辅助函数：安全获取数组值
const safeValue = (value: any): number | null => {
  return value === undefined || value === null || isNaN(value) ? null : value;
};

/**
 * 计算简单移动平均线 (SMA)
 */
export const calculateSMA = (data: number[], period: number): number[] => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.warn('calculateSMA: 无效的输入数据');
    return [];
  }
  
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN); // 数据不足时填充NaN
      continue;
    }
    
    let sum = 0;
    let validCount = 0;
    for (let j = 0; j < period; j++) {
      const value = data[i - j];
      if (value !== undefined && !isNaN(value)) {
        sum += value;
        validCount++;
      }
    }
    
    if (validCount > 0) {
      result.push(sum / validCount);
    } else {
      result.push(NaN);
    }
  }
  
  return result;
};

/**
 * 计算指数移动平均线 (EMA)
 */
export const calculateEMA = (data: number[], period: number): number[] => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.warn('calculateEMA: 无效的输入数据');
    return [];
  }
  
  const result: number[] = [];
  const k = 2 / (period + 1);
  
  // 过滤掉undefined和NaN值
  const cleanData = data.map(x => x !== undefined && !isNaN(x) ? x : null);
  const validData = cleanData.filter(x => x !== null) as number[];
  
  if (validData.length < period) {
    console.warn('calculateEMA: 有效数据不足');
    return Array(data.length).fill(NaN);
  }
  
  // 第一个值使用SMA
  let firstSMA = 0;
  let validCount = 0;
  
  for (let i = 0; i < period && i < data.length; i++) {
    if (cleanData[i] !== null) {
      firstSMA += cleanData[i] as number;
      validCount++;
    }
  }
  
  if (validCount === 0) {
    console.warn('calculateEMA: 初始周期内无有效数据');
    return Array(data.length).fill(NaN);
  }
  
  let ema = firstSMA / validCount;
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    
    if (i === period - 1) {
      result.push(ema);
      continue;
    }
    
    const currentValue = cleanData[i];
    if (currentValue !== null) {
      ema = currentValue * k + ema * (1 - k);
      result.push(ema);
    } else {
      result.push(ema); // 保持上一个EMA值
    }
  }
  
  return result;
};

/**
 * 计算MACD指标
 */
export const calculateMACD = (
  closePrices: number[]
): { 
  macd: number[], 
  signal: number[], 
  histogram: number[] 
} => {
  if (!hasValidData(closePrices)) {
    console.warn('calculateMACD: 无效的输入数据');
    return { 
      macd: Array(closePrices.length).fill(0), 
      signal: Array(closePrices.length).fill(0), 
      histogram: Array(closePrices.length).fill(0) 
    };
  }
  
  try {
    // 检查数据是否足够
    if (closePrices.length < 26) {
      console.warn('calculateMACD: 数据点不足，至少需要26个点');
      return { 
        macd: Array(closePrices.length).fill(0), 
        signal: Array(closePrices.length).fill(0), 
        histogram: Array(closePrices.length).fill(0) 
      };
    }
    
    // 清理数据，替换无效值
    const cleanPrices = closePrices.map(price => 
      price === undefined || isNaN(price) ? null : price
    );
    
    // 填充null值
    const filledPrices = fillNullValues(cleanPrices);
    const validPrices = filledPrices.filter(x => x !== null) as number[];
    
    if (validPrices.length < 26) {
      console.warn('calculateMACD: 有效数据点不足');
      return { 
        macd: Array(closePrices.length).fill(0), 
        signal: Array(closePrices.length).fill(0), 
        histogram: Array(closePrices.length).fill(0) 
      };
    }
    
    // 计算EMA
    const ema12 = calculateEMA(closePrices, 12);
    const ema26 = calculateEMA(closePrices, 26);
    
    if (!hasValidData(ema12) || !hasValidData(ema26)) {
      console.warn('calculateMACD: EMA计算结果无效');
      return { 
        macd: Array(closePrices.length).fill(0), 
        signal: Array(closePrices.length).fill(0), 
        histogram: Array(closePrices.length).fill(0) 
      };
    }
    
    const macdLine: number[] = [];
    
    for (let i = 0; i < closePrices.length; i++) {
      if (i < 25) {
        // 前26个点没有完整的EMA26值，填充0
        macdLine.push(0);
        continue;
      }
      
      if (isNaN(ema12[i]) || isNaN(ema26[i])) {
        // 若任一EMA值无效，保持前一个MACD值或填充0
        const prevValue = i > 0 ? macdLine[i - 1] : 0;
        macdLine.push(isNaN(prevValue) ? 0 : prevValue);
      } else {
        macdLine.push(ema12[i] - ema26[i]);
      }
    }
    
    // 过滤无效的MACD值，将NaN替换为0
    const safeMACD = macdLine.map(v => isNaN(v) ? 0 : v);
    
    // 计算信号线 (9日EMA of MACD)
    const signalData = calculateEMA(safeMACD, 9);
    
    // 确保信号线没有NaN值
    const safeSignal = signalData.map(v => isNaN(v) ? 0 : v);
    
    // 计算柱状图
    const histogram = safeMACD.map((value, i) => {
      if (i >= safeSignal.length) return 0;
      return value - safeSignal[i];
    });
    
    return {
      macd: safeMACD,
      signal: safeSignal,
      histogram
    };
  } catch (error) {
    console.error('calculateMACD错误:', error);
    return { 
      macd: Array(closePrices.length).fill(0), 
      signal: Array(closePrices.length).fill(0), 
      histogram: Array(closePrices.length).fill(0) 
    };
  }
};

/**
 * 计算RSI指标
 */
export const calculateRSI = (closePrices: number[], period: number = 14): number[] => {
  if (!hasValidData(closePrices)) {
    console.warn('calculateRSI: 无效的输入数据');
    return Array(closePrices.length).fill(NaN);
  }
  
  try {
    if (closePrices.length <= period) {
      console.warn('calculateRSI: 数据点不足');
      return Array(closePrices.length).fill(NaN);
    }
    
    // 清理数据，替换无效值
    const cleanPrices = closePrices.map(price => 
      price === undefined || isNaN(price) ? null : price
    );
    
    // 填充null值
    const filledPrices = fillNullValues(cleanPrices);
    const validPrices = filledPrices.filter(x => x !== null) as number[];
    
    if (validPrices.length <= period) {
      console.warn('calculateRSI: 有效数据点不足');
      return Array(closePrices.length).fill(NaN);
    }
    
    const rsi: number[] = [];
    
    // 先填充前period个点为NaN
    for (let i = 0; i < period; i++) {
      rsi.push(NaN);
    }
    
    // 计算首个period周期的平均涨跌
    let gainSum = 0;
    let lossSum = 0;
    let validChanges = 0;
    
    for (let i = 1; i <= period; i++) {
      const current = filledPrices[i];
      const previous = filledPrices[i-1];
      
      if (current === null || previous === null) {
        continue;
      }
      
      const change = current - previous;
      if (change >= 0) {
        gainSum += change;
      } else {
        lossSum += Math.abs(change);
      }
      validChanges++;
    }
    
    if (validChanges === 0) {
      console.warn('calculateRSI: 首个周期内无有效变化');
      return Array(closePrices.length).fill(NaN);
    }
    
    let avgGain = gainSum / validChanges;
    let avgLoss = lossSum / validChanges;
    
    // 计算首个RSI值
    const firstRSI = avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));
    rsi.push(firstRSI);
    
    // 使用平滑RSI计算后续值
    for (let i = period + 1; i < closePrices.length; i++) {
      const current = filledPrices[i];
      const previous = filledPrices[i-1];
      
      if (current === null || previous === null) {
        // 如果当前点或前一个点无效，使用前一个RSI值
        rsi.push(rsi[i-period-1]);
        continue;
      }
      
      const change = current - previous;
      const currentGain = change >= 0 ? change : 0;
      const currentLoss = change < 0 ? Math.abs(change) : 0;
      
      // 使用平滑RSI算法
      avgGain = ((avgGain * (period - 1)) + currentGain) / period;
      avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;
      
      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }
    
    return rsi;
  } catch (error) {
    console.error('calculateRSI错误:', error);
    return Array(closePrices.length).fill(NaN);
  }
};

/**
 * 计算KDJ指标
 */
export const calculateKDJ = (
  highPrices: number[],
  lowPrices: number[],
  closePrices: number[],
  period: number = 9
): { k: number[], d: number[], j: number[] } => {
  if (!hasValidData(highPrices) || !hasValidData(lowPrices) || !hasValidData(closePrices)) {
    console.warn('calculateKDJ: 无效的输入数据');
    const length = Math.max(
      highPrices ? highPrices.length : 0, 
      lowPrices ? lowPrices.length : 0, 
      closePrices ? closePrices.length : 0
    );
    return { 
      k: Array(length).fill(NaN), 
      d: Array(length).fill(NaN), 
      j: Array(length).fill(NaN) 
    };
  }
  
  try {
    // 确保所有数组长度一致
    const length = Math.min(highPrices.length, lowPrices.length, closePrices.length);
    if (length <= period) {
      console.warn('calculateKDJ: 数据点不足');
      return { 
        k: Array(length).fill(NaN), 
        d: Array(length).fill(NaN), 
        j: Array(length).fill(NaN) 
      };
    }
    
    // 清理数据，替换无效值
    const cleanHighs = highPrices.slice(0, length).map(price => 
      price === undefined || isNaN(price) ? null : price
    );
    
    const cleanLows = lowPrices.slice(0, length).map(price => 
      price === undefined || isNaN(price) ? null : price
    );
    
    const cleanCloses = closePrices.slice(0, length).map(price => 
      price === undefined || isNaN(price) ? null : price
    );
    
    // 填充null值
    const filledHighs = fillNullValues(cleanHighs);
    const filledLows = fillNullValues(cleanLows);
    const filledCloses = fillNullValues(cleanCloses);
    
    // 验证有足够的有效数据
    const validDataPoints = filledHighs.filter((v, i) => 
      v !== null && filledLows[i] !== null && filledCloses[i] !== null
    ).length;
    
    if (validDataPoints <= period) {
      console.warn('calculateKDJ: 有效数据点不足');
      return { 
        k: Array(length).fill(NaN), 
        d: Array(length).fill(NaN), 
        j: Array(length).fill(NaN) 
      };
    }
    
    const k: number[] = [];
    const d: number[] = [];
    const j: number[] = [];
    
    // 先填充前period-1个点为NaN
    for (let i = 0; i < period - 1; i++) {
      k.push(NaN);
      d.push(NaN);
      j.push(NaN);
    }
    
    let lastK = 50; // 初始K值为50
    let lastD = 50; // 初始D值为50
    
    for (let i = period - 1; i < length; i++) {
      // 查找当前周期内的最高价和最低价
      let highestHigh = -Infinity;
      let lowestLow = Infinity;
      let validCount = 0;
      
      for (let j = i - period + 1; j <= i; j++) {
        if (j < 0) continue;
        
        const high = filledHighs[j];
        const low = filledLows[j];
        
        if (high !== null && low !== null) {
          highestHigh = Math.max(highestHigh, high);
          lowestLow = Math.min(lowestLow, low);
          validCount++;
        }
      }
      
      // 如果没有足够的有效数据，或者最高价等于最低价，使用前一个值
      const current = filledCloses[i];
      
      if (validCount === 0 || highestHigh === -Infinity || lowestLow === Infinity || 
          Math.abs(highestHigh - lowestLow) < 0.000001 || current === null) {
        k.push(lastK);
        d.push(lastD);
        j.push(3 * lastK - 2 * lastD);
        continue;
      }
      
      // 计算RSV
      const rsv = ((current - lowestLow) / (highestHigh - lowestLow)) * 100;
      
      // 计算K值
      const currentK = (2 / 3) * lastK + (1 / 3) * rsv;
      k.push(currentK);
      lastK = currentK;
      
      // 计算D值
      const currentD = (2 / 3) * lastD + (1 / 3) * currentK;
      d.push(currentD);
      lastD = currentD;
      
      // 计算J值
      const currentJ = 3 * currentK - 2 * currentD;
      j.push(currentJ);
    }
    
    return { k, d, j };
  } catch (error) {
    console.error('calculateKDJ错误:', error);
    const length = Math.min(highPrices.length, lowPrices.length, closePrices.length);
    return { 
      k: Array(length).fill(NaN), 
      d: Array(length).fill(NaN), 
      j: Array(length).fill(NaN) 
    };
  }
};

/**
 * 计算布林带指标
 */
export const calculateBollingerBands = (
  closePrices: number[],
  period: number = 20,
  multiplier: number = 2
): { upper: number[], middle: number[], lower: number[] } => {
  if (!closePrices || !Array.isArray(closePrices) || closePrices.length === 0) {
    console.warn('calculateBollingerBands: 无效的输入数据');
    return { upper: [], middle: [], lower: [] };
  }
  
  try {
    if (closePrices.length < period) {
      console.warn('calculateBollingerBands: 数据点不足');
      return { 
        upper: Array(closePrices.length).fill(NaN), 
        middle: Array(closePrices.length).fill(NaN), 
        lower: Array(closePrices.length).fill(NaN) 
      };
    }
    
    const middle: number[] = calculateSMA(closePrices, period);
    const upper: number[] = [];
    const lower: number[] = [];
    
    for (let i = 0; i < closePrices.length; i++) {
      if (i < period - 1 || isNaN(middle[i])) {
        upper.push(NaN);
        lower.push(NaN);
        continue;
      }
      
      let sum = 0;
      let validCount = 0;
      for (let j = i - period + 1; j <= i; j++) {
        if (closePrices[j] !== undefined && !isNaN(closePrices[j]) && !isNaN(middle[i])) {
          sum += Math.pow(closePrices[j] - middle[i], 2);
          validCount++;
        }
      }
      
      if (validCount === 0) {
        upper.push(NaN);
        lower.push(NaN);
        continue;
      }
      
      const stdDev = Math.sqrt(sum / validCount);
      upper.push(middle[i] + multiplier * stdDev);
      lower.push(middle[i] - multiplier * stdDev);
    }
    
    return { upper, middle, lower };
  } catch (error) {
    console.error('calculateBollingerBands错误:', error);
    return { 
      upper: Array(closePrices.length).fill(NaN), 
      middle: Array(closePrices.length).fill(NaN), 
      lower: Array(closePrices.length).fill(NaN) 
    };
  }
};

/**
 * 从K线数据提取收盘价
 */
export const extractClosePrices = (data: CandlestickData[]): number[] => {
  return data.map(item => item.close);
};

/**
 * 从K线数据提取最高价
 */
export const extractHighPrices = (data: CandlestickData[]): number[] => {
  return data.map(item => item.high);
};

/**
 * 从K线数据提取最低价
 */
export const extractLowPrices = (data: CandlestickData[]): number[] => {
  return data.map(item => item.low);
}; 