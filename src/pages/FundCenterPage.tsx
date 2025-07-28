import React, { useState, useEffect } from 'react';
import './FundCenterPage.css';
import { fetchFundData, recordFundDataManually, fetchHoldingPositionsProfits } from '../services/api';
import FundRecordModal from '../components/FundRecordModal/FundRecordModal';
import ConfirmModal from '../components/ConfirmModal/ConfirmModal';

// 动态导入Chart.js组件
let Line: any = null;
let ChartJS: any = null;
let chartComponents: any = null;

const initializeChart = async () => {
  if (!Line) {
    const chartModule = await import('react-chartjs-2');
    const chartJSModule = await import('chart.js');

    Line = chartModule.Line;
    ChartJS = chartJSModule.Chart;
    chartComponents = {
      CategoryScale: chartJSModule.CategoryScale,
      LinearScale: chartJSModule.LinearScale,
      PointElement: chartJSModule.PointElement,
      LineElement: chartJSModule.LineElement,
      Title: chartJSModule.Title,
      Tooltip: chartJSModule.Tooltip,
      Legend: chartJSModule.Legend
    };

    // 注册ChartJS组件
    ChartJS.register(
      chartComponents.CategoryScale,
      chartComponents.LinearScale,
      chartComponents.PointElement,
      chartComponents.LineElement,
      chartComponents.Title,
      chartComponents.Tooltip,
      chartComponents.Legend
    );
  }
};

interface FundData {
  id: number;
  totalInvestment: number;
  totalProfit: number;
  totalFund: number;
  recordTime: string;
}

interface ProfitStatistics {
  profitByStrategyName: { [key: string]: number };
  profitByStrategySymbol: { [key: string]: number };
  totalHlodingInvestmentAmount?: number;
  todayProfit?: number;
}

const FundCenterPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'half-year'>('week');
  const [fundData, setFundData] = useState<FundData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [chartReady, setChartReady] = useState<boolean>(false);

  // 持仓收益统计数据
  const [profitStatistics, setProfitStatistics] = useState<ProfitStatistics | null>(null);
  const [profitLoading, setProfitLoading] = useState<boolean>(false);

  // 表格显示条数
  const tableDisplayCount = 10;

  // 排序状态
  const [strategyNameSortOrder, setStrategyNameSortOrder] = useState<'asc' | 'desc'>('desc');
  const [strategySymbolSortOrder, setStrategySymbolSortOrder] = useState<'asc' | 'desc'>('desc');

  // 手动记录相关状态
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordModal, setRecordModal] = useState({
    isOpen: false,
    data: null as any
  });
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    message: ''
  });

  // 获取持仓收益统计数据
  const fetchProfitStatistics = async () => {
    setProfitLoading(true);
    try {
      const result = await fetchHoldingPositionsProfits();
      if (result.success && result.data && result.data.statistics) {
        setProfitStatistics({
          profitByStrategyName: result.data.statistics.profitByStrategyName || {},
          profitByStrategySymbol: result.data.statistics.profitByStrategySymbol || {},
          totalHlodingInvestmentAmount: result.data.statistics.totalHlodingInvestmentAmount,
          todayProfit: result.data.statistics.todayProfit
        });
      }
    } catch (error) {
      console.error('获取持仓收益统计失败:', error);
    } finally {
      setProfitLoading(false);
    }
  };

  useEffect(() => {
    const initializeAndFetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 初始化图表组件
        await initializeChart();
        setChartReady(true);

        // 获取资金数据
        const response = await fetchFundData(timeRange);
        if (response.success && response.data) {
          setFundData(response.data);
        } else {
          setError(response.message || '获取资金数据失败');
        }

        // 获取持仓收益统计数据
        await fetchProfitStatistics();
      } catch (err) {
        setError('获取资金数据时发生错误');
        console.error('获取资金数据错误:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAndFetchData();
  }, [timeRange]);

  // 手动记录资金数据
  const handleManualRecord = async () => {
    setIsRecording(true);

    try {
      const result = await recordFundDataManually();

      if (result.success && result.data) {
        // 显示成功弹窗
        setRecordModal({
          isOpen: true,
          data: result.data
        });

        // 刷新数据
        const response = await fetchFundData(timeRange);
        if (response.success && response.data) {
          setFundData(response.data);
        }
      } else {
        // 显示错误弹窗
        setErrorModal({
          isOpen: true,
          message: result.message || '记录资金数据失败'
        });
      }
    } catch (error) {
      console.error('手动记录资金数据失败:', error);
      setErrorModal({
        isOpen: true,
        message: '记录资金数据时发生错误'
      });
    } finally {
      setIsRecording(false);
    }
  };

  // 关闭记录成功弹窗
  const closeRecordModal = () => {
    setRecordModal({
      isOpen: false,
      data: null
    });
  };

  // 关闭错误弹窗
  const closeErrorModal = () => {
    setErrorModal({
      isOpen: false,
      message: ''
    });
  };

  // 格式化日期时间
  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);

    if (timeRange === 'today') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (timeRange === 'week') {
      return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  };

  // 格式化金额
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // 排序处理函数
  const handleStrategyNameSort = () => {
    setStrategyNameSortOrder(strategyNameSortOrder === 'desc' ? 'asc' : 'desc');
  };

  const handleStrategySymbolSort = () => {
    setStrategySymbolSortOrder(strategySymbolSortOrder === 'desc' ? 'asc' : 'desc');
  };

  // 获取排序图标
  const getSortIcon = (sortOrder: 'asc' | 'desc') => {
    return sortOrder === 'desc' ? '↓' : '↑';
  };



  // 准备图表数据
  const chartData = {
    labels: fundData.map(item => formatDateTime(item.recordTime)),
    datasets: [
      {
        label: '总收益',
        data: fundData.map(item => item.totalProfit),
        borderColor: fundData.length > 0 && fundData[fundData.length - 1].totalProfit >= 0 ? '#10b981' : '#ef4444',
        backgroundColor: fundData.length > 0 && fundData[fundData.length - 1].totalProfit >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointBackgroundColor: fundData.length > 0 && fundData[fundData.length - 1].totalProfit >= 0 ? '#10b981' : '#ef4444',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        yAxisID: 'y',
      },
      {
        label: '收益率参考',
        data: fundData.map(item => (item.totalProfit / item.totalInvestment) * 100),
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 0,
        yAxisID: 'y1',
        hidden: true, // 隐藏这条线，只用于Y轴刻度计算
      }
    ]
  };

  // 图表配置
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(30, 34, 45, 0.95)',
        titleColor: '#d9d9d9',
        bodyColor: '#d9d9d9',
        borderColor: '#3a3f4c',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: false,
        callbacks: {
          title: function (context: any) {
            if (context.length > 0) {
              const dataIndex = context[0].dataIndex;
              const recordTime = fundData[dataIndex]?.recordTime;
              if (recordTime) {
                const date = new Date(recordTime);
                return date.toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                });
              }
            }
            return '';
          },
          label: function (context: any) {
            const dataIndex = context.dataIndex;
            const item = fundData[dataIndex];

            if (!item) return '';

            const lines = [
              `总投资: ${formatCurrency(item.totalInvestment)}`,
              `总收益: ${formatCurrency(item.totalProfit)}`,
              `收益率: ${((item.totalProfit / item.totalInvestment) * 100).toFixed(2)}%`
            ];

            return lines;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(70, 70, 70, 0.3)',
          drawBorder: false
        },
        ticks: {
          color: '#a0a0a0',
          font: {
            size: 12
          }
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: '收益',
          color: fundData.length > 0 && fundData[fundData.length - 1].totalProfit >= 0 ? '#10b981' : '#ef4444',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(70, 70, 70, 0.3)',
          drawBorder: false
        },
        ticks: {
          color: fundData.length > 0 && fundData[fundData.length - 1].totalProfit >= 0 ? '#10b981' : '#ef4444',
          font: {
            size: 11
          },
          callback: function (value: any) {
            return formatCurrency(value);
          }
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: '收益率 (%)',
          color: fundData.length > 0 && fundData[fundData.length - 1].totalProfit >= 0 ? '#10b981' : '#ef4444',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        grid: {
          drawOnChartArea: false,
          drawBorder: false
        },
        min: (() => {
          if (fundData.length === 0) return -5;
          const profitRates = fundData.map(item => (item.totalProfit / item.totalInvestment) * 100);
          const minRate = Math.min(...profitRates);
          return Math.floor(minRate) - 1;
        })(),
        max: (() => {
          if (fundData.length === 0) return 5;
          const profitRates = fundData.map(item => (item.totalProfit / item.totalInvestment) * 100);
          const maxRate = Math.max(...profitRates);
          return Math.ceil(maxRate) + 1;
        })(),
        ticks: {
          color: fundData.length > 0 && fundData[fundData.length - 1].totalProfit >= 0 ? '#10b981' : '#ef4444',
          font: {
            size: 11
          },
          callback: function (value: any) {
            return `${value.toFixed(1)}%`;
          }
        }
      }
    }
  };

  return (
    <div className="fund-center-page">
      <div className="fund-center-header">
        <div className="time-range-selector">
          <button
            className={timeRange === 'today' ? 'active' : ''}
            onClick={() => setTimeRange('today')}
          >
            当天
          </button>
          <button
            className={timeRange === 'week' ? 'active' : ''}
            onClick={() => setTimeRange('week')}
          >
            近7天
          </button>
          <button
            className={timeRange === 'month' ? 'active' : ''}
            onClick={() => setTimeRange('month')}
          >
            30天
          </button>
          <button
            className={timeRange === 'half-year' ? 'active' : ''}
            onClick={() => setTimeRange('half-year')}
          >
            半年
          </button>
          <button
            className="manual-record-btn"
            onClick={handleManualRecord}
            disabled={isRecording}
          >
            {isRecording ? '记录中...' : '手动记录'}
          </button>
        </div>
      </div>

      {fundData.length > 0 && (
        <div className="fund-statistics-panel">
          {/* <div className="stat-item">
            <span className="stat-label">当前总资金</span>
            <span className="stat-value">{formatCurrency(fundData[fundData.length - 1].totalFund)}</span>
          </div> */}
          <div className="stat-item">
            <span className="stat-label">总投资</span>
            <span className="stat-value">{formatCurrency(fundData[fundData.length - 1].totalInvestment)}</span>
          </div>
          {profitStatistics && (
            <div className="stat-item">
              <span className="stat-label">持仓投资金额</span>
              <span className="stat-value">{formatCurrency(profitStatistics.totalHlodingInvestmentAmount || 0)}</span>
            </div>
          )}
          <div className="stat-item">
            <span className="stat-label">总收益</span>
            <span className={`stat-value ${fundData[fundData.length - 1].totalProfit >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(fundData[fundData.length - 1].totalProfit)}
            </span>
          </div>
          {profitStatistics && (
            <div className="stat-item">
              <span className="stat-label">今日收益</span>
              <span className={`stat-value ${(profitStatistics.todayProfit || 0) >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(profitStatistics.todayProfit || 0)}
              </span>
            </div>
          )}
          <div className="stat-item">
            <span className="stat-label">收益率</span>
            <span className={`stat-value ${fundData[fundData.length - 1].totalProfit >= 0 ? 'positive' : 'negative'}`}>
              {((fundData[fundData.length - 1].totalProfit / fundData[fundData.length - 1].totalInvestment) * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      <div className="fund-chart-container">
        {isLoading ? (
          <div className="loading-indicator">加载中...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : fundData.length > 0 && chartReady && Line ? (
          <Line data={chartData} options={chartOptions} />
        ) : fundData.length > 0 && !chartReady ? (
          <div className="loading-indicator">图表加载中...</div>
        ) : (
          <div className="no-data-message">暂无资金数据</div>
        )}
      </div>

      {/* 收益统计表格 */}
      {profitStatistics && (
        <div className="profit-statistics-container">
          <div className="statistics-tables">
            {/* 按策略名称分组的收益统计 */}
            <div className="statistics-table-wrapper">
              <h3 className="table-title">按策略名称收益统计（前10名）</h3>
              <div className="table-container">
                <table className="profit-table">
                  <thead>
                    <tr>
                      <th>策略名称</th>
                      <th
                        className="sortable-header"
                        onClick={handleStrategyNameSort}
                        style={{ cursor: 'pointer' }}
                      >
                        收益金额 {getSortIcon(strategyNameSortOrder)}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(profitStatistics.profitByStrategyName)
                      .sort(([, a], [, b]) => strategyNameSortOrder === 'desc' ? b - a : a - b) // 根据排序状态排列
                      .slice(0, tableDisplayCount) // 只显示前10个
                      .map(([strategyName, profit]) => (
                        <tr key={strategyName}>
                          <td>{strategyName}</td>
                          <td className={profit >= 0 ? 'profit-positive' : 'profit-negative'}>
                            {formatCurrency(profit)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 按币种分组的收益统计 */}
            <div className="statistics-table-wrapper">
              <h3 className="table-title">按币种收益统计（前10名）</h3>
              <div className="table-container">
                <table className="profit-table">
                  <thead>
                    <tr>
                      <th>交易对</th>
                      <th
                        className="sortable-header"
                        onClick={handleStrategySymbolSort}
                        style={{ cursor: 'pointer' }}
                      >
                        收益金额 {getSortIcon(strategySymbolSortOrder)}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(profitStatistics.profitByStrategySymbol)
                      .sort(([, a], [, b]) => strategySymbolSortOrder === 'desc' ? b - a : a - b) // 根据排序状态排列
                      .slice(0, tableDisplayCount) // 只显示前10个
                      .map(([symbol, profit]) => (
                        <tr key={symbol}>
                          <td>{symbol}</td>
                          <td className={profit >= 0 ? 'profit-positive' : 'profit-negative'}>
                            {formatCurrency(profit)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {profitLoading && (
            <div className="loading-indicator">加载收益统计中...</div>
          )}
        </div>
      )}

      {/* 资金记录成功弹窗 */}
      <FundRecordModal
        isOpen={recordModal.isOpen}
        onClose={closeRecordModal}
        data={recordModal.data}
      />

      {/* 错误信息弹窗 */}
      <ConfirmModal
        isOpen={errorModal.isOpen}
        title="记录失败"
        message={errorModal.message}
        confirmText="确定"
        cancelText=""
        onConfirm={closeErrorModal}
        onCancel={closeErrorModal}
        type="danger"
      />
    </div>
  );
};

export default FundCenterPage; 