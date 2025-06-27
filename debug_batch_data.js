const http = require('http');

const batchId = '8b5dd3cb-2c5f-4a1d-890e-8536b00283b7';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: `/api/api/backtest/ta4j/summaries/batch/${batchId}`,
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('开始请求API...');

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      console.log('API响应状态码:', res.statusCode);
      console.log('API响应数据结构:');
      console.log('- code:', jsonData.code);
      console.log('- message:', jsonData.message);
      console.log('- 策略数量:', jsonData.data ? jsonData.data.length : 0);
      
      if (jsonData.data && jsonData.data.length > 0) {
        // 按年化收益率倒序排列
        const sortedData = jsonData.data.sort((a, b) => (b.annualizedReturn || 0) - (a.annualizedReturn || 0));
        
        console.log('\n=== 按年化收益率倒序排列的前10个策略 ===');
        sortedData.slice(0, 10).forEach((strategy, index) => {
          console.log(`${index + 1}. ${strategy.strategyName}`);
          console.log(`   年化收益率: ${strategy.annualizedReturn || 'N/A'}`);
          console.log(`   综合评分: ${strategy.comprehensiveScore || 'N/A'}`);
          console.log(`   最大回撤: ${strategy.maxDrawdown || 'N/A'}`);
          console.log(`   最大回撤持续天数: ${strategy.maxDrawdownDuration || 'N/A'}`);
          console.log(`   胜率: ${strategy.winRate || 'N/A'}`);
          console.log('');
        });
        
        console.log('\n=== 分析最大回撤持续天数 ===');
        const maxDrawdownDurations = sortedData.map(s => s.maxDrawdownDuration || 0);
        const uniqueDurations = [...new Set(maxDrawdownDurations)];
        console.log('所有策略的最大回撤持续天数:', maxDrawdownDurations.slice(0, 10));
        console.log('唯一值:', uniqueDurations);
        console.log('是否都相同:', uniqueDurations.length === 1);
        
        console.log('\n=== 综合评分分析 ===');
        sortedData.slice(0, 10).forEach((strategy, index) => {
          const annualReturn = strategy.annualizedReturn || 0;
          const score = strategy.comprehensiveScore || 0;
          const reasonableScore = annualReturn * 20; // 简单的合理性估算：20%年化收益应该得4分左右
          console.log(`${strategy.strategyName}:`);
          console.log(`  年化收益率: ${(annualReturn * 100).toFixed(2)}%`);
          console.log(`  实际评分: ${score.toFixed(2)}`);
          console.log(`  估算合理评分: ${reasonableScore.toFixed(2)}`);
          console.log(`  是否合理: ${Math.abs(score - reasonableScore) < 2 ? '是' : '否'}`);
          console.log('');
        });
      }
    } catch (error) {
      console.error('解析JSON数据失败:', error);
      console.log('原始响应数据:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('请求失败:', error);
});

req.end(); 