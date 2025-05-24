import React from 'react';
import { useSelector } from 'react-redux';
import { AppState, OrderBookEntry } from '../../store/types';
import { formatPrice, formatAmount } from '../../utils/helpers';
import './OrderBook.css';

const OrderBook: React.FC = () => {
  const orderBookData = useSelector((state: AppState) => state.orderBookData);
  const selectedPair = useSelector((state: AppState) => state.selectedPair);

  // 计算累计数量
  const calculateAccumulated = (entries: OrderBookEntry[], index: number, isAsk: boolean) => {
    if (isAsk) {
      return entries.slice(0, index + 1).reduce((acc, entry) => acc + entry.amount, 0);
    } else {
      return entries.slice(0, index + 1).reduce((acc, entry) => acc + entry.amount, 0);
    }
  };

  // 计算深度图宽度百分比
  const calculateDepthWidth = (entries: OrderBookEntry[], index: number, isAsk: boolean) => {
    if (entries.length === 0) return 0;
    
    const maxAmount = Math.max(...entries.map(entry => entry.amount));
    const percentage = (entries[index].amount / maxAmount) * 100;
    return `${percentage}%`;
  };

  return (
    <div className="order-book">
      <div className="order-book-header">
        <h3>订单簿 - {selectedPair}</h3>
      </div>
      
      <div className="order-book-content">
        <div className="order-book-labels">
          <span>价格</span>
          <span>数量</span>
          <span>累计</span>
        </div>
        
        {/* 卖单 */}
        <div className="order-book-asks">
          {orderBookData.asks.map((ask, index) => (
            <div key={`ask-${index}`} className="order-book-row ask">
              <div 
                className="depth-visualization ask-depth" 
                style={{ width: calculateDepthWidth(orderBookData.asks, index, true) }}
              ></div>
              <span className="price">{formatPrice(ask.price)}</span>
              <span className="amount">{formatAmount(ask.amount)}</span>
              <span className="accumulated">{formatAmount(calculateAccumulated(orderBookData.asks, index, true))}</span>
            </div>
          ))}
        </div>
        
        {/* 中间价格 */}
        <div className="order-book-middle">
          {orderBookData.asks.length > 0 && orderBookData.bids.length > 0 && (
            <div className="middle-price">
              <span>
                {formatPrice((orderBookData.asks[orderBookData.asks.length - 1].price + 
                  orderBookData.bids[0].price) / 2)}
              </span>
            </div>
          )}
        </div>
        
        {/* 买单 */}
        <div className="order-book-bids">
          {orderBookData.bids.map((bid, index) => (
            <div key={`bid-${index}`} className="order-book-row bid">
              <div 
                className="depth-visualization bid-depth" 
                style={{ width: calculateDepthWidth(orderBookData.bids, index, false) }}
              ></div>
              <span className="price">{formatPrice(bid.price)}</span>
              <span className="amount">{formatAmount(bid.amount)}</span>
              <span className="accumulated">{formatAmount(calculateAccumulated(orderBookData.bids, index, false))}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrderBook; 