import { Time } from 'lightweight-charts';

// 回测交易记录类型
export interface BacktestTrade {
  id: string | number;
  side: 'buy' | 'sell';
  entryTime: Time | number;
  entryPrice: number;
  exitTime?: Time | number;
  exitPrice?: number;
  profit: number;
  quantity: number;
  fee?: number;
  status: 'open' | 'closed';
}

// 回测结果类型
export interface BacktestResult {
  trades: BacktestTrade[];
  totalProfit: number;
  winRate: number;
  profitFactor?: number;
  maxDrawdown?: number;
  sharpeRatio?: number;
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  startTime?: number;
  endTime?: number;
} 