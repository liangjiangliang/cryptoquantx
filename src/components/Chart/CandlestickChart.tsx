import React, { useEffect, useRef, useState } from 'react';
import { createChart, CrosshairMode, Time, LineWidth, ISeriesApi, IChartApi } from 'lightweight-charts';
import { useSelector, useDispatch } from 'react-redux';
import { AppState, CandlestickData } from '../../store/types';
import { updateCandlestickData } from '../../store/actions';
import { fetchHistoryWithIntegrityCheck } from '../../services/api';
import DataLoadModal from '../DataLoadModal/DataLoadModal';
import IndicatorSelector, { IndicatorType } from './IndicatorSelector';
import { 
  calculateMACD, 
  calculateRSI, 
  calculateKDJ, 
  calculateBollingerBands, 
  extractClosePrices, 
  extractHighPrices, 
  extractLowPrices 
} from '../../utils/indicators';
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
  // 主图表容器
  const chartContainerRef = useRef<HTMLDivElement>(null);
  // 副图表容器
  const macdChartRef = useRef<HTMLDivElement>(null);
  const rsiChartRef = useRef<HTMLDivElement>(null);
  const kdjChartRef = useRef<HTMLDivElement>(null);
  
  // 浮层提示参考
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // 主图表和系列
  const chart = useRef<IChartApi | null>(null);
  const candleSeries = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeries = useRef<ISeriesApi<'Histogram'> | null>(null);
  
  // 副图表
  const macdChart = useRef<IChartApi | null>(null);
  const rsiChart = useRef<IChartApi | null>(null);
  const kdjChart = useRef<IChartApi | null>(null);
  
  // 指标数据系列
  const mainIndicatorSeries = useRef<Array<ISeriesApi<'Line'> | ISeriesApi<'Histogram'> | null>>([]);
  const macdSeries = useRef<Array<ISeriesApi<'Line'> | ISeriesApi<'Histogram'> | null>>([]);
  const rsiSeries = useRef<Array<ISeriesApi<'Line'> | null>>([]);
  const kdjSeries = useRef<Array<ISeriesApi<'Line'> | null>>([]);
  
  // 当前启用的副图表
  const [activeSubCharts, setActiveSubCharts] = useState<IndicatorType[]>([]);
  
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
    indicators?: {
      boll?: {
        upper: string;
        middle: string;
        lower: string;
      };
      macd?: {
        macd: string;
        signal: string;
        histogram: string;
      };
      rsi?: string;
      kdj?: {
        k: string;
        d: string;
        j: string;
      };
    };
  } | null>(null);
  
  // 指标选择状态 - 修改为支持多选
  const [mainIndicator, setMainIndicator] = useState<IndicatorType>('none');
  const [subIndicators, setSubIndicators] = useState<IndicatorType[]>([]);
  
  // 数据加载弹窗状态
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [responseMessage, setResponseMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // 添加历史数据加载状态变量，防止重复查询
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);
  // 添加面板显示/隐藏状态
  const [showPanels, setShowPanels] = useState<boolean>(true);

  const dispatch = useDispatch();
  const candlestickData = useSelector((state: AppState) => state.candlestickData);
  const selectedPair = useSelector((state: AppState) => state.selectedPair);
  const timeframe = useSelector((state: AppState) => state.timeframe);
  
  // 检查副图指标是否被选中
  const isSubIndicatorSelected = (indicator: IndicatorType): boolean => {
    return subIndicators.includes(indicator);
  };
  
  // 安全获取数据点的方法，避免undefined或null
  const safeGetDataPoint = (dataArray: any[], index: number, defaultValue: any = null) => {
    if (!dataArray || !Array.isArray(dataArray) || index < 0 || index >= dataArray.length) {
      return defaultValue;
    }
    const value = dataArray[index];
    return value === undefined || value === null || isNaN(value) ? defaultValue : value;
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
        
        // 查找对应时间点的指标值
        const indicators: any = {};
        
        try {
          // 找到当前时间点对应的数据索引
          const dataIndex = candlestickData.findIndex(d => d.time === param.time);
          
          if (dataIndex !== -1) {
            // 获取各指标的值
            if (mainIndicator === 'boll') {
              try {
                const closePrices = extractClosePrices(candlestickData);
                const { upper, middle, lower } = calculateBollingerBands(closePrices);
                
                const upperValue = safeGetDataPoint(upper, dataIndex);
                const middleValue = safeGetDataPoint(middle, dataIndex);
                const lowerValue = safeGetDataPoint(lower, dataIndex);
                
                if (upperValue !== null && middleValue !== null && lowerValue !== null) {
                  indicators.boll = {
                    upper: formatPrice(upperValue),
                    middle: formatPrice(middleValue),
                    lower: formatPrice(lowerValue)
                  };
                }
              } catch (error) {
                console.error('获取BOLL指标数据错误:', error);
              }
            }
            
            if (isSubIndicatorSelected('macd')) {
              try {
                const closePrices = extractClosePrices(candlestickData);
                const { macd, signal, histogram } = calculateMACD(closePrices);
                
                const macdValue = safeGetDataPoint(macd, dataIndex);
                const signalValue = safeGetDataPoint(signal, dataIndex);
                const histogramValue = safeGetDataPoint(histogram, dataIndex);
                
                if (macdValue !== null && signalValue !== null && histogramValue !== null) {
                  indicators.macd = {
                    macd: macdValue.toFixed(4),
                    signal: signalValue.toFixed(4),
                    histogram: histogramValue.toFixed(4)
                  };
                }
              } catch (error) {
                console.error('获取MACD指标数据错误:', error);
              }
            } 
            
            if (isSubIndicatorSelected('rsi')) {
              try {
                const closePrices = extractClosePrices(candlestickData);
                const rsiData = calculateRSI(closePrices);
                
                const rsiValue = safeGetDataPoint(rsiData, dataIndex);
                
                if (rsiValue !== null) {
                  indicators.rsi = rsiValue.toFixed(2);
                }
              } catch (error) {
                console.error('获取RSI指标数据错误:', error);
              }
            } 
            
            if (isSubIndicatorSelected('kdj')) {
              try {
                const closePrices = extractClosePrices(candlestickData);
                const highPrices = extractHighPrices(candlestickData);
                const lowPrices = extractLowPrices(candlestickData);
                const { k, d, j } = calculateKDJ(highPrices, lowPrices, closePrices);
                
                const kValue = safeGetDataPoint(k, dataIndex);
                const dValue = safeGetDataPoint(d, dataIndex);
                const jValue = safeGetDataPoint(j, dataIndex);
                
                if (kValue !== null && dValue !== null && jValue !== null) {
                  indicators.kdj = {
                    k: kValue.toFixed(2),
                    d: dValue.toFixed(2),
                    j: jValue.toFixed(2)
                  };
                }
              } catch (error) {
                console.error('获取KDJ指标数据错误:', error);
              }
            }
          }
        } catch (error) {
          console.error('处理指标数据错误:', error);
        }
        
        setHoveredData({
          time,
          open,
          high,
          low,
          close,
          volume,
          change,
          changePercent,
          indicators
        });
      }
    });
  };

  // 创建所有图表
  const createCharts = () => {
    if (!chartContainerRef.current) return;
    
    try {
      // 获取容器高度
      const containerHeight = chartContainerRef.current.clientHeight || 600;
      const mainChartHeight = Math.max(400, containerHeight * 0.7); // 主图占70%或至少400px
      const subChartHeight = 150; // 每个副图的高度
      
      // 通用图表选项
      const commonOptions = {
          width: chartContainerRef.current.clientWidth,
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

      // 只有当主图表不存在时才创建主图表
      if (!chart.current) {
        // 创建主图表
        chart.current = createChart(chartContainerRef.current, {
          ...commonOptions,
          height: mainChartHeight,
        });

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

        // 设置十字线移动事件
        setupCrosshairMoveHandler();
      }
      
      // 响应窗口大小变化
      const handleResize = () => {
        if (!chartContainerRef.current) return;
        
        const width = chartContainerRef.current.clientWidth;
        const height = chartContainerRef.current.clientHeight || 600;
        const mainHeight = Math.max(400, height * 0.7);
        
        // 添加延迟，确保DOM已完全更新
        setTimeout(() => {
          // 更新主图表尺寸
          if (chart.current) {
            chart.current.applyOptions({ 
              width,
              height: mainHeight
            });
          }
          
          // 更新所有副图表尺寸
          if (macdChart.current) {
            macdChart.current.applyOptions({ 
              width,
              height: subChartHeight
            });
          }
          
          if (rsiChart.current) {
            rsiChart.current.applyOptions({ 
              width,
              height: subChartHeight
            });
          }
          
          if (kdjChart.current) {
            kdjChart.current.applyOptions({ 
              width,
              height: subChartHeight
            });
          }

          // 同步所有图表的时间轴
          syncTimeScales();
          
          // 使图表内容适应新尺寸
          if (chart.current && candlestickData.length > 0) {
            chart.current.timeScale().fitContent();
          }
        }, 100);
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    } catch (error) {
      console.error('图表初始化错误:', error);
    }
  };

  // 使用useEffect创建和更新图表
  useEffect(() => {
    const cleanup = createCharts();
    
    // 当组件卸载时，清除所有图表
    return () => {
      if (cleanup) cleanup();
      
      if (chart.current) {
        chart.current.remove();
        chart.current = null;
      }
      
      if (macdChart.current) {
        macdChart.current.remove();
        macdChart.current = null;
      }
      
      if (rsiChart.current) {
        rsiChart.current.remove();
        rsiChart.current = null;
      }
      
      if (kdjChart.current) {
        kdjChart.current.remove();
        kdjChart.current = null;
      }
    };
  }, []);

  // 副图指标变化时，只更新副图，不影响主图
  useEffect(() => {
    if (subIndicators && chart.current) {
      // 延迟更新指标，确保DOM元素准备就绪
      setTimeout(() => {
        updateIndicators();
      }, 0);
    }
  }, [subIndicators]);

  // 同步所有图表的时间轴
  const syncTimeScales = () => {
    if (!chart.current) return;
    
    const mainTimeScale = chart.current.timeScale();
    const visibleRange = mainTimeScale.getVisibleRange();
    
    if (!visibleRange) return;
    
    // 同步MACD图表
    if (macdChart.current) {
      macdChart.current.timeScale().setVisibleRange(visibleRange);
    }
    
    // 同步RSI图表
    if (rsiChart.current) {
      rsiChart.current.timeScale().setVisibleRange(visibleRange);
    }
    
    // 同步KDJ图表
    if (kdjChart.current) {
      kdjChart.current.timeScale().setVisibleRange(visibleRange);
    }
  };

  // 为所有副图表添加时间轴变化事件
  const setupSubChartTimeScaleEvents = () => {
    // 为MACD图表添加时间轴变化事件
    if (macdChart.current) {
      macdChart.current.timeScale().subscribeVisibleTimeRangeChange((range) => {
        if (range && chart.current) {
          chart.current.timeScale().setVisibleRange(range);
          // 同步其他副图
          if (rsiChart.current) rsiChart.current.timeScale().setVisibleRange(range);
          if (kdjChart.current) kdjChart.current.timeScale().setVisibleRange(range);
        }
      });
    }
    
    // 为RSI图表添加时间轴变化事件
    if (rsiChart.current) {
      rsiChart.current.timeScale().subscribeVisibleTimeRangeChange((range) => {
        if (range && chart.current) {
          chart.current.timeScale().setVisibleRange(range);
          // 同步其他副图
          if (macdChart.current) macdChart.current.timeScale().setVisibleRange(range);
          if (kdjChart.current) kdjChart.current.timeScale().setVisibleRange(range);
        }
      });
    }
    
    // 为KDJ图表添加时间轴变化事件
    if (kdjChart.current) {
      kdjChart.current.timeScale().subscribeVisibleTimeRangeChange((range) => {
        if (range && chart.current) {
          chart.current.timeScale().setVisibleRange(range);
          // 同步其他副图
          if (macdChart.current) macdChart.current.timeScale().setVisibleRange(range);
          if (rsiChart.current) rsiChart.current.timeScale().setVisibleRange(range);
        }
      });
    }
  };

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
        
        // 更新指标
        setTimeout(() => {
          updateIndicators();
        }, 0);
      }
    } catch (error) {
      console.error('更新图表数据错误:', error);
    }
  }, [candlestickData]);

  // 订阅主图表的时间范围变化事件
  useEffect(() => {
    if (chart.current) {
      // 添加时间轴变化事件监听
      chart.current.timeScale().subscribeVisibleTimeRangeChange(syncTimeScales);
      
      return () => {
        // 清除事件监听
        if (chart.current) {
          chart.current.timeScale().unsubscribeVisibleTimeRangeChange(syncTimeScales);
        }
      };
    }
  }, [chart.current]);

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
          
          // 清空指标
          clearIndicators();
        }
      }
    } catch (error) {
      console.error('更新图表标题错误:', error);
    }
  }, [selectedPair, timeframe, dispatch]);
  
  // 监听指标变化
  useEffect(() => {
    try {
      updateIndicators();
    } catch (error) {
      console.error('更新指标错误:', error);
    }
  }, [mainIndicator, subIndicators]);
  
  // 当指标选择改变时，重新设置十字线事件处理器
  useEffect(() => {
    setupCrosshairMoveHandler();
  }, [mainIndicator, subIndicators]);
  
  // 更新指标
  const updateIndicators = () => {
    try {
      if (!chart.current || !candlestickData || !candlestickData.length) {
        console.warn('无法更新指标：图表或数据不存在');
        return;
      }
      
      // 清除旧指标
      clearIndicators();
      
      // 创建一个安全的更新流程
      const safeUpdateProcess = async () => {
        try {
          // 更新主图指标
          if (mainIndicator !== 'none') {
            try {
              drawMainIndicator();
            } catch (error) {
              console.error('更新主图指标失败:', error);
            }
          }
          
          // 更新副图指标
          if (subIndicators && subIndicators.length > 0) {
            // 更新活跃的副图表列表
            setActiveSubCharts(subIndicators);
            
            // 确保所有必要的副图容器已准备好
            const allContainersReady = subIndicators.every(indicator => {
              switch (indicator) {
                case 'macd': return !!macdChartRef.current;
                case 'rsi': return !!rsiChartRef.current;
                case 'kdj': return !!kdjChartRef.current;
                default: return true;
              }
            });
            
            if (allContainersReady) {
              try {
                // 使用延迟确保DOM已完全更新
                await new Promise(resolve => setTimeout(resolve, 50));
                
                // 绘制副图指标
                drawSubIndicator();
                
                // 同步所有图表的时间轴
                await new Promise(resolve => setTimeout(resolve, 100));
                try {
                  syncTimeScales();
                  // 为副图表添加时间轴变化事件，确保双向联动
                  setupSubChartTimeScaleEvents();
                } catch (error) {
                  console.error('同步时间轴失败:', error);
                }
              } catch (error) {
                console.error('绘制副图指标失败:', error);
              }
            } else {
              console.warn('部分副图容器未准备好，将在DOM更新后重试');
              // 使用requestAnimationFrame确保下一帧再次尝试
              requestAnimationFrame(() => updateIndicators());
            }
          } else {
            // 如果没有选择任何副图指标，清除所有副图
            clearSubIndicators();
          }
        } catch (error) {
          console.error('指标更新过程中发生错误:', error);
        }
      };
      
      // 执行更新流程
      safeUpdateProcess().catch(error => {
        console.error('更新指标流程失败:', error);
      });
    } catch (error) {
      console.error('更新指标错误:', error);
    }
  };
  
  // 清除所有指标
  const clearIndicators = () => {
    try {
      // 清除主图指标
      if (mainIndicatorSeries.current) {
        mainIndicatorSeries.current.forEach((series) => {
          if (series && chart.current) {
            chart.current.removeSeries(series);
          }
        });
      }
      mainIndicatorSeries.current = [];
      
      // 清除副图指标
      clearSubChartSeries();
    } catch (error) {
      console.error('清除指标错误:', error);
    }
  };
  
  // 清除副图上的所有系列数据
  const clearSubChartSeries = () => {
    try {
      // 清除MACD系列
      if (macdSeries.current) {
        macdSeries.current.forEach((series) => {
          if (series && macdChart.current) {
            macdChart.current.removeSeries(series);
          }
        });
      }
      macdSeries.current = [];
      
      // 清除RSI系列
      if (rsiSeries.current) {
        rsiSeries.current.forEach((series) => {
          if (series && rsiChart.current) {
            rsiChart.current.removeSeries(series);
          }
        });
      }
      rsiSeries.current = [];
      
      // 清除KDJ系列
      if (kdjSeries.current) {
        kdjSeries.current.forEach((series) => {
          if (series && kdjChart.current) {
            kdjChart.current.removeSeries(series);
          }
        });
      }
      kdjSeries.current = [];
    } catch (error) {
      console.error('清除副图系列错误:', error);
    }
  };
  
  // 清除所有副图和系列
  const clearSubIndicators = () => {
    try {
      // 先清除系列数据
      clearSubChartSeries();
      
      // 清除MACD图表
      if (macdChart.current) {
        macdChart.current.remove();
        macdChart.current = null;
      }
      
      // 清除RSI图表
      if (rsiChart.current) {
        rsiChart.current.remove();
        rsiChart.current = null;
      }
      
      // 清除KDJ图表
      if (kdjChart.current) {
        kdjChart.current.remove();
        kdjChart.current = null;
      }
    } catch (error) {
      console.error('清除副图指标错误:', error);
    }
  };
  
  // 绘制主图指标
  const drawMainIndicator = () => {
    try {
      if (!chart.current || !candlestickData || !candlestickData.length || mainIndicator === 'none') return;
      
      switch (mainIndicator) {
        case 'boll': {
          const closePrices = extractClosePrices(candlestickData);
          // 检查是否满足计算布林带的条件（至少需要20个数据点）
          if (closePrices.length < 20) return;
          
          const { upper, middle, lower } = calculateBollingerBands(closePrices);
          
          // 上轨
          const upperSeries = chart.current.addLineSeries({
            color: '#f48fb1',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
          });
          
          // 中轨
          const middleSeries = chart.current.addLineSeries({
            color: '#90caf9',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
          });
          
          // 下轨
          const lowerSeries = chart.current.addLineSeries({
            color: '#80deea',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
          });
          
          // 准备数据，过滤掉无效值
          const upperData = upper.map((value, index) => ({
            time: candlestickData[index].time as Time,
            value: isNaN(value) ? null : value,
          })).filter(item => item.value !== null);
          
          const middleData = middle.map((value, index) => ({
            time: candlestickData[index].time as Time,
            value: isNaN(value) ? null : value,
          })).filter(item => item.value !== null);
          
          const lowerData = lower.map((value, index) => ({
            time: candlestickData[index].time as Time,
            value: isNaN(value) ? null : value,
          })).filter(item => item.value !== null);
          
          // 如果没有有效数据，不添加指标
          if (upperData.length === 0 || middleData.length === 0 || lowerData.length === 0) return;
          
          // 设置数据
          upperSeries.setData(upperData);
          middleSeries.setData(middleData);
          lowerSeries.setData(lowerData);
          
          // 保存引用
          mainIndicatorSeries.current.push(upperSeries);
          mainIndicatorSeries.current.push(middleSeries);
          mainIndicatorSeries.current.push(lowerSeries);
          break;
        }
        default:
          break;
      }
    } catch (error) {
      console.error('绘制主图指标错误:', error);
    }
  };
  
  // 准备时间序列数据，过滤掉所有无效值
  const prepareTimeSeriesData = (
    values: number[], 
    times: (Time)[], 
    color?: string
  ) => {
    if (!values || !times || values.length === 0 || times.length === 0) {
      return [];
    }
    
    // 确保两个数组长度匹配
    const length = Math.min(values.length, times.length);
    
    const result = [];
    for (let i = 0; i < length; i++) {
      const value = values[i];
      const time = times[i];
      
      // 跳过所有无效值
      if (value === undefined || value === null || isNaN(value) || !time) {
        continue;
      }
      
      const point: any = {
        time: time,
        value: value
      };
      
      if (color) {
        point.color = color;
      }
      
      result.push(point);
    }
    
    return result;
  };
  
  // 绘制MACD指标
  const drawMacdIndicator = () => {
    if (!macdChart.current || !macdChartRef.current || !candlestickData.length) return;
    
    try {
      // 清除旧的MACD系列
      if (macdSeries.current && macdSeries.current.length > 0) {
        macdSeries.current.forEach(series => {
          if (series && macdChart.current) {
            macdChart.current.removeSeries(series);
          }
        });
        macdSeries.current = [];
      }
      
      const closePrices = extractClosePrices(candlestickData);
      
      // 检查是否满足计算MACD的条件（至少需要26个数据点）
      if (closePrices.length < 26) {
        console.warn('数据点不足，无法计算MACD');
        return;
      }
      
      // 创建MACD指标窗格
      const { macd, signal, histogram } = calculateMACD(closePrices);
      
      if (!macd || !signal || !histogram || 
          macd.length === 0 || signal.length === 0 || histogram.length === 0 ||
          macd.every(v => isNaN(v)) || 
          signal.every(v => isNaN(v)) || 
          histogram.every(v => isNaN(v))) {
        console.warn('MACD数据全为NaN，跳过绘制');
        return;
      }
      
      // 创建时间序列
      const times = candlestickData.map(item => item.time as Time);
      
      // 深度复制数组，避免直接修改原始数据
      const macdCopy = [...macd];
      const signalCopy = [...signal];
      const histogramCopy = [...histogram];
      
      // 安全处理：将所有NaN值替换为null，以避免图表绘制错误
      for (let i = 0; i < macdCopy.length; i++) {
        if (isNaN(macdCopy[i])) macdCopy[i] = 0;
        if (isNaN(signalCopy[i])) signalCopy[i] = 0;
        if (isNaN(histogramCopy[i])) histogramCopy[i] = 0;
      }
      
      // 准备数据，过滤掉无效值
      const macdData = prepareTimeSeriesData(macdCopy, times);
      const signalData = prepareTimeSeriesData(signalCopy, times);
      
      // 特殊处理柱状图数据
      const histogramData: {time: Time, value: number, color: string}[] = [];
      
      // 小心地构建柱状图数据，避免任何可能的null值
      for (let i = 0; i < Math.min(histogramCopy.length, times.length); i++) {
        const value = histogramCopy[i];
        const time = times[i];
        
        if (value !== undefined && !isNaN(value) && time !== undefined) {
          histogramData.push({
            time: time,
            value: value,
            color: value >= 0 ? '#26a69a' : '#ef5350',
          });
        }
      }
      
      // 如果没有有效数据，不添加指标
      if (macdData.length === 0 || signalData.length === 0 || histogramData.length === 0) {
        console.warn('MACD处理后数据为空，跳过绘制');
        return;
      }
      
      // 创建单独的价格轴
      const indicatorPriceScale = {
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        borderVisible: true,
        borderColor: '#2e3241',
      };
      
      try {
        // MACD线
        const macdLine = macdChart.current.addLineSeries({
          color: '#90caf9',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          ...indicatorPriceScale
        });
        
        // 信号线
        const signalLine = macdChart.current.addLineSeries({
          color: '#f48fb1',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        
        // 柱状图
        const histogramSeries = macdChart.current.addHistogramSeries({
          color: '#26a69a',
          priceLineVisible: false,
          lastValueVisible: false,
        });
        
        // 设置数据
        macdLine.setData(macdData);
        signalLine.setData(signalData);
        histogramSeries.setData(histogramData);
        
        // 保存引用
        macdSeries.current.push(macdLine);
        macdSeries.current.push(signalLine);
        macdSeries.current.push(histogramSeries);
        
        // 适应视图
        macdChart.current.timeScale().fitContent();
      } catch (error) {
        console.error('设置MACD数据错误:', error);
      }
    } catch (error) {
      console.error('绘制MACD指标错误:', error);
    }
  };
  
  // 绘制RSI指标
  const drawRsiIndicator = () => {
    if (!rsiChart.current || !rsiChartRef.current || !candlestickData.length) return;
    
    try {
      // 清除旧的RSI系列
      if (rsiSeries.current && rsiSeries.current.length > 0) {
        rsiSeries.current.forEach(series => {
          if (series && rsiChart.current) {
            rsiChart.current.removeSeries(series);
          }
        });
        rsiSeries.current = [];
      }
      
      const closePrices = extractClosePrices(candlestickData);
      
      // 检查是否满足计算RSI的条件（至少需要14个数据点）
      if (closePrices.length < 14) {
        console.warn('数据点不足，无法计算RSI');
        return;
      }
      
      // 创建RSI指标
      const rsiData = calculateRSI(closePrices);
      
      if (!rsiData || rsiData.length === 0 || rsiData.every(v => isNaN(v))) {
        console.warn('RSI数据全为NaN，跳过绘制');
        return;
      }
      
      // 创建时间序列
      const times = candlestickData.map(item => item.time as Time);
      
      // 准备数据，过滤掉无效值
      const formattedData = prepareTimeSeriesData(rsiData, times);
      
      // 如果没有有效数据，不添加指标
      if (formattedData.length === 0) {
        console.warn('RSI处理后数据为空，跳过绘制');
        return;
      }
      
      // 创建单独的价格轴
      const indicatorPriceScale = {
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        borderVisible: true,
        borderColor: '#2e3241',
      };
      
      // RSI线
      const rsiLine = rsiChart.current.addLineSeries({
        color: '#90caf9',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
        ...indicatorPriceScale
      });
      
      // 添加70和30线
      const upperLine = rsiChart.current.addLineSeries({
        color: '#ef5350',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      
      const lowerLine = rsiChart.current.addLineSeries({
        color: '#26a69a',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      
      // 创建70和30线的数据
      const upperLineData = formattedData.map(item => ({
        time: item.time,
        value: 70,
      }));
      
      const lowerLineData = formattedData.map(item => ({
        time: item.time,
        value: 30,
      }));
      
      try {
        // 设置数据
        rsiLine.setData(formattedData);
        upperLine.setData(upperLineData);
        lowerLine.setData(lowerLineData);
        
        // 保存引用
        rsiSeries.current.push(rsiLine);
        rsiSeries.current.push(upperLine);
        rsiSeries.current.push(lowerLine);
        
        // 适应视图
        rsiChart.current.timeScale().fitContent();
      } catch (error) {
        console.error('设置RSI数据错误:', error);
      }
    } catch (error) {
      console.error('绘制RSI指标错误:', error);
    }
  };
  
  // 绘制KDJ指标
  const drawKdjIndicator = () => {
    if (!kdjChart.current || !kdjChartRef.current || !candlestickData.length) return;
    
    try {
      // 清除旧的KDJ系列
      if (kdjSeries.current && kdjSeries.current.length > 0) {
        kdjSeries.current.forEach(series => {
          if (series && kdjChart.current) {
            kdjChart.current.removeSeries(series);
          }
        });
        kdjSeries.current = [];
      }
      
      const closePrices = extractClosePrices(candlestickData);
      const highPrices = extractHighPrices(candlestickData);
      const lowPrices = extractLowPrices(candlestickData);
      
      // 检查是否满足计算KDJ的条件（至少需要9个数据点）
      if (closePrices.length < 9 || highPrices.length < 9 || lowPrices.length < 9) {
        console.warn('数据点不足，无法计算KDJ');
        return;
      }
      
      // 创建KDJ指标
      const { k, d, j } = calculateKDJ(highPrices, lowPrices, closePrices);
      
      if (!k || !d || !j || 
          k.length === 0 || d.length === 0 || j.length === 0 ||
          k.every(v => isNaN(v)) || 
          d.every(v => isNaN(v)) || 
          j.every(v => isNaN(v))) {
        console.warn('KDJ数据全为NaN，跳过绘制');
        return;
      }
      
      // 创建时间序列
      const times = candlestickData.map(item => item.time as Time);
      
      // 准备数据，过滤掉无效值
      const kData = prepareTimeSeriesData(k, times);
      const dData = prepareTimeSeriesData(d, times);
      const jData = prepareTimeSeriesData(j, times);
      
      // 如果没有有效数据，不添加指标
      if (kData.length === 0 || dData.length === 0 || jData.length === 0) {
        console.warn('KDJ处理后数据为空，跳过绘制');
        return;
      }
      
      // 创建单独的价格轴
      const indicatorPriceScale = {
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        borderVisible: true,
        borderColor: '#2e3241',
      };
      
      // K线
      const kLine = kdjChart.current.addLineSeries({
        color: '#90caf9',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
        ...indicatorPriceScale
      });
      
      // D线
      const dLine = kdjChart.current.addLineSeries({
        color: '#f48fb1',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      
      // J线
      const jLine = kdjChart.current.addLineSeries({
        color: '#80deea',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      
      try {
        // 设置数据
        kLine.setData(kData);
        dLine.setData(dData);
        jLine.setData(jData);
        
        // 保存引用
        kdjSeries.current.push(kLine);
        kdjSeries.current.push(dLine);
        kdjSeries.current.push(jLine);
        
        // 适应视图
        kdjChart.current.timeScale().fitContent();
      } catch (error) {
        console.error('设置KDJ数据错误:', error);
      }
    } catch (error) {
      console.error('绘制KDJ指标错误:', error);
    }
  };

  // 绘制副图指标
  const drawSubIndicator = () => {
    try {
      if (!candlestickData || !candlestickData.length) {
        console.warn('没有数据可用于绘制副图指标');
        return;
      }
      
      // 确保当前选择的副图指标存在，否则清除并退出
      if (!subIndicators || subIndicators.length === 0) {
        clearSubIndicators();
        return;
      }
      
      // 确保图表容器已经创建，检查DOM节点是否存在
      const macdReady = subIndicators.includes('macd') ? !!macdChartRef.current : true;
      const rsiReady = subIndicators.includes('rsi') ? !!rsiChartRef.current : true;
      const kdjReady = subIndicators.includes('kdj') ? !!kdjChartRef.current : true;
      
      if (!macdReady || !rsiReady || !kdjReady) {
        console.warn('部分副图容器未准备好，将延迟绘制');
        // 使用requestAnimationFrame延迟绘制，等待DOM更新
        requestAnimationFrame(() => drawSubIndicator());
        return;
      }
      
      // 通用图表选项
      const commonOptions = {
        width: chartContainerRef.current ? chartContainerRef.current.clientWidth : 800,
        height: 150,
        layout: {
          background: { color: '#1e222d' },
          textColor: '#d9d9d9',
        },
        grid: {
          vertLines: { color: '#2e3241' },
          horzLines: { color: '#2e3241' },
        },
        timeScale: {
          borderColor: '#2e3241',
          timeVisible: false,
          secondsVisible: false,
          barSpacing: chart.current ? chart.current.timeScale().options().barSpacing : 6,
        },
        rightPriceScale: {
          borderColor: '#2e3241',
        },
      };

      // 分步创建和绘制图表，确保稳定性
      const createAndDrawCharts = async () => {
        // 1. 先清除不再需要的副图
        if (!subIndicators.includes('macd') && macdChart.current) {
          macdChart.current.remove();
          macdChart.current = null;
        }
        
        if (!subIndicators.includes('rsi') && rsiChart.current) {
          rsiChart.current.remove();
          rsiChart.current = null;
        }
        
        if (!subIndicators.includes('kdj') && kdjChart.current) {
          kdjChart.current.remove();
          kdjChart.current = null;
        }
        
        // 2. 创建所有需要的图表实例
        await Promise.all(subIndicators.map(async (indicator) => {
          try {
            switch (indicator) {
              case 'macd':
                if (!macdChart.current && macdChartRef.current) {
                  macdChart.current = createChart(macdChartRef.current, commonOptions);
                }
                break;
              case 'rsi':
                if (!rsiChart.current && rsiChartRef.current) {
                  rsiChart.current = createChart(rsiChartRef.current, commonOptions);
                }
                break;
              case 'kdj':
                if (!kdjChart.current && kdjChartRef.current) {
                  kdjChart.current = createChart(kdjChartRef.current, commonOptions);
                }
                break;
            }
            // 使用短延迟确保图表实例创建完成
            await new Promise(resolve => setTimeout(resolve, 10));
          } catch (error) {
            console.error(`创建${indicator}图表失败:`, error);
          }
        }));
        
        // 3. 绘制各个指标，添加额外的错误处理
        for (const indicator of subIndicators) {
          try {
            switch (indicator) {
              case 'macd':
                if (macdChart.current && macdChartRef.current) {
                  drawMacdIndicator();
                }
                break;
              case 'rsi':
                if (rsiChart.current && rsiChartRef.current) {
                  drawRsiIndicator();
                }
                break;
              case 'kdj':
                if (kdjChart.current && kdjChartRef.current) {
                  drawKdjIndicator();
                }
                break;
            }
            // 短暂延迟确保每个指标绘制完成
            await new Promise(resolve => setTimeout(resolve, 10));
          } catch (error) {
            console.error(`绘制${indicator}指标失败:`, error);
          }
        }
        
        // 4. 同步所有图表的时间轴
        setTimeout(() => {
          try {
            syncTimeScales();
            // 为副图表添加时间轴变化事件，确保双向联动
            setupSubChartTimeScaleEvents();
          } catch (error) {
            console.error('同步时间轴失败:', error);
          }
        }, 50);
      };
      
      // 执行绘制流程
      createAndDrawCharts().catch(error => {
        console.error('绘制副图表失败:', error);
      });
    } catch (error) {
      console.error('绘制副图指标错误:', error);
    }
  };

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
    // 防止重复查询
    if (isHistoryLoading) return;
    
    setIsLoading(true);
    setIsHistoryLoading(true);
    
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
      setIsHistoryLoading(false);
    }
  };

  // 处理副图指标选择变化
  const handleSubIndicatorChange = (value: IndicatorType) => {
    // 如果选择"none"，清空所有副图指标
    if (value === 'none') {
      setSubIndicators([]);
      return;
    }
    
    // 如果指标已经存在，则从列表中移除它
    if (subIndicators.includes(value)) {
      setSubIndicators(subIndicators.filter(indicator => indicator !== value));
    } else {
      // 添加新指标到列表中
      setSubIndicators([...subIndicators, value]);
    }
  };
  
  // 切换回测和交易面板显示状态
  const togglePanels = () => {
    setShowPanels(!showPanels);
    
    // 通过自定义事件通知App组件更新面板显示状态
    const event = new CustomEvent('togglePanels', { detail: { show: !showPanels } });
    window.dispatchEvent(event);
    
    // 添加短暂延迟，确保DOM更新后重新调整图表大小
    setTimeout(() => {
      if (chart.current) {
        chart.current.applyOptions({
          width: chartContainerRef.current?.clientWidth
        });
        
        // 同步更新所有副图的大小
        if (macdChart.current) {
          macdChart.current.applyOptions({
            width: chartContainerRef.current?.clientWidth
          });
        }
        
        if (rsiChart.current) {
          rsiChart.current.applyOptions({
            width: chartContainerRef.current?.clientWidth
          });
        }
        
        if (kdjChart.current) {
          kdjChart.current.applyOptions({
            width: chartContainerRef.current?.clientWidth
          });
        }
        
        // 使时间轴适应新宽度
        chart.current.timeScale().fitContent();
        syncTimeScales();
      }
    }, 350); // 延迟时间略长于CSS过渡时间
  };

  // 监听面板显示状态变化
  useEffect(() => {
    const handleTogglePanels = (event: CustomEvent<{show: boolean}>) => {
      setShowPanels(event.detail.show);
    };
    
    window.addEventListener('togglePanels', handleTogglePanels as EventListener);
    
    return () => {
      window.removeEventListener('togglePanels', handleTogglePanels as EventListener);
    };
  }, []);

  return (
    <div className={`candlestick-chart-container ${showPanels ? '' : 'panels-hidden'}`}>
      <div className="chart-header">
        <h2>{selectedPair} - {timeframe}</h2>
        <div className="chart-buttons">
          <IndicatorSelector 
            type="main"
            value={mainIndicator}
            onChange={setMainIndicator}
            disabled={isLoading || candlestickData.length === 0}
          />
          <div className="sub-indicators-selector">
            <label>副图指标:</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={isSubIndicatorSelected('macd')} 
                  onChange={() => handleSubIndicatorChange('macd')}
                  disabled={isLoading || candlestickData.length === 0}
                />
                MACD
              </label>
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={isSubIndicatorSelected('rsi')} 
                  onChange={() => handleSubIndicatorChange('rsi')}
                  disabled={isLoading || candlestickData.length === 0}
                />
                RSI
              </label>
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={isSubIndicatorSelected('kdj')} 
                  onChange={() => handleSubIndicatorChange('kdj')}
                  disabled={isLoading || candlestickData.length === 0}
                />
                KDJ
              </label>
            </div>
          </div>
          <button className="query-button" onClick={handleQueryClick} disabled={isLoading || isHistoryLoading}>
            {isLoading ? '查询中...' : '查询数据'}
          </button>
          <button className="load-data-button" onClick={handleLoadDataClick}>
            加载历史数据
          </button>
          <button className="toggle-panels-button" onClick={togglePanels}>
            {showPanels ? '隐藏回测面板' : '显示回测面板'}
          </button>
        </div>
      </div>
      <div className={`chart-container ${showPanels ? '' : 'panels-hidden'}`}>
        <div className="chart-wrapper">
          <div ref={chartContainerRef} className={`chart-content main-chart ${showPanels ? '' : 'panels-hidden'}`}>
            {candlestickData.length === 0 && (
              <div className="empty-data-message">
                <p>没有可显示的数据</p>
                <p>请点击"查询数据"或"加载历史数据"按钮获取数据</p>
              </div>
            )}
          </div>
          
          {/* MACD副图 */}
          {subIndicators.includes('macd') && (
            <div ref={macdChartRef} className={`chart-content sub-chart macd-chart ${showPanels ? '' : 'panels-hidden'}`}>
              <div className="indicator-label">MACD</div>
            </div>
          )}
          
          {/* RSI副图 */}
          {subIndicators.includes('rsi') && (
            <div ref={rsiChartRef} className={`chart-content sub-chart rsi-chart ${showPanels ? '' : 'panels-hidden'}`}>
              <div className="indicator-label">RSI</div>
            </div>
          )}
          
          {/* KDJ副图 */}
          {subIndicators.includes('kdj') && (
            <div ref={kdjChartRef} className={`chart-content sub-chart kdj-chart ${showPanels ? '' : 'panels-hidden'}`}>
              <div className="indicator-label">KDJ</div>
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
            
            {/* 显示技术指标值 */}
            {hoveredData.indicators && hoveredData.indicators.boll && (
              <>
                <div className="tooltip-divider"></div>
                <div className="tooltip-section-title">布林带(BOLL)</div>
                <div className="tooltip-row">
                  <span className="tooltip-label">上轨:</span>
                  <span className="tooltip-value">{hoveredData.indicators.boll.upper}</span>
                </div>
                <div className="tooltip-row">
                  <span className="tooltip-label">中轨:</span>
                  <span className="tooltip-value">{hoveredData.indicators.boll.middle}</span>
                </div>
                <div className="tooltip-row">
                  <span className="tooltip-label">下轨:</span>
                  <span className="tooltip-value">{hoveredData.indicators.boll.lower}</span>
                </div>
              </>
            )}
            
            {hoveredData.indicators && hoveredData.indicators.macd && (
              <>
                <div className="tooltip-divider"></div>
                <div className="tooltip-section-title">MACD</div>
                <div className="tooltip-row">
                  <span className="tooltip-label">MACD:</span>
                  <span className="tooltip-value">{hoveredData.indicators.macd.macd}</span>
                </div>
                <div className="tooltip-row">
                  <span className="tooltip-label">信号线:</span>
                  <span className="tooltip-value">{hoveredData.indicators.macd.signal}</span>
                </div>
                <div className="tooltip-row">
                  <span className="tooltip-label">直方图:</span>
                  <span className={`tooltip-value ${parseFloat(hoveredData.indicators.macd.histogram) >= 0 ? 'positive' : 'negative'}`}>
                    {hoveredData.indicators.macd.histogram}
                  </span>
                </div>
              </>
            )}
            
            {hoveredData.indicators && hoveredData.indicators.rsi && (
              <>
                <div className="tooltip-divider"></div>
                <div className="tooltip-section-title">RSI</div>
                <div className="tooltip-row">
                  <span className="tooltip-label">RSI:</span>
                  <span className="tooltip-value">{hoveredData.indicators.rsi}</span>
                </div>
              </>
            )}
            
            {hoveredData.indicators && hoveredData.indicators.kdj && (
              <>
                <div className="tooltip-divider"></div>
                <div className="tooltip-section-title">KDJ</div>
                <div className="tooltip-row">
                  <span className="tooltip-label">K:</span>
                  <span className="tooltip-value">{hoveredData.indicators.kdj.k}</span>
                </div>
                <div className="tooltip-row">
                  <span className="tooltip-label">D:</span>
                  <span className="tooltip-value">{hoveredData.indicators.kdj.d}</span>
                </div>
                <div className="tooltip-row">
                  <span className="tooltip-label">J:</span>
                  <span className="tooltip-value">{hoveredData.indicators.kdj.j}</span>
                </div>
              </>
            )}
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