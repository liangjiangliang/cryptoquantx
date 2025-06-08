import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { AppState, BacktestSummary } from '../../store/types';
import { setBacktestSummaries } from '../../store/actions';
import { fetchBacktestSummaries } from '../../services/api';
import { formatDate, formatPercentage } from '../../utils/helpers';
import './BacktestSummaries.css';

const BacktestSummaries: React.FC = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const backtestSummaries = useSelector((state: AppState) => state.backtestSummaries);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchBacktestId, setBatchBacktestId] = useState<string>('');
  const [showBatchInput, setShowBatchInput] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'all' | 'batch'>('all');
  const [filteredSummaries, setFilteredSummaries] = useState<BacktestSummary[]>([]);
  const [sortField, setSortField] = useState<string>('totalReturn');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // 从URL和sessionStorage获取批次ID和回测ID列表
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const batchId = queryParams.get('batchId');
    
    if (batchId) {
      setBatchBacktestId(batchId);
      setViewMode('batch');
      
      // 获取存储在sessionStorage中的回测ID列表
      const backtestIdsJson = sessionStorage.getItem('backtestIds');
      if (backtestIdsJson) {
        try {
          const backtestIds = JSON.parse(backtestIdsJson);
          // 如果有回测ID列表，使用它来获取批量回测数据
          handleFetchBatchBacktests(batchId, backtestIds);
        } catch (err) {
          console.error('解析回测ID列表失败:', err);
          // 如果解析失败，正常加载全部回测数据
          handleRefresh();
        }
      } else {
        // 如果没有回测ID列表，使用批次ID获取数据
        handleFetchBatchBacktests(batchId);
      }
    } else {
      // 没有批次ID参数，加载所有回测数据
      handleRefresh();
    }
  }, [location.search]);

  // 当backtestSummaries变化时，根据当前视图模式和排序设置过滤和排序数据
  useEffect(() => {
    let summaries = [...backtestSummaries];
    
    // 按选定字段排序
    summaries.sort((a, b) => {
      if (sortField === 'totalReturn' || sortField === 'sharpeRatio') {
        const aValue = a[sortField as keyof BacktestSummary] as number || 0;
        const bValue = b[sortField as keyof BacktestSummary] as number || 0;
        return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
      } else if (sortField === 'createTime') {
        return sortDirection === 'desc' 
          ? new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
          : new Date(a.createTime).getTime() - new Date(b.createTime).getTime();
      }
      return 0;
    });
    
    setFilteredSummaries(summaries);
  }, [backtestSummaries, sortField, sortDirection]);

  // 处理刷新按钮点击
  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    setViewMode('all');
    
    try {
      const summaries = await fetchBacktestSummaries();
      dispatch(setBacktestSummaries(summaries));
    } catch (err) {
      setError('获取回测汇总数据失败');
      console.error('获取回测汇总数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 处理批量回测按钮点击
  const handleToggleBatchInput = () => {
    setShowBatchInput(!showBatchInput);
  };

  // 处理批量回测ID输入
  const handleBatchIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBatchBacktestId(e.target.value);
  };

  // 处理批量回测查询
  const handleSubmitBatchId = async () => {
    if (!batchBacktestId.trim()) {
      setError('请输入批次ID');
      return;
    }
    
    await handleFetchBatchBacktests(batchBacktestId);
  };

  // 获取批量回测数据
  const handleFetchBatchBacktests = async (batchId: string, backtestIds?: string[]) => {
    setLoading(true);
    setError(null);
    setViewMode('batch');
    
    try {
      let summaries;
      if (backtestIds && backtestIds.length > 0) {
        // 如果有回测ID列表，查询所有回测数据然后过滤
        const allSummaries = await fetchBacktestSummaries();
        // 通过backtestId字段过滤，而不是id字段
        summaries = allSummaries.filter(summary => 
          backtestIds.includes(summary.backtestId)
        );
        
        console.log('批量回测IDs:', backtestIds);
        console.log('过滤后回测结果数量:', summaries.length);
      } else {
        // 否则直接通过批次ID查询
        summaries = await fetchBacktestSummaries();
        // 过滤出属于该批次的回测
        summaries = summaries.filter(summary => 
          summary.backtestId === batchId
        );
      }
      
      if (summaries && summaries.length > 0) {
        dispatch(setBacktestSummaries(summaries));
      } else {
        setError(`未找到批次ID为 ${batchId} 的回测数据`);
      }
    } catch (err) {
      setError('获取批量回测数据失败');
      console.error('获取批量回测数据失败:', err);
    } finally {
      setLoading(false);
      setShowBatchInput(false);
    }
  };

  // 处理排序
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // 默认降序
    }
  };

  // 渲染排序指示器
  const renderSortIndicator = (field: string) => {
    if (field === sortField) {
      return <span className="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
    }
    return null;
  };

  const formatAmount = (amount: number): string => {
    // 处理负数
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount);

    let formattedValue: string;
    if (absAmount >= 1000000000) {
      formattedValue = `${(absAmount / 1000000000).toFixed(2)}B`;
    } else if (absAmount >= 1000000) {
      formattedValue = `${(absAmount / 1000000).toFixed(2)}M`;
    } else if (absAmount >= 1000) {
      formattedValue = `${(absAmount / 1000).toFixed(2)}K`;
    } else {
      formattedValue = absAmount.toFixed(2);
    }

    return isNegative ? `-${formattedValue}` : formattedValue;
  };

  return (
    <div className="backtest-summaries">
      <div className="backtest-summaries-header">
        <h3>{viewMode === 'batch' ? `批次回测结果 (${batchBacktestId})` : '历史回测结果'}</h3>
        <div className="header-actions">
          <button
            className="batch-button"
            onClick={handleToggleBatchInput}
          >
            批量回测
          </button>
          <button 
            className="refresh-button" 
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? '加载中...' : '刷新'}
          </button>
        </div>
      </div>
      
      {showBatchInput && (
        <div className="batch-input-container">
          <input
            type="text"
            placeholder="输入批次ID"
            value={batchBacktestId}
            onChange={handleBatchIdChange}
          />
          <button 
            className="submit-batch-button"
            onClick={handleSubmitBatchId}
          >
            查询
          </button>
        </div>
      )}
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="backtest-table">
        <div className="backtest-table-header">
          <div className="backtest-cell id">ID</div>
          <div className="backtest-cell strategy">策略</div>
          <div className="backtest-cell symbol">交易对</div>
          <div className="backtest-cell interval">周期</div>
          <div 
            className="backtest-cell return-rate sortable"
            onClick={() => handleSort('totalReturn')}
          >
            收益率 {renderSortIndicator('totalReturn')}
          </div>
          <div 
            className="backtest-cell profit-factor sortable"
            onClick={() => handleSort('winRate')}
          >
            胜率 {renderSortIndicator('winRate')}
          </div>
          <div 
            className="backtest-cell sharpe-ratio sortable"
            onClick={() => handleSort('sharpeRatio')}
          >
            夏普比率 {renderSortIndicator('sharpeRatio')}
          </div>
          <div 
            className="backtest-cell created sortable"
            onClick={() => handleSort('createTime')}
          >
            创建时间 {renderSortIndicator('createTime')}
          </div>
          <div className="backtest-cell actions">操作</div>
        </div>
        
        <div className="backtest-table-body">
          {filteredSummaries.length === 0 ? (
            <div className="no-data-message">暂无回测数据</div>
          ) : (
            filteredSummaries.map(summary => (
              <div className="backtest-row" key={summary.id}>
                <div className="backtest-cell id">{String(summary.id).substring(0, 8)}...</div>
                <div className="backtest-cell strategy">{summary.strategyName}</div>
                <div className="backtest-cell symbol">{summary.symbol}</div>
                <div className="backtest-cell interval">{summary.intervalVal}</div>
                <div className={`backtest-cell return-rate ${summary.totalReturn >= 0 ? 'positive' : 'negative'}`}>
                  {formatPercentage(summary.totalReturn * 100)}
                </div>
                <div className="backtest-cell profit-factor">
                  {(summary.winRate * 100).toFixed(2)}%
                </div>
                <div className="backtest-cell sharpe-ratio">
                  {summary.sharpeRatio ? summary.sharpeRatio.toFixed(2) : 'N/A'}
                </div>
                <div className="backtest-cell created">
                  {summary.createTime.substring(0, 10)}
                </div>
                <div className="backtest-cell actions">
                  <button 
                    className="view-button"
                    onClick={() => window.location.href = `/backtest-detail/${summary.id}`}
                  >
                    查看
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BacktestSummaries;
