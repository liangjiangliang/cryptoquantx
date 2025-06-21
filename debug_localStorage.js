// 调试localStorage数据的脚本
// 在浏览器控制台中运行此脚本

console.log('=== localStorage 调试信息 ===');

// 检查K线数据
const candlestickKey = 'cryptoquantx_candlestick_data';
const candlestickData = localStorage.getItem(candlestickKey);
console.log('K线数据键:', candlestickKey);
console.log('K线数据存在:', !!candlestickData);
if (candlestickData) {
  try {
    const parsed = JSON.parse(candlestickData);
    console.log('K线数据长度:', Array.isArray(parsed) ? parsed.length : 'Not an array');
    console.log('K线数据第一项:', parsed[0]);
    console.log('K线数据类型检查:', {
      isArray: Array.isArray(parsed),
      firstItemType: typeof parsed[0],
      firstItemKeys: parsed[0] ? Object.keys(parsed[0]) : 'N/A'
    });
  } catch (e) {
    console.error('解析K线数据失败:', e);
  }
} else {
  console.log('没有找到K线数据');
}

// 检查图表设置
const settingsKey = 'cryptoquantx_chart_settings';
const settingsData = localStorage.getItem(settingsKey);
console.log('\n图表设置键:', settingsKey);
console.log('图表设置存在:', !!settingsData);
if (settingsData) {
  try {
    const parsed = JSON.parse(settingsData);
    console.log('图表设置:', parsed);
  } catch (e) {
    console.error('解析图表设置失败:', e);
  }
} else {
  console.log('没有找到图表设置');
}

// 检查所有以cryptoquantx开头的localStorage项
console.log('\n=== 所有相关的localStorage项 ===');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && key.startsWith('cryptoquantx')) {
    console.log(`${key}:`, localStorage.getItem(key)?.substring(0, 100) + '...');
  }
}

console.log('=== 调试完成 ==='); 