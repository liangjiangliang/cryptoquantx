import React, { useRef, useEffect, useState } from 'react';
import { createChart, CrosshairMode, Time, ISeriesApi, IChartApi, SeriesMarkerPosition } from 'lightweight-charts';
import { BacktestTradeDetail, CandlestickData } from '../../store/types';
import { formatPrice } from '../../utils/helpers';
import { fetchHistoryWithIntegrityCheck, getDefaultDateRange, formatDateTimeString } from '../../services/api';
import './BacktestDetailChart.css';

interface BacktestDetailChartProps {
  symbol: string;
  startTime: string;
  endTime: string;
  tradeDetails: BacktestTradeDetail[];
}

const BacktestDetailChart: React.FC<BacktestDetailChartProps> = ({
  symbol,
  startTime,
  endTime,
  tradeDetails
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const candleSeries = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeries = useRef<ISeriesApi<'Histogram'> | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
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
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<any[]>([]);

  // 格式化日期为显示格式
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

  // 格式化成交量
  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) {
      return (volume / 1000000).toFixed(2) + 'M';
    } else if (volume >= 1000) {
      return (volume / 1000).toFixed(2) + 'K';
    }
    return volume.toFixed(2);
  };

  // 创建图表
  const createCharts = () => {
    if (!chartContainerRef.current) return;
    
    try {
      // 创建主图表
      chart.current = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 450, // 将高度从600px减少到450px
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
      });

      // 创建蜡烛图系列 - 红涨绿跌风格
      candleSeries.current = chart.current.addCandlestickSeries({
        upColor: '#ff5555',
        downColor: '#32a852',
        borderVisible: false,
        wickUpColor: '#ff5555',
        wickDownColor: '#32a852',
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

      // 设置十字线移动事件
      setupCrosshairMoveHandler();
      
      // 加载K线数据
      loadKlineData();
      
      // 响应窗口大小变化
      const handleResize = () => {
        if (!chartContainerRef.current || !chart.current) return;
        
        const width = chartContainerRef.current.clientWidth;
        
        chart.current.applyOptions({
          width: width
        });
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    } catch (error) {
      console.error('图表初始化错误:', error);
      setError('图表初始化失败');
      // 清理可能部分创建的引用
      if (chart.current) {
        chart.current.remove();
        chart.current = null;
      }
      candleSeries.current = null;
      volumeSeries.current = null;
    }
  };

  // 设置十字线移动事件监听
  const setupCrosshairMoveHandler = () => {
    if (!chart.current || !candleSeries.current) return;

    // 主图表十字线移动事件
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

      // 检查series引用是否存在
      if (!candleSeries.current || !volumeSeries.current) {
        setHoveredData(null);
        return;
      }
      
      const candleData = param.seriesPrices.get(candleSeries.current);
      const volumeData = param.seriesPrices.get(volumeSeries.current);
      
      if (candleData && volumeData && candleData.open != null && candleData.high != null && candleData.low != null && candleData.close != null && volumeData != null) {
        // 调试信息，查看param.time的实际类型和值
        console.log('param.time类型:', typeof param.time, 'param.time值:', param.time);
        
        let time;
        
        // 处理param.time是对象的情况
        let dateStr = '';
        if (typeof param.time === 'object' && param.time !== null) {
          // 从对象中提取年月日并格式化
          const { year, month, day } = param.time;
          // 确保月份和日期是两位数
          const formattedMonth = String(month).padStart(2, '0');
          const formattedDay = String(day).padStart(2, '0');
          dateStr = `${year}-${formattedMonth}-${formattedDay}`;
          console.log('格式化后的日期:', dateStr);
        } else {
          // 如果不是对象，转为字符串
          dateStr = String(param.time);
          console.log('转换为字符串的日期:', dateStr);
        }
        
        // 尝试从原始数据中找到对应的K线
        if (originalData && originalData.length > 0) {
          const originalCandle = originalData.find(item => {
            // 检查item是否存在且有openTime属性
            if (!item || !item.openTime) return false;
            // 从openTime提取日期部分（不含时间）
            const itemDate = item.openTime.split(' ')[0];
            return itemDate === dateStr;
          });
          
          if (originalCandle) {
            // 直接使用原始数据中的日期时间格式
            time = originalCandle.openTime;
          } else {
            // 如果找不到匹配的原始数据，则使用格式化的日期字符串
            time = dateStr;
          }
        } else {
          // 没有原始数据，使用格式化的日期字符串
          time = dateStr;
        }
        
        const open = formatPrice(candleData.open);
        const high = formatPrice(candleData.high);
        const low = formatPrice(candleData.low);
        const close = formatPrice(candleData.close);
        const volume = formatVolume(volumeData);
        
        // 计算涨跌幅
        const change = (candleData.close - candleData.open).toFixed(2);
        const changePercent = ((candleData.close - candleData.open) / candleData.open * 100).toFixed(2);
        
        const hoveredInfo = {
          time,
          open,
          high,
          low,
          close,
          volume,
          change,
          changePercent
        };
        
        // 更新悬浮数据
        setHoveredData(hoveredInfo);
        
        // 设置浮层位置跟随鼠标
        if (tooltipRef.current && chartContainerRef.current) {
          // 获取chart容器的位置和大小
          const chartRect = chartContainerRef.current.getBoundingClientRect();
          
          // 在下一帧更新tooltip位置，确保DOM已更新
          requestAnimationFrame(() => {
            if (!tooltipRef.current) return;
            
            // 获取tooltip的尺寸
            const tooltipRect = tooltipRef.current.getBoundingClientRect();
            
            // 计算相对于chart容器的鼠标位置
            const x = param.point.x;
            const y = param.point.y;
            
            // 始终将悬浮窗放在鼠标左侧
            let left = x - tooltipRect.width - 20;
            
            // 如果左侧空间不足，再考虑放在右侧
            if (left < 10) {
              left = x + 20;
            }
            
            let top = y - tooltipRect.height / 2; // 垂直居中对齐
            if (top < 10) {
              top = 10; // 如果太靠上，则固定在顶部
            } else if (top + tooltipRect.height > chartRect.height - 10) {
              top = chartRect.height - tooltipRect.height - 10; // 如果太靠下，则固定在底部
            }
            
            // 更新tooltip位置
            tooltipRef.current.style.transform = 'translate3d(0, 0, 0)'; // 启用硬件加速
            tooltipRef.current.style.left = `${left}px`;
            tooltipRef.current.style.top = `${top}px`;
          });
        }
      }
    });
  };

  // 加载K线数据
  const loadKlineData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 从开始日期到结束日期获取K线数据
      const startDate = startTime.split(' ')[0];
      const endDate = endTime.split(' ')[0];
      
      // 为了确保有足够的上下文，我们获取稍微扩展的时间范围
      // 计算开始日期前30天的日期作为请求开始日期
      const extendedStartDate = new Date(startDate);
      extendedStartDate.setDate(extendedStartDate.getDate() - 30);
      extendedStartDate.setHours(0, 0, 0, 0);
      const requestStartDate = formatDateTimeString(extendedStartDate);
      
      // 计算结束日期后15天的日期作为请求结束日期
      const extendedEndDate = new Date(endDate);
      extendedEndDate.setDate(extendedEndDate.getDate() + 15);
      extendedEndDate.setHours(23, 59, 59, 999);
      const requestEndDate = formatDateTimeString(extendedEndDate);
      
      // 获取K线数据，使用fetchHistoryWithIntegrityCheck函数
      let result;
      try {
        result = await fetchHistoryWithIntegrityCheck(
          symbol,
          '1D',
          requestStartDate,
          requestEndDate
        );
        
        if (!result || !result.data || !Array.isArray(result.data) || result.data.length === 0) {
          setError('没有找到K线数据或数据格式错误');
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('加载K线数据失败:', error);
        setError('加载K线数据失败');
        setLoading(false);
        return;
      }
      
      // 保存原始K线数据，包含完整的日期时间信息
      setOriginalData(result.data);
      
      // 调试信息，查看原始数据的格式
      console.log('原始K线数据示例:', result.data.length > 0 ? result.data[0] : '无数据');
      
      // fetchHistoryWithIntegrityCheck返回的data已经是CandlestickData[]格式
      // 需要将time字段转换为Time类型以兼容lightweight-charts
      const convertedData = result.data
        .filter(item => item && item.time != null && item.open != null && item.high != null && item.low != null && item.close != null && item.volume != null)
        .map(item => ({
          ...item,
          time: item.time as Time
        }));
      
      // 调试信息，查看转换后的数据格式
      console.log('转换后的K线数据示例:', convertedData.length > 0 ? convertedData[0] : '无数据');
      
      // 更新K线图 - 添加更严格的检查
      if (candleSeries.current && volumeSeries.current && chart.current && convertedData.length > 0) {
        // 直接使用转换好的数据
        candleSeries.current.setData(convertedData);
        
        // 创建成交量数据
        const volumeData = convertedData
          .filter(item => item && item.time != null && item.volume != null && item.close != null && item.open != null)
          .map((item) => ({
            time: item.time,
            value: item.volume,
            color: item.close > item.open ? '#ff5555' : '#32a852',
          }));
        
        if (volumeData.length > 0) {
            volumeSeries.current.setData(volumeData);
          }
        
        // 绘制交易标记
        drawTradeMarkers();
        
        // 设置图表时间范围，聚焦于回测的开始和结束时间
        if (chart.current && convertedData.length > 0) {
          // 首先让图表适应所有内容
          chart.current.timeScale().fitContent();
          
          // 然后设置可见范围为回测的开始和结束时间
          setTimeout(() => {
            if (chart.current) {
              const from = startDate;
              const to = endDate;
              
              // 设置时间范围
              chart.current.timeScale().setVisibleRange({
                from,
                to,
              });
            }
          }, 100); // 小延迟确保渲染完成
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('加载K线数据失败:', err);
      setError('加载K线数据失败');
      setLoading(false);
    }
  };

  // 绘制交易标记
  const drawTradeMarkers = () => {
    if (!candleSeries.current || !chart.current || !tradeDetails || tradeDetails.length === 0) return;

    try {
      // 准备交易标记
      const markers: any[] = tradeDetails
        .filter(trade => trade && trade.entryTime && trade.exitTime && trade.entryPrice != null && trade.exitPrice != null && trade.type && trade.profit != null)
        .flatMap(trade => {
          const markers = [];
          
          // 将交易时间字符串转换为日期格式 YYYY-MM-DD
          const entryDate = trade.entryTime.split(' ')[0];
          const exitDate = trade.exitTime.split(' ')[0];
        
        // 添加入场标记 - 使用与主图相同的颜色
        markers.push({
          time: entryDate,
          position: trade.type === 'BUY' ? 'belowBar' : 'aboveBar',
          color: trade.type === 'BUY' ? '#00FFFF' : '#FF00FF', // 买入青色，卖出品红色
          shape: trade.type === 'BUY' ? 'arrowUp' : 'arrowDown',
          text: `${trade.type === 'BUY' ? '买入' : '卖出'} ${formatPrice(trade.entryPrice)}`,
          size: 2,
        });
        
        // 添加出场标记 - 使用与主图相同的颜色
        markers.push({
          time: exitDate,
          position: trade.type === 'BUY' ? 'aboveBar' : 'belowBar',
          color: trade.type === 'BUY' ? '#FFFF00' : '#00FF00', // 买入平仓黄色，卖出平仓绿色
          shape: trade.type === 'BUY' ? 'arrowDown' : 'arrowUp',
          text: `平仓 ${formatPrice(trade.exitPrice)} (${trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)})`,
          size: 2,
        });
        
        return markers;
      });
      
      // 设置标记
      candleSeries.current.setMarkers(markers);
    } catch (error) {
      console.error('绘制交易标记错误:', error);
    }
  };

  // 初始化图表
  useEffect(() => {
    createCharts();
    
    return () => {
      // 清理图表和所有引用
      if (chart.current) {
        chart.current.remove();
        chart.current = null;
      }
      candleSeries.current = null;
      volumeSeries.current = null;
    };
  }, []);

  // 当交易详情更新时，重新绘制标记
  useEffect(() => {
    if (candleSeries.current && tradeDetails && tradeDetails.length > 0) {
      drawTradeMarkers();
    }
  }, [tradeDetails]);

  return (
    <div className="backtest-detail-chart-container">
      <div 
        ref={chartContainerRef} 
        className="chart" 
        style={{ 
          height: 'auto', // 由固定600px改为自适应
          minHeight: 300,
          maxHeight: 600,
          visibility: loading ? 'hidden' : 'visible'
        }}
      />
      
      {/* K线详细信息浮层 */}
      {hoveredData && (
        <div 
          ref={tooltipRef} 
          style={{
            position: 'absolute',
            zIndex: 100,
            backgroundColor: 'rgba(30, 34, 45, 0.9)',
            border: '1px solid #2e3241',
            borderRadius: '4px',
            padding: '8px 12px',
            color: '#d9d9d9',
            fontSize: '12px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
            pointerEvents: 'none', // 允许鼠标点击事件穿透到下面的图表
            left: '0px', // 初始位置，会被JavaScript动态更新
            top: '0px',  // 初始位置，会被JavaScript动态更新
            minWidth: '180px',
            maxWidth: '250px'
          }}
        >
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
            <span style={{
              color: parseFloat(hoveredData.change) >= 0 ? '#ff5555' : '#32a852',
              fontWeight: '500'
            }}>
              {hoveredData.change} ({hoveredData.changePercent}%)
            </span>
          </div>
        </div>
      )}
      
      {/* 加载状态提示 */}
      {loading && (
        <div className="chart-loading">加载K线数据中...</div>
      )}
      
      {/* 错误提示 */}
      {error && (
        <div className="chart-error">{error}</div>
      )}
    </div>
  );
};

export default BacktestDetailChart;