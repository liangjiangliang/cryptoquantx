import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from '../../store/types';
import { formatPrice, formatAmount, formatTime } from '../../utils/helpers';
import './TradeHistory.css';

const TradeHistory: React.FC = () => {
  const tradeHistoryData = useSelector((state: AppState) => state.tradeHistoryData);
  const selectedPair = useSelector((state: AppState) => state.selectedPair);

  return (
    <div className="trade-history">
      <div className="trade-history-header">
        <h3>最近成交 - {selectedPair}</h3>
      </div>
      
      <div className="trade-history-content">
        <div className="trade-history-labels">
          <span>价格</span>
          <span>数量</span>
          <span>时间</span>
        </div>
        
        <div className="trade-history-list">
          {tradeHistoryData.map((trade) => (
            <div key={trade.id} className={`trade-history-row ${trade.side}`}>
              <span className="price">{formatPrice(trade.price)}</span>
              <span className="amount">{formatAmount(trade.amount)}</span>
              <span className="time">{formatTime(trade.time)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TradeHistory; 