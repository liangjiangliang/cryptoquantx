import React, { useState, useEffect } from 'react';
import { fetchIndicatorDistributions, updateIndicatorDistributions } from '../services/api';
import './IndicatorDistributionPage.css';

interface IndicatorDetail {
  name: string;
  displayName: string;
  type: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  sampleCount: number;
  range: {
    min: number;
    max: number;
    avg: number;
  };
  percentiles: {
    p10: number;
    p20: number;
    p30: number;
    p40: number;
    p50: number;
    p60: number;
    p70: number;
    p80: number;
    p90: number;
  };
}

interface IndicatorDistributionData {
  totalCount: number;
  indicatorDetails: IndicatorDetail[];
}

// 每页显示的指标数量
const INDICATORS_PER_PAGE = 13;

const IndicatorDistributionPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<IndicatorDistributionData | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  // 添加分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(INDICATORS_PER_PAGE);

  // 加载指标分布数据
  const loadIndicatorDistributions = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchIndicatorDistributions();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.message || '获取指标分布详情失败');
      }
    } catch (error) {
      console.error('获取指标分布详情时发生错误:', error);
      setError('获取指标分布详情时发生错误');
    } finally {
      setLoading(false);
    }
  };

  // 更新指标分布
  const handleUpdateDistributions = async () => {
    setUpdating(true);
    try {
      const result = await updateIndicatorDistributions();
      if (result.success) {
        // 重新加载数据
        loadIndicatorDistributions();
        setError(null);
      } else {
        setError(result.message || '更新指标分布失败');
      }
    } catch (error) {
      console.error('更新指标分布时发生错误:', error);
      setError('更新指标分布时发生错误');
    } finally {
      setUpdating(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadIndicatorDistributions();
  }, []);

  // 格式化指标值
  const formatValue = (value: number, indicator: IndicatorDetail): string => {
    // 特殊处理非百分比指标
    if (["numberOfTrades", "maxDrawdownDuration"].includes(indicator.name)) {
      return value.toFixed(0);
    } else {
      return `${(value * 100).toFixed(2)}%`;
    }
  };

  // 获取指标类型中文
  const getTypeText = (type: string): string => {
    switch (type) {
      case "POSITIVE": return "正向(↑)";
      case "NEGATIVE": return "负向(↓)";
      case "NEUTRAL": return "中性";
      default: return type;
    }
  };

  // 根据类型获取标记
  const getTypeEmoji = (type: string): string => {
    switch (type) {
      case "POSITIVE": return "↑";
      case "NEGATIVE": return "↓";
      case "NEUTRAL": return "•";
      default: return "";
    }
  };

  // 根据类型获取类名
  const getTypeClass = (type: string): string => {
    switch (type) {
      case "POSITIVE": return "positive";
      case "NEGATIVE": return "negative";
      case "NEUTRAL": return "neutral";
      default: return "";
    }
  };

  // 过滤指标
  const getFilteredIndicators = () => {
    if (!data?.indicatorDetails) return [];

    return data.indicatorDetails.filter(indicator => {
      // 类型筛选
      if (filterType !== 'all' && indicator.type !== filterType) {
        return false;
      }

      // 搜索筛选
      if (searchTerm && !indicator.displayName.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !indicator.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      // 排序优先级：类型 > 名称
      if (a.type !== b.type) {
        const typeOrder: Record<string, number> = {
          "POSITIVE": 1,
          "NEGATIVE": 2,
          "NEUTRAL": 3
        };
        return typeOrder[a.type] - typeOrder[b.type];
      }
      return a.displayName.localeCompare(b.displayName);
    });
  };

  // 计算总页数
  const getTotalPages = () => {
    const filteredIndicators = getFilteredIndicators();
    return Math.ceil(filteredIndicators.length / pageSize);
  };

  // 获取当前页的指标
  const getCurrentPageIndicators = () => {
    const filteredIndicators = getFilteredIndicators();
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredIndicators.slice(startIndex, endIndex);
  };

  // 处理页面变更
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // 处理每页显示数量变化
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // 重置到第一页
  };

  // 渲染表头
  const renderTableHeader = () => {
    return (
      <thead>
        <tr>
          <th>指标名称</th>
          <th>类型</th>
          <th>10%</th>
          <th>20%</th>
          <th>30%</th>
          <th>40%</th>
          <th>50%(中位数)</th>
          <th>60%</th>
          <th>70%</th>
          <th>80%</th>
          <th>90%</th>
        </tr>
      </thead>
    );
  };

  // 渲染表格内容
  const renderTableBody = () => {
    const currentPageIndicators = getCurrentPageIndicators();

    if (currentPageIndicators.length === 0) {
      return (
        <tbody>
          <tr>
            <td colSpan={14} className="no-data">没有找到符合条件的指标数据</td>
          </tr>
        </tbody>
      );
    }

    return (
      <tbody>
        {currentPageIndicators.map((indicator) => (
          <tr key={indicator.name} className={getTypeClass(indicator.type)}>
            <td className="indicator-name">
              <span className="display-name">{indicator.displayName}</span>
              <span className="code-name">({indicator.name})</span>
            </td>
            <td className={`indicator-type ${getTypeClass(indicator.type)}`}>
              {getTypeText(indicator.type)}
            </td>
            <td>{formatValue(indicator.percentiles.p10, indicator)}</td>
            <td>{formatValue(indicator.percentiles.p20, indicator)}</td>
            <td>{formatValue(indicator.percentiles.p30, indicator)}</td>
            <td>{formatValue(indicator.percentiles.p40, indicator)}</td>
            <td>{formatValue(indicator.percentiles.p50, indicator)}</td>
            <td>{formatValue(indicator.percentiles.p60, indicator)}</td>
            <td>{formatValue(indicator.percentiles.p70, indicator)}</td>
            <td>{formatValue(indicator.percentiles.p80, indicator)}</td>
            <td>{formatValue(indicator.percentiles.p90, indicator)}</td>
          </tr>
        ))}
      </tbody>
    );
  };

  // 渲染表格
  const renderTable = () => {
    return (
      <div className="table-container">
        <table className="indicator-distribution-table">
          {renderTableHeader()}
          {renderTableBody()}
        </table>
      </div>
    );
  };

  // 渲染筛选器
  const renderFilters = () => {
    const buttonHeight = '36px';

    return (
      <div className="filters" style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', overflowX: 'auto' }}>
        <div className="action-buttons" style={{ display: 'flex', gap: '5px', marginLeft: 'auto', flexShrink: 0 }}>
          <button
            className="refresh-btn"
            onClick={loadIndicatorDistributions}
            disabled={loading}
            style={{ padding: '0 10px', fontSize: '14px', whiteSpace: 'nowrap', height: buttonHeight }}
          >
            {loading ? '加载中...' : '刷新数据'}
          </button>
          <button
            className="update-btn"
            onClick={handleUpdateDistributions}
            disabled={updating || loading}
            style={{ padding: '0 10px', fontSize: '14px', whiteSpace: 'nowrap', height: buttonHeight }}
          >
            {updating ? '更新中...' : '更新分布'}
          </button>
        </div>
      </div>
    );
  };

  // 渲染类型说明
  const renderTypeLegend = () => {
    return (
      <div className="type-legend">
        <h3>指标类型说明</h3>
        <ul>
          <li className="positive">
            <span className="legend-icon">↑</span>
            <span className="legend-text">正向指标：数值越高越好，例如：年化收益率、夏普比率、获利因子</span>
          </li>
          <li className="negative">
            <span className="legend-icon">↓</span>
            <span className="legend-text">负向指标：数值越低越好，例如：最大回撤、交易成本、波动率</span>
          </li>
          <li className="neutral">
            <span className="legend-icon">•</span>
            <span className="legend-text">中性指标：无明确好坏倾向，例如：交易次数</span>
          </li>
        </ul>
      </div>
    );
  };

  // 主页面渲染
  return (
    <div className="indicator-distribution-page">


      {renderFilters()}

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">
          <div className="loader"></div>
          <p>加载指标分布数据中...</p>
        </div>
      ) : data ? (
        <div className="content">
          {renderTable()}

          {/* 分页控件 */}
          {getTotalPages() > 1 && (
            <div className="pagination-container">
              <div className="pagination-buttons">
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
                  {currentPage} / {getTotalPages()} 页 (共 {getFilteredIndicators().length} 条记录)
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === getTotalPages()}
                  className="pagination-button"
                >
                  下一页
                </button>
                <button
                  onClick={() => handlePageChange(getTotalPages())}
                  disabled={currentPage === getTotalPages()}
                  className="pagination-button"
                >
                  末页
                </button>
              </div>
              <div className="page-size-selector">
                每页
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={13}>13</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                条
              </div>
            </div>
          )}

          {/*{renderTypeLegend()}*/}
        </div>
      ) : (
        <div className="no-data-message">
          无法获取指标分布数据，请点击刷新按钮重试。
        </div>
      )}
    </div>
  );
};

export default IndicatorDistributionPage;
