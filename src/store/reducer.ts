import { AppState } from './types';
import { ActionType } from './actions';
import { mockOrderBookData, mockTradeHistoryData, mockCryptoPairs } from '../data/mockData';
import { getDefaultStartDate, getDefaultEndDate } from '../constants/trading';

// 初始状态
const initialState: AppState = {
  selectedPair: 'BTC-USDT',
  timeframe: '1D',
  dateRange: {
    startDate: getDefaultStartDate(),
    endDate: getDefaultEndDate()
  },
  candlestickData: [], // 初始化为空数组，将通过API加载数据
  orderBookData: mockOrderBookData,
  tradeHistoryData: mockTradeHistoryData,
  cryptoPairs: mockCryptoPairs,
  userOrders: [],
  backtestResults: null,
  backtestSummaries: [],
  isBacktesting: false,
  balance: {
    USDT: 10000,
    BTC: 0.5,
    ETH: 5
  }
};

// Reducer
const reducer = (state = initialState, action: any): AppState => {
  switch (action.type) {
    case ActionType.SET_SELECTED_PAIR:
      return {
        ...state,
        selectedPair: action.payload
      };
    
    case ActionType.SET_TIMEFRAME:
      return {
        ...state,
        timeframe: action.payload
      };
    
    case ActionType.SET_DATE_RANGE:
      return {
        ...state,
        dateRange: action.payload
      };
    
    case ActionType.UPDATE_CANDLESTICK_DATA:
      return {
        ...state,
        candlestickData: action.payload
      };
    
    case ActionType.UPDATE_ORDER_BOOK:
      return {
        ...state,
        orderBookData: action.payload
      };
    
    case ActionType.UPDATE_TRADE_HISTORY:
      return {
        ...state,
        tradeHistoryData: action.payload
      };
    
    case ActionType.UPDATE_CRYPTO_PAIRS:
      return {
        ...state,
        cryptoPairs: action.payload
      };
    
    case ActionType.ADD_USER_ORDER:
      return {
        ...state,
        userOrders: [...state.userOrders, action.payload]
      };
    
    case ActionType.UPDATE_USER_ORDER:
      return {
        ...state,
        userOrders: state.userOrders.map(order => 
          order.id === action.payload.orderId 
            ? { ...order, ...action.payload.updates } 
            : order
        )
      };
    
    case ActionType.CANCEL_USER_ORDER:
      return {
        ...state,
        userOrders: state.userOrders.map(order => 
          order.id === action.payload 
            ? { ...order, status: 'canceled', updatedAt: Date.now() } 
            : order
        )
      };
    
    case ActionType.START_BACKTEST:
      return {
        ...state,
        isBacktesting: true,
        backtestResults: null
      };
    
    case ActionType.FINISH_BACKTEST:
      return {
        ...state,
        isBacktesting: false,
        backtestResults: action.payload
      };
    
    case ActionType.UPDATE_BALANCE:
      return {
        ...state,
        balance: {
          ...state.balance,
          ...action.payload
        }
      };
    
    case ActionType.SET_BACKTEST_SUMMARIES:
      return {
        ...state,
        backtestSummaries: action.payload
      };
    
    default:
      return state;
  }
};

export default reducer; 