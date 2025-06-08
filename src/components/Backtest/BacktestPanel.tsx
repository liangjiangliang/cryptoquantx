import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppState, BacktestResults } from '../../store/types';
import { startBacktest, finishBacktest, setSelectedPair, setTimeframe, setDateRange, clearBacktestResults } from '../../store/actions';
import { formatDate, formatPrice, formatPercentage } from '../../utils/helpers';
import { mockBacktestResults } from '../../data/mockData';
import './BacktestPanel.css';
import { Link, useLocation, useNavigate } from 'react-router-dom';

// 导入与CandlestickChart相同的常量
import { COMMON_PAIRS, TIMEFRAMES } from '../../constants/trading';
import { runAllBacktests } from '../../services/api';

// 策略接口定义
interface Strategy {
  name: string;
  description: string;
  params: string;
}

interface StrategiesResponse {
  code: number;
  data: {
    [key: string]: Strategy;
  };
  message: string;
}

// 每页显示的交易记录数量
const TRADES_PER_PAGE = 13;

const BacktestPanel: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selectedPair = useSelector((state: AppState) => state.selectedPair);
  const timeframe = useSelector((state: AppState) => state.timeframe);
  const isBacktesting = useSelector((state: AppState) => state.isBacktesting);
  const backtestResults = useSelector((state: AppState) => state.backtestResults);
  const dateRange = useSelector((state: AppState) => state.dateRange);

  const [initialCapital, setInitialCapital] = useState<string>('10000');
  const [feeRatio, setFeeRatio] = useState<string>('0.001'); // 默认手续费率0.1%
  const [strategy, setStrategy] = useState<string>('');
  const [strategies, setStrategies] = useState<{[key: string]: Strategy}>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 添加分页状态
  const [currentPage, setCurrentPage] = useState(1);

  const [runningBatchBacktest, setRunningBatchBacktest] = useState<boolean>(false);
  const [batchStatusMessage, setBatchStatusMessage] = useState<string>('');

  // 获取可用策略列表
  useEffect(() => {
    const fetchStrategies = async () => {
      setLoading(true);
      setError(null);
      try {
        // 使用相对路径，通过React开发服务器的代理转发请求
        const response = await fetch('/api/api/backtest/ta4j/strategies');
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data: StrategiesResponse = await response.json();
        if (data.code === 200 && data.data) {
          setStrategies(data.data);
          
          // 检查当前URL是否包含策略代码
          const urlParams = new URLSearchParams(window.location.search);
          const strategyFromUrl = urlParams.get('strategy');
          
          // 如果URL中有策略代码且该策略存在，则使用它
          if (strategyFromUrl && data.data[strategyFromUrl]) {
            setStrategy(strategyFromUrl);
            // 清除可能存在的回测结果
            dispatch(clearBacktestResults());
          } 
          // 否则使用第一个策略作为默认值
          else if (Object.keys(data.data).length > 0 && !strategy) {
            setStrategy(Object.keys(data.data)[0]);
          }
        } else {
          throw new Error(data.message || '获取策略列表失败');
        }
      } catch (err) {
        console.error('获取策略列表失败:', err);
        setError(err instanceof Error ? err.message : '获取策略列表失败');

        // 添加模拟数据，以防API不可用
        const mockStrategies: {[key: string]: Strategy} = {
          "SMA": {
            "name": "简单移动平均线策略",
            "description": "基于短期和长期移动平均线的交叉信号产生买卖信号",
            "params": "短期均线周期,长期均线周期 (例如：5,20)"
          },
          "MACD": {
            "name": "MACD策略",
            "description": "基于MACD线与信号线的交叉以及柱状图的变化产生买卖信号",
            "params": "短周期,长周期,信号周期 (例如：12,26,9)"
          },
          "RSI": {
            "name": "RSI相对强弱指标策略",
            "description": "基于RSI指标的超买超卖区域产生买卖信号",
            "params": "RSI周期,超卖阈值,超买阈值 (例如：14,30,70)"
          },
          "BOLLINGER": {
            "name": "布林带策略",
            "description": "基于价格突破布林带上下轨或回归中轨产生买卖信号",
            "params": "周期,标准差倍数 (例如：20,2.0)"
          }
        };
        setStrategies(mockStrategies);
        
        // 同样检查URL参数
        const urlParams = new URLSearchParams(window.location.search);
        const strategyFromUrl = urlParams.get('strategy');
        
        if (strategyFromUrl && mockStrategies[strategyFromUrl]) {
          setStrategy(strategyFromUrl);
          dispatch(clearBacktestResults());
        } else if (!strategy) {
          setStrategy(Object.keys(mockStrategies)[0]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStrategies();
  }, [strategy, dispatch]);

  // 监听setStrategy事件，接收从URL传递的策略代码
  useEffect(() => {
    const handleSetStrategy = (event: CustomEvent<{strategyCode: string}>) => {
      const { strategyCode } = event.detail;
      console.log('收到策略切换事件:', strategyCode, '当前可用策略:', Object.keys(strategies));
      
      if (strategyCode) {
        // 即使当前strategies中没有该策略，也先设置，后面strategies加载完成后会再次检查
        setStrategy(strategyCode);
        // 无论之前是否有回测结果，都清除它们以显示配置面板
        dispatch(clearBacktestResults());
      }
    };
    
    window.addEventListener('setStrategy', handleSetStrategy as EventListener);
    
    return () => {
      window.removeEventListener('setStrategy', handleSetStrategy as EventListener);
    };
  }, [dispatch]); // 移除strategies依赖，防止事件处理器频繁重建

  // 运行回测
  const runBacktest = async () => {
    dispatch(startBacktest());

    try {
      // 格式化开始和结束时间
      const formattedStartTime = `${dateRange.startDate} 00:00:00`;
      const formattedEndTime = `${dateRange.endDate} 23:59:59`;

      // 构建API URL，添加手续费参数
      const url = `/api/api/backtest/ta4j/run?startTime=${encodeURIComponent(formattedStartTime)}&endTime=${encodeURIComponent(formattedEndTime)}&initialAmount=${initialCapital}&strategyType=${strategy}&symbol=${selectedPair}&interval=${timeframe}&saveResult=True&feeRatio=${feeRatio}`;

      console.log('发送回测请求:', url);

      // 发送请求
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log('回测API返回数据:', data);

      if (data.code === 200 && data.data && data.data.success) {
        // 确保API返回的backtestId字段存在且被正确保存
        const backtestId = data.data.backtestId || Date.now().toString();
        console.log('获取到回测ID:', backtestId);
        
        // 转换API返回的数据为应用所需的格式
        const results: BacktestResults = {
          initialCapital: data.data.initialAmount,
          finalCapital: data.data.finalAmount,
          profit: data.data.totalProfit,
          profitPercentage: data.data.totalReturn,
          totalTrades: data.data.numberOfTrades,
          winningTrades: data.data.profitableTrades,
          losingTrades: data.data.unprofitableTrades,
          winRate: data.data.winRate * 100, // 转换为百分比
          maxDrawdown: data.data.maxDrawdown * 100, // 转换为百分比
          sharpeRatio: data.data.sharpeRatio,
          backtestId: backtestId, // 明确使用获取的backtestId
          trades: (data.data.trades || []).map((trade: any) => ({
            id: String(trade.index || Math.random()),
            entryTime: new Date(trade.entryTime).getTime() / 1000,
            entryPrice: trade.entryPrice,
            exitTime: trade.exitTime ? new Date(trade.exitTime).getTime() / 1000 : 0,
            exitPrice: trade.exitPrice || 0,
            side: trade.type === 'BUY' ? 'buy' : 'sell',
            amount: trade.entryAmount || 0,
            profit: trade.profit || 0,
            profitPercentage: trade.profitPercentage * 100 || 0 // 转换为百分比
          }))
        };

        dispatch(finishBacktest(results));
      } else {
        throw new Error(data.data?.errorMessage || data.message || '回测失败');
      }
    } catch (error) {
      console.error('回测失败:', error);
      alert(`回测失败: ${error instanceof Error ? error.message : '未知错误'}`);
      dispatch(finishBacktest(null as any)); // 重置回测状态
    }
  };

  // 运行批量回测
  const runBatchBacktest = async () => {
    setRunningBatchBacktest(true);
    setBatchStatusMessage('运行批量回测中...');

    try {
      // 使用与单个回测相同的参数
      const result = await runAllBacktests(
        selectedPair,
        timeframe,
        dateRange.startDate,
        dateRange.endDate,
        Number(initialCapital),
        Number(feeRatio)
      );

      if (result.success) {
        setBatchStatusMessage('批量回测完成!');
        // 如果创建成功且返回了批量回测ID，跳转到批量回测详情页面
        if (result.batchBacktestId) {
          setTimeout(() => {
            navigate(`/backtest-summaries?batch_backtest_id=${result.batchBacktestId}`);
          }, 1500);
        } else {
          setTimeout(() => {
            navigate('/backtest-summaries');
          }, 1500);
        }
      } else {
        setBatchStatusMessage(`批量回测失败: ${result.message}`);
      }
    } catch (error) {
      console.error('批量回测出错:', error);
      setBatchStatusMessage('批量回测出错，请稍后重试');
    } finally {
      setRunningBatchBacktest(false);
    }
  };

  // 处理时间周期变更
  const handleTimeframeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTimeframe = e.target.value as '1m' | '5m' | '15m' | '30m' | '1H' | '2H' | '4H' | '6H' | '12H' | '1D' | '1W' | '1M';
    
    // 更新Redux中的时间周期
    dispatch(setTimeframe(newTimeframe));
    
    // 触发自定义事件，通知K线图组件更新数据
    const event = new CustomEvent('timeframeChanged', {
      detail: { timeframe: newTimeframe }
    });
    window.dispatchEvent(event);
  };

  // 处理日期变更
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setDateRange(e.target.value, dateRange.endDate));
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setDateRange(dateRange.startDate, e.target.value));
  };

  // 计算总页数
  const getTotalPages = () => {
    if (!backtestResults || !backtestResults.trades) return 1;
    return Math.ceil(backtestResults.trades.length / TRADES_PER_PAGE);
  };

  // 获取当前页的交易记录
  const getCurrentPageTrades = () => {
    if (!backtestResults || !backtestResults.trades) return [];

    const startIndex = (currentPage - 1) * TRADES_PER_PAGE;
    const endIndex = startIndex + TRADES_PER_PAGE;

    return backtestResults.trades.slice(startIndex, endIndex);
  };

  // 处理页面变更
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // 清除回测结果时重置页码
  const handleClearResults = () => {
    setCurrentPage(1);
    dispatch(clearBacktestResults());
  };

  return (
    <div className="backtest-panel">
      <div className="backtest-panel-header">
        <h3>{selectedPair}</h3>
        <div className="backtest-info">
           <div className="info-row">
             <span className="info-item">
               <span className="info-label">策略:</span>
               <span className="info-value">{strategies[strategy]?.name || strategy || '未选择'}</span>
             </span>
             <span className="info-item">
               <span className="info-label">周期:</span>
               <span className="info-value">{timeframe}</span>
             </span>
           </div>
           <div className="info-row">
             <span className="info-item">
               <span className="info-label">时间:</span>
               <span className="info-value">{dateRange.startDate} ~ {dateRange.endDate}</span>
             </span>
           </div>
         </div>
      </div>

      <div className="backtest-panel-content">
        {!backtestResults ? (
          <div className="backtest-form">
            <div className="input-group">
              <label>开始日期</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={handleStartDateChange}
              />
            </div>

            <div className="input-group">
              <label>结束日期</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={handleEndDateChange}
              />
            </div>

            <div className="input-group">
              <label>初始资金 (USDT)</label>
              <input
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(e.target.value)}
                min="100"
                step="100"
              />
            </div>

            <div className="input-group">
              <label>手续费率</label>
              <input
                type="number"
                value={feeRatio}
                onChange={(e) => setFeeRatio(e.target.value)}
                min="0"
                max="0.01"
                step="0.0001"
                placeholder="例如：0.001 表示 0.1%"
              />
            </div>

            <div className="input-group">
              <label>交易策略</label>
              {loading ? (
                <div className="loading-strategies">加载策略中...</div>
              ) : error ? (
                <div className="error-message">{error}</div>
              ) : (
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                >
                  {Object.entries(strategies).map(([key, strategyData]) => (
                    <option key={key} value={key}>
                      {strategyData.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {strategy && strategies[strategy] && (
              <div className="strategy-description">
                <p>{strategies[strategy].description}</p>
                <p className="params-hint">参数: {strategies[strategy].params}</p>
              </div>
            )}

            <div className="input-group">
              <label>交易对</label>
              <select
                className="pair-selector"
                value={selectedPair}
                onChange={(e) => dispatch(setSelectedPair(e.target.value))}
              >
                {COMMON_PAIRS.map((pair: string) => (
                  <option key={pair} value={pair}>{pair}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>时间周期</label>
              <select
                className="timeframe-selector"
                value={timeframe}
                onChange={handleTimeframeChange}
              >
                {TIMEFRAMES.map((tf: {value: string, label: string}) => (
                  <option key={tf.value} value={tf.value}>{tf.label}</option>
                ))}
              </select>
            </div>

            <button
              className="run-backtest-button"
              onClick={runBacktest}
              disabled={isBacktesting || loading || !strategy || runningBatchBacktest}
            >
              {isBacktesting ? '运行中...' : '运行回测'}
            </button>
            
            <button
              className="run-batch-backtest-button"
              onClick={runBatchBacktest}
              disabled={runningBatchBacktest || isBacktesting || loading || !strategy}
            >
              {runningBatchBacktest ? '批量回测运行中...' : '运行批量回测'}
            </button>
            
            {batchStatusMessage && (
              <div className={`batch-status-message ${runningBatchBacktest ? 'loading' : ''}`}>
                {batchStatusMessage}
              </div>
            )}
          </div>
        ) : (
          <div className="backtest-results">
            <div className="results-summary">
              <div className="summary-item">
                <span className="label">初始资金</span>
                <span className="value">{(backtestResults.initialCapital/1000.0).toFixed(2)}K</span>
              </div>
              <div className="summary-item">
                <span className="label">最终资金</span>
                <span className="value">{(backtestResults.finalCapital / 1000.0).toFixed(2)}K </span>
              </div>
              <div className="summary-item">
                <span className="label">净利润</span>
                <span className={`value ${backtestResults.profit >= 0 ? 'positive' : 'negative'}`}>
                  {backtestResults.profit >= 0 ? '+' : ''}{(backtestResults.profit/ 1000.0).toFixed(2)}K
                </span>
              </div>
              <div className="summary-item">
                <span className="label">收益率</span>
                <span className={`value ${backtestResults.profitPercentage >= 0 ? 'positive' : 'negative'}`}>
                  {formatPercentage(backtestResults.profitPercentage *100)}
                </span>
              </div>
              <div className="summary-item">
                <span className="label">总交易次数</span>
                <span className="value">{backtestResults.totalTrades}</span>
              </div>
              <div className="summary-item">
                <span className="label">胜率</span>
                <span className="value">{backtestResults.winRate.toFixed(2)}%</span>
              </div>
              <div className="summary-item">
                <span className="label">最大回撤</span>
                <span className="value">{formatPercentage(backtestResults.maxDrawdown)}</span>
              </div>
              <div className="summary-item">
                <span className="label">夏普比率</span>
                <span className="value">{backtestResults.sharpeRatio.toFixed(2)}</span>
              </div>
            </div>

            <div className="trades-table">
              <div className="trades-table-header">
                <h4>交易记录</h4>
              </div>

              <div className="trades-table-container">
                <table>
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>类型</th>
                      <th>价格</th>
                      <th>金额</th>
                      <th>盈亏</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getCurrentPageTrades().map((trade) => (
                      <tr key={trade.id}>
                        <td>{formatDate(trade.entryTime)}</td>
                        <td className={trade.side}>{trade.side === 'buy' ? '买入' : '卖出'}</td>
                        <td>{formatPrice(trade.entryPrice)}</td>
                        <td>{trade.amount?.toFixed(2) || '0.0000'}</td>
                        <td className={trade.profit >= 0 ? 'positive' : 'negative'}>
                          {trade.profit >= 0 ? '+' : ''}{trade.profit?.toFixed(2) || '0.00'}
                          <span className="percentage">
                            ({formatPercentage(trade.profitPercentage || 0)})
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {backtestResults.trades.length > TRADES_PER_PAGE && (
                <div className="pagination bottom">
                  <button
                    className="pagination-button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    上一页
                  </button>
                  <span className="pagination-info">
                    {currentPage} / {getTotalPages()}
                  </span>
                  <button
                    className="pagination-button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === getTotalPages()}
                  >
                    下一页
                  </button>
                  
                  {backtestResults.backtestId && (
                    <Link 
                      to={`/backtest-detail/${backtestResults.backtestId}`}
                      className="detail-button"
                      style={{ marginLeft: '15px' }}
                    >
                      回测明细
                    </Link>
                  )}

                  <button
                    className="reset-backtest-button"
                    onClick={handleClearResults}
                  >
                    重新设置
                  </button>
                </div>
              )}

              {backtestResults.trades.length <= TRADES_PER_PAGE && (
                <div className="pagination bottom">
                  {backtestResults.backtestId && (
                    <Link 
                      to={`/backtest-detail/${backtestResults.backtestId}`}
                      className="detail-button"
                      style={{ marginRight: '15px' }}
                    >
                      回测明细
                    </Link>
                  )}
                  <button
                    className="reset-backtest-button"
                    onClick={handleClearResults}
                  >
                    重新设置
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BacktestPanel;
