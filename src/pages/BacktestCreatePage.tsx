import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchBacktestStrategies, createBacktest, getDefaultDateRange, getYesterdayDateString } from '../services/api';
import { Strategy } from '../types/strategy';
import './BacktestCreatePage.css';

const BacktestCreatePage: React.FC = () => {
  const { strategyCode } = useParams<{ strategyCode: string }>();
  const navigate = useNavigate();
  
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formParams, setFormParams] = useState<{[key: string]: any}>({});
  const [creatingBacktest, setCreatingBacktest] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // 回测配置
  const [symbol, setSymbol] = useState<string>('BTC-USDT');
  const [interval, setInterval] = useState<string>('1D');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [initialAmount, setInitialAmount] = useState<number>(10000);

  // 设置默认日期范围（使用统一的默认时间范围）
  useEffect(() => {
    const defaultRange = getDefaultDateRange();
    // 只取日期部分用于UI显示
    setStartDate(defaultRange.startDate.split(' ')[0]);
    setEndDate(defaultRange.endDate.split(' ')[0]);
  }, []);

  // 加载策略详情
  useEffect(() => {
    const loadStrategy = async () => {
      if (!strategyCode) {
        setError('未提供策略代码');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const response = await fetchBacktestStrategies();
        
        if (response && response.data && response.data[strategyCode]) {
          const strategyData = response.data[strategyCode];
          setStrategy(strategyData);
          
          // 设置默认参数
          try {
            // 检查default_params是否为undefined或空字符串
            const defaultParamsStr = strategyData.default_params;
            if (!defaultParamsStr) {
              setFormParams({});
            } else {
              const defaultParams = JSON.parse(defaultParamsStr);
              setFormParams(defaultParams);
            }
          } catch (err) {
            console.error('解析默认参数失败:', err);
            setFormParams({});
          }
        } else {
          setError(`未找到策略: ${strategyCode}`);
        }
      } catch (err) {
        setError('加载策略详情失败，请稍后重试');
        console.error('加载策略详情失败:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadStrategy();
  }, [strategyCode]);

  // 解析JSON字符串为对象
  const parseJsonString = (jsonString: string): any => {
    try {
      // 检查jsonString是否为undefined或空字符串
      if (!jsonString) {
        return {};
      }
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('解析JSON失败:', error);
      return {};
    }
  };

  // 处理表单参数变化
  const handleParamChange = (key: string, value: string) => {
    setFormParams(prev => ({
      ...prev,
      [key]: isNaN(Number(value)) ? value : Number(value)
    }));
  };

  // 处理创建回测
  const handleCreateBacktest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!strategyCode) {
      setStatusMessage('策略代码无效');
      return;
    }
    
    if (!startDate || !endDate) {
      setStatusMessage('请设置开始和结束日期');
      return;
    }
    
    setCreatingBacktest(true);
    setStatusMessage('创建回测中...');
    
    try {
      const result = await createBacktest(
        symbol,
        interval,
        strategyCode,
        formParams,
        startDate,
        endDate,
        initialAmount
      );
      
      if (result.success) {
        setStatusMessage('回测创建成功!');
        // 如果创建成功，跳转到回测汇总页面
        setTimeout(() => {
          navigate('/backtest-summaries');
        }, 1500);
      } else {
        setStatusMessage(`创建失败: ${result.message}`);
      }
    } catch (error) {
      console.error('创建回测出错:', error);
      setStatusMessage('创建回测出错，请稍后重试');
    } finally {
      setCreatingBacktest(false);
    }
  };

  // 返回回测工厂页面
  const handleGoBack = () => {
    navigate('/backtest-factory');
  };

  if (loading) {
    return <div className="loading-container">加载策略详情中...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button className="back-btn" onClick={handleGoBack}>返回策略列表</button>
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="error-container">
        <div className="error-message">策略数据不可用</div>
        <button className="back-btn" onClick={handleGoBack}>返回策略列表</button>
      </div>
    );
  }

  const params = parseJsonString(strategy.params);

  return (
    <div className="backtest-create-page">
      <div className="page-header">
        <button className="back-btn" onClick={handleGoBack}>
          ← 返回策略列表
        </button>
        <h1>{strategy.name}</h1>
        <p className="strategy-code">{strategyCode}</p>
      </div>
      
      <div className="strategy-info">
        <div className="info-item">
          <span className="label">策略分类:</span>
          <span className="value">{strategy.category}</span>
        </div>
        <div className="info-item">
          <span className="label">策略描述:</span>
          <span className="value">{strategy.description}</span>
        </div>
      </div>
      
      <div className="create-form-container">
        <h2>创建新回测</h2>
        
        <form className="create-form" onSubmit={handleCreateBacktest}>
          <div className="form-section">
            <h3>回测配置</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="symbol">交易对:</label>
                <select 
                  id="symbol" 
                  value={symbol} 
                  onChange={(e) => setSymbol(e.target.value)}
                >
                  <option value="BTC-USDT">BTC-USDT</option>
                  <option value="ETH-USDT">ETH-USDT</option>
                  <option value="BNB-USDT">BNB-USDT</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="interval">K线周期:</label>
                <select 
                  id="interval" 
                  value={interval} 
                  onChange={(e) => setInterval(e.target.value)}
                >
                  <option value="1m">1分钟</option>
                  <option value="5m">5分钟</option>
                  <option value="15m">15分钟</option>
                  <option value="30m">30分钟</option>
                  <option value="1h">1小时</option>
                  <option value="4h">4小时</option>
                  <option value="1D">日线</option>
                  <option value="1W">周线</option>
                </select>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startDate">开始日期:</label>
                <input 
                  type="date" 
                  id="startDate" 
                  value={startDate} 
                  max={getYesterdayDateString()}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="endDate">结束日期:</label>
                <input 
                  type="date" 
                  id="endDate" 
                  value={endDate}
                  max={getYesterdayDateString()}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="initialAmount">初始资金:</label>
                <input 
                  type="number" 
                  id="initialAmount" 
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(Number(e.target.value))}
                  min="1000"
                />
              </div>
            </div>
          </div>
          
          <div className="form-section">
            <h3>策略参数</h3>
            
            <div className="strategy-params-grid">
              {Object.entries(params).map(([key, description]) => (
                <div key={key} className="form-group">
                  <label htmlFor={key}>{String(description)}:</label>
                  <input 
                    type="number" 
                    id={key} 
                    name={key} 
                    value={formParams[key] || ''} 
                    onChange={(e) => handleParamChange(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
          
          {statusMessage && (
            <div className={`status-message ${creatingBacktest ? 'loading' : ''}`}>
              {statusMessage}
            </div>
          )}
          
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-btn"
              onClick={handleGoBack}
              disabled={creatingBacktest}
            >
              取消
            </button>
            
            <button 
              type="submit" 
              className="create-btn"
              disabled={creatingBacktest}
            >
              {creatingBacktest ? '创建中...' : '创建回测'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BacktestCreatePage; 