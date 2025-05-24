// 蜡烛图数据类型
export interface CandlestickData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// 订单簿数据类型
export interface OrderBookEntry {
  price: number;
  amount: number;
}

export interface OrderBookData {
  asks: OrderBookEntry[];
  bids: OrderBookEntry[];
}

// 交易历史数据类型
export interface TradeHistoryEntry {
  id: string;
  time: number;
  price: number;
  amount: number;
  side: 'buy' | 'sell';
}

// 加密货币对类型
export interface CryptoPair {
  symbol: string;
  name: string;
  price: number;
  change: number;
}

// 回测交易类型
export interface BacktestTrade {
  id: string;
  entryTime: number;
  entryPrice: number;
  exitTime: number;
  exitPrice: number;
  side: 'buy' | 'sell';
  amount: number;
  profit: number;
  profitPercentage: number;
}

// 回测结果类型
export interface BacktestResults {
  initialCapital: number;
  finalCapital: number;
  profit: number;
  profitPercentage: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
  trades: BacktestTrade[];
}

// 用户订单类型
export interface UserOrder {
  id: string;
  symbol: string;
  type: 'market' | 'limit';
  side: 'buy' | 'sell';
  price: number;
  amount: number;
  total: number;
  status: 'pending' | 'filled' | 'canceled';
  createdAt: number;
  updatedAt: number;
}

// 日期范围类型
export interface DateRange {
  startDate: string;
  endDate: string;
}

// 应用状态类型
export interface AppState {
  selectedPair: string;
  timeframe: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';
  dateRange: DateRange;
  candlestickData: CandlestickData[];
  orderBookData: OrderBookData;
  tradeHistoryData: TradeHistoryEntry[];
  cryptoPairs: CryptoPair[];
  userOrders: UserOrder[];
  backtestResults: BacktestResults | null;
  isBacktesting: boolean;
  balance: {
    USDT: number;
    BTC: number;
    ETH: number;
  };
} 