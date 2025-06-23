import React, { useEffect, useRef, useState } from 'react';
import { createChart, CrosshairMode, Time, LineWidth, ISeriesApi, IChartApi, SeriesMarkerPosition, SeriesMarker, LineStyle } from 'lightweight-charts';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { AppState, CandlestickData, BacktestTrade } from '../../store/types';
import { updateCandlestickData, setSelectedPair, setTimeframe, setDateRange } from '../../store/actions';
import { fetchHistoryWithIntegrityCheck, getDefaultDateRange, formatDateTimeString, getYesterdayDateString } from '../../services/api';
import DataLoadModal from '../DataLoadModal/DataLoadModal';
import IndicatorSelector, { IndicatorType } from './IndicatorSelector';
import {
  calculateMACD,
  calculateRSI,
  calculateStockRSI,
  calculateKDJ,
  calculateBollingerBands,
  calculateSAR,
  extractClosePrices,
  extractHighPrices,
  extractLowPrices
} from '../../utils/indicators';
import './CandlestickChart.css';
import TradeMarkers from './TradeMarkers';
import { COMMON_PAIRS, TIMEFRAMES } from '../../constants/trading';
import { Link } from 'react-router-dom';
import QuickTimeSelector from './QuickTimeSelector';

// K线宽度本地存储键名
const CHART_BAR_SPACING_KEY = 'cryptoquantx_chart_bar_spacing';
// K线数据本地存储键名
const CANDLESTICK_DATA_KEY = 'cryptoquantx_candlestick_data';
const CHART_SETTINGS_KEY = 'cryptoquantx_chart_settings';

// 默认K线宽度
const DEFAULT_BAR_SPACING = 1; // 从6改为3，使K线宽度更合适

// 从localStorage获取保存的K线宽度
const getSavedBarSpacing = (): number => {
  try {
    const savedValue = localStorage.getItem(CHART_BAR_SPACING_KEY);
    return savedValue ? parseFloat(savedValue) : DEFAULT_BAR_SPACING;
  } catch (error) {
    console.error('读取K线宽度设置失败:', error);
    return DEFAULT_BAR_SPACING;
  }
};

// 保存K线宽度到localStorage
const saveBarSpacing = (spacing: number): void => {
  try {
    localStorage.setItem(CHART_BAR_SPACING_KEY, spacing.toString());
  } catch (error) {
    console.error('保存K线宽度设置失败:', error);
  }
};

// 保存K线数据到localStorage
const saveCandlestickData = (data: CandlestickData[]): void => {
  try {
    localStorage.setItem(CANDLESTICK_DATA_KEY, JSON.stringify(data));
    // console.log('已保存K线数据到localStorage:', {
    //   dataLength: data.length,
    //   firstItem: data.length > 0 ? data[0] : null
    // });
  } catch (error) {
    console.error('保存K线数据失败:', error);
  }
};

// 从localStorage获取K线数据
const getSavedCandlestickData = (): CandlestickData[] => {
  try {
    const savedData = localStorage.getItem(CANDLESTICK_DATA_KEY);
    const data = savedData ? JSON.parse(savedData) : [];
    console.log('从localStorage读取K线数据:', {
      hasData: !!savedData,
      dataLength: data.length,
      firstItem: data.length > 0 ? data[0] : null
    });
    return data;
  } catch (error) {
    console.error('读取K线数据失败:', error);
    return [];
  }
};

// 保存图表设置到localStorage
const saveChartSettings = (settings: {selectedPair: string, timeframe: string, dateRange: {startDate: string, endDate: string}}): void => {
  try {
    localStorage.setItem(CHART_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('保存图表设置失败:', error);
  }
};

// 从localStorage获取图表设置
const getSavedChartSettings = (): {selectedPair: string, timeframe: string, dateRange: {startDate: string, endDate: string}} | null => {
  try {
    const savedSettings = localStorage.getItem(CHART_SETTINGS_KEY);
    return savedSettings ? JSON.parse(savedSettings) : null;
  } catch (error) {
    console.error('读取图表设置失败:', error);
    return null;
  }
};

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

// 格式化价格（增强版，处理undefined）
const formatPrice = (price: number | undefined): string => {
  if (price === undefined) return '0.00';
  return price.toFixed(price < 10 ? 6 : price < 100 ? 4 : 2);
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

// 修改CandlestickChart组件的返回类型
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
  // 交易标记系列
  const tradeMarkers = useRef<ISeriesApi<'Candlestick'> | null>(null);

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
    mouseX?: number;
    mouseY?: number;
    indicators?: {
      boll?: {
        upper: string;
        middle: string;
        lower: string;
      };
      sar?: string;
      macd?: {
        macd: string;
        signal: string;
        histogram: string;
      };
      rsi?: string;
      stockrsi?: string;
      kdj?: {
        k: string;
        d: string;
        j: string;
      };
    };
  } | null>(null);

  // 指标选择状态 - 修改为支持多选
  const [mainIndicator, setMainIndicator] = useState<IndicatorType>('boll');
  const [subIndicators, setSubIndicators] = useState<IndicatorType[]>(['macd', 'rsi', 'stockrsi', 'kdj']);

  // 数据加载弹窗状态
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [responseMessage, setResponseMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // 添加历史数据加载状态变量，防止重复查询
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);
  // 添加面板显示/隐藏状态
  const [showPanels, setShowPanels] = useState<boolean>(true);

  const dispatch = useDispatch();
  const location = useLocation();
  const candlestickData = useSelector((state: AppState) => {
    // console.log('Redux candlestickData更新:', {
    //   length: state.candlestickData.length,
    //   type: typeof state.candlestickData,
    //   isArray: Array.isArray(state.candlestickData),
    //   firstItem: state.candlestickData.length > 0 ? state.candlestickData[0] : null
    // });
    return state.candlestickData;
  });
  const selectedPair = useSelector((state: AppState) => state.selectedPair);
  const timeframe = useSelector((state: AppState) => state.timeframe);
  const backtestResults = useSelector((state: AppState) => state.backtestResults);
  const dateRange = useSelector((state: AppState) => state.dateRange);

  // 页面加载时记录恢复状态和强制数据恢复
  useEffect(() => {
    // console.log('页面加载完成，当前状态:', {
    //   selectedPair,
    //   timeframe,
    //   dateRange,
    //   candlestickDataLength: candlestickData.length
    // });
    
    // 强制检查localStorage并恢复数据
    const forceDataRecovery = () => {
      try {
        const savedData = localStorage.getItem(CANDLESTICK_DATA_KEY);
        // console.log('强制数据恢复检查:', {
        //   hasLocalStorageData: !!savedData,
        //   reduxDataLength: candlestickData.length
        // });
        
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          // console.log('从localStorage强制恢复数据:', {
          //   dataLength: parsedData.length,
          //   firstItem: parsedData[0]
          // });
          
          // 无论Redux中是否有数据，都强制更新一次
          dispatch(updateCandlestickData(parsedData));
        }
      } catch (error) {
        console.error('强制数据恢复失败:', error);
      }
    };
    
    // 添加强制数据恢复事件监听
    const handleForceDataRestore = (event: CustomEvent) => {
      console.log('接收到强制数据恢复事件:', event.detail);
      if (event.detail && event.detail.data) {
        dispatch(updateCandlestickData(event.detail.data));
      }
    };
    
    window.addEventListener('forceDataRestore', handleForceDataRestore as EventListener);
    
    // 立即执行一次数据恢复检查
    forceDataRecovery();
    
    // 再延迟执行一次，确保组件完全初始化
    setTimeout(forceDataRecovery, 200);
    setTimeout(forceDataRecovery, 1000);

    return () => {
      window.removeEventListener('forceDataRestore', handleForceDataRestore as EventListener);
    };
  }, []); // 只在组件初始化时执行一次



  // 检查副图指标是否被选中
  const isSubIndicatorSelected = (indicator: IndicatorType): boolean => {
    return subIndicators.includes(indicator);
  };

  // 安全获取数据点的方法，避免undefined或null
  const safeGetDataPoint = (dataArray: any[], index: number, defaultValue: any = 0) => {
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
        // 当鼠标移出图表时，清除指标值显示
        clearIndicatorValues();
        return;
      }

      // 确保有数据可用
      if (!candlestickData || candlestickData.length === 0) {
        // console.log('没有K线数据可用');
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

        // 设置悬浮数据，并包含鼠标位置信息
        setHoveredData({
          time,
          open,
          high,
          low,
          close,
          volume,
          change,
          changePercent,
          // 添加鼠标位置信息
          mouseX: param.point.x,
          mouseY: param.point.y
        });

        // 打印一些调试信息，查看candlestickData的格式
        // console.log('param.time:', param.time, 'type:', typeof param.time);
        // console.log('candlestickData示例:', candlestickData.length > 0 ? {
        //   time: candlestickData[0].time,
        //   timeType: typeof candlestickData[0].time
        // } : '无数据');
        // console.log('candlestickData长度:', candlestickData.length);

        // 获取当前显示的K线索引
        let dataIndex = -1;

        try {
          // 使用图表的逻辑坐标直接获取索引
          if (chart.current) {
            const logical = chart.current.timeScale().coordinateToLogical(param.point.x);
            if (logical !== null && logical >= 0 && logical < candlestickData.length) {
              dataIndex = Math.round(logical);
              // console.log('使用坐标估算，找到索引:', dataIndex);
            }
          }

          // 如果坐标估算失败，尝试时间匹配
          if (dataIndex === -1) {
            if (typeof param.time === 'number') {
              // 对于时间戳，找到最接近的时间点
              let minDiff = Infinity;
              for (let i = 0; i < candlestickData.length; i++) {
                const item = candlestickData[i];
                const itemTime = typeof item.time === 'number' ? item.time :
                              typeof item.time === 'string' ? new Date(item.time).getTime() / 1000 :
                              Number(item.time);

                const diff = Math.abs(itemTime - param.time);
                if (diff < minDiff) {
                  minDiff = diff;
                  dataIndex = i;
                }
              }
              // console.log('使用最接近匹配，找到索引:', dataIndex, '差值:', minDiff);
            }
          }
        } catch (error) {
          console.error('获取数据索引错误:', error);
        }

        // console.log('最终找到的数据索引:', dataIndex);

        // 如果找到了有效的数据索引，更新指标值
        if (dataIndex !== -1 && dataIndex < candlestickData.length) {
          // 更新MACD指标值
          if (isSubIndicatorSelected('macd') && macdChartRef.current) {
            const closePrices = extractClosePrices(candlestickData);
            const { macd, signal, histogram } = calculateMACD(closePrices);

            const macdValue = safeGetDataPoint(macd, dataIndex);
            const signalValue = safeGetDataPoint(signal, dataIndex);
            const histogramValue = safeGetDataPoint(histogram, dataIndex);

                    if (typeof macdValue === 'number' && typeof signalValue === 'number' && typeof histogramValue === 'number') {
          // 创建或更新MACD值显示元素
          let macdValueElement = document.getElementById('macd-indicator-values');
          if (!macdValueElement) {
            macdValueElement = document.createElement('div');
            macdValueElement.id = 'macd-indicator-values';
            macdValueElement.className = 'indicator-value-text macd-indicator';
            macdChartRef.current.appendChild(macdValueElement);
          }

          macdValueElement.innerHTML = `
            MACD: <span class="value">${macdValue.toFixed(4)}</span> | 
            信号: <span class="value">${signalValue.toFixed(4)}</span> | 
            柱: <span class="${histogramValue >= 0 ? 'positive' : 'negative'}">${histogramValue.toFixed(4)}</span>
          `;
          macdValueElement.style.display = 'block';
        }
          }

          // 更新RSI指标值
          if (isSubIndicatorSelected('rsi') && rsiChartRef.current) {
            const closePrices = extractClosePrices(candlestickData);
            const rsiData = calculateRSI(closePrices);

            const rsiValue = safeGetDataPoint(rsiData, dataIndex);

                    if (typeof rsiValue === 'number') {
          // 创建或更新RSI值显示元素
          let rsiValueElement = document.getElementById('rsi-indicator-values');
          if (!rsiValueElement) {
            rsiValueElement = document.createElement('div');
            rsiValueElement.id = 'rsi-indicator-values';
            rsiValueElement.className = 'indicator-value-text rsi-indicator';
            rsiChartRef.current.appendChild(rsiValueElement);
          }

          rsiValueElement.innerHTML = `RSI: <span class="value">${rsiValue.toFixed(2)}</span>`;
          rsiValueElement.style.display = 'block';
        }
          }

          // 更新KDJ指标值
          if (isSubIndicatorSelected('kdj') && kdjChartRef.current) {
            const closePrices = extractClosePrices(candlestickData);
            const highPrices = extractHighPrices(candlestickData);
            const lowPrices = extractLowPrices(candlestickData);
            const { k, d, j } = calculateKDJ(highPrices, lowPrices, closePrices);

            const kValue = safeGetDataPoint(k, dataIndex);
            const dValue = safeGetDataPoint(d, dataIndex);
            const jValue = safeGetDataPoint(j, dataIndex);

                    if (typeof kValue === 'number' && typeof dValue === 'number' && typeof jValue === 'number') {
          // 创建或更新KDJ值显示元素
          let kdjValueElement = document.getElementById('kdj-indicator-values');
          if (!kdjValueElement) {
            kdjValueElement = document.createElement('div');
            kdjValueElement.id = 'kdj-indicator-values';
            kdjValueElement.className = 'indicator-value-text kdj-indicator';
            kdjChartRef.current.appendChild(kdjValueElement);
          }

          kdjValueElement.innerHTML = `
            K: <span class="value">${kValue.toFixed(2)}</span> | 
            D: <span class="value">${dValue.toFixed(2)}</span> | 
            J: <span class="value">${jValue.toFixed(2)}</span>
          `;
          kdjValueElement.style.display = 'block';
        }
          }

          // 更新BOLL指标值
          if (mainIndicator === 'boll' && chartContainerRef.current) {
            const closePrices = extractClosePrices(candlestickData);
            const { upper, middle, lower } = calculateBollingerBands(closePrices);

            const upperValue = safeGetDataPoint(upper, dataIndex);
            const middleValue = safeGetDataPoint(middle, dataIndex);
            const lowerValue = safeGetDataPoint(lower, dataIndex);

                    if (typeof upperValue === 'number' && typeof middleValue === 'number' && typeof lowerValue === 'number') {
          // 创建或更新BOLL值显示元素
          let bollValueElement = document.getElementById('boll-indicator-values');
          if (!bollValueElement) {
            bollValueElement = document.createElement('div');
            bollValueElement.id = 'boll-indicator-values';
            bollValueElement.className = 'indicator-value-text boll-indicator';
            chartContainerRef.current.appendChild(bollValueElement);
          }

          bollValueElement.innerHTML = `
            上轨: <span class="value">${upperValue.toFixed(2)}</span> | 
            中轨: <span class="value">${middleValue.toFixed(2)}</span> | 
            下轨: <span class="value">${lowerValue.toFixed(2)}</span>
          `;
          bollValueElement.style.display = 'block';
          bollValueElement.style.position = 'absolute';

          // 恢复BOLL指标值固定在左上角
          bollValueElement.style.left = '10px';
          bollValueElement.style.top = '10px';
          bollValueElement.style.backgroundColor = 'rgba(30, 34, 45, 0.7)';
          bollValueElement.style.padding = '5px';
          bollValueElement.style.borderRadius = '3px';
          bollValueElement.style.zIndex = '2';
        }
          }
        }
      }
    });
  };

  // 清除指标值显示
  const clearIndicatorValues = () => {
    try {
      // 清除MACD指标值
      const macdValueElement = document.getElementById('macd-indicator-values');
      if (macdValueElement) {
        macdValueElement.style.display = 'none';
      }

      // 清除RSI指标值
      const rsiValueElement = document.getElementById('rsi-indicator-values');
      if (rsiValueElement) {
        rsiValueElement.style.display = 'none';
      }

      // 清除KDJ指标值
      const kdjValueElement = document.getElementById('kdj-indicator-values');
      if (kdjValueElement) {
        kdjValueElement.style.display = 'none';
      }

      // 清除BOLL指标值
      const bollValueElement = document.getElementById('boll-indicator-values');
      if (bollValueElement) {
        bollValueElement.style.display = 'none';
      }
    } catch (error) {
      console.error('清除指标值显示错误:', error);
    }
  };

  // 创建所有图表
  const createCharts = () => {
    if (!chartContainerRef.current) return;

    try {
      // 获取保存的K线宽度
      const savedBarSpacing = getSavedBarSpacing();

      // 获取容器高度
      const containerHeight = chartContainerRef.current.clientHeight || 600;
      const mainChartHeight = Math.max(500, containerHeight * 0.75); // 主图占75%或至少500px
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
            barSpacing: savedBarSpacing, // 使用保存的K线宽度
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

        // 监听K线宽度变化和时间轴范围变化
        chart.current.timeScale().subscribeVisibleLogicalRangeChange((range) => {
          if (!chart.current || !range) return;

          try {
            // 获取当前K线宽度
            const currentBarSpacing = chart.current.timeScale().options().barSpacing;

            // 如果宽度发生变化，保存到localStorage
            if (currentBarSpacing !== undefined && currentBarSpacing !== getSavedBarSpacing()) {
              saveBarSpacing(currentBarSpacing);
            }

            // 同步更新所有副图表的时间轴范围和K线宽度
            if (macdChart.current && macdChart.current.timeScale()) {
              try {
                macdChart.current.timeScale().setVisibleLogicalRange(range);
                if (currentBarSpacing !== undefined) {
                  macdChart.current.timeScale().applyOptions({ barSpacing: currentBarSpacing });
                }
              } catch (error) {
                // 忽略错误
              }
            }
            
            if (rsiChart.current && rsiChart.current.timeScale()) {
              try {
                rsiChart.current.timeScale().setVisibleLogicalRange(range);
                if (currentBarSpacing !== undefined) {
                  rsiChart.current.timeScale().applyOptions({ barSpacing: currentBarSpacing });
                }
              } catch (error) {
                // 忽略错误
              }
            }
            
            if (kdjChart.current && kdjChart.current.timeScale()) {
              try {
                kdjChart.current.timeScale().setVisibleLogicalRange(range);
                if (currentBarSpacing !== undefined) {
                  kdjChart.current.timeScale().applyOptions({ barSpacing: currentBarSpacing });
                }
              } catch (error) {
                // 忽略错误
              }
            }
          } catch (error) {
            console.error('同步图表错误:', error);
          }
        });
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
    // 延迟创建图表，确保DOM完全准备好
    const timer = setTimeout(() => {
      createCharts();
    }, 50);

    // 当组件卸载时，清除所有图表
    return () => {
      clearTimeout(timer);
      
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
  }, []); // 只在组件初始化时创建一次图表



  // 副图指标变化时，只更新副图，不影响主图
  useEffect(() => {
    if (subIndicators && chart.current) {
      // 延迟更新指标，确保DOM元素准备就绪
      setTimeout(() => {
        updateIndicators();
      }, 0);
    }
  }, [subIndicators]);

  // 监听回测面板的时间周期变更事件
  useEffect(() => {
    const handleTimeframeChange = (event: CustomEvent) => {
      const { timeframe: newTimeframe } = event.detail;
      console.log('K线图接收到时间周期变更事件:', newTimeframe);
      
      // 清空当前K线数据
      if (candleSeries.current && volumeSeries.current) {
        candleSeries.current.setData([]);
        volumeSeries.current.setData([]);
        dispatch(updateCandlestickData([]));
        clearIndicators();
      }
    };

    const handleRetryDataUpdate = () => {
      // 重新触发数据更新
      if (candlestickData.length > 0) {
        console.log('重试数据更新');
        // 通过更新一个临时状态来触发useEffect重新执行
        setIsLoading(prev => !prev);
        setTimeout(() => setIsLoading(prev => !prev), 10);
      }
    };

    // 添加事件监听器
    window.addEventListener('timeframeChanged', handleTimeframeChange as EventListener);
    window.addEventListener('retryDataUpdate', handleRetryDataUpdate);

    // 清理函数
    return () => {
      window.removeEventListener('timeframeChanged', handleTimeframeChange as EventListener);
      window.removeEventListener('retryDataUpdate', handleRetryDataUpdate);
    };
  }, [selectedPair, dateRange, candlestickData]); // 依赖项包括selectedPair和dateRange，确保在这些值变化时重新绑定事件

  // 同步所有图表的时间轴
  const syncTimeScales = () => {
    // 只在图表初始化时使用一次，后续由主图表控制
    try {
      if (!chart.current || !chart.current.timeScale()) return;

      const mainVisibleRange = chart.current.timeScale().getVisibleLogicalRange();
      if (!mainVisibleRange) return;

      // 手动设置副图表的可见范围
      if (macdChart.current && macdChart.current.timeScale()) {
        try {
          macdChart.current.timeScale().setVisibleLogicalRange(mainVisibleRange);
        } catch (error) {
          // 忽略错误
        }
      }

      if (rsiChart.current && rsiChart.current.timeScale()) {
        try {
          rsiChart.current.timeScale().setVisibleLogicalRange(mainVisibleRange);
        } catch (error) {
          // 忽略错误
        }
      }

      if (kdjChart.current && kdjChart.current.timeScale()) {
        try {
          kdjChart.current.timeScale().setVisibleLogicalRange(mainVisibleRange);
        } catch (error) {
          // 忽略错误
        }
      }
    } catch (error) {
      // 忽略错误
    }
  };

  // 完全禁用副图表的时间轴变化事件
  const setupSubChartTimeScaleEvents = () => {
    // 不再添加任何事件监听，改为由主图表完全控制
    // 主图表变化时，手动更新副图表
    try {
      if (chart.current && chart.current.timeScale()) {
        chart.current.timeScale().subscribeVisibleLogicalRangeChange((range) => {
          if (!range) return;

          try {
            // 手动设置副图表的可见范围
            if (macdChart.current && macdChart.current.timeScale()) {
              try {
                macdChart.current.timeScale().setVisibleLogicalRange(range);
              } catch (error) {
                // 忽略错误
              }
            }

            if (rsiChart.current && rsiChart.current.timeScale()) {
              try {
                rsiChart.current.timeScale().setVisibleLogicalRange(range);
              } catch (error) {
                // 忽略错误
              }
            }

            if (kdjChart.current && kdjChart.current.timeScale()) {
              try {
                kdjChart.current.timeScale().setVisibleLogicalRange(range);
              } catch (error) {
                // 忽略错误
              }
            }
          } catch (error) {
            // 忽略错误
          }
        });
      }
    } catch (error) {
      // 忽略错误
    }
  };

  // 更新数据
  useEffect(() => {
    // console.log('数据更新useEffect触发:', {
    //   dataLength: candlestickData.length,
    //   hasChart: !!chart.current,
    //   hasCandleSeries: !!candleSeries.current,
    //   hasVolumeSeries: !!volumeSeries.current,
    //   hasContainer: !!chartContainerRef.current,
    //   firstItem: candlestickData.length > 0 ? candlestickData[0] : null
    // });

    try {
      if (candlestickData.length > 0) {
        // 等待图表初始化完成
        if (!candleSeries.current || !volumeSeries.current || !chart.current) {
          // console.log('图表未初始化，重新创建图表');
          // 如果图表还没初始化，先创建图表
          if (chartContainerRef.current) {
            createCharts();
            
            // 延迟处理数据，给图表初始化时间
            const timer = setTimeout(() => {
              // console.log('延迟重试，检查图表状态:', {
              //   hasCandleSeries: !!candleSeries.current,
              //   hasVolumeSeries: !!volumeSeries.current,
              //   hasChart: !!chart.current
              // });
              // 简单的重试机制
              if (candleSeries.current && volumeSeries.current) {
                setDataToChart();
              } else {
                console.warn('图表组件初始化失败');
                // 再次尝试创建图表
                createCharts();
                setTimeout(() => {
                  if (candleSeries.current && volumeSeries.current) {
                    setDataToChart();
                  }
                }, 200);
              }
            }, 300);
            return () => clearTimeout(timer);
          } else {
            console.warn('图表容器不可用');
            return;
          }
        }

        // 图表已初始化，直接设置数据
        // console.log('图表已初始化，直接设置数据');
        setDataToChart();
      } else {
        // console.log('candlestickData为空，长度:', candlestickData.length);
      }
    } catch (error) {
      console.error('更新图表数据错误:', error);
    }

    // 设置数据到图表的函数
    function setDataToChart() {
      try {
        // console.log('开始处理数据，原始数据长度:', candlestickData.length);
        
        // 格式化数据，过滤掉包含 null 或 undefined 的数据项
        const formattedData = candlestickData
          .filter((item: CandlestickData) => {
            // 基本检查：确保item存在且有必要的字段
            if (!item || typeof item !== 'object') return false;
            
            // 时间检查：确保时间字段存在且有效
            if (item.time === null || item.time === undefined) return false;
            
            // 价格检查：确保OHLC数据存在且为有效数字
            const priceFields = [item.open, item.high, item.low, item.close];
            return priceFields.every(price => 
              price !== null && price !== undefined && 
              typeof price === 'number' && !isNaN(price) && isFinite(price)
            );
          })
          .sort((a, b) => Number(a.time) - Number(b.time)) // 确保时间序列排序
          .map((item: CandlestickData) => ({
            time: Number(item.time) as Time, // 确保时间是数字
            open: Number(item.open),
            high: Number(item.high),
            low: Number(item.low),
            close: Number(item.close),
          }));

        const volumeData = candlestickData
          .filter((item: CandlestickData) => {
            // 基本检查
            if (!item || typeof item !== 'object') return false;
            
            // 时间和价格检查
            if (item.time === null || item.time === undefined) return false;
            if (item.open === null || item.open === undefined || isNaN(item.open)) return false;
            if (item.close === null || item.close === undefined || isNaN(item.close)) return false;
            
            // 成交量检查：允许0值，但不允许null/undefined/NaN
            return item.volume !== null && item.volume !== undefined && 
                   typeof item.volume === 'number' && !isNaN(item.volume) && isFinite(item.volume);
          })
          .sort((a, b) => Number(a.time) - Number(b.time)) // 确保时间序列排序
          .map((item: CandlestickData) => ({
            time: Number(item.time) as Time, // 确保时间是数字
            value: Number(item.volume),
            color: item.close > item.open ? '#ff5555' : '#32a852', // 红涨绿跌
          }));

        // console.log('数据处理结果:', {
        //   原始数据: candlestickData.length,
        //   格式化后: formattedData.length,
        //   成交量数据: volumeData.length,
        //   图表状态: {
        //     hasChart: !!chart.current,
        //     hasCandleSeries: !!candleSeries.current,
        //     hasVolumeSeries: !!volumeSeries.current
        //   }
        // });

        // 确保有有效数据才设置
        if (formattedData.length > 0 && volumeData.length > 0 && candleSeries.current && volumeSeries.current) {
          // console.log('开始设置数据到图表');
          try {
            // 先清空现有数据，避免数组大小冲突
            candleSeries.current.setData([]);
            volumeSeries.current.setData([]);
            
            // 短暂延迟后设置新数据
            setTimeout(() => {
              if (candleSeries.current && volumeSeries.current) {
                try {
                  candleSeries.current.setData(formattedData);
                  volumeSeries.current.setData(volumeData);
                  // console.log('数据设置完成，K线条数:', formattedData.length);
                } catch (error) {
                  console.error('设置图表数据时出错:', error);
                  // 尝试逐条添加数据
                  try {
                    formattedData.forEach(item => {
                      if (candleSeries.current) {
                        candleSeries.current.update(item);
                      }
                    });
                    volumeData.forEach(item => {
                      if (volumeSeries.current) {
                        volumeSeries.current.update(item);
                      }
                    });
                    console.log('通过逐条更新成功设置数据');
                  } catch (updateError) {
                    console.error('逐条更新也失败:', updateError);
                  }
                }
              }
            }, 10);
          } catch (error) {
            console.error('清空数据时出错:', error);
          }

          // 适配视图
          setTimeout(() => {
            if (chart.current) {
              // console.log('调整图表视图');
              chart.current.timeScale().fitContent();
            }
          }, 50);

          // 更新指标
          setTimeout(() => {
            updateIndicators();

            // 如果有回测结果，重新绘制交易标记
            if (backtestResults && backtestResults.trades && backtestResults.trades.length > 0) {
              drawTradeMarkers();
            }

            // 重新设置十字线事件处理器，确保使用最新的数据
            setupCrosshairMoveHandler();
            
            // console.log('K线图数据更新完成，应该可以看到图表了');
          }, 100);
        } else {
          console.warn('数据设置失败:', {
            formattedDataLength: formattedData.length,
            volumeDataLength: volumeData.length,
            hasCandleSeries: !!candleSeries.current,
            hasVolumeSeries: !!volumeSeries.current,
            candlestickDataSample: candlestickData.slice(0, 2)
          });
        }
      } catch (error) {
        console.error('设置数据到图表时发生错误:', error);
      }
    }
  }, [candlestickData, backtestResults]);

  // 添加指标值显示功能
  const updateIndicatorValues = () => {
    try {
      // 如果没有数据，不进行更新
      if (candlestickData.length === 0) return;

      // 获取当前鼠标位置对应的数据索引
      if (!chart.current) return;

      const timeScale = chart.current.timeScale();
      const currentCoordinate = timeScale.width() / 2;
      const currentLogical = timeScale.coordinateToLogical(currentCoordinate);

      if (currentLogical === null || currentLogical < 0 || currentLogical >= candlestickData.length) return;

      const dataIndex = Math.round(currentLogical);
      const currentData = candlestickData[dataIndex];
      if (!currentData) return;

      // 更新MACD指标值
      if (isSubIndicatorSelected('macd') && macdChart.current) {
        const macdContainer = macdChartRef.current;
        if (!macdContainer) return;

        // 查找或创建MACD指标值显示元素
        let macdValueElement = macdContainer.querySelector('.macd-indicator-values');
        if (!macdValueElement) {
          macdValueElement = document.createElement('div');
          macdValueElement.className = 'indicator-value-text macd-indicator';
          macdContainer.appendChild(macdValueElement);
        }

        // 计算MACD值
        const closePrices = extractClosePrices(candlestickData);
        const { macd, signal, histogram } = calculateMACD(closePrices);
        const macdValue = safeGetDataPoint(macd, dataIndex);
        const signalValue = safeGetDataPoint(signal, dataIndex);
        const histogramValue = safeGetDataPoint(histogram, dataIndex);

        if (typeof macdValue === 'number' && typeof signalValue === 'number' && typeof histogramValue === 'number') {
          macdValueElement.innerHTML = `
            MACD: <span class="value">${macdValue.toFixed(4)}</span> | 
            信号: <span class="value">${signalValue.toFixed(4)}</span> | 
            柱: <span class="${histogramValue >= 0 ? 'positive' : 'negative'}">${histogramValue.toFixed(4)}</span>
          `;
        }
      }

      // 更新RSI指标值
      if (isSubIndicatorSelected('rsi') && rsiChart.current) {
        const rsiContainer = rsiChartRef.current;
        if (!rsiContainer) return;

        // 查找或创建RSI指标值显示元素
        let rsiValueElement = rsiContainer.querySelector('.rsi-indicator-values');
        if (!rsiValueElement) {
          rsiValueElement = document.createElement('div');
          rsiValueElement.className = 'indicator-value-text rsi-indicator';
          rsiContainer.appendChild(rsiValueElement);
        }

        // 计算RSI值
        const closePrices = extractClosePrices(candlestickData);
        const rsiData = calculateRSI(closePrices);

        const rsiValue = safeGetDataPoint(rsiData, dataIndex);

        if (typeof rsiValue === 'number') {
          rsiValueElement.innerHTML = `RSI: <span class="value">${rsiValue.toFixed(2)}</span>`;
        }
      }

      // 更新KDJ指标值
      if (isSubIndicatorSelected('kdj') && kdjChart.current) {
        const kdjContainer = kdjChartRef.current;
        if (!kdjContainer) return;

        // 查找或创建KDJ指标值显示元素
        let kdjValueElement = kdjContainer.querySelector('.kdj-indicator-values');
        if (!kdjValueElement) {
          kdjValueElement = document.createElement('div');
          kdjValueElement.className = 'indicator-value-text kdj-indicator';
          kdjContainer.appendChild(kdjValueElement);
        }

        // 计算KDJ值
        const closePrices = extractClosePrices(candlestickData);
        const highPrices = extractHighPrices(candlestickData);
        const lowPrices = extractLowPrices(candlestickData);
        const { k, d, j } = calculateKDJ(highPrices, lowPrices, closePrices);

        const kValue = safeGetDataPoint(k, dataIndex);
        const dValue = safeGetDataPoint(d, dataIndex);
        const jValue = safeGetDataPoint(j, dataIndex);

        if (typeof kValue === 'number' && typeof dValue === 'number' && typeof jValue === 'number') {
          kdjValueElement.innerHTML = `
            K: <span class="value">${kValue.toFixed(2)}</span> | 
            D: <span class="value">${dValue.toFixed(2)}</span> | 
            J: <span class="value">${jValue.toFixed(2)}</span>
          `;
        }
      }

      // 更新BOLL指标值
      if (mainIndicator === 'boll' && chartContainerRef.current) {
        const closePrices = extractClosePrices(candlestickData);
        const { upper, middle, lower } = calculateBollingerBands(closePrices);

        const upperValue = safeGetDataPoint(upper, dataIndex);
        const middleValue = safeGetDataPoint(middle, dataIndex);
        const lowerValue = safeGetDataPoint(lower, dataIndex);

        if (typeof upperValue === 'number' && typeof middleValue === 'number' && typeof lowerValue === 'number') {
          // 创建或更新BOLL值显示元素
          let bollValueElement = document.getElementById('boll-indicator-values');
          if (!bollValueElement) {
            bollValueElement = document.createElement('div');
            bollValueElement.id = 'boll-indicator-values';
            bollValueElement.className = 'indicator-value-text boll-indicator';
            chartContainerRef.current.appendChild(bollValueElement);
          }

          bollValueElement.innerHTML = `
            上轨: <span class="value">${upperValue.toFixed(2)}</span> | 
            中轨: <span class="value">${middleValue.toFixed(2)}</span> | 
            下轨: <span class="value">${lowerValue.toFixed(2)}</span>
          `;
          bollValueElement.style.display = 'block';
          bollValueElement.style.position = 'absolute';
          bollValueElement.style.left = '10px';
          bollValueElement.style.top = '10px';
          bollValueElement.style.backgroundColor = 'rgba(30, 34, 45, 0.7)';
          bollValueElement.style.padding = '5px';
          bollValueElement.style.borderRadius = '3px';
          bollValueElement.style.zIndex = '2';
        }
      }
    } catch (error) {
      console.error('更新指标值显示错误:', error);
    }
  };

  // 监听指标变化
  useEffect(() => {
    try {
      updateIndicators();

      // 如果有回测结果，绘制交易标记
      if (backtestResults && backtestResults.trades && backtestResults.trades.length > 0) {
        drawTradeMarkers();
      }
    } catch (error) {
      console.error('更新指标错误:', error);
    }
  }, [mainIndicator, subIndicators, backtestResults]);

  // 订阅主图表的时间范围变化事件
  useEffect(() => {
    const setupTimeScaleSync = () => {
      if (chart.current && chart.current.timeScale()) {
        try {
          // 添加时间轴变化事件监听
          chart.current.timeScale().subscribeVisibleLogicalRangeChange((range) => {
            if (!range) return;

            try {
              // 手动设置副图表的可见范围
              if (macdChart.current && macdChart.current.timeScale()) {
                try {
                  macdChart.current.timeScale().setVisibleLogicalRange(range);
                } catch (error) {
                  // 忽略错误
                }
              }

              if (rsiChart.current && rsiChart.current.timeScale()) {
                try {
                  rsiChart.current.timeScale().setVisibleLogicalRange(range);
                } catch (error) {
                  // 忽略错误
                }
              }

              if (kdjChart.current && kdjChart.current.timeScale()) {
                try {
                  kdjChart.current.timeScale().setVisibleLogicalRange(range);
                } catch (error) {
                  // 忽略错误
                }
              }
            } catch (error) {
              // 忽略错误
            }
          });
        } catch (error) {
          // 忽略错误
        }
      }
    };

    setupTimeScaleSync();

    return () => {
      // 清除事件监听
      if (chart.current && chart.current.timeScale()) {
        try {
          // 由于我们没有保存回调函数的引用，这里无法取消订阅
          // 但在组件卸载时会清理整个图表，所以不会造成内存泄漏
        } catch (error) {
          // 忽略错误
        }
      }
    };
  }, []);

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
          if (mainIndicator !== 'none' && chart.current) {
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
                  // 确保所有图表都存在并且有timeScale
                  if (chart.current && chart.current.timeScale()) {
                    syncTimeScales();
                    // 为副图表添加时间轴变化事件，确保双向联动
                    setupSubChartTimeScaleEvents();

                    // 如果有回测结果，重新绘制交易标记
                    if (backtestResults && backtestResults.trades && backtestResults.trades.length > 0 && candleSeries.current) {
                      drawTradeMarkers();
                    }
                  }
                } catch (error) {
                  console.error('同步时间轴失败:', error);
                }
              } catch (error) {
                console.error('绘制副图指标失败:', error);
              }
            } else {
              console.warn('部分副图容器未准备好，将在DOM更新后重试');
              // 使用requestAnimationFrame确保下一帧再次尝试
              requestAnimationFrame(() => {
                try {
                  updateIndicators();
                } catch (error) {
                  console.error('重试更新指标错误:', error);
                }
              });
            }
          } else {
            // 如果没有选择任何副图指标，清除所有副图
            try {
              clearSubIndicators();

              // 如果有回测结果，重新绘制交易标记
              if (backtestResults && backtestResults.trades && backtestResults.trades.length > 0 && candleSeries.current) {
                drawTradeMarkers();
              }
            } catch (error) {
              console.error('清除副图指标错误:', error);
            }
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

                  // 准备数据，使用统一的数据准备函数
        const times = candlestickData.map(item => item.time as Time);
        const upperData = prepareTimeSeriesData(upper, times);
        const middleData = prepareTimeSeriesData(middle, times);
        const lowerData = prepareTimeSeriesData(lower, times);

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
        case 'sar': {
          const highPrices = extractHighPrices(candlestickData);
          const lowPrices = extractLowPrices(candlestickData);
          const closePrices = extractClosePrices(candlestickData);

          // 检查是否满足计算SAR的条件（至少需要2个数据点）
          if (highPrices.length < 2 || lowPrices.length < 2 || closePrices.length < 2) return;

          // 计算SAR
          const sarValues = calculateSAR(highPrices, lowPrices, closePrices);

          // 创建SAR点状图
          const sarSeries = chart.current.addLineSeries({
            color: '#00bcd4',
            lineWidth: 1,
            crosshairMarkerVisible: true,
            crosshairMarkerRadius: 4,
            lastValueVisible: false,
            priceLineVisible: false,
          });

          // 准备数据，使用统一的数据准备函数
          const times = candlestickData.map(item => item.time as Time);
          const sarData = prepareTimeSeriesData(sarValues, times);

          // 如果没有有效数据，不添加指标
          if (sarData.length === 0) return;

          // 设置数据
          sarSeries.setData(sarData);

          // 保存引用
          mainIndicatorSeries.current.push(sarSeries);
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
            try {
              macdChart.current.removeSeries(series);
            } catch (error) {
              console.error('移除MACD系列错误:', error);
            }
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
        // console.warn('MACD数据全为NaN，跳过绘制');
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
        // console.warn('MACD处理后数据为空，跳过绘制');
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
        if (!macdChart.current) return;

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
        if (macdLine && macdData.length > 0) {
          try {
            macdLine.setData(macdData);
          } catch (error) {
            console.error('设置MACD线数据错误:', error);
          }
        }

        if (signalLine && signalData.length > 0) {
          try {
            signalLine.setData(signalData);
          } catch (error) {
            console.error('设置信号线数据错误:', error);
          }
        }

        if (histogramSeries && histogramData.length > 0) {
          try {
            histogramSeries.setData(histogramData);
          } catch (error) {
            console.error('设置直方图数据错误:', error);
          }
        }

        // 保存引用
        macdSeries.current.push(macdLine);
        macdSeries.current.push(signalLine);
        macdSeries.current.push(histogramSeries);

        // 适应视图
        if (macdChart.current && macdChart.current.timeScale()) {
          try {
            macdChart.current.timeScale().fitContent();
          } catch (error) {
            // 忽略错误，避免控制台报错
          }
        }
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
            try {
              rsiChart.current.removeSeries(series);
            } catch (error) {
              console.error('移除RSI系列错误:', error);
            }
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
        // console.warn('RSI数据全为NaN，跳过绘制');
        return;
      }

      // 深度复制数组，避免直接修改原始数据
      const rsiCopy = [...rsiData];

      // 安全处理：将所有NaN值替换为null，以避免图表绘制错误
      for (let i = 0; i < rsiCopy.length; i++) {
        if (isNaN(rsiCopy[i])) rsiCopy[i] = 50; // 使用中间值50代替NaN
      }

      // 创建时间序列
      const times = candlestickData.map(item => item.time as Time);

      // 准备数据，过滤掉无效值
      const formattedData = prepareTimeSeriesData(rsiCopy, times);

      // 如果没有有效数据，不添加指标
      if (formattedData.length === 0) {
        // console.warn('RSI处理后数据为空，跳过绘制');
        return;
      }

      try {
        if (!rsiChart.current) return;

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

        // 设置数据
        if (rsiLine && formattedData.length > 0) {
          try {
            rsiLine.setData(formattedData);
          } catch (error) {
            console.error('设置RSI线数据错误:', error);
          }
        }

        if (upperLine && upperLineData.length > 0) {
          try {
            upperLine.setData(upperLineData);
          } catch (error) {
            console.error('设置RSI上限线数据错误:', error);
          }
        }

        if (lowerLine && lowerLineData.length > 0) {
          try {
            lowerLine.setData(lowerLineData);
          } catch (error) {
            console.error('设置RSI下限线数据错误:', error);
          }
        }

        // 保存引用
        rsiSeries.current.push(rsiLine);
        rsiSeries.current.push(upperLine);
        rsiSeries.current.push(lowerLine);

        // 适应视图
        if (rsiChart.current && rsiChart.current.timeScale()) {
          try {
            rsiChart.current.timeScale().fitContent();
          } catch (error) {
            // 忽略错误，避免控制台报错
          }
        }
      } catch (error) {
        console.error('设置RSI数据错误:', error);
      }
    } catch (error) {
      console.error('绘制RSI指标错误:', error);
    }
  };

  // 绘制StockRSI指标
  const drawStockRsiIndicator = () => {
    if (!rsiChart.current || !rsiChartRef.current || !candlestickData.length) return;

    try {
      // 清除旧的RSI系列
      if (rsiSeries.current && rsiSeries.current.length > 0) {
        rsiSeries.current.forEach(series => {
          if (series && rsiChart.current) {
            try {
              rsiChart.current.removeSeries(series);
            } catch (error) {
              console.error('移除StockRSI系列错误:', error);
            }
          }
        });
        rsiSeries.current = [];
      }

      const closePrices = extractClosePrices(candlestickData);

      // 检查是否满足计算StockRSI的条件（至少需要28个数据点，14+14）
      if (closePrices.length < 28) {
        console.warn('数据点不足，无法计算StockRSI');
        return;
      }

      // 创建StockRSI指标
      const stockRsiData = calculateStockRSI(closePrices);

      if (!stockRsiData || stockRsiData.length === 0 || stockRsiData.every(v => isNaN(v))) {
        // console.warn('StockRSI数据全为NaN，跳过绘制');
        return;
      }

      // 深度复制数组，避免直接修改原始数据
      const stockRsiCopy = [...stockRsiData];

      // 安全处理：将所有NaN值替换为null，以避免图表绘制错误
      for (let i = 0; i < stockRsiCopy.length; i++) {
        if (isNaN(stockRsiCopy[i])) stockRsiCopy[i] = 50; // 使用中间值50代替NaN
      }

      // 创建时间序列
      const times = candlestickData.map(item => item.time as Time);

      // 准备数据，过滤掉无效值
      const formattedData = prepareTimeSeriesData(stockRsiCopy, times);

      // 如果没有有效数据，不添加指标
      if (formattedData.length === 0) {
        // console.warn('StockRSI处理后数据为空，跳过绘制');
        return;
      }

      try {
        if (!rsiChart.current) return;

        // 创建单独的价格轴
        const indicatorPriceScale = {
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
          borderVisible: true,
          borderColor: '#2e3241',
        };

        // StockRSI线
        const stockRsiLine = rsiChart.current.addLineSeries({
          color: '#f48fb1',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: true,
          ...indicatorPriceScale
        });

        // 添加80、50和20线
        const upperLine = rsiChart.current.addLineSeries({
          color: '#ef5350',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });

        const middleLine = rsiChart.current.addLineSeries({
          color: '#90caf9',
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

        // 创建80、50和20线的数据
        const upperLineData = formattedData.map(item => ({
          time: item.time,
          value: 80,
        }));

        const middleLineData = formattedData.map(item => ({
          time: item.time,
          value: 50,
        }));

        const lowerLineData = formattedData.map(item => ({
          time: item.time,
          value: 20,
        }));

        // 设置数据
        if (stockRsiLine && formattedData.length > 0) {
          try {
            stockRsiLine.setData(formattedData);
          } catch (error) {
            console.error('设置StockRSI线数据错误:', error);
          }
        }

        if (upperLine && upperLineData.length > 0) {
          try {
            upperLine.setData(upperLineData);
          } catch (error) {
            console.error('设置StockRSI上限线数据错误:', error);
          }
        }

        if (middleLine && middleLineData.length > 0) {
          try {
            middleLine.setData(middleLineData);
          } catch (error) {
            console.error('设置StockRSI中线数据错误:', error);
          }
        }

        if (lowerLine && lowerLineData.length > 0) {
          try {
            lowerLine.setData(lowerLineData);
          } catch (error) {
            console.error('设置StockRSI下限线数据错误:', error);
          }
        }

        // 保存引用
        rsiSeries.current.push(stockRsiLine);
        rsiSeries.current.push(upperLine);
        rsiSeries.current.push(middleLine);
        rsiSeries.current.push(lowerLine);

        // 适应视图
        if (rsiChart.current && rsiChart.current.timeScale()) {
          try {
            rsiChart.current.timeScale().fitContent();
          } catch (error) {
            // 忽略错误，避免控制台报错
          }
        }
      } catch (error) {
        console.error('设置StockRSI数据错误:', error);
      }
    } catch (error) {
      console.error('绘制StockRSI指标错误:', error);
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
            try {
              kdjChart.current.removeSeries(series);
            } catch (error) {
              console.error('移除KDJ系列错误:', error);
            }
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
        // console.warn('KDJ数据全为NaN，跳过绘制');
        return;
      }

      // 深度复制数组，避免直接修改原始数据
      const kCopy = [...k];
      const dCopy = [...d];
      const jCopy = [...j];

      // 安全处理：将所有NaN值替换为50，以避免图表绘制错误
      for (let i = 0; i < kCopy.length; i++) {
        if (isNaN(kCopy[i])) kCopy[i] = 50;
        if (isNaN(dCopy[i])) dCopy[i] = 50;
        if (isNaN(jCopy[i])) jCopy[i] = 50;
      }

      // 创建时间序列
      const times = candlestickData.map(item => item.time as Time);

      // 准备数据，过滤掉无效值
      const kData = prepareTimeSeriesData(kCopy, times);
      const dData = prepareTimeSeriesData(dCopy, times);
      const jData = prepareTimeSeriesData(jCopy, times);

      // 如果没有有效数据，不添加指标
      if (kData.length === 0 || dData.length === 0 || jData.length === 0) {
        // console.warn('KDJ处理后数据为空，跳过绘制');
        return;
      }

      try {
        if (!kdjChart.current) return;

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

        // 设置数据
        if (kLine && kData.length > 0) {
          try {
            kLine.setData(kData);
          } catch (error) {
            console.error('设置KDJ K线数据错误:', error);
          }
        }

        if (dLine && dData.length > 0) {
          try {
            dLine.setData(dData);
          } catch (error) {
            console.error('设置KDJ D线数据错误:', error);
          }
        }

        if (jLine && jData.length > 0) {
          try {
            jLine.setData(jData);
          } catch (error) {
            console.error('设置KDJ J线数据错误:', error);
          }
        }

        // 保存引用
        kdjSeries.current.push(kLine);
        kdjSeries.current.push(dLine);
        kdjSeries.current.push(jLine);

        // 适应视图
        if (kdjChart.current && kdjChart.current.timeScale()) {
          try {
            kdjChart.current.timeScale().fitContent();
          } catch (error) {
            // 忽略错误，避免控制台报错
          }
        }
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
      const rsiReady = (subIndicators.includes('rsi') || subIndicators.includes('stockrsi')) ? !!rsiChartRef.current : true;
      const kdjReady = subIndicators.includes('kdj') ? !!kdjChartRef.current : true;

      if (!macdReady || !rsiReady || !kdjReady) {
        console.warn('部分副图容器未准备好，将延迟绘制');
        // 使用requestAnimationFrame延迟绘制，等待DOM更新
        requestAnimationFrame(() => drawSubIndicator());
        return;
      }

      // 获取保存的K线宽度
      const savedBarSpacing = getSavedBarSpacing();

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
          barSpacing: savedBarSpacing, // 使用保存的K线宽度
        },
        rightPriceScale: {
          borderColor: '#2e3241',
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
      };

      // 分步创建和绘制图表，确保稳定性
      const createAndDrawCharts = async () => {
        try {
          // 1. 先清除不再需要的副图
          if (!subIndicators.includes('macd') && macdChart.current) {
            macdChart.current.remove();
            macdChart.current = null;
          }

          if (!subIndicators.includes('rsi') && !subIndicators.includes('stockrsi') && rsiChart.current) {
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
                    macdChart.current = createChart(macdChartRef.current, {
                      ...commonOptions,
                      height: 150,
                      // 保持与主图完全相同的时间轴设置，只隐藏显示
                      timeScale: {
                        ...commonOptions.timeScale,
                        visible: false,
                        borderVisible: false
                      }
                    });
                  }
                  break;
                case 'rsi':
                case 'stockrsi':
                  if (!rsiChart.current && rsiChartRef.current) {
                    rsiChart.current = createChart(rsiChartRef.current, {
                      ...commonOptions,
                      height: 150,
                      // 保持与主图完全相同的时间轴设置，只隐藏显示
                      timeScale: {
                        ...commonOptions.timeScale,
                        visible: false,
                        borderVisible: false
                      }
                    });
                  }
                  break;
                case 'kdj':
                  if (!kdjChart.current && kdjChartRef.current) {
                    kdjChart.current = createChart(kdjChartRef.current, {
                      ...commonOptions,
                      height: 150,
                      // 保持与主图完全相同的时间轴设置，只隐藏显示
                      timeScale: {
                        ...commonOptions.timeScale,
                        visible: false,
                        borderVisible: false
                      }
                    });
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
                case 'stockrsi':
                  if (rsiChart.current && rsiChartRef.current) {
                    drawStockRsiIndicator();
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

          // 4. 手动设置副图表的可见范围，而不是使用同步
          setTimeout(() => {
            try {
              if (chart.current && chart.current.timeScale()) {
                const mainVisibleRange = chart.current.timeScale().getVisibleLogicalRange();

                if (mainVisibleRange) {
                  // 手动设置每个副图表的可见范围
                  if (macdChart.current && macdChart.current.timeScale()) {
                    try {
                      macdChart.current.timeScale().setVisibleLogicalRange(mainVisibleRange);
                    } catch (error) {
                      // 忽略错误
                    }
                  }

                  if (rsiChart.current && rsiChart.current.timeScale()) {
                    try {
                      rsiChart.current.timeScale().setVisibleLogicalRange(mainVisibleRange);
                    } catch (error) {
                      // 忽略错误
                    }
                  }

                  if (kdjChart.current && kdjChart.current.timeScale()) {
                    try {
                      kdjChart.current.timeScale().setVisibleLogicalRange(mainVisibleRange);
                    } catch (error) {
                      // 忽略错误
                    }
                  }
                }

                // 如果有回测结果，重新绘制交易标记
                if (backtestResults && backtestResults.trades && backtestResults.trades.length > 0) {
                  drawTradeMarkers();
                }
              }
            } catch (error) {
              // 忽略错误
            }
          }, 100);
        } catch (error) {
          console.error('绘制副图表失败:', error);
        }
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
      // 确保时间周期格式正确
      // 注意：API可能需要小写格式，根据实际情况调整
      const normalizedInterval = interval;

      const result = await fetchHistoryWithIntegrityCheck(
        symbol,
        normalizedInterval,
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
    // 使用统一的默认时间范围
    const defaultRange = getDefaultDateRange();

    // 打开模态框并传入默认值
    setIsModalOpen(true);

    // 通过自定义事件设置默认值
    setTimeout(() => {
      const event = new CustomEvent('setDefaultDataLoadValues', {
        detail: {
          startDate: defaultRange.startDate.split(' ')[0], // 只取日期部分用于UI显示
          endDate: defaultRange.endDate.split(' ')[0], // 只取日期部分用于UI显示
          interval: '1D' // 默认周期为1天
        }
      });
      window.dispatchEvent(event);
    }, 100);
  };

  // 格式化日期为API所需格式（使用统一的格式化函数）
  const formatDateForApi = (date: Date): string => {
    return formatDateTimeString(date);
  };

  // 处理查询按钮点击
  const handleQueryClick = async () => {
    // 防止重复查询
    if (isHistoryLoading) return;

    setIsLoading(true);
    setIsHistoryLoading(true);

    try {
      // 直接使用Redux中的日期范围，已经是完整的时间格式
      const startTimeStr = dateRange.startDate;
      const endTimeStr = dateRange.endDate;

      // 确保时间周期格式正确
      const normalizedTimeframe = timeframe;

      // 使用fetchHistoryWithIntegrityCheck函数，传入标准格式的时间字符串
      const result = await fetchHistoryWithIntegrityCheck(
        selectedPair,
        normalizedTimeframe,
        startTimeStr,
        endTimeStr
      );

      // console.log('API返回结果:', result);
      // console.log('API结果类型:', typeof result);
      // console.log('API结果结构:', {
      //   hasData: !!result.data,
      //   dataType: typeof result.data,
      //   dataIsArray: Array.isArray(result.data),
      //   dataLength: result.data ? result.data.length : 'N/A'
      // });

      const data = result;

      console.log('查询结果:', data);

      if (data && data.data && Array.isArray(data.data)) {
        // 转换数据格式，添加数据验证
        const candlestickData = data.data
          .filter((item: any) => {
            // 基本数据验证
            if (!item) return false;
            
            // 时间验证
            if (!item.time) return false;
            
            // 价格数据验证
            const prices = [item.open, item.high, item.low, item.close];
            if (prices.some(price => price === null || price === undefined || isNaN(Number(price)))) {
              return false;
            }
            
            // 成交量验证
            if (item.volume === null || item.volume === undefined || isNaN(Number(item.volume))) {
              return false;
            }
            
            return true;
          })
          .map((item: any) => {
            // 将日期字符串转换为时间戳（秒）
            let openTime: number;
            try {
              openTime = new Date(item.time).getTime() ;
              // 验证时间戳是否有效
              if (isNaN(openTime) || openTime <= 0) {
                throw new Error('Invalid timestamp');
              }
            } catch (error) {
              console.warn('时间转换失败:', item.time, error);
              // 使用当前时间作为备选
              openTime = Math.floor(Date.now() / 1000);
            }

            return {
              time: openTime,
              open: Number(item.open),
              high: Number(item.high),
              low: Number(item.low),
              close: Number(item.close),
              volume: Number(item.volume)
            };
          });

        console.log(`数据转换完成: 原始${data.data.length}条，有效${candlestickData.length}条`);

        if (candlestickData.length > 0) {
          console.log('准备更新Redux数据:', {
            dataLength: candlestickData.length,
            firstItem: candlestickData[0],
            lastItem: candlestickData[candlestickData.length - 1]
          });
          
          // 更新Redux中的数据
          dispatch(updateCandlestickData(candlestickData));
          
          // 保存K线数据到localStorage
          saveCandlestickData(candlestickData);
          
          // 保存图表设置到localStorage
          saveChartSettings({
            selectedPair,
            timeframe,
            dateRange
          });
          
          // console.log('Redux数据更新调用完成，已保存到localStorage');
          
          // 显示成功消息
          setResponseMessage(`成功加载 ${candlestickData.length} 条数据`);
        } else {
          console.warn('数据转换后没有有效数据');
          setResponseMessage('数据转换后没有有效数据');
        }
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

  // 绘制回测交易标记
  const drawTradeMarkers = () => {
    if (!chart.current || !candleSeries.current || !backtestResults || !backtestResults.trades || backtestResults.trades.length === 0) {
      return;
    }

    try {
      // 准备买入和卖出标记
      const markers: SeriesMarker<Time>[] = [];

      // 安全地处理每个交易记录
      backtestResults.trades.forEach((trade: BacktestTrade) => {
        if (!trade || !trade.entryTime) return;

        // 添加买入标记
        if (trade.side === 'buy') {
          markers.push({
            time: trade.entryTime as Time,
            position: 'belowBar' as SeriesMarkerPosition,
            color: '#00FFFF', // 青色，更容易区分
            shape: 'arrowUp',
            text: `买入 ${formatPrice(trade.entryPrice)}`,
            size: 1, // 减小标记尺寸
            id: `entry-${trade.id || Math.random().toString(36).substring(2, 9)}`,
          });
        } else {
          // 卖出标记
          markers.push({
            time: trade.entryTime as Time,
            position: 'aboveBar' as SeriesMarkerPosition,
            color: '#FF00FF', // 品红色，更容易区分
            shape: 'arrowDown',
            text: `卖出 ${formatPrice(trade.entryPrice)}`,
            size: 1, // 减小标记尺寸
            id: `entry-${trade.id || Math.random().toString(36).substring(2, 9)}`,
          });
        }

        // 添加平仓标记，如果存在exitTime
        if (trade.exitTime) {
          markers.push({
            time: trade.exitTime as Time,
            position: (trade.side === 'buy' ? 'aboveBar' : 'belowBar') as SeriesMarkerPosition,
            color: trade.side === 'buy' ? '#FFFF00' : '#00FF00', // 买入平仓用黄色，卖出平仓用绿色
            shape: trade.side === 'buy' ? 'arrowDown' : 'arrowUp',
            text: `平仓 ${formatPrice(trade.exitPrice)} (${trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)})`,
            size: 1, // 减小标记尺寸
            id: `exit-${trade.id || Math.random().toString(36).substring(2, 9)}`,
          });
        }
      });

      // 设置标记
      if (markers.length > 0) {
        candleSeries.current.setMarkers(markers);
        console.log(`已绘制 ${markers.length} 个交易标记`);
      }
    } catch (error) {
      console.error('绘制交易标记错误:', error);
    }
  };

  // 监听回测结果变化
  useEffect(() => {
    if (backtestResults && backtestResults.trades && backtestResults.trades.length > 0) {
      // console.log(`检测到回测结果更新: ${backtestResults.trades.length} 个交易记录`);
      // 延迟一下，确保图表已经准备好
      setTimeout(() => {
        drawTradeMarkers();
      }, 100);
    } else {
      // 如果没有回测结果，清除所有标记
      // console.log('backtestResults为空，清除买卖点标记');
      if (candleSeries.current) {
        candleSeries.current.setMarkers([]);
        // console.log('已通过backtestResults监听清除买卖点标记');
      } else {
        // console.log('candleSeries.current不存在，无法清除买卖点标记');
      }
    }
  }, [backtestResults]);

  // 清除买卖点标记的函数
  const clearTradeMarkers = () => {
    try {
      if (candleSeries.current) {
        candleSeries.current.setMarkers([]);
        // console.log('已清除所有买卖点标记');
      } else {
        console.log('candleSeries.current 不存在，无法清除买卖点标记');
      }
    } catch (error) {
      console.error('清除买卖点标记时出错:', error);
    }
  };

  // 监听路由变化，当导航到首页时清除买卖点标记
  useEffect(() => {
    if (location.pathname === '/') {
      // console.log('检测到路由变化到首页，准备清除买卖点标记');
      
      // 尝试多次清除，确保candleSeries已初始化
      let retryCount = 0;
      const maxRetries = 10;
      
      const attemptClear = () => {
        retryCount++;
        if (candleSeries.current) {
          clearTradeMarkers();
          // console.log('路由变化到首页，已清除买卖点标记');
        } else if (retryCount < maxRetries) {
          // console.log(`第${retryCount}次尝试清除买卖点标记，candleSeries.current还未初始化，${200 * retryCount}ms后重试`);
          setTimeout(attemptClear, 200 * retryCount);
        } else {
          console.log('达到最大重试次数，停止尝试清除买卖点标记');
        }
      };
      
      // 立即尝试一次，然后延迟尝试
      attemptClear();
    }
  }, [location.pathname]);

  // 监听首页加载事件，清除买卖点标记
  useEffect(() => {
    const handleHomePageLoad = () => {
      clearTradeMarkers();
    };

    // 监听首页加载事件
    window.addEventListener('reload_data', handleHomePageLoad);

    // 组件初始化时也清除买卖点标记（针对首页刷新情况）
    if (window.location.pathname === '/') {
      setTimeout(() => {
        clearTradeMarkers();
      }, 200);
    }

    return () => {
      window.removeEventListener('reload_data', handleHomePageLoad);
    };
  }, []);

  // 清除所有指标
  const clearIndicators = () => {
    try {
      // 清除主图指标
      if (mainIndicatorSeries.current && mainIndicatorSeries.current.length > 0) {
        mainIndicatorSeries.current.forEach((series) => {
          if (series && chart.current) {
            try {
              chart.current.removeSeries(series);
            } catch (error) {
              console.error('清除主图指标错误:', error);
            }
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
      if (macdSeries.current && macdSeries.current.length > 0) {
        macdSeries.current.forEach((series) => {
          if (series && macdChart.current) {
            try {
              macdChart.current.removeSeries(series);
            } catch (error) {
              console.error('移除MACD系列错误:', error);
            }
          }
        });
      }
      macdSeries.current = [];

      // 清除RSI系列
      if (rsiSeries.current && rsiSeries.current.length > 0) {
        rsiSeries.current.forEach((series) => {
          if (series && rsiChart.current) {
            try {
              rsiChart.current.removeSeries(series);
            } catch (error) {
              console.error('移除RSI系列错误:', error);
            }
          }
        });
      }
      rsiSeries.current = [];

      // 清除KDJ系列
      if (kdjSeries.current && kdjSeries.current.length > 0) {
        kdjSeries.current.forEach((series) => {
          if (series && kdjChart.current) {
            try {
              kdjChart.current.removeSeries(series);
            } catch (error) {
              console.error('移除KDJ系列错误:', error);
            }
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

  // 处理交易对变更
  const handlePairChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // 使用正确的action更新Redux中的selectedPair
    dispatch(setSelectedPair(e.target.value));

    // 清空K线数据，等待用户点击查询按钮重新加载
    if (candleSeries.current && volumeSeries.current) {
      candleSeries.current.setData([]);
      volumeSeries.current.setData([]);
      dispatch(updateCandlestickData([]));
      clearIndicators();
      
      // 清除localStorage中的数据
      try {
        localStorage.removeItem(CANDLESTICK_DATA_KEY);
      } catch (error) {
        console.error('清除K线数据缓存失败:', error);
      }
    }
  };

  // 处理时间周期变更
  const handleTimeframeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // 使用正确的action更新Redux中的timeframe
    dispatch(setTimeframe(e.target.value as '1m' | '5m' | '15m' | '30m' | '1H' | '2H' | '4H' | '6H' | '12H' | '1D' | '1W' | '1M'));

    // 清空K线数据，等待用户点击查询按钮重新加载
    if (candleSeries.current && volumeSeries.current) {
      candleSeries.current.setData([]);
      volumeSeries.current.setData([]);
      dispatch(updateCandlestickData([]));
      clearIndicators();
      
      // 清除localStorage中的数据
      try {
        localStorage.removeItem(CANDLESTICK_DATA_KEY);
      } catch (error) {
        console.error('清除K线数据缓存失败:', error);
      }
    }
  };

  // 处理日期变更
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDatePart = e.target.value;
    // 手动选择日期时，使用00:00:00作为开始时间
    const newStartDate = `${newDatePart} 00:00:00`;
    
    // 获取结束日期的日期部分进行比较
    const endDatePart = dateRange.endDate.split(' ')[0];
    
    // 如果开始日期大于结束日期，自动调整结束日期为选择日期的23:59:59
    if (newDatePart > endDatePart) {
      dispatch(setDateRange(newStartDate, `${newDatePart} 23:59:59`));
    } else {
      dispatch(setDateRange(newStartDate, dateRange.endDate));
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDatePart = e.target.value;
    // 手动选择日期时，使用23:59:59作为结束时间
    const newEndDate = `${newDatePart} 23:59:59`;
    
    // 获取开始日期的日期部分进行比较
    const startDatePart = dateRange.startDate.split(' ')[0];
    
    // 如果结束日期小于开始日期，自动调整开始日期为选择日期的00:00:00
    if (newDatePart < startDatePart) {
      dispatch(setDateRange(`${newDatePart} 00:00:00`, newEndDate));
    } else {
      dispatch(setDateRange(dateRange.startDate, newEndDate));
    }
  };

  // 处理快捷时间选择
  const handleQuickTimeSelect = (startDate: string, endDate: string) => {
    const settings = { selectedPair, timeframe, dateRange: { startDate, endDate } };
    saveChartSettings(settings);
    dispatch(setDateRange(startDate, endDate));
  };

  return (
    <div className={`candlestick-chart-container ${showPanels ? '' : 'panels-hidden'}`}>
      <div className="chart-header">
        <div className="chart-selectors">
          <div className="selector-group">
            <label>交易对:</label>
            <select
              className="pair-selector"
              value={selectedPair}
              onChange={handlePairChange}
            >
              {COMMON_PAIRS.map(pair => (
                <option key={pair} value={pair}>{pair}</option>
              ))}
            </select>
          </div>
          <div className="selector-group">
            <label>时间周期:</label>
            <select
              className="timeframe-selector"
              value={timeframe}
              onChange={handleTimeframeChange}
            >
              {TIMEFRAMES.map(tf => (
                <option key={tf.value} value={tf.value}>{tf.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="chart-buttons">
          <div className="date-range-selector">
            <QuickTimeSelector onTimeRangeSelect={handleQuickTimeSelect} />
            <div className="date-input-group">
              <label>开始日期:</label>
              <input
                type="date"
                className="date-input"
                value={dateRange.startDate.split(' ')[0]}
                max={dateRange.endDate.split(' ')[0] < getYesterdayDateString() ? dateRange.endDate.split(' ')[0] : getYesterdayDateString()}
                onChange={handleStartDateChange}
              />
            </div>
            <div className="date-input-group">
              <label>结束日期:</label>
              <input
                type="date"
                className="date-input"
                value={dateRange.endDate.split(' ')[0]}
                min={dateRange.startDate.split(' ')[0]}
                max={getYesterdayDateString()}
                onChange={handleEndDateChange}
              />
            </div>
          </div>
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
          <button className="toggle-panels-button" onClick={togglePanels}>
            {showPanels ? '隐藏回测面板' : '显示回测面板'}
          </button>
        </div>
      </div>
      <div className="chart-container">
        <div className="chart-wrapper">
          <div ref={chartContainerRef} className={`chart-content main-chart ${showPanels ? '' : 'panels-hidden'}`} style={{ minHeight: '400px' }}>
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
          
          {/* 底部填充区域 - 始终显示 */}
          <div className={`chart-bottom-padding ${showPanels ? '' : 'panels-hidden'}`}></div>
        </div>

        {/* K线详细信息浮层 */}
        {hoveredData && (
          <div
            className="chart-tooltip"
            ref={tooltipRef}
            style={{
              position: 'absolute',
              left: `${hoveredData.mouseX ? Math.min(chartContainerRef.current?.clientWidth ? chartContainerRef.current.clientWidth - 150 : 800, Math.max(10, hoveredData.mouseX - 220)) : 0}px`,
              top: `${hoveredData.mouseY ? Math.min(chartContainerRef.current?.clientHeight ? chartContainerRef.current.clientHeight - 150 : 400, Math.max(10, hoveredData.mouseY - 40)) : 0}px`,
              backgroundColor: 'rgba(30, 34, 45, 0.9)',
              padding: '8px',
              borderRadius: '4px',
              zIndex: 3,
              pointerEvents: 'none'
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

      {/* 显示加载状态 */}
      {(isLoading || isHistoryLoading) && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>{isHistoryLoading ? '正在加载历史数据...' : '正在加载数据...'}</p>
        </div>
      )}
    </div>
  );
};

export default CandlestickChart;

