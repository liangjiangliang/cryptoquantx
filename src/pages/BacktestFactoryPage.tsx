import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchBacktestStrategies, createBacktest } from '../services/api';
import { Strategy, StrategyMap, ParsedParams, StrategyParam } from '../types/strategy';
import './BacktestFactoryPage.css';

const BacktestFactoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [strategies, setStrategies] = useState<StrategyMap>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [strategyCategories, setStrategyCategories] = useState<string[]>([]);
  const [formParams, setFormParams] = useState<{[key: string]: any}>({});
  const [creatingBacktest, setCreatingBacktest] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // 回测配置
  const [symbol, setSymbol] = useState<string>('BTC-USDT');
  const [interval, setInterval] = useState<string>('1D');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [initialAmount, setInitialAmount] = useState<number>(10000);

  // 分页状态
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  
  // 过滤和排序
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  
  // 缓存处理过的数据
  const [filteredStrategies, setFilteredStrategies] = useState<[string, Strategy][]>([]);
  
  // 设置默认日期范围（过去90天）
  useEffect(() => {
    const today = new Date();
    const endDateStr = today.toISOString().split('T')[0];
    
    const startDay = new Date();
    startDay.setDate(today.getDate() - 90);
    const startDateStr = startDay.toISOString().split('T')[0];
    
    setStartDate(startDateStr);
    setEndDate(endDateStr);
  }, []);

  // 加载策略列表
  useEffect(() => {
    const loadStrategies = async () => {
      setLoading(true);
      try {
        const response = await fetchBacktestStrategies();
        // API返回格式: { code: 200, data: { STRATEGY_CODE: { ... } }, message: "success" }
        if (response && response.data) {
          setStrategies(response.data);
          
          // 提取所有策略分类
          const categorySet = new Set<string>();
          Object.values(response.data).forEach((strategy: any) => {
            if (strategy && typeof strategy === 'object' && 'category' in strategy && typeof strategy.category === 'string') {
              categorySet.add(strategy.category);
            }
          });
          setCategories(['全部', ...Array.from(categorySet)]);
          
          // 如果有策略，默认选择第一个
          const strategyKeys = Object.keys(response.data);
          if (strategyKeys.length > 0) {
            const firstStrategy = strategyKeys[0];
            setSelectedStrategy(firstStrategy);
            
            // 设置默认参数值
            if (response.data[firstStrategy] && response.data[firstStrategy].default_params) {
              try {
                // 检查default_params是否为undefined或空字符串
                const defaultParamsStr = response.data[firstStrategy].default_params;
                if (!defaultParamsStr) {
                  setFormParams({});
                } else {
                  const defaultParams = JSON.parse(defaultParamsStr);
                  setFormParams(defaultParams);
                }
              } catch (err) {
                console.error('解析默认参数失败:', err);
                setFormParams({});
              }
            }
          }
        } else {
          setError('获取策略数据失败，API返回格式不正确');
        }
      } catch (err) {
        setError('加载回测策略失败，请稍后重试');
        console.error('加载回测策略失败:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadStrategies();
  }, []);

  // 当选择的策略变化时，更新表单参数
  useEffect(() => {
    if (selectedStrategy && strategies[selectedStrategy]) {
      try {
        // 检查default_params是否为undefined或null
        const defaultParamsStr = strategies[selectedStrategy].default_params;
        if (!defaultParamsStr) {
          // 如果default_params为undefined或空字符串，使用空对象
          setFormParams({});
          return;
        }
        const defaultParams = JSON.parse(defaultParamsStr);
        setFormParams(defaultParams);
      } catch (err) {
        console.error('解析默认参数失败:', err);
        setFormParams({});
      }
    }
  }, [selectedStrategy, strategies]);

  // 处理过滤和排序，仅在相关依赖变化时执行
  useEffect(() => {
    const getFilteredAndSortedStrategies = () => {
      let result = Object.entries(strategies);
      
      // 先按分类过滤
      if (selectedCategory) {
        result = result.filter(([_, strategy]) => strategy.category === selectedCategory);
      }
      
      // 再按搜索词过滤
      if (searchTerm) {
        const searchTermLower = searchTerm.toLowerCase();
        result = result.filter(([code, strategy]) => 
          code.toLowerCase().includes(searchTermLower) || 
          strategy.name.toLowerCase().includes(searchTermLower) ||
          strategy.description.toLowerCase().includes(searchTermLower)
        );
      }
      
      // 按字段排序
      result.sort((a, b) => {
        const strategyA = a[1];
        const strategyB = b[1];
        
        let valueA: any, valueB: any;
        
        switch (sortField) {
          case 'code':
            valueA = a[0];
            valueB = b[0];
            break;
          case 'name':
            valueA = strategyA.name;
            valueB = strategyB.name;
            break;
          case 'category':
            valueA = strategyA.category;
            valueB = strategyB.category;
            break;
          default:
            valueA = strategyA.name;
            valueB = strategyB.name;
        }
        
        if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
        if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
      
      // 计算总页数，但不在这里设置状态，避免循环
      const calculatedTotalPages = Math.ceil(result.length / itemsPerPage);
      
      // 检查当前页是否超出新的总页数
      const newCurrentPage = Math.min(currentPage, Math.max(1, calculatedTotalPages));
      
      // 返回分页结果
      const startIndex = (newCurrentPage - 1) * itemsPerPage;
      
      // 保存结果和元数据
      setFilteredStrategies(result.slice(startIndex, startIndex + itemsPerPage));
      setTotalPages(calculatedTotalPages);
      
      // 如果当前页超出新的总页数，更新当前页
      if (currentPage !== newCurrentPage) {
        setCurrentPage(newCurrentPage);
      }
    };
    
    getFilteredAndSortedStrategies();
  }, [strategies, searchTerm, sortField, sortDirection, selectedCategory, itemsPerPage, currentPage]);

  // 解析JSON字符串为对象
  const parseJsonString = (jsonString: string): any => {
    try {
      // 检查jsonString是否为undefined或null
      if (!jsonString) {
        return {};
      }
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('解析JSON失败:', error);
      return {};
    }
  };

  // 处理表单参数变化
  const handleParamChange = (key: string, value: string) => {
    setFormParams(prev => ({
      ...prev,
      [key]: isNaN(Number(value)) ? value : Number(value)
    }));
  };

  // 处理创建回测
  const handleCreateBacktest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStrategy) {
      setStatusMessage('请选择策略');
      return;
    }
    
    if (!startDate || !endDate) {
      setStatusMessage('请设置开始和结束日期');
      return;
    }
    
    setCreatingBacktest(true);
    setStatusMessage('创建回测中...');
    
    try {
      const result = await createBacktest(
        symbol,
        interval,
        selectedStrategy,
        formParams,
        startDate,
        endDate,
        initialAmount
      );
      
      if (result.success) {
        setStatusMessage('回测创建成功!');
        // 如果创建成功，跳转到回测汇总页面
        setTimeout(() => {
          navigate('/backtest-summaries');
        }, 1500);
      } else {
        setStatusMessage(`创建失败: ${result.message}`);
      }
    } catch (error) {
      console.error('创建回测出错:', error);
      setStatusMessage('创建回测出错，请稍后重试');
    } finally {
      setCreatingBacktest(false);
    }
  };

  // 渲染策略卡片
  const renderStrategyCard = (strategyCode: string, strategy: Strategy) => {
    const isSelected = selectedStrategy === strategyCode;
    
    return (
      <div 
        key={strategyCode}
        className={`strategy-card ${isSelected ? 'selected' : ''}`}
        onClick={() => setSelectedStrategy(strategyCode)}
      >
        <h3>{strategy.name}</h3>
        <p className="strategy-description">{strategy.description}</p>
        <div className="strategy-code">{strategyCode}</div>
      </div>
    );
  };

  // 渲染策略参数表单
  const renderStrategyParams = () => {
    if (!selectedStrategy || !strategies[selectedStrategy]) {
      return null;
    }
    
    const strategy = strategies[selectedStrategy];
    const params = parseJsonString(strategy.params);
    
    return (
      <div className="strategy-params">
        <h3>{strategy.name} - 参数配置</h3>
        <p>{strategy.description}</p>
        
        <form className="params-form" onSubmit={handleCreateBacktest}>
          <div className="backtest-config-section">
            <h4>回测配置</h4>
            
            <div className="param-group">
              <label htmlFor="symbol">交易对:</label>
              <select 
                id="symbol" 
                value={symbol} 
                onChange={(e) => setSymbol(e.target.value)}
              >
                <option value="BTC-USDT">BTC-USDT</option>
                <option value="ETH-USDT">ETH-USDT</option>
                <option value="BNB-USDT">BNB-USDT</option>
              </select>
            </div>
            
            <div className="param-group">
              <label htmlFor="interval">K线周期:</label>
              <select 
                id="interval" 
                value={interval} 
                onChange={(e) => setInterval(e.target.value)}
              >
                <option value="1m">1分钟</option>
                <option value="5m">5分钟</option>
                <option value="15m">15分钟</option>
                <option value="30m">30分钟</option>
                <option value="1h">1小时</option>
                <option value="4h">4小时</option>
                <option value="1D">日线</option>
                <option value="1W">周线</option>
              </select>
            </div>
            
            <div className="param-group">
              <label htmlFor="startDate">开始日期:</label>
              <input 
                type="date" 
                id="startDate" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div className="param-group">
              <label htmlFor="endDate">结束日期:</label>
              <input 
                type="date" 
                id="endDate" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            
            <div className="param-group">
              <label htmlFor="initialAmount">初始资金:</label>
              <input 
                type="number" 
                id="initialAmount" 
                value={initialAmount}
                onChange={(e) => setInitialAmount(Number(e.target.value))}
                min="1000"
              />
            </div>
          </div>
          
          <div className="strategy-params-section">
            <h4>策略参数</h4>
            {Object.entries(params).map(([key, description]) => (
              <div key={key} className="param-group">
                <label htmlFor={key}>{String(description)}:</label>
                <input 
                  type="number" 
                  id={key} 
                  name={key} 
                  value={formParams[key] || ''} 
                  onChange={(e) => handleParamChange(key, e.target.value)}
                />
              </div>
            ))}
          </div>
          
          {statusMessage && (
            <div className={`status-message ${creatingBacktest ? 'loading' : ''}`}>
              {statusMessage}
            </div>
          )}
          
          <button 
            type="submit" 
            className="create-backtest-btn"
            disabled={creatingBacktest}
          >
            {creatingBacktest ? '创建中...' : '创建回测'}
          </button>
        </form>
      </div>
    );
  };

  // 按分类渲染策略列表
  const renderStrategiesByCategory = () => {
    return strategyCategories.map(category => (
      <div key={category} className="strategy-category-section">
        <h2 className="category-title">{category}</h2>
        <div className="strategy-cards-container">
          {Object.entries(strategies)
            .filter(([_, strategy]) => strategy.category === category)
            .map(([strategyCode, strategy]) => renderStrategyCard(strategyCode, strategy))}
        </div>
      </div>
    ));
  };

  // 跳转到策略详情/创建回测页面
  const handleViewStrategy = (strategyCode: string) => {
    navigate(`/backtest-create/${strategyCode}`);
  };

  // 处理搜索
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // 处理排序
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // 处理分类筛选
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category === '全部' ? '' : category);
    setCurrentPage(1);
  };

  // 生成分页控件
  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // 首页和上一页按钮
    pages.push(
      <button 
        key="first" 
        onClick={() => setCurrentPage(1)} 
        disabled={currentPage === 1}
        className="page-btn"
      >
        首页
      </button>
    );
    
    pages.push(
      <button 
        key="prev" 
        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
        disabled={currentPage === 1}
        className="page-btn"
      >
        上一页
      </button>
    );
    
    // 页码按钮
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button 
          key={i} 
          onClick={() => setCurrentPage(i)}
          className={`page-btn ${currentPage === i ? 'active' : ''}`}
        >
          {i}
        </button>
      );
    }
    
    // 下一页和末页按钮
    pages.push(
      <button 
        key="next" 
        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
        disabled={currentPage === totalPages}
        className="page-btn"
      >
        下一页
      </button>
    );
    
    pages.push(
      <button 
        key="last" 
        onClick={() => setCurrentPage(totalPages)} 
        disabled={currentPage === totalPages}
        className="page-btn"
      >
        末页
      </button>
    );
    
    return (
      <div className="pagination">
        {pages}
        <span className="page-info">
          {currentPage} / {totalPages} 页，共 {Object.keys(strategies).length} 条
        </span>
      </div>
    );
  };

  // 渲染表格头部
  const renderTableHeader = () => {
    return (
      <div className="strategy-header">
        <div 
          className="strategy-cell code" 
          onClick={() => handleSort('code')}
        >
          策略代码
          {sortField === 'code' && (
            <span className="sort-indicator">
              {sortDirection === 'asc' ? '↑' : '↓'}
            </span>
          )}
        </div>
        <div 
          className="strategy-cell name" 
          onClick={() => handleSort('name')}
        >
          策略名称
          {sortField === 'name' && (
            <span className="sort-indicator">
              {sortDirection === 'asc' ? '↑' : '↓'}
            </span>
          )}
        </div>
        <div 
          className="strategy-cell category" 
          onClick={() => handleSort('category')}
        >
          分类
          {sortField === 'category' && (
            <span className="sort-indicator">
              {sortDirection === 'asc' ? '↑' : '↓'}
            </span>
          )}
        </div>
        <div className="strategy-cell description">描述</div>
        <div className="strategy-cell default-params">默认参数</div>
        <div className="strategy-cell action">操作</div>
      </div>
    );
  };

  // 渲染策略行
  const renderStrategyRow = (strategyCode: string, strategy: Strategy) => {
    // 解析并格式化默认参数
    let formattedParams = "";
    try {
      if (strategy.default_params && strategy.params) {
        const defaultParams = JSON.parse(strategy.default_params);
        const paramNames = JSON.parse(strategy.params);
        
        formattedParams = Object.entries(defaultParams)
          .map(([key, value]) => {
            // 使用params中的中文名称，如果不存在则使用原键名
            const displayName = paramNames[key] || key;
            return `${displayName}: ${value}`;
          })
          .join(', ');
      }
    } catch (err) {
      console.error('解析参数失败:', err);
      formattedParams = "参数解析失败";
    }

    return (
      <div key={strategyCode} className="strategy-row">
        <div className="strategy-cell code">{strategyCode}</div>
        <div className="strategy-cell name">{strategy.name}</div>
        <div className="strategy-cell category">{strategy.category}</div>
        <div className="strategy-cell description">{strategy.description}</div>
        <div className="strategy-cell default-params">{formattedParams}</div>
        <div className="strategy-cell action">
          <button 
            className="view-btn"
            onClick={() => handleViewStrategy(strategyCode)}
          >
            查看详情
          </button>
        </div>
      </div>
    );
  };

  // 渲染过滤器
  const renderFilters = () => {
    return (
      <div className="filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="搜索策略名称或描述"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        
        <div className="category-filter">
          <span>分类筛选:</span>
          <div className="category-buttons">
            {categories.map(category => (
              <button
                key={category}
                className={`category-btn ${selectedCategory === (category === '全部' ? '' : category) ? 'active' : ''}`}
                onClick={() => handleCategoryChange(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
        
        <div className="page-size-selector">
          <span>每页显示:</span>
          <select 
            value={itemsPerPage} 
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value="5">5条</option>
            <option value="10">10条</option>
            <option value="20">20条</option>
            <option value="50">50条</option>
          </select>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="loading-container">加载策略中...</div>;
  }

  if (error) {
    return <div className="error-container">{error}</div>;
  }

  return (
    <div className="backtest-factory-page">
      <div className="page-header">
        <h1>回测工厂</h1>
        <p>查看所有可用的策略模型</p>
      </div>
      
      {renderFilters()}
      
      <div className="strategy-table">
        {renderTableHeader()}
        
        <div className="strategy-body">
          {filteredStrategies.length > 0 ? (
            filteredStrategies.map(([code, strategy]) => 
              renderStrategyRow(code, strategy)
            )
          ) : (
            <div className="no-results">没有找到匹配的策略</div>
          )}
        </div>
      </div>
      
      {renderPagination()}
    </div>
  );
};

export default BacktestFactoryPage; 