import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../../store/types';
import { addUserOrder, updateBalance } from '../../store/actions';
import { formatAmount, generateId } from '../../utils/helpers';
import './TradingPanel.css';

const TradingPanel: React.FC = () => {
  const dispatch = useDispatch();
  const selectedPair = useSelector((state: AppState) => state.selectedPair);
  const orderBookData = useSelector((state: AppState) => state.orderBookData);
  const balance = useSelector((state: AppState) => state.balance);
  
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [total, setTotal] = useState('');
  const [sliderValue, setSliderValue] = useState(0);

  // 获取当前交易对的基础货币和计价货币
  const [baseCurrency, quoteCurrency] = selectedPair.split('/');

  // 获取当前最佳买卖价格
  const bestAskPrice = orderBookData.asks.length > 0 ? orderBookData.asks[0].price : 0;
  const bestBidPrice = orderBookData.bids.length > 0 ? orderBookData.bids[0].price : 0;

  // 处理价格变化
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPrice = e.target.value;
    setPrice(newPrice);
    
    if (newPrice && amount) {
      const calculatedTotal = parseFloat(newPrice) * parseFloat(amount);
      setTotal(calculatedTotal.toFixed(2));
    } else {
      setTotal('');
    }
  };

  // 处理数量变化
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = e.target.value;
    setAmount(newAmount);
    
    if (price && newAmount) {
      const calculatedTotal = parseFloat(price) * parseFloat(newAmount);
      setTotal(calculatedTotal.toFixed(2));
    } else {
      setTotal('');
    }
  };

  // 处理总额变化
  const handleTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTotal = e.target.value;
    setTotal(newTotal);
    
    if (price && newTotal) {
      const calculatedAmount = parseFloat(newTotal) / parseFloat(price);
      setAmount(calculatedAmount.toFixed(8));
    } else {
      setAmount('');
    }
  };

  // 处理滑块变化
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setSliderValue(value);
    
    // 计算可用余额的百分比
    const availableBalance = side === 'buy' 
      ? balance[quoteCurrency as keyof typeof balance] 
      : balance[baseCurrency as keyof typeof balance];
    
    if (side === 'buy') {
      const newTotal = (availableBalance * value / 100).toFixed(2);
      setTotal(newTotal);
      
      if (price) {
        const calculatedAmount = parseFloat(newTotal) / parseFloat(price);
        setAmount(calculatedAmount.toFixed(8));
      }
    } else {
      const newAmount = (availableBalance * value / 100).toFixed(8);
      setAmount(newAmount);
      
      if (price) {
        const calculatedTotal = parseFloat(price) * parseFloat(newAmount);
        setTotal(calculatedTotal.toFixed(2));
      }
    }
  };

  // 处理下单
  const handlePlaceOrder = () => {
    if (!price || !amount || !total) return;
    
    const priceValue = parseFloat(price);
    const amountValue = parseFloat(amount);
    const totalValue = parseFloat(total);
    
    // 检查余额是否足够
    if (side === 'buy' && totalValue > balance[quoteCurrency as keyof typeof balance]) {
      alert(`余额不足: 需要 ${totalValue} ${quoteCurrency}, 但只有 ${balance[quoteCurrency as keyof typeof balance]} ${quoteCurrency}`);
      return;
    }
    
    if (side === 'sell' && amountValue > balance[baseCurrency as keyof typeof balance]) {
      alert(`余额不足: 需要 ${amountValue} ${baseCurrency}, 但只有 ${balance[baseCurrency as keyof typeof balance]} ${baseCurrency}`);
      return;
    }
    
    // 创建订单
    const order = {
      id: generateId(),
      symbol: selectedPair,
      type: orderType,
      side,
      price: priceValue,
      amount: amountValue,
      total: totalValue,
      status: 'pending' as 'pending' | 'filled' | 'canceled',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // 更新余额
    const newBalance = { ...balance };
    if (side === 'buy') {
      newBalance[quoteCurrency as keyof typeof balance] -= totalValue;
      // 如果是市价单，立即更新余额
      if (orderType === 'market') {
        newBalance[baseCurrency as keyof typeof balance] += amountValue;
      }
    } else {
      newBalance[baseCurrency as keyof typeof balance] -= amountValue;
      // 如果是市价单，立即更新余额
      if (orderType === 'market') {
        newBalance[quoteCurrency as keyof typeof balance] += totalValue;
      }
    }
    
    // 分发动作
    dispatch(addUserOrder(order));
    dispatch(updateBalance(newBalance));
    
    // 重置表单
    setPrice('');
    setAmount('');
    setTotal('');
    setSliderValue(0);
    
    alert(`${side === 'buy' ? '买入' : '卖出'}订单已提交`);
  };

  return (
    <div className="trading-panel">
      <div className="trading-panel-header">
        <h3>交易 - {selectedPair}</h3>
      </div>
      
      <div className="trading-panel-content">
        {/* 订单类型选择 */}
        <div className="order-type-selector">
          <button
            className={`order-type-button ${orderType === 'limit' ? 'active' : ''}`}
            onClick={() => setOrderType('limit')}
          >
            限价单
          </button>
          <button
            className={`order-type-button ${orderType === 'market' ? 'active' : ''}`}
            onClick={() => setOrderType('market')}
          >
            市价单
          </button>
        </div>
        
        {/* 买卖方向选择 */}
        <div className="order-side-selector">
          <button
            className={`order-side-button buy ${side === 'buy' ? 'active' : ''}`}
            onClick={() => setSide('buy')}
          >
            买入 {baseCurrency}
          </button>
          <button
            className={`order-side-button sell ${side === 'sell' ? 'active' : ''}`}
            onClick={() => setSide('sell')}
          >
            卖出 {baseCurrency}
          </button>
        </div>
        
        {/* 价格输入 */}
        {orderType === 'limit' && (
          <div className="input-group">
            <label>价格 ({quoteCurrency})</label>
            <div className="input-with-buttons">
              <button onClick={() => setPrice(bestBidPrice.toString())}>最佳买价</button>
              <input
                type="number"
                value={price}
                onChange={handlePriceChange}
                placeholder={`输入${quoteCurrency}价格`}
                min="0"
                step="0.01"
              />
              <button onClick={() => setPrice(bestAskPrice.toString())}>最佳卖价</button>
            </div>
          </div>
        )}
        
        {/* 数量输入 */}
        <div className="input-group">
          <label>数量 ({baseCurrency})</label>
          <input
            type="number"
            value={amount}
            onChange={handleAmountChange}
            placeholder={`输入${baseCurrency}数量`}
            min="0"
            step="0.00000001"
          />
        </div>
        
        {/* 总额输入 */}
        <div className="input-group">
          <label>总额 ({quoteCurrency})</label>
          <input
            type="number"
            value={total}
            onChange={handleTotalChange}
            placeholder={`输入${quoteCurrency}总额`}
            min="0"
            step="0.01"
          />
        </div>
        
        {/* 百分比滑块 */}
        <div className="slider-group">
          <input
            type="range"
            min="0"
            max="100"
            value={sliderValue}
            onChange={handleSliderChange}
            className="percentage-slider"
          />
          <div className="slider-labels">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>
        
        {/* 可用余额 */}
        <div className="balance-info">
          <span>可用 {side === 'buy' ? quoteCurrency : baseCurrency}:</span>
          <span>{formatAmount(side === 'buy' ? balance[quoteCurrency as keyof typeof balance] : balance[baseCurrency as keyof typeof balance])}</span>
        </div>
        
        {/* 下单按钮 */}
        <button
          className={`place-order-button ${side}`}
          onClick={handlePlaceOrder}
          disabled={!((orderType === 'limit' && price && amount && total) || (orderType === 'market' && amount && total))}
        >
          {side === 'buy' ? '买入' : '卖出'} {baseCurrency}
        </button>
      </div>
    </div>
  );
};

export default TradingPanel; 