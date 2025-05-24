import { 
  CandlestickData, 
  OrderBookData, 
  TradeHistoryEntry, 
  CryptoPair, 
  UserOrder,
  BacktestResults
} from './types';

// Action 类型
export enum ActionType {
  SET_SELECTED_PAIR = 'SET_SELECTED_PAIR',
  SET_TIMEFRAME = 'SET_TIMEFRAME',
  SET_DATE_RANGE = 'SET_DATE_RANGE',
  UPDATE_CANDLESTICK_DATA = 'UPDATE_CANDLESTICK_DATA',
  UPDATE_ORDER_BOOK = 'UPDATE_ORDER_BOOK',
  UPDATE_TRADE_HISTORY = 'UPDATE_TRADE_HISTORY',
  UPDATE_CRYPTO_PAIRS = 'UPDATE_CRYPTO_PAIRS',
  ADD_USER_ORDER = 'ADD_USER_ORDER',
  UPDATE_USER_ORDER = 'UPDATE_USER_ORDER',
  CANCEL_USER_ORDER = 'CANCEL_USER_ORDER',
  START_BACKTEST = 'START_BACKTEST',
  FINISH_BACKTEST = 'FINISH_BACKTEST',
  UPDATE_BALANCE = 'UPDATE_BALANCE',
}

// Action 创建函数
export const setSelectedPair = (pair: string) => ({
  type: ActionType.SET_SELECTED_PAIR,
  payload: pair
});

export const setTimeframe = (timeframe: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w') => ({
  type: ActionType.SET_TIMEFRAME,
  payload: timeframe
});

export const setDateRange = (startDate: string, endDate: string) => ({
  type: ActionType.SET_DATE_RANGE,
  payload: { startDate, endDate }
});

export const updateCandlestickData = (data: CandlestickData[]) => ({
  type: ActionType.UPDATE_CANDLESTICK_DATA,
  payload: data
});

export const updateOrderBook = (data: OrderBookData) => ({
  type: ActionType.UPDATE_ORDER_BOOK,
  payload: data
});

export const updateTradeHistory = (data: TradeHistoryEntry[]) => ({
  type: ActionType.UPDATE_TRADE_HISTORY,
  payload: data
});

export const updateCryptoPairs = (pairs: CryptoPair[]) => ({
  type: ActionType.UPDATE_CRYPTO_PAIRS,
  payload: pairs
});

export const addUserOrder = (order: UserOrder) => ({
  type: ActionType.ADD_USER_ORDER,
  payload: order
});

export const updateUserOrder = (orderId: string, updates: Partial<UserOrder>) => ({
  type: ActionType.UPDATE_USER_ORDER,
  payload: { orderId, updates }
});

export const cancelUserOrder = (orderId: string) => ({
  type: ActionType.CANCEL_USER_ORDER,
  payload: orderId
});

export const startBacktest = () => ({
  type: ActionType.START_BACKTEST
});

export const finishBacktest = (results: BacktestResults) => ({
  type: ActionType.FINISH_BACKTEST,
  payload: results
});

export const updateBalance = (balance: { [key: string]: number }) => ({
  type: ActionType.UPDATE_BALANCE,
  payload: balance
}); 