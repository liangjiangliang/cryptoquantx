import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BacktestSummary } from '../store/types';
import { fetchBacktestSummaries, fetchBacktestStrategies } from '../services/api';
import { formatPercentage } from '../utils/helpers';
import './BatchBacktestDetailPage.css';

interface Strategy {
  name: string;
  description: string;
  params: string;
  category?: string;
  default_params?: string;
  strategy_code?: string;
}

const BatchBacktestDetailPage: React.FC = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backtestResults, setBacktestResults] = useState<BacktestSummary[]>([]);
  const [strategyMap, setStrategyMap] = useState<{[key: string]: Strategy}>({});
  const [batchInfo, setBatchInfo] = useState({
    name: '',
    createdAt: '',
    description: ''
  });

  useEffect(() => {
    const loadBatchBacktestDetail = async () => {
      setLoading(true);
      try {
        // 获取策略信息，用于参数显示
        const strategiesResponse = await fetchBacktestStrategies();
        if (strategiesResponse && strategiesResponse.data) {
          setStrategyMap(strategiesResponse.data);
        }
        
        // 获取回测结果
        const allBacktests = await fetchBacktestSummaries();
        
        // 模拟批量回测详情数据
        // 实际中应该使用 backtestId 查询相关的批次回测
        const mockBatchInfo = {
          name: batchId === 'batch-001' ? '多策略BTC-USDT回测' : 
                batchId === 'batch-002' ? 'ETH-USDT均线策略参数优化' : 'BTC-USDT布林带回测',
          createdAt: '2023-07-15',
          description: '使用不同参数组合进行多策略回测，评估最优策略组合'
        };
        
        // 模拟该批次下的回测结果
        // 实际中应该根据批次ID筛选出相关回测结果
        // 这里简单使用已有的所有回测结果，并按收益率倒序排列
        const sortedResults = [...allBacktests].sort((a, b) => b.totalReturn - a.totalReturn);
        
        setTimeout(() => {
          setBatchInfo(mockBatchInfo);
          setBacktestResults(sortedResults.slice(0, 5)); // 取前5条数据
          setLoading(false);
        }, 800);
      } catch (err) {
        setError('获取批量回测详情失败，请稍后重试');
        console.error('获取批量回测详情失败:', err);
        setLoading(false);
      }
    };
    
    if (batchId) {
      loadBatchBacktestDetail();
    }
  }, [batchId]);

  // 将策略参数格式化为中文显示
  const formatStrategyParams = (strategyCode: string, paramsStr: string): string => {
    try {
      // 如果策略参数为空或无效，直接返回原始值
      if (!paramsStr) {
        return paramsStr;
      }

      // 解析参数字符串为对象
      const params = JSON.parse(paramsStr);
      
      // 如果没有策略信息或策略参数定义，返回原始格式的参数
      if (!strategyMap[strategyCode] || !strategyMap[strategyCode].params) {
        return Object.entries(params)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
      }
      
      // 获取策略参数中文定义
      const paramNames = JSON.parse(strategyMap[strategyCode].params);
      
      // 转换为中文显示格式
      return Object.entries(params)
        .map(([key, value]) => {
          // 使用中文名称，如果不存在则使用原键名
          const displayName = paramNames[key] || key;
          return `${displayName}: ${value}`;
        })
        .join(', ');
    } catch (err) {
      console.error('解析策略参数失败:', err);
      return paramsStr; // 解析失败时返回原始字符串
    }
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
    <div className="batch-backtest-detail-page">
      <div className="page-header">
        <h2>批量回测详情: {batchInfo.name}</h2>
        <p className="batch-info">
          <span>批次ID: {batchId}</span>
          <span>创建时间: {batchInfo.createdAt}</span>
        </p>
        <p className="batch-description">{batchInfo.description}</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-indicator">加载中...</div>
      ) : backtestResults.length === 0 ? (
        <div className="no-data-message">暂无批量回测详情数据</div>
      ) : (
        <div className="results-table-container">
          <table className="results-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>交易对</th>
                <th>时间周期</th>
                <th>策略</th>
                <th>参数</th>
                <th>初始资金</th>
                <th>最终资金</th>
                <th>总收益</th>
                <th>收益率</th>
                <th>交易次数</th>
                <th>胜率</th>
                <th>最大回撤</th>
                <th>夏普比率</th>
              </tr>
            </thead>
            <tbody>
              {backtestResults.map((result) => (
                <tr key={result.id} className="result-row">
                  <td>{result.id}</td>
                  <td>{result.symbol}</td>
                  <td>{result.intervalVal}</td>
                  <td>{result.strategyName}</td>
                  <td>{formatStrategyParams(result.strategyName, result.strategyParams)}</td>
                  <td>{formatAmount(result.initialAmount)}</td>
                  <td>{formatAmount(result.finalAmount)}</td>
                  <td>{formatAmount(result.totalProfit)}</td>
                  <td className={result.totalReturn >= 0 ? 'positive' : 'negative'}>
                    {formatPercentage(result.totalReturn * 100)}
                  </td>
                  <td>{result.numberOfTrades}</td>
                  <td>{(result.winRate * 100).toFixed(2)}%</td>
                  <td>{(result.maxDrawdown * 100).toFixed(2)}%</td>
                  <td>{result.sharpeRatio.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BatchBacktestDetailPage; 