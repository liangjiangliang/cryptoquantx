import React, { useEffect, useRef, useState } from 'react';
import { createChart, CrosshairMode, Time, LineWidth } from 'lightweight-charts';
import { useSelector, useDispatch } from 'react-redux';
import { AppState, CandlestickData } from '../../store/types';
import { updateCandlestickData } from '../../store/actions';
import { fetchHistoryWithIntegrityCheck } from '../../services/api';
import DataLoadModal from '../DataLoadModal/DataLoadModal';
import './CandlestickChart.css';

// 格式化日期
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 格式化价格
const formatPrice = (price: number): string => {
  return price.toFixed(2);
};

// 格式化成交量
const formatVolume = (volume: number): string => {
  if (volume >= 1000000) {
    return (volume / 1000000).toFixed(2) + 'M';
  } else if (volume >= 1000) {
    return (volume / 1000).toFixed(2) + 'K';
  }
  return volume.toFixed(2);
};

const CandlestickChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const chart = useRef<any>(null);
  const candleSeries = useRef<any>(null);
  const volumeSeries = useRef<any>(null);
  
  // 当前鼠标悬浮的K线数据
  const [hoveredData, setHoveredData] = useState<{
    time: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
    change: string;
    changePercent: string;
  } | null>(null);
  
  // 数据加载弹窗状态
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [responseMessage, setResponseMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const dispatch = useDispatch();
  const candlestickData = useSelector((state: AppState) => state.candlestickData);
  const selectedPair = useSelector((state: AppState) => state.selectedPair);
  const timeframe = useSelector((state: AppState) => state.timeframe);
  
  // 创建图表
  useEffect(() => {
    if (chartContainerRef.current) {
      // 清除旧图表
      if (chart.current) {
        chart.current.remove();
      }

      try {
        // 创建新图表
        const chartOptions = {
          width: chartContainerRef.current.clientWidth,
          height: 500,
          layout: {
            background: { color: '#1e222d' },
            textColor: '#d9d9d9',
          },
          grid: {
            vertLines: { color: '#2e3241' },
            horzLines: { color: '#2e3241' },
          },
          crosshair: {
            mode: CrosshairMode.Normal,
            vertLine: {
              color: '#555',
              style: 1,
              visible: true,
              labelVisible: false,
            },
            horzLine: {
              color: '#555',
              style: 1,
              visible: true,
              labelVisible: true,
            },
          },
          rightPriceScale: {
            borderColor: '#2e3241',
          },
          timeScale: {
            borderColor: '#2e3241',
            timeVisible: true,
            secondsVisible: false,
          },
        };

        chart.current = createChart(chartContainerRef.current, chartOptions);

        // 创建蜡烛图系列 - 红涨绿跌风格
        candleSeries.current = chart.current.addCandlestickSeries({
          upColor: '#ff5555',       // 上涨颜色改为红色
          downColor: '#32a852',     // 下跌颜色改为绿色
          borderVisible: false,
          wickUpColor: '#ff5555',   // 上涨影线颜色改为红色
          wickDownColor: '#32a852', // 下跌影线颜色改为绿色
          priceFormat: {
            type: 'price',
            precision: 2,
            minMove: 0.01,
          },
        });

        // 创建成交量系列 - 红涨绿跌风格
        volumeSeries.current = chart.current.addHistogramSeries({
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: '',
          scaleMargins: {
            top: 0.8,
            bottom: 0,
          },
        });

        // 添加鼠标悬浮事件监听
        chart.current.subscribeCrosshairMove((param: any) => {
          if (
            param.point === undefined ||
            !param.time ||
            param.point.x < 0 ||
            param.point.y < 0
          ) {
            setHoveredData(null);
            return;
          }

          const candleData = param.seriesPrices.get(candleSeries.current);
          const volumeData = param.seriesPrices.get(volumeSeries.current);
          
          if (candleData && volumeData) {
            const time = formatDate(param.time);
            const open = formatPrice(candleData.open);
            const high = formatPrice(candleData.high);
            const low = formatPrice(candleData.low);
            const close = formatPrice(candleData.close);
            const volume = formatVolume(volumeData);
            
            // 计算涨跌幅
            const change = (candleData.close - candleData.open).toFixed(2);
            const changePercent = ((candleData.close - candleData.open) / candleData.open * 100).toFixed(2);
            
            setHoveredData({
              time,
              open,
              high,
              low,
              close,
              volume,
              change,
              changePercent
            });
          }
        });

        // 响应窗口大小变化
        const handleResize = () => {
          if (chart.current && chartContainerRef.current) {
            chart.current.applyOptions({
              width: chartContainerRef.current.clientWidth,
            });
          }
        };

        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
          if (chart.current) {
            chart.current.remove();
          }
        };
      } catch (error) {
        console.error('图表初始化错误:', error);
      }
    }
  }, []);

  // 更新数据
  useEffect(() => {
    try {
      if (candleSeries.current && volumeSeries.current && candlestickData.length > 0) {
        // 格式化数据
        const formattedData = candlestickData.map((item: CandlestickData) => ({
          time: item.time as Time,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        }));

        const volumeData = candlestickData.map((item: CandlestickData) => ({
          time: item.time as Time,
          value: item.volume,
          color: item.close > item.open ? '#ff5555' : '#32a852', // 红涨绿跌
        }));

        // 设置数据
        candleSeries.current.setData(formattedData);
        volumeSeries.current.setData(volumeData);

        // 适配视图
        chart.current?.timeScale().fitContent();
      }
    } catch (error) {
      console.error('更新图表数据错误:', error);
    }
  }, [candlestickData]);

  // 更新标题和处理周期变化
  useEffect(() => {
    try {
      if (chart.current) {
        chart.current.applyOptions({
          layout: {
            textColor: '#d9d9d9',
            background: { color: '#1e222d' },
          }
        });
        
        // 周期变化时清空K线数据
        if (candleSeries.current && volumeSeries.current) {
          // 清空图表数据
          candleSeries.current.setData([]);
          volumeSeries.current.setData([]);
          
          // 清空Redux中的数据
          dispatch(updateCandlestickData([]));
        }
      }
    } catch (error) {
      console.error('更新图表标题错误:', error);
    }
  }, [selectedPair, timeframe, dispatch]);

  // 处理加载历史数据
  const handleLoadHistoryData = async (
    symbol: string,
    interval: string,
    startDate: string,
    endDate: string
  ) => {
    try {
      const result = await fetchHistoryWithIntegrityCheck(
        symbol,
        interval,
        startDate,
        endDate
      );
      
      console.log('API返回结果:', result); // 调试日志
      
      // 直接返回API响应结果，不做数据验证
      return result;
    } catch (error: any) {
      console.error('加载历史数据失败:', error);
      throw error;
    }
  };

  // 处理加载数据按钮点击
  const handleLoadDataClick = () => {
    setIsModalOpen(true);
  };

  // 格式化日期为API所需格式
  const formatDateForApi = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day} 00:00:00`;
  };

  // 处理查询按钮点击
  const handleQueryClick = async () => {
    setIsLoading(true);
    
    try {
      // 获取当前日期
      const now = new Date();
      
      // 默认查询过去一年的数据
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      
      const startTimeStr = formatDateForApi(oneYearAgo);
      const endTimeStr = formatDateForApi(now);
      
      // 构建API URL
      const url = `/api/market/query_saved_history?symbol=${selectedPair}&interval=${timeframe}&startTimeStr=${encodeURIComponent(startTimeStr)}&endTimeStr=${encodeURIComponent(endTimeStr)}`;
      
      console.log('查询URL:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('查询结果:', data);
      
      if (data && data.data && Array.isArray(data.data)) {
        // 转换数据格式
        const candlestickData = data.data.map((item: any) => {
          // 将日期字符串转换为时间戳（秒）
          const openTime = new Date(item.openTime).getTime() / 1000;
          
          return {
            time: openTime,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            volume: item.volume
          };
        });
        
        // 更新Redux中的数据
        dispatch(updateCandlestickData(candlestickData));
        
        // 显示成功消息
        setResponseMessage(`成功加载 ${data.data.length} 条数据`);
      } else {
        setResponseMessage('没有找到符合条件的数据');
      }
    } catch (error: any) {
      console.error('查询数据失败:', error);
      setResponseMessage(`查询失败: ${error.message || '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="candlestick-chart-container">
      <div className="chart-header">
        <h2>{selectedPair} - {timeframe}</h2>
        <div className="chart-buttons">
          <button className="query-button" onClick={handleQueryClick} disabled={isLoading}>
            {isLoading ? '查询中...' : '查询数据'}
          </button>
          <button className="load-data-button" onClick={handleLoadDataClick}>
            加载历史数据
          </button>
        </div>
      </div>
      <div className="chart-wrapper">
        <div ref={chartContainerRef} className="chart-content">
          {candlestickData.length === 0 && (
            <div className="empty-data-message">
              <p>没有可显示的数据</p>
              <p>请点击"查询数据"或"加载历史数据"按钮获取数据</p>
            </div>
          )}
          {isLoading && (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
              <p>正在加载数据...</p>
            </div>
          )}
        </div>
        
        {/* K线详细信息浮层 */}
        {hoveredData && (
          <div className="chart-tooltip" ref={tooltipRef}>
            <div className="tooltip-row">
              <span className="tooltip-label">时间:</span>
              <span className="tooltip-value">{hoveredData.time}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">开盘:</span>
              <span className="tooltip-value">{hoveredData.open}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">最高:</span>
              <span className="tooltip-value">{hoveredData.high}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">最低:</span>
              <span className="tooltip-value">{hoveredData.low}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">收盘:</span>
              <span className="tooltip-value">{hoveredData.close}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">成交量:</span>
              <span className="tooltip-value">{hoveredData.volume}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">涨跌:</span>
              <span className={`tooltip-value ${parseFloat(hoveredData.change) >= 0 ? 'positive' : 'negative'}`}>
                {hoveredData.change} ({hoveredData.changePercent}%)
              </span>
            </div>
          </div>
        )}
        
        {/* 数据加载弹窗 */}
        <DataLoadModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onLoadData={handleLoadHistoryData}
        />
      </div>
    </div>
  );
};

export default CandlestickChart; 