// 模拟K线数据
export const mockCandlestickData = Array.from({ length: 100 }, (_, i) => {
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

// 模拟订单簿数据
export const mockOrderBookData = {
  asks: Array.from({ length: 10 }, (_, i) => ({
    price: 32000 + i * 50,
    amount: Math.random() * 2 + 0.1
  })),
  bids: Array.from({ length: 10 }, (_, i) => ({
    price: 31950 - i * 50,
    amount: Math.random() * 2 + 0.1
  }))
};

// 模拟交易历史数据
export const mockTradeHistoryData = Array.from({ length: 20 }, (_, i) => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - i * 5);
  
  return {
    id: `trade-${i}`,
    time: date.getTime(),
    price: 31000 + Math.random() * 2000,
    amount: Math.random() * 2 + 0.01,
    side: Math.random() > 0.5 ? 'buy' : 'sell' as 'buy' | 'sell'
  };
});

// 模拟加密货币列表
export const mockCryptoPairs = [
  { symbol: 'BTC/USDT', name: 'Bitcoin', price: 31245.67, change: 2.35 },
  { symbol: 'ETH/USDT', name: 'Ethereum', price: 1845.23, change: -1.24 },
  { symbol: 'BNB/USDT', name: 'Binance Coin', price: 312.45, change: 0.75 },
  { symbol: 'SOL/USDT', name: 'Solana', price: 98.76, change: 5.43 },
  { symbol: 'ADA/USDT', name: 'Cardano', price: 0.45, change: -0.32 },
  { symbol: 'XRP/USDT', name: 'Ripple', price: 0.56, change: 1.23 },
  { symbol: 'DOT/USDT', name: 'Polkadot', price: 6.78, change: 3.21 },
  { symbol: 'DOGE/USDT', name: 'Dogecoin', price: 0.087, change: -2.34 },
];

// 模拟回测结果数据
export const mockBacktestResults = {
  initialCapital: 10000,
  finalCapital: 14350,
  profit: 4350,
  profitPercentage: 43.5,
  totalTrades: 124,
  winningTrades: 78,
  losingTrades: 46,
  winRate: 62.9,
  maxDrawdown: 12.4,
  sharpeRatio: 1.8,
  trades: Array.from({ length: 20 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 40 + i * 2);
    
    const isWin = Math.random() > 0.4;
    const entryPrice = 30000 + Math.random() * 3000;
    const exitPrice = isWin 
      ? entryPrice * (1 + Math.random() * 0.1) 
      : entryPrice * (1 - Math.random() * 0.05);
    
    return {
      id: `trade-${i}`,
      entryTime: date.getTime(),
      entryPrice,
      exitTime: date.getTime() + 86400000, // 一天后
      exitPrice,
      side: Math.random() > 0.5 ? 'buy' : 'sell' as 'buy' | 'sell',
      amount: Math.random() * 1 + 0.1,
      profit: isWin ? Math.random() * 500 + 50 : -Math.random() * 250 - 50,
      profitPercentage: isWin ? Math.random() * 10 + 1 : -Math.random() * 5 - 1
    };
  })
}; 