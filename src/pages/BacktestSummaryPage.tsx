import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { AppState, BacktestSummary } from '../store/types';
import { setBacktestSummaries } from '../store/actions';
import { fetchBacktestSummaries } from '../services/api';
import { formatPercentage } from '../utils/helpers';
import Logo from '../components/Logo';
import './BacktestSummaryPage.css';

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
  | 'sharpeRatio';

// 过滤器类型
interface Filters {
  symbol: string;
  intervalVal: string;
  strategyName: string;
}

const BacktestSummaryPage: React.FC = () => {
  const dispatch = useDispatch();
  const backtestSummaries = useSelector((state: AppState) => state.backtestSummaries);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 排序状态
  const [sortField, setSortField] = useState<SortField>('createTime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(16);

  // 过滤状态
  const [filters, setFilters] = useState<Filters>({
    symbol: '',
    intervalVal: '',
    strategyName: ''
  });

  // 过滤后的数据
  const [filteredData, setFilteredData] = useState<BacktestSummary[]>([]);

  useEffect(() => {
    loadBacktestSummaries();
  }, []);

  // 当原始数据或过滤条件变化时，更新过滤后的数据
  useEffect(() => {
    filterAndSortData();
  }, [backtestSummaries, sortField, sortDirection, filters]);

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

  // 处理过滤器变化
  const handleFilterChange = (field: keyof Filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 过滤和排序数据
  const filterAndSortData = () => {
    // 先过滤
    let result = [...backtestSummaries];

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

  // 渲染排序图标
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <span className="sort-icon">⇅</span>;
    }
    return sortDirection === 'asc'
      ? <span className="sort-icon active">↑</span>
      : <span className="sort-icon active">↓</span>;
  };

  // 获取唯一的筛选选项
  const getUniqueValues = (field: keyof BacktestSummary) => {
    const values = new Set<string>();
    backtestSummaries.forEach(item => {
      if (typeof item[field] === 'string') {
        values.add(item[field] as string);
      }
    });
    return Array.from(values).sort();
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
              <option key={value} value={value}>{value}</option>
            ))}
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
                <th>参数</th>
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
                </th>
                <th onClick={() => handleSort('sharpeRatio')} className="sortable-header">
                  夏普比率 {renderSortIcon('sharpeRatio')}
                </th>
                <th onClick={() => handleSort('createTime')} className="sortable-header">
                  创建时间 {renderSortIcon('createTime')}
                </th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {currentPageData.map((summary) => (
                <tr key={summary.id}>
                  <td>{summary.id}</td>
                  <td>{summary.symbol}</td>
                  <td>{summary.intervalVal}</td>
                  <td>{summary.strategyName}</td>
                  <td>{summary.strategyParams}</td>
                  <td>{summary.startTime.substring(0, 10)}</td>
                  <td>{summary.endTime.substring(0, 10)}</td>
                  <td>{formatAmount(summary.initialAmount)}</td>
                  <td>{formatAmount(summary.finalAmount)}</td>
                  <td>{formatAmount(summary.totalProfit)}</td>
                  <td className={summary.totalReturn >= 0 ? 'positive' : 'negative'}>
                    {formatPercentage(summary.totalReturn * 100)}
                  </td>
                  <td>{formatAmount(summary.totalFee)}</td>
                  <td>{((summary.totalFee / summary.initialAmount) * 100).toFixed(2)}%</td>
                  <td>{summary.numberOfTrades}</td>
                  <td>{(summary.winRate * 100).toFixed(2)}%</td>
                  <td>{(summary.maxDrawdown * 100).toFixed(2)}%</td>
                  <td>{summary.sharpeRatio.toFixed(2)}</td>
                  <td>{summary.createTime.substring(0, 10)}</td>
                  <td>
                    <Link
                      to={`/backtest-detail/${summary.backtestId}`}
                      className="detail-button"
                    >
                      交易详情
                    </Link>
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
              <option value={pageSize}>{pageSize}</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            条
          </div>
        </div>
      )}
    </div>
  );
};

export default BacktestSummaryPage;
