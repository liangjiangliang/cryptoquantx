// 在浏览器控制台中运行这个脚本来调试图表数据问题

console.log('=== 图表数据调试信息 ===');

// 1. 检查localStorage数据
console.log('\n1. localStorage数据检查:');
const savedData = localStorage.getItem('cryptoquantx_candlestick_data');
const savedSettings = localStorage.getItem('cryptoquantx_chart_settings');

console.log('K线数据存在:', !!savedData);
console.log('图表设置存在:', !!savedSettings);

if (savedData) {
  try {
    const data = JSON.parse(savedData);
    console.log('K线数据长度:', data.length);
    console.log('第一个数据项:', data[0]);
    console.log('最后一个数据项:', data[data.length - 1]);
    
    // 检查时间格式
    if (data.length > 0) {
      const firstItem = data[0];
      console.log('时间字段类型:', typeof firstItem.time);
      console.log('时间值:', firstItem.time);
      console.log('是否为有效时间戳:', firstItem.time > 1000000000 && firstItem.time < 9999999999);
    }
  } catch (e) {
    console.error('解析localStorage数据失败:', e);
  }
}

if (savedSettings) {
  try {
    const settings = JSON.parse(savedSettings);
    console.log('保存的设置:', settings);
  } catch (e) {
    console.error('解析设置数据失败:', e);
  }
}

// 2. 检查Redux store状态
console.log('\n2. Redux Store状态检查:');
// 假设store是全局可访问的，如果不是，需要从React DevTools查看
const storeData = window.__REDUX_DEVTOOLS_EXTENSION__ ? 
  window.__REDUX_DEVTOOLS_EXTENSION__.store?.getState() : 
  'Redux DevTools 不可用';

if (storeData && storeData !== 'Redux DevTools 不可用') {
  console.log('Redux中K线数据长度:', storeData.candlestickData?.length || 0);
  console.log('Redux中交易对:', storeData.selectedPair);
  console.log('Redux中时间周期:', storeData.timeframe);
  console.log('Redux中日期范围:', storeData.dateRange);
} else {
  console.log('无法访问Redux store，请在React DevTools中查看');
}

// 3. 检查图表DOM元素
console.log('\n3. 图表DOM元素检查:');
const chartContainer = document.querySelector('.main-chart');
const candlestickChart = document.querySelector('.candlestick-chart-container');

console.log('主图表容器存在:', !!chartContainer);
console.log('K线图容器存在:', !!candlestickChart);

if (chartContainer) {
  console.log('主图表容器尺寸:', {
    width: chartContainer.clientWidth,
    height: chartContainer.clientHeight
  });
}

// 4. 检查是否有错误信息
console.log('\n4. 页面错误检查:');
const errors = window.console._errors || [];
if (errors.length > 0) {
  console.log('发现错误:', errors);
} else {
  console.log('未发现明显错误');
}

// 5. 提供数据恢复函数
console.log('\n5. 数据恢复函数:');
window.forceDataRestore = function() {
  console.log('尝试强制恢复数据...');
  const savedData = localStorage.getItem('cryptoquantx_candlestick_data');
  if (savedData) {
    try {
      const data = JSON.parse(savedData);
      console.log('准备恢复数据，长度:', data.length);
      
      // 触发自定义事件来通知React组件
      const event = new CustomEvent('forceDataRestore', {
        detail: { data: data }
      });
      window.dispatchEvent(event);
      
      console.log('数据恢复事件已发送');
    } catch (e) {
      console.error('数据恢复失败:', e);
    }
  } else {
    console.log('没有可恢复的数据');
  }
};

console.log('可以调用 window.forceDataRestore() 来强制恢复数据');
console.log('=== 调试信息结束 ==='); 