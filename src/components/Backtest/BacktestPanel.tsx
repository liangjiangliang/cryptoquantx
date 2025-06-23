import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppState, BacktestResults } from '../../store/types';
import { startBacktest, finishBacktest, setSelectedPair, setTimeframe, setDateRange, clearBacktestResults } from '../../store/actions';
import { formatDate, formatPrice, formatPercentage } from '../../utils/helpers';
import { mockBacktestResults } from '../../data/mockData';
import './BacktestPanel.css';
import { Link, useLocation } from 'react-router-dom';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import FailedStrategiesModal, { FailedStrategy } from '../FailedStrategiesModal/FailedStrategiesModal';

// 导入与CandlestickChart相同的常量
import { COMMON_PAIRS, TIMEFRAMES } from '../../constants/trading';
import { runAllBacktests, fetchFailedStrategies, getYesterdayDateString } from '../../services/api';
import QuickTimeSelector from '../Chart/QuickTimeSelector';

// 策略接口定义
interface Strategy {
  name: string;
  description: string;
  params: string;
  available?: boolean;  // 添加available字段，表示策略是否可用
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

  // 使用useRef来保持最新的状态值，避免闭包问题
  const runningBatchBacktestRef = React.useRef(false);
  const [runningBatchBacktest, setRunningBatchBacktest] = useState<boolean>(false);
  
  // 当状态变化时更新ref
  useEffect(() => {
    runningBatchBacktestRef.current = runningBatchBacktest;
    // console.log('runningBatchBacktest状态更新:', runningBatchBacktest);
  }, [runningBatchBacktest]);
  const [batchStatusMessage, setBatchStatusMessage] = useState<string>('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [modalTitle, setModalTitle] = useState<string>('');
  const [modalMessage, setModalMessage] = useState<string>('');
  const [modalType, setModalType] = useState<'danger' | 'warning' | 'info'>('info');
  // 失败策略弹窗相关状态
  const [showFailedStrategiesModal, setShowFailedStrategiesModal] = useState(false);
  const [failedStrategies, setFailedStrategies] = useState<FailedStrategy[]>([]);
  const [loadingFailedStrategies, setLoadingFailedStrategies] = useState(false);

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
          // console.log('策略加载成功:', Object.keys(data.data));
          
          // 检查当前URL是否包含策略代码
          const urlParams = new URLSearchParams(window.location.search);
          const strategyFromUrl = urlParams.get('strategy');
          
          // 如果URL中有策略代码且该策略存在，则使用它
          if (strategyFromUrl && data.data[strategyFromUrl]) {
            console.log('使用URL中的策略:', strategyFromUrl);
            setStrategy(strategyFromUrl);
            // 清除可能存在的回测结果
            dispatch(clearBacktestResults());
          } 
          // 否则使用第一个策略作为默认值
          else if (Object.keys(data.data).length > 0) {
            const firstStrategy = Object.keys(data.data)[0];
            // console.log('使用第一个策略作为默认值:', firstStrategy);
            setStrategy(firstStrategy);
          }
        } else {
          throw new Error(data.message || '获取策略列表失败');
        }
      } catch (err) {
        console.error('获取策略列表失败:', err);
        const errorMessage = err instanceof Error ? err.message : '获取策略列表失败';
        setError(errorMessage);
        showErrorDialog('获取策略列表失败', errorMessage);

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
        } else {
          setStrategy(Object.keys(mockStrategies)[0]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStrategies();
  }, [dispatch]); // 移除strategy依赖，防止无限循环

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
      const formattedEndTime = `${dateRange.endDate} 00:00:00`;

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
          maximumLoss: data.data.maximumLoss, // 添加最大损失字段
          annualizedReturn: data.data.annualizedReturn, // 添加年化收益率字段
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
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      showErrorDialog('回测失败', `回测失败: ${errorMessage}`);
      dispatch(finishBacktest(null as any)); // 重置回测状态
    }
  };

  // 运行批量回测
  const runBatchBacktest = async () => {
    console.log('开始批量回测，当前状态:', { runningBatchBacktest, isBacktesting, loading, strategy });
    setRunningBatchBacktest(true);
    setBatchStatusMessage('批量回测运行中...'); // 添加初始状态消息

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
        // 批量回测完成后设置状态消息
        if (result.data && result.data.batch_backtest_id) {
          // 保存批次ID供后续使用
          (runAllBacktests as any).lastBatchId = result.data.batch_backtest_id;
          
          // 获取策略执行结果和统计数据
          const strategyResults = result.data.results || [];
          const totalStrategies = result.data.total_strategies || strategyResults.length || 0;
          const successfulBacktests = result.data.successful_backtests || 0;
          const failedBacktests = result.data.failed_backtests || (totalStrategies - successfulBacktests);
          const maxReturnStrategy = result.data.max_return_strategy || '-';
          const maxReturn = result.data.max_return || 0;

          // 构建成功消息
          const successMessage = `
<table class="batch-result-table">
  <tr><td>总结果</td><td>${totalStrategies}</td></tr>
  <tr><td>成功</td><td>${successfulBacktests}</td></tr>
  <tr><td>失败</td><td>${failedBacktests}</td></tr>
  <tr><td>平均收益率</td><td>${result.data.avg_return ? formatPercentage(result.data.avg_return * 100) : '0.00%'}</td></tr>
  <tr><td>最高收益率</td><td>${formatPercentage(maxReturn * 100)}</td></tr>
  <tr><td>最佳策略</td><td>${maxReturnStrategy}</td></tr>
</table>`;
            
            setBatchStatusMessage(successMessage);
            showStatusDialog('批量回测完成', successMessage, 'info', result.data.batch_backtest_id);
        } else {
          const successMessage = '批量回测完成';
          setBatchStatusMessage(successMessage);
          showStatusDialog('批量回测完成', successMessage, 'info');
        }
      } else {
        const errorMessage = `批量回测失败: ${result.message}`;
        setBatchStatusMessage(errorMessage);
        showErrorDialog('批量回测失败', errorMessage);
      }
    } catch (error) {
      console.error('批量回测出错:', error);
      const errorMessage = '批量回测出错，请稍后重试';
      setBatchStatusMessage(errorMessage);
      showErrorDialog('批量回测错误', errorMessage);
    } finally {
      console.log('批量回测完成，重置状态');
      // 直接重置状态，不使用setTimeout
      setRunningBatchBacktest(false);
      console.log('状态已重置，当前ref值:', runningBatchBacktestRef.current);
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
    const newDatePart = e.target.value;
    // 保留原有的时间部分，只更改日期部分
    const existingTimePart = dateRange.startDate.includes(' ') ? 
      dateRange.startDate.split(' ')[1] : '00:00:00';
    const newStartDate = `${newDatePart} ${existingTimePart}`;
    dispatch(setDateRange(newStartDate, dateRange.endDate));
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDatePart = e.target.value;
    // 保留原有的时间部分，只更改日期部分
    const existingTimePart = dateRange.endDate.includes(' ') ? 
      dateRange.endDate.split(' ')[1] : '23:59:59';
    const newEndDate = `${newDatePart} ${existingTimePart}`;
    dispatch(setDateRange(dateRange.startDate, newEndDate));
  };

  // 处理快捷时间选择
  const handleQuickTimeSelect = (startDate: string, endDate: string) => {
    dispatch(setDateRange(startDate, endDate));
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

  // 显示错误弹窗
  const showErrorDialog = (title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType('danger');
    setShowErrorModal(true);
  };

  // 显示状态弹窗
  const showStatusDialog = (title: string, message: string, type: 'danger' | 'warning' | 'info' = 'info', batchId?: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setShowStatusModal(true);
    
    // 如果有批次ID，保存到状态中
    if (batchId) {
      setBatchStatusMessage(prevMessage => prevMessage + `\n\n批次ID: ${batchId}`);
    }
  };

  // 显示失败策略列表
  const showFailedStrategiesList = async () => {
    setLoadingFailedStrategies(true);
    setShowFailedStrategiesModal(true);
    
    try {
      // 尝试从模态框消息中提取批次ID
      const batchIdMatch = modalMessage.match(/批次ID:\s*([^\s]+)/);
      let batchId = '';
      
      if (batchIdMatch && batchIdMatch[1]) {
        batchId = batchIdMatch[1];
      } else {
        // 如果模态框消息中没有批次ID，使用最近一次批量回测的批次ID
        batchId = (runAllBacktests as any).lastBatchId;
      }
      
      console.log('获取失败策略，批次ID:', batchId);
      
      // 如果有批次ID，从批量回测结果中获取失败策略
      if (batchId) {
        try {
          const url = `/api/api/backtest/ta4j/run-all-results?batch_backtest_id=${batchId}`;
          const response = await fetch(url);
          
          if (response.ok) {
            const data = await response.json();
            console.log('批量回测结果数据:', data);
            
            if (data.code === 200 && data.data && Array.isArray(data.data.results)) {
              // 从结果中筛选出失败的策略
              const failedStrategies = data.data.results.filter((strategy: any) => 
                strategy.success === false
              ).map((strategy: any) => ({
                strategy_code: strategy.strategy_code || 'Unknown',
                strategy_name: strategy.strategy_name || strategy.strategy_code || 'Unknown',
                error: strategy.error || '未知错误'
              }));
              
              console.log('筛选出的失败策略:', failedStrategies);
              setFailedStrategies(failedStrategies);
              return;
            }
          }
        } catch (error) {
          console.error('从批量回测结果获取失败策略失败:', error);
        }
      }
      
      // 如果上面的方法失败，使用原有的API
      const strategies = await fetchFailedStrategies(batchId);
      console.log('从API获取的失败策略列表:', strategies);
      setFailedStrategies(strategies);
    } catch (error) {
      console.error('获取失败策略失败:', error);
      setFailedStrategies([]);
    } finally {
      setLoadingFailedStrategies(false);
    }
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
            <QuickTimeSelector onTimeRangeSelect={handleQuickTimeSelect} />
            
            <div className="input-group">
              <label>开始日期</label>
              <input
                type="date"
                value={dateRange.startDate.split(' ')[0]}
                max={getYesterdayDateString()}
                onChange={handleStartDateChange}
              />
            </div>

            <div className="input-group">
              <label>结束日期</label>
              <input
                type="date"
                value={dateRange.endDate.split(' ')[0]}
                max={getYesterdayDateString()}
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
                <div className="error-message">策略加载失败，请刷新重试</div>
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
          </div>
        ) : (
          <div className="backtest-results">
            <div className="results-summary">
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
                <span className="label">年化收益率</span>
                <span className="value positive">{backtestResults.annualizedReturn ? (backtestResults.annualizedReturn * 100).toFixed(2) + '%' : '-'}</span>
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
                <span className="label">最大损失</span>
                <span className="value">{backtestResults.maximumLoss ? (backtestResults.maximumLoss * 100).toFixed(2) + '%' : '-'}</span>
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
      
      {/* 错误信息弹窗 */}
      <ConfirmModal
        isOpen={showErrorModal}
        onCancel={() => setShowErrorModal(false)}
        onConfirm={() => setShowErrorModal(false)}
        title={modalTitle}
        message={modalMessage}
        confirmText="确定"
        cancelText="取消"
        type={modalType}
      />
      
      {/* 状态信息弹窗 */}
      <ConfirmModal
        isOpen={showStatusModal}
        onCancel={() => setShowStatusModal(false)}
        onConfirm={() => {
          setShowStatusModal(false);
          // 如果是批量回测完成且包含批次ID，跳转到历史回测页面
          if (modalTitle.includes('批量回测完成')) {
            // 提取批次ID
            const batchIdMatch = modalMessage.match(/批次ID:\s*([^\s]+)/);
            if (batchIdMatch && batchIdMatch[1]) {
              const batchId = batchIdMatch[1];
              // 跳转到历史回测页面并传递batchId参数
              window.location.href = `/backtest-summaries?batch_backtest_id=${batchId}`;
            } else {
              // 从API返回中提取批次ID
              const batchIdFromAPI = (runAllBacktests as any).lastBatchId;
              if (batchIdFromAPI) {
                window.location.href = `/backtest-summaries?batch_backtest_id=${batchIdFromAPI}`;
              }
            }
          }
        }}
        title={modalTitle}
        message={modalMessage}
        confirmText={modalTitle.includes('批量回测完成') ? '确定' : '确定'}
        cancelText="关闭"
        type={modalType}
        // 添加查看明细按钮
        showDetailButton={modalTitle.includes('批量回测完成')}
        onViewDetail={() => {
          setShowStatusModal(false);
          // 提取批次ID
          const batchIdMatch = modalMessage.match(/批次ID:\s*([^\s]+)/);
          if (batchIdMatch && batchIdMatch[1]) {
            const batchId = batchIdMatch[1];
            // 跳转到历史回测页面并传递batchId参数
            window.location.href = `/backtest-summaries?batch_backtest_id=${batchId}`;
          } else {
            // 从API返回中提取批次ID
            const batchIdFromAPI = (runAllBacktests as any).lastBatchId;
            if (batchIdFromAPI) {
              window.location.href = `/backtest-summaries?batch_backtest_id=${batchIdFromAPI}`;
            }
          }
        }}
        detailButtonText="查看明细"
        // 添加失败策略按钮
        showFailedStrategiesButton={modalTitle.includes('批量回测完成')}
        onViewFailedStrategies={showFailedStrategiesList}
      />

      {/* 失败策略弹窗 */}
      <FailedStrategiesModal
        isOpen={showFailedStrategiesModal}
        onClose={() => setShowFailedStrategiesModal(false)}
        failedStrategies={failedStrategies}
        loading={loadingFailedStrategies}
      />
    </div>
  );
};

export default BacktestPanel;
