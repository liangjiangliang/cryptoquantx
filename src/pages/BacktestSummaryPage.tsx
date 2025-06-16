import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { AppState, BacktestSummary } from '../store/types';
import { setBacktestSummaries } from '../store/actions';
import { fetchBacktestSummaries, fetchBatchBacktestSummariesBatch } from '../services/api';
import { formatPercentage } from '../utils/helpers';
import Logo from '../components/Logo';
import './BacktestSummaryPage.css';

// 指标说明
const INDICATOR_DESCRIPTIONS = {
  annualizedReturn: '年化收益率：将投资期间的收益率转换为年化形式，便于比较不同时间长度的投资表现',
  maxDrawdown: '最大回撤：投资组合从最高点到最低点的最大跌幅，衡量投资风险',
  sharpeRatio: '夏普比率：衡量每单位风险所获得的超额回报，数值越高表示风险调整后收益越好',
  calmarRatio: '卡玛比率：年化收益率与最大回撤的比值，数值越高表示策略越优秀',
  sortinoRatio: '索提诺比率：类似夏普比率，但只考虑下行风险，更关注负收益的波动性',
  averageProfit: '平均收益：每笔交易的平均盈利金额',
  volatility: '波动率：价格变化的标准差，衡量投资的不确定性和风险程度',
  maximumLoss: '最大损失：单笔交易的最大亏损金额'
};

// 排序方向类型
type SortDirection = 'asc' | 'desc';

// 排序字段类型
type SortField =
  | 'id'
  | 'createTime'
  | 'symbol'
  | 'intervalVal'
  | 'strategyName'
  | 'startTime'
  | 'endTime'
  | 'initialAmount'
  | 'finalAmount'
  | 'totalProfit'
  | 'totalReturn'
  | 'totalFee'
  | 'feeRate'
  | 'numberOfTrades'
  | 'winRate'
  | 'maxDrawdown'
  | 'sharpeRatio'
  | 'annualizedReturn'
  | 'calmarRatio'
  | 'sortinoRatio'
  | 'averageProfit'
  | 'volatility'
  | 'profitableTrades'
  | 'unprofitableTrades'
  | 'maximumLoss';

// 过滤条件类型
interface Filters {
  symbol: string;
  intervalVal: string;
  strategyName: string;
}

// 聚合维度类型
type AggregationDimension = '' | 'symbol' | 'intervalVal' | 'strategyName';

// 策略类型
interface Strategy {
  name: string;
  description: string;
  params: string;
  category?: string;
  default_params?: string;
  strategy_code?: string;
}

const BacktestSummaryPage: React.FC = () => {
  const dispatch = useDispatch();
  const backtestSummaries = useSelector((state: AppState) => state.backtestSummaries);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(14);
  const [sortField, setSortField] = useState<SortField>('annualizedReturn');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filteredData, setFilteredData] = useState<BacktestSummary[]>([]);
  const [filters, setFilters] = useState<Filters>({ symbol: '', intervalVal: '', strategyName: '' });
  // 添加关键词搜索状态
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  // 聚合维度
  const [aggregationDimension, setAggregationDimension] = useState<AggregationDimension>('');
  // 聚合后的数据
  const [aggregatedData, setAggregatedData] = useState<BacktestSummary[]>([]);
  // 存储策略名称映射
  const [strategyMap, setStrategyMap] = useState<{[key: string]: Strategy}>({});
  // 获取URL参数
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const batchId = queryParams.get('batchId');
  const batchBacktestId = queryParams.get('batch_backtest_id'); // 新增
  // 存储批次相关的回测ID列表
  const [batchBacktestIds, setBatchBacktestIds] = useState<string[]>([]);
  // 悬浮窗状态
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    content: string;
    x: number;
    y: number;
  }>({
    visible: false,
    content: '',
    x: 0,
    y: 0
  });

  useEffect(() => {
    if (batchBacktestId) {
      // 新增：如果有 batch_backtest_id，直接请求批量回测汇总接口
      setLoading(true);
      setError(null);
      fetchBatchBacktestSummariesBatch(batchBacktestId)
        .then((summaries) => {
          dispatch(setBacktestSummaries(summaries));
        })
        .catch((err) => {
          setError('获取批量回测汇总数据失败，请稍后重试');
          console.error('获取批量回测汇总数据失败:', err);
        })
        .finally(() => setLoading(false));
      return;
    }
    loadBacktestSummaries();
    // 加载策略列表
    fetchStrategies();
    if (batchId) {
      try {
        const storedIds = sessionStorage.getItem('backtestIds');
        if (storedIds) {
          const backtestIds = JSON.parse(storedIds);
          setBatchBacktestIds(backtestIds);
          // 如果是从批量回测页面跳转过来的，设置默认排序为收益率降序
          setSortField('totalReturn');
          setSortDirection('desc');
        }
      } catch (err) {
        console.error('解析sessionStorage中的回测ID列表失败:', err);
      }
    }
  }, [batchId, batchBacktestId]);

  // 当原始数据、过滤条件或批次回测ID列表变化时，更新过滤后的数据
  useEffect(() => {
    filterAndSortData();
  }, [backtestSummaries, sortField, sortDirection, filters, batchBacktestIds, aggregationDimension, searchKeyword]);

  const loadBacktestSummaries = async () => {
    setLoading(true);
    setError(null);
    try {
      const summaries = await fetchBacktestSummaries();
      dispatch(setBacktestSummaries(summaries));
    } catch (err) {
      setError('获取回测汇总数据失败，请稍后重试');
      console.error('获取回测汇总数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 获取策略列表
  const fetchStrategies = async () => {
    try {
      const response = await fetch('/api/api/backtest/ta4j/strategies');
      if (!response.ok) {
        throw new Error('获取策略列表失败');
      }
      const data = await response.json();
      if (data.code === 200 && data.data) {
        setStrategyMap(data.data);
      }
    } catch (error) {
      console.error('获取策略列表失败:', error);
    }
  };

  // 获取策略的中文名称
  const getStrategyDisplayName = (strategyCode: string): string => {
    if (strategyMap[strategyCode]) {
      return strategyMap[strategyCode].name;
    }
    return strategyCode;
  };

  // 将策略参数格式化为只显示值，用逗号拼接
  const formatStrategyParams = (strategyCode: string, paramsStr: string): string => {
    try {
      // 如果策略参数为空或无效，直接返回原始值
      if (!paramsStr) {
        return paramsStr;
      }

      // 解析参数字符串为对象
      const params = JSON.parse(paramsStr);

      // 只展示参数值，不展示名称，用逗号拼接
      return Object.values(params).join(', ');
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

  // 处理排序
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // 如果点击的是当前排序字段，则切换排序方向
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 否则，更改排序字段，并设置为降序（大多数情况下用户希望看到最大值）
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // 处理过滤条件变化
  const handleFilterChange = (field: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1); // 重置到第一页
  };

  // 过滤和排序数据
  const filterAndSortData = () => {
    // 先过滤
    let result = [...backtestSummaries];

    // 如果有批次ID和回测ID列表，只显示这些回测的摘要信息
    if (batchId && batchBacktestIds.length > 0) {
      result = result.filter(item => batchBacktestIds.includes(item.backtestId));
    }

    if (filters.symbol) {
      result = result.filter(item =>
        item.symbol.toLowerCase().includes(filters.symbol.toLowerCase())
      );
    }

    if (filters.intervalVal) {
      result = result.filter(item =>
        item.intervalVal.toLowerCase().includes(filters.intervalVal.toLowerCase())
      );
    }

    if (filters.strategyName) {
      result = result.filter(item =>
        item.strategyName.toLowerCase().includes(filters.strategyName.toLowerCase())
      );
    }

    // 关键词搜索过滤
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      result = result.filter(item => {
        // 在多个字段中搜索关键词
        return (
          item.symbol.toLowerCase().includes(keyword) ||
          item.intervalVal.toLowerCase().includes(keyword) ||
          item.strategyName.toLowerCase().includes(keyword) ||
          (strategyMap[item.strategyName] && strategyMap[item.strategyName].name.toLowerCase().includes(keyword))
        );
      });
    }

    // 如果选择了聚合维度，进行数据聚合
    if (aggregationDimension) {
      result = aggregateData(result, aggregationDimension);
    }

    // 再排序
    result.sort((a, b) => {
      let valueA: any;
      let valueB: any;

      // 根据排序字段获取对应的值
      switch (sortField) {
        case 'id':
          valueA = a.id;
          valueB = b.id;
          break;
        case 'createTime':
          valueA = new Date(a.createTime).getTime();
          valueB = new Date(b.createTime).getTime();
          break;
        case 'symbol':
          valueA = a.symbol;
          valueB = b.symbol;
          break;
        case 'intervalVal':
          valueA = a.intervalVal;
          valueB = b.intervalVal;
          break;
        case 'strategyName':
          valueA = a.strategyName;
          valueB = b.strategyName;
          break;
        case 'startTime':
          valueA = new Date(a.startTime).getTime();
          valueB = new Date(b.startTime).getTime();
          break;
        case 'endTime':
          valueA = new Date(a.endTime).getTime();
          valueB = new Date(b.endTime).getTime();
          break;
        case 'initialAmount':
          valueA = a.initialAmount;
          valueB = b.initialAmount;
          break;
        case 'finalAmount':
          valueA = a.finalAmount;
          valueB = b.finalAmount;
          break;
        case 'totalProfit':
          valueA = a.totalProfit;
          valueB = b.totalProfit;
          break;
        case 'totalReturn':
          valueA = a.totalReturn;
          valueB = b.totalReturn;
          break;
        case 'totalFee':
          valueA = a.totalFee;
          valueB = b.totalFee;
          break;
        case 'feeRate':
          valueA = a.totalFee / a.initialAmount;
          valueB = b.totalFee / b.initialAmount;
          break;
        case 'numberOfTrades':
          valueA = a.numberOfTrades;
          valueB = b.numberOfTrades;
          break;
        case 'winRate':
          valueA = a.winRate;
          valueB = b.winRate;
          break;
        case 'maxDrawdown':
          valueA = a.maxDrawdown;
          valueB = b.maxDrawdown;
          break;
        case 'sharpeRatio':
          valueA = a.sharpeRatio;
          valueB = b.sharpeRatio;
          break;
        case 'annualizedReturn':
          valueA = a.annualizedReturn;
          valueB = b.annualizedReturn;
          break;
        case 'calmarRatio':
          valueA = a.calmarRatio || 0;
          valueB = b.calmarRatio || 0;
          break;
        case 'sortinoRatio':
          valueA = a.sortinoRatio || 0;
          valueB = b.sortinoRatio || 0;
          break;
        case 'averageProfit':
          valueA = a.averageProfit;
          valueB = b.averageProfit;
          break;
        case 'volatility':
          valueA = a.volatility || 0;
          valueB = b.volatility || 0;
          break;
        case 'profitableTrades':
          valueA = a.profitableTrades;
          valueB = b.profitableTrades;
          break;
        case 'unprofitableTrades':
          valueA = a.unprofitableTrades;
          valueB = b.unprofitableTrades;
          break;
        case 'maximumLoss':
          valueA = a.maximumLoss || 0;
          valueB = b.maximumLoss || 0;
          break;
        default:
          valueA = a.id;
          valueB = b.id;
      }

      // 字符串比较
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortDirection === 'asc'
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }

      // 数值比较
      return sortDirection === 'asc'
        ? valueA - valueB
        : valueB - valueA;
    });

    // 在设置filtered数据时重置到第一页
    setCurrentPage(1);
    setFilteredData(result);
  };

  // 显示指标说明悬浮窗
  const showTooltip = (field: keyof typeof INDICATOR_DESCRIPTIONS, event: React.MouseEvent) => {
    const description = INDICATOR_DESCRIPTIONS[field];
    if (description) {
      const rect = event.currentTarget.getBoundingClientRect();
      setTooltip({
        visible: true,
        content: description,
        x: rect.right + 10,
        y: rect.top
      });
    }
  };

  // 隐藏悬浮窗
  const hideTooltip = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  // 渲染排序图标
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <span className="sort-icon">⇅</span>;
    }
    return sortDirection === 'asc'
      ? <span className="sort-icon active">↑</span>
      : <span className="sort-icon active">↓</span>;
  };

  // 数据聚合函数
  const aggregateData = (data: BacktestSummary[], dimension: AggregationDimension): BacktestSummary[] => {
    if (!dimension) return data;

    // 按维度分组
    const groups: { [key: string]: BacktestSummary[] } = {};
    data.forEach(item => {
      // 获取分组键
      let key = item[dimension] as string;

      // 确保键存在
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });

    // 计算每组的平均值
    return Object.entries(groups).map(([key, items]) => {
      const count = items.length;

      // 创建聚合结果
      const aggregated: BacktestSummary = {
        ...items[0], // 保留第一个项目的基本信息
        id: 0, // 使用0表示这是聚合数据
        backtestId: `aggregated_${key}`,
        numberOfTrades: Math.round(items.reduce((sum, item) => sum + item.numberOfTrades, 0) / count),
        initialAmount: items.reduce((sum, item) => sum + item.initialAmount, 0) / count,
        finalAmount: items.reduce((sum, item) => sum + item.finalAmount, 0) / count,
        totalProfit: items.reduce((sum, item) => sum + item.totalProfit, 0) / count,
        totalReturn: items.reduce((sum, item) => sum + item.totalReturn, 0) / count,
        totalFee: items.reduce((sum, item) => sum + item.totalFee, 0) / count,
        winRate: items.reduce((sum, item) => sum + item.winRate, 0) / count,
        maxDrawdown: items.reduce((sum, item) => sum + item.maxDrawdown, 0) / count,
        sharpeRatio: items.reduce((sum, item) => sum + item.sharpeRatio, 0) / count,
        annualizedReturn: items.reduce((sum, item) => sum + (item.annualizedReturn || 0), 0) / count,
        // 新增字段的聚合计算
        calmarRatio: items.reduce((sum, item) => sum + (item.calmarRatio || 0), 0) / count,
        sortinoRatio: items.reduce((sum, item) => sum + (item.sortinoRatio || 0), 0) / count,
        averageProfit: items.reduce((sum, item) => sum + item.averageProfit, 0) / count,
        volatility: items.reduce((sum, item) => sum + (item.volatility || 0), 0) / count,
        profitableTrades: Math.round(items.reduce((sum, item) => sum + item.profitableTrades, 0) / count),
        unprofitableTrades: Math.round(items.reduce((sum, item) => sum + item.unprofitableTrades, 0) / count),
        maximumLoss: items.reduce((sum, item) => sum + (item.maximumLoss || 0), 0) / count,
      };

      // 根据聚合维度设置显示名称
      switch (dimension) {
        case 'symbol':
          aggregated.strategyName = `${key}的平均值 (${count}个回测)`;
          break;
        case 'intervalVal':
          aggregated.strategyName = `${key}周期的平均值 (${count}个回测)`;
          break;
        case 'strategyName':
          // 策略聚合时，保留原始策略代码，但在显示时使用策略名称
          aggregated.strategyName = key; // 保留原始策略代码
          aggregated.strategyParams = JSON.stringify({
            aggregated: `${getStrategyDisplayName(key)}的平均值 (${count}个回测)`
          });
          break;
      }

      return aggregated;
    });
  };

  // 获取唯一的筛选选项
  const getUniqueValues = (field: keyof BacktestSummary) => {
    const values = new Set<string>();
    backtestSummaries.forEach(item => {
      if (typeof item[field] === 'string') {
        values.add(item[field] as string);
      }
    });
    // 自然排序
    return Array.from(values).sort((a, b) => {
      // 如果是策略代码，尝试提取数字部分进行排序
      if (field === 'strategyName') {
        const numA = a.match(/\d+/);
        const numB = b.match(/\d+/);
        if (numA && numB) {
          return parseInt(numA[0]) - parseInt(numB[0]);
        }
      }
      return a.localeCompare(b, 'zh-CN');
    });
  };

  // 页面处理函数
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 计算总页数
  const totalPages = Math.ceil(filteredData.length / pageSize);

  // 获取当前页的数据
  const currentPageData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="backtest-summary-page">
      {error && <div className="error-message">{error}</div>}

      {/* 过滤器 */}
      <div className="filters-container">
        {/* 关键词搜索框 */}
        <div className="filter-item search-item">
          <label>关键词搜索:</label>
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="输入关键词搜索..."
            className="search-input"
          />
        </div>
        <div className="filter-item">
          <label>交易对:</label>
          <select
            value={filters.symbol}
            onChange={(e) => handleFilterChange('symbol', e.target.value)}
          >
            <option value="">全部交易对</option>
            {getUniqueValues('symbol').map(value => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
        <div className="filter-item">
          <label>时间周期:</label>
          <select
            value={filters.intervalVal}
            onChange={(e) => handleFilterChange('intervalVal', e.target.value)}
          >
            <option value="">全部时间周期</option>
            {getUniqueValues('intervalVal').map(value => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
        <div className="filter-item">
          <label>策略:</label>
          <select
            value={filters.strategyName}
            onChange={(e) => handleFilterChange('strategyName', e.target.value)}
          >
            <option value="">全部策略</option>
            {getUniqueValues('strategyName').map(value => (
              <option key={value} value={value}>{getStrategyDisplayName(value)}</option>
            ))}
          </select>
        </div>
        <div className="filter-item">
          <label>聚合维度:</label>
          <select
            value={aggregationDimension}
            onChange={(e) => setAggregationDimension(e.target.value as AggregationDimension)}
          >
            <option value="">不聚合</option>
            <option value="strategyName">按策略聚合</option>
            <option value="symbol">按交易对聚合</option>
            <option value="intervalVal">按时间周期聚合</option>

          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-indicator">加载中...</div>
      ) : filteredData.length === 0 ? (
        <div className="no-data-message">暂无回测数据</div>
      ) : (
        <div className="summary-table-container">
          <table className="summary-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('id')} className="sortable-header">
                  ID {renderSortIcon('id')}
                </th>
                <th onClick={() => handleSort('symbol')} className="sortable-header">
                  交易对 {renderSortIcon('symbol')}
                </th>
                <th onClick={() => handleSort('intervalVal')} className="sortable-header">
                  时间周期 {renderSortIcon('intervalVal')}
                </th>
                <th onClick={() => handleSort('strategyName')} className="sortable-header">
                  策略 {renderSortIcon('strategyName')}
                </th>
                <th onClick={() => handleSort('startTime')} className="sortable-header">
                  开始时间 {renderSortIcon('startTime')}
                </th>
                <th onClick={() => handleSort('endTime')} className="sortable-header">
                  结束时间 {renderSortIcon('endTime')}
                </th>
                <th onClick={() => handleSort('initialAmount')} className="sortable-header">
                  初始资金 {renderSortIcon('initialAmount')}
                </th>
                <th onClick={() => handleSort('finalAmount')} className="sortable-header">
                  最终资金 {renderSortIcon('finalAmount')}
                </th>
                <th onClick={() => handleSort('totalProfit')} className="sortable-header">
                  总收益 {renderSortIcon('totalProfit')}
                </th>
                <th onClick={() => handleSort('totalReturn')} className="sortable-header">
                  收益率 {renderSortIcon('totalReturn')}
                </th>
                <th onClick={() => handleSort('annualizedReturn')} className="sortable-header">
                  年化收益率 {renderSortIcon('annualizedReturn')}
                  <span
                    className="info-icon"
                    onClick={(e) => { e.stopPropagation(); showTooltip('annualizedReturn', e); }}
                    onMouseLeave={hideTooltip}
                  >
                    ⓘ
                  </span>
                </th>
                <th onClick={() => handleSort('totalFee')} className="sortable-header">
                  手续费 {renderSortIcon('totalFee')}
                </th>
                <th onClick={() => handleSort('feeRate')} className="sortable-header">
                  手续费率 {renderSortIcon('feeRate')}
                </th>
                <th onClick={() => handleSort('numberOfTrades')} className="sortable-header">
                  交易次数 {renderSortIcon('numberOfTrades')}
                </th>
                <th onClick={() => handleSort('winRate')} className="sortable-header">
                  胜率 {renderSortIcon('winRate')}
                </th>
                <th onClick={() => handleSort('maxDrawdown')} className="sortable-header">
                  最大回撤 {renderSortIcon('maxDrawdown')}
                  <span
                    className="info-icon"
                    onClick={(e) => { e.stopPropagation(); showTooltip('maxDrawdown', e); }}
                    onMouseLeave={hideTooltip}
                  >
                    ⓘ
                  </span>
                </th>
                <th onClick={() => handleSort('maximumLoss')} className="sortable-header">
                  最大损失 {renderSortIcon('maximumLoss')}
                  <span
                    className="info-icon"
                    onClick={(e) => { e.stopPropagation(); showTooltip('maximumLoss', e); }}
                    onMouseLeave={hideTooltip}
                  >
                    ⓘ
                  </span>
                </th>
                <th onClick={() => handleSort('sharpeRatio')} className="sortable-header">
                  夏普比率 {renderSortIcon('sharpeRatio')}
                  <span
                    className="info-icon"
                    onClick={(e) => { e.stopPropagation(); showTooltip('sharpeRatio', e); }}
                    onMouseLeave={hideTooltip}
                  >
                    ⓘ
                  </span>
                </th>
                <th onClick={() => handleSort('calmarRatio')} className="sortable-header">
                  卡玛比率 {renderSortIcon('calmarRatio')}
                  <span
                    className="info-icon"
                    onClick={(e) => { e.stopPropagation(); showTooltip('calmarRatio', e); }}
                    onMouseLeave={hideTooltip}
                  >
                    ⓘ
                  </span>
                </th>
                <th onClick={() => handleSort('sortinoRatio')} className="sortable-header">
                  索提诺比率 {renderSortIcon('sortinoRatio')}
                  <span
                    className="info-icon"
                    onClick={(e) => { e.stopPropagation(); showTooltip('sortinoRatio', e); }}
                    onMouseLeave={hideTooltip}
                  >
                    ⓘ
                  </span>
                </th>
                <th onClick={() => handleSort('averageProfit')} className="sortable-header">
                  平均收益 {renderSortIcon('averageProfit')}
                  <span
                    className="info-icon"
                    onClick={(e) => { e.stopPropagation(); showTooltip('averageProfit', e); }}
                    onMouseLeave={hideTooltip}
                  >
                    ⓘ
                  </span>
                </th>
                <th onClick={() => handleSort('volatility')} className="sortable-header">
                  波动率 {renderSortIcon('volatility')}
                  <span
                    className="info-icon"
                    onClick={(e) => { e.stopPropagation(); showTooltip('volatility', e); }}
                    onMouseLeave={hideTooltip}
                  >
                    ⓘ
                  </span>
                </th>
                <th onClick={() => handleSort('createTime')} className="sortable-header">
                  创建时间 {renderSortIcon('createTime')}
                </th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {currentPageData.map((summary) => (
                <tr key={summary.id || summary.backtestId} className={summary.id === 0 ? 'aggregated-row' : ''}>
                  <td>{summary.id || '聚合'}</td>
                  <td>{summary.symbol}</td>
                  <td>{summary.intervalVal}</td>
                  <td>{summary.id === 0 && summary.strategyParams && JSON.parse(summary.strategyParams).aggregated ?
                      JSON.parse(summary.strategyParams).aggregated :
                      getStrategyDisplayName(summary.strategyName)}</td>
                  <td>{summary.id === 0 ? '-' : summary.startTime.substring(0, 10)}</td>
                  <td>{summary.id === 0 ? '-' : summary.endTime.substring(0, 10)}</td>
                  <td>{formatAmount(summary.initialAmount)}</td>
                  <td>{formatAmount(summary.finalAmount)}</td>
                  <td>{formatAmount(summary.totalProfit)}</td>
                  <td>
                    {formatPercentage(summary.totalReturn * 100)}
                  </td>
                  <td className="positive">{summary.annualizedReturn !== null && summary.annualizedReturn !== undefined ? formatPercentage(summary.annualizedReturn * 100) : ''}</td>
                  <td>{formatAmount(summary.totalFee)}</td>
                  <td>{((summary.totalFee / summary.initialAmount) * 100).toFixed(2)}%</td>
                  <td>{summary.numberOfTrades}</td>
                  <td>{(summary.winRate * 100).toFixed(2)}%</td>
                  <td>{(summary.maxDrawdown * 100).toFixed(2)}%</td>
                  <td>{summary.maximumLoss ? (summary.maximumLoss * 100).toFixed(2) + '%' : '-'}</td>
                  <td>{summary.sharpeRatio.toFixed(2)}</td>
                  <td>{summary.calmarRatio ? summary.calmarRatio.toFixed(2) : '-'}</td>
                  <td>{summary.sortinoRatio ? summary.sortinoRatio.toFixed(2) : '-'}</td>
                  <td>{summary.averageProfit.toFixed(2)}</td>
                  <td>{summary.volatility ? summary.volatility.toFixed(2) : '-'}</td>
                  <td>{summary.id === 0 ? '-' : summary.createTime.substring(0, 10)}</td>
                  <td>
                    {summary.id !== 0 && (
                      <Link
                        to={`/backtest-detail/${summary.backtestId}`}
                        className="detail-button"
                      >
                        详情
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 分页控制 */}
      {filteredData.length > 0 && (
        <div className="pagination-container">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            首页
          </button>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            上一页
          </button>
          <div className="pagination-info">
            {currentPage} / {totalPages} 页 (共 {filteredData.length} 条记录)
          </div>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            下一页
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            末页
          </button>
          <div className="page-size-selector">
            每页
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={15}>15</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            条
          </div>
        </div>
      )}

      {/* 指标说明悬浮窗 */}
      {tooltip.visible && (
        <div
          className="tooltip"
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            zIndex: 1000,
            backgroundColor: '#333',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            maxWidth: '300px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            pointerEvents: 'none'
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

export default BacktestSummaryPage;
