import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setSelectedPair } from '../../store/actions';
import { AppState, CryptoPair } from '../../store/types';
import { formatPercentage } from '../../utils/helpers';
import './PairSelector.css';

const PairSelector: React.FC = () => {
  const dispatch = useDispatch();
  const cryptoPairs = useSelector((state: AppState) => state.cryptoPairs);
  const selectedPair = useSelector((state: AppState) => state.selectedPair);
  const [searchTerm, setSearchTerm] = useState('');

  const handlePairChange = (pair: string) => {
    dispatch(setSelectedPair(pair));
  };

  const filteredPairs = cryptoPairs.filter(pair => 
    pair.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
    pair.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pair-selector">
      <div className="pair-search">
        <input
          type="text"
          placeholder="搜索交易对..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="pair-list">
        <div className="pair-list-header">
          <span className="pair-name">交易对</span>
          <span className="pair-price">最新价格</span>
          <span className="pair-change">24h涨跌</span>
        </div>
        {filteredPairs.map((pair: CryptoPair) => (
          <div
            key={pair.symbol}
            className={`pair-item ${selectedPair === pair.symbol ? 'selected' : ''}`}
            onClick={() => handlePairChange(pair.symbol)}
          >
            <span className="pair-name">{pair.symbol}</span>
            <span className="pair-price">{pair.price.toFixed(2)}</span>
            <span className={`pair-change ${pair.change >= 0 ? 'positive' : 'negative'}`}>
              {formatPercentage(pair.change)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PairSelector; 