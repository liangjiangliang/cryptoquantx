import React, { useState, useEffect } from 'react';
import './FundCenterPage.css';
import { fetchFundData } from '../services/api';

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
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2
    }).format(value);
  };

  // 准备图表数据
  const chartData = {
    labels: fundData.map(item => formatDateTime(item.recordTime)),
    datasets: [
      {
        label: '总资金',
        data: fundData.map(item => item.totalFund),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        tension: 0.4,
        pointRadius: timeRange === 'today' ? 3 : 1,
      },
      {
        label: '总投资',
        data: fundData.map(item => item.totalInvestment),
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        fill: false,
        tension: 0.4,
        pointRadius: 0,
      },
      {
        label: '总收益',
        data: fundData.map(item => item.totalProfit),
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: false,
        tension: 0.4,
        pointRadius: 0,
      }
    ]
  };

  // 图表配置
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#d9d9d9'
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.raw !== null ? formatCurrency(context.raw) : '无数据';
            return `${label}: ${value}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(70, 70, 70, 0.5)'
        },
        ticks: {
          color: '#d9d9d9'
        }
      },
      y: {
        grid: {
          color: 'rgba(70, 70, 70, 0.5)'
        },
        ticks: {
          color: '#d9d9d9',
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  return (
    <div className="fund-center-page">
      <div className="fund-center-header">
        <h2>资金中心</h2>
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
        </div>
      </div>

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
    </div>
  );
};

export default FundCenterPage; 