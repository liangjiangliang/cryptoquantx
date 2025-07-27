import React, { useState, useEffect } from 'react';
import './FundCenterPage.css';
import { fetchFundData, recordFundDataManually } from '../services/api';
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

const FundCenterPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'half-year'>('today');
  const [fundData, setFundData] = useState<FundData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [chartReady, setChartReady] = useState<boolean>(false);

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

  useEffect(() => {
    const initializeAndFetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 初始化图表组件
        await initializeChart();
        setChartReady(true);

        // 获取数据
        const response = await fetchFundData(timeRange);
        if (response.success && response.data) {
          setFundData(response.data);
        } else {
          setError(response.message || '获取资金数据失败');
        }
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

  // 准备图表数据
  const chartData = {
    labels: fundData.map(item => formatDateTime(item.recordTime)),
    datasets: [
      {
        label: '总资金',
        data: fundData.map(item => item.totalFund),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: timeRange === 'today' ? 4 : 2,
        pointHoverRadius: 6,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        yAxisID: 'y',
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
              `总资金: ${formatCurrency(item.totalFund)}`,
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
          text: '资金 (¥)',
          color: '#3b82f6',
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
          color: '#3b82f6',
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
        <div className="fund-summary">
          <div className="summary-item">
            <div className="label">当前总资金</div>
            <div className="value">{formatCurrency(fundData[fundData.length - 1].totalFund)}</div>
          </div>
          <div className="summary-item">
            <div className="label">总投资</div>
            <div className="value">{formatCurrency(fundData[fundData.length - 1].totalInvestment)}</div>
          </div>
          <div className="summary-item">
            <div className="label">总收益</div>
            <div className={`value ${fundData[fundData.length - 1].totalProfit >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(fundData[fundData.length - 1].totalProfit)}
            </div>
          </div>
          <div className="summary-item">
            <div className="label">收益率</div>
            <div className={`value ${fundData[fundData.length - 1].totalProfit >= 0 ? 'positive' : 'negative'}`}>
              {((fundData[fundData.length - 1].totalProfit / fundData[fundData.length - 1].totalInvestment) * 100).toFixed(2)}%
            </div>
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