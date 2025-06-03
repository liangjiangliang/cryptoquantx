import React, { useEffect } from 'react';
import { IChartApi, ISeriesApi, SeriesMarkerPosition, SeriesMarker, Time } from 'lightweight-charts';
import { BacktestTrade } from '../../types/backtest';
import './TradeMarkers.css';

// 格式化价格
const formatPrice = (price: number | undefined): string => {
  if (price === undefined) return '0.00';
  return price.toFixed(price < 10 ? 6 : price < 100 ? 4 : 2);
};

interface TradeMarkersProps {
  chart: React.RefObject<IChartApi | null>;
  candleSeries: React.RefObject<ISeriesApi<'Candlestick'> | null>;
  backtestResults: any; // 回测结果
}

const TradeMarkers: React.FC<TradeMarkersProps> = ({ chart, candleSeries, backtestResults }) => {
  // 绘制回测交易标记
  const drawTradeMarkers = () => {
    if (!chart.current || !candleSeries.current || !backtestResults || !backtestResults.trades || backtestResults.trades.length === 0) {
      return;
    }

    try {
      // 准备买入和卖出标记
      const markers = backtestResults.trades.flatMap((trade: BacktestTrade) => {
        const markers: SeriesMarker<Time>[] = [];

        // 添加买入标记
        if (trade.side === 'buy') {
          markers.push({
            time: trade.entryTime as Time,
            position: 'belowBar' as SeriesMarkerPosition,
            color: '#00FFFF', // 青色，更容易区分
            shape: 'arrowUp',
            text: `买入 ${formatPrice(trade.entryPrice)}`,
            size: 1,
            id: `entry-${trade.id || ''}`,
          });
        } else {
          // 卖出标记
          markers.push({
            time: trade.entryTime as Time,
            position: 'aboveBar' as SeriesMarkerPosition,
            color: '#FF00FF', // 品红色，更容易区分
            shape: 'arrowDown',
            text: `卖出 ${formatPrice(trade.entryPrice)}`,
            size: 1,
            id: `entry-${trade.id || ''}`,
          });
        }

        // 添加平仓标记
        if (trade.exitTime && trade.exitPrice !== undefined) {
          const profitText = trade.profit !== undefined && trade.profit !== null
            ? `(${trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)})`
            : '';

          markers.push({
            time: trade.exitTime as Time,
            position: (trade.side === 'buy' ? 'aboveBar' : 'belowBar') as SeriesMarkerPosition,
            color: trade.side === 'buy' ? '#FFFF00' : '#00FF00', // 买入平仓黄色，卖出平仓绿色
            shape: trade.side === 'buy' ? 'arrowDown' : 'arrowUp',
            text: `平仓 ${formatPrice(trade.exitPrice)} ${profitText}`,
            size: 1,
            id: `exit-${trade.id || Math.random().toString(36).substring(2, 9)}`,
          });
        }

        return markers;
      });

      // 设置标记
      candleSeries.current.setMarkers(markers);

      console.log(`已绘制 ${markers.length} 个交易标记`);
    } catch (error) {
      console.error('绘制交易标记错误:', error);
    }
  };

  // 监听回测结果变化
  useEffect(() => {
    if (backtestResults && backtestResults.trades && backtestResults.trades.length > 0) {
      console.log(`检测到回测结果更新: ${backtestResults.trades.length} 个交易记录`);
      // 延迟一下，确保图表已经准备好
      setTimeout(() => {
        drawTradeMarkers();
      }, 100);
    } else if (candleSeries.current) {
      // 如果没有回测结果，清除所有标记
      candleSeries.current.setMarkers([]);
    }
  }, [backtestResults]);

  // 组件不渲染任何内容，仅处理标记逻辑
  return null;
};

export default TradeMarkers;
