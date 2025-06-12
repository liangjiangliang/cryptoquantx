import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchBacktestStrategies, createBacktest, deleteStrategy, generateStrategy, updateStrategy } from '../services/api';
import ConfirmModal from '../components/ConfirmModal/ConfirmModal';
import GenerateStrategyModal from '../components/GenerateStrategyModal/GenerateStrategyModal';
import ResultModal from '../components/ResultModal/ResultModal';
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
  const [itemsPerPage, setItemsPerPage] = useState<number>(9);
  const [totalPages, setTotalPages] = useState<number>(1);
  
  // 过滤和排序
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<string>('updated_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  
  // 缓存处理过的数据
  const [filteredStrategies, setFilteredStrategies] = useState<[string, Strategy][]>([]);
  
  // 删除确认模态框状态
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStrategyCode, setDeleteStrategyCode] = useState<string>('');
  
  // 生成策略相关状态
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [strategyDescription, setStrategyDescription] = useState('');
  const [generatingStrategy, setGeneratingStrategy] = useState(false);
  
  // 修改策略相关状态
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateStrategyDescription, setUpdateStrategyDescription] = useState('');
  const [updatingStrategy, setUpdatingStrategy] = useState(false);
  const [currentStrategyId, setCurrentStrategyId] = useState<number | null>(null);
  
  // 结果弹窗状态
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalTitle, setResultModalTitle] = useState('');
  const [resultModalMessage, setResultModalMessage] = useState('');
  const [resultModalType, setResultModalType] = useState<'success' | 'error' | 'info'>('info');
  
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

  useEffect(() => {
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
          case 'updated_at':
            // 处理更新时间排序，如果没有更新时间则使用最小值
            valueA = strategyA.update_time ? new Date(strategyA.update_time).getTime() : 0;
            valueB = strategyB.update_time ? new Date(strategyB.update_time).getTime() : 0;
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
    // 跳转到首页并在URL中传递策略代码参数
    navigate(`/?strategy=${strategyCode}`);
  };

  // 删除策略
  const handleDeleteStrategy = (strategyCode: string) => {
    setDeleteStrategyCode(strategyCode);
    setShowDeleteModal(true);
  };

  const confirmDeleteStrategy = async () => {
    try {
      const result = await deleteStrategy(deleteStrategyCode);
      
      if (result.success) {
        setStatusMessage('策略删除成功!');
        // 重新加载策略列表
        loadStrategies();
      } else {
        setStatusMessage(`删除失败: ${result.message}`);
      }
    } catch (error) {
      console.error('删除策略出错:', error);
      setStatusMessage('删除策略出错，请稍后重试');
    } finally {
      setShowDeleteModal(false);
      setDeleteStrategyCode('');
    }
  };

  const cancelDeleteStrategy = () => {
    setShowDeleteModal(false);
    setDeleteStrategyCode('');
  };

  // 处理生成策略
  const handleGenerateStrategy = async () => {
    if (!strategyDescription.trim()) {
      setStatusMessage('请输入策略描述');
      return;
    }

    setGeneratingStrategy(true);
    setStatusMessage('正在生成策略...');

    try {
      const result = await generateStrategy(strategyDescription);
      
      if (result.success) {
        // 显示详细的返回信息
        let message = '策略生成成功!';
        if (result.data) {
          // 如果有返回数据，显示详细信息
          if (typeof result.data === 'string') {
            message += `\n\n生成的策略:\n${result.data}`;
          } else if (typeof result.data === 'object') {
            message += `\n\n返回数据:\n${JSON.stringify(result.data, null, 2)}`;
          }
        }
        if (result.message && result.message !== '策略生成成功') {
          message += `\n\n服务器消息: ${result.message}`;
        }
        
        // 使用ResultModal显示详细信息
        showResult('策略生成成功', message, 'success');
        
        setStatusMessage('策略生成成功!');
        setShowGenerateModal(false);
        setStrategyDescription('');
        // 重新加载策略列表
        loadStrategies();
      } else {
        const errorMessage = `生成失败: ${result.message || '未知错误'}`;
        setStatusMessage(errorMessage);
        showResult('策略生成失败', errorMessage, 'error');
      }
    } catch (error) {
      console.error('生成策略出错:', error);
      const errorMessage = '生成策略出错，请稍后重试';
      setStatusMessage(errorMessage);
      showResult('策略生成错误', errorMessage, 'error');
    } finally {
      setGeneratingStrategy(false);
    }
  };

  // 取消生成策略
  const cancelGenerateStrategy = () => {
    setShowGenerateModal(false);
    setStrategyDescription('');
  };

  // 处理修改策略
  const handleUpdateStrategy = async () => {
    if (!updateStrategyDescription.trim()) {
      showResult('输入错误', '请输入策略描述', 'error');
      return;
    }

    if (!currentStrategyId) {
      showResult('错误', '未选择策略', 'error');
      return;
    }

    setUpdatingStrategy(true);
    try {
      const result = await updateStrategy(currentStrategyId, updateStrategyDescription);
      
      if (result.success) {
        setShowUpdateModal(false);
        setUpdateStrategyDescription('');
        setCurrentStrategyId(null);
        // 显示策略详细信息
        const strategyData = result.data;
        const detailMessage = `
策略名称: ${strategyData.strategyName}
分类: ${strategyData.category}
描述: ${strategyData.description}
评论: ${strategyData.comments}
更新时间: ${strategyData.updateTime}`;
        showResult('策略修改成功', detailMessage, 'success');
        // 刷新策略列表
        await loadStrategies();
      } else {
        showResult('策略修改失败', result.message || '修改策略失败，请稍后重试', 'error');
      }
    } catch (error) {
      console.error('修改策略出错:', error);
      const errorMessage = '修改策略出错，请稍后重试';
      showResult('策略修改错误', errorMessage, 'error');
    } finally {
      setUpdatingStrategy(false);
    }
  };

  // 取消修改策略
  const cancelUpdateStrategy = () => {
    setShowUpdateModal(false);
    setUpdateStrategyDescription('');
    setCurrentStrategyId(null);
  };

  // 打开修改策略模态框
  const openUpdateModal = (strategyId: number) => {
    setCurrentStrategyId(strategyId);
    setShowUpdateModal(true);
  };

  // 显示结果弹窗
  const showResult = (title: string, message: string, type: 'success' | 'error' | 'info') => {
    setResultModalTitle(title);
    setResultModalMessage(message);
    setResultModalType(type);
    setShowResultModal(true);
  };

  // 关闭结果弹窗
  const closeResultModal = () => {
    setShowResultModal(false);
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

  // 生成分页控件 - 与历史回测页面保持一致
  const renderPagination = () => {
    // 计算总记录数
    const totalRecords = Object.entries(strategies).filter(([code, strategy]) => {
      // 应用相同的过滤逻辑
      let matches = true;
      
      if (selectedCategory) {
        matches = matches && strategy.category === selectedCategory;
      }
      
      if (searchTerm) {
        const searchTermLower = searchTerm.toLowerCase();
        matches = matches && (
          code.toLowerCase().includes(searchTermLower) || 
          strategy.name.toLowerCase().includes(searchTermLower) ||
          strategy.description.toLowerCase().includes(searchTermLower)
        );
      }
      
      return matches;
    }).length;
    
    return (
      <div className="pagination-container">
        <div className="pagination-buttons">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            首页
          </button>
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            上一页
          </button>
          <div className="pagination-info">
            {currentPage} / {totalPages} 页 (共 {totalRecords} 条记录)
          </div>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            下一页
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            末页
          </button>
        </div>
        <div className="page-size-selector">
          每页
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          条
        </div>
      </div>
    );
  };

  // 渲染表格头部
  const renderTableHeader = () => {
    return (
      <div className="strategy-header">
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
          className="strategy-cell comments" 
          onClick={() => handleSort('comments')}
        >
          评价
          {sortField === 'comments' && (
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
        <div 
          className="strategy-cell updated-at" 
          onClick={() => handleSort('updated_at')}
        >
          更新时间
          {sortField === 'updated_at' && (
            <span className="sort-indicator">
              {sortDirection === 'asc' ? '↑' : '↓'}
            </span>
          )}
        </div>
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
        <div className="strategy-cell name">{strategy.name}</div>
        <div className="strategy-cell comments">{strategy.comments || '暂无评价'}</div>
        <div className="strategy-cell category">{strategy.category}</div>
        <div className="strategy-cell description">{strategy.description}</div>
        <div className="strategy-cell default-params">{formattedParams}</div>
        <div className="strategy-cell updated-at">
          {strategy.update_time ? new Date(strategy.update_time).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }) : '未知'}
        </div>
        <div className="strategy-cell action">
          <button 
            className="view-btn"
            onClick={() => handleViewStrategy(strategyCode)}
          >
            执行
          </button>
          <button 
            className="update-btn"
            onClick={() => openUpdateModal(strategy.id || 0)}
          >
            更新
          </button>
          <button 
            className="delete-btn"
            onClick={() => handleDeleteStrategy(strategyCode)}
          >
            删除
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
        
        <div className="generate-strategy-section">
          <button
            className="generate-strategy-btn"
            onClick={() => setShowGenerateModal(true)}
            disabled={generatingStrategy}
          >
            {generatingStrategy ? '生成中...' : '🤖 AI生成策略'}
          </button>
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
      
      {/* 确认删除模态框 */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="确认删除策略"
        message={`确定要删除策略 "${deleteStrategyCode}" 吗？此操作不可撤销，删除后将无法恢复。`}
        confirmText="删除"
        cancelText="取消"
        type="danger"
        onConfirm={confirmDeleteStrategy}
        onCancel={cancelDeleteStrategy}
      />
      
      {/* 生成策略模态框 */}
      <GenerateStrategyModal
        isOpen={showGenerateModal}
        onClose={cancelGenerateStrategy}
        onConfirm={handleGenerateStrategy}
        description={strategyDescription}
        onDescriptionChange={setStrategyDescription}
        isGenerating={generatingStrategy}
      />
      
      {/* 修改策略模态框 */}
      <GenerateStrategyModal
        isOpen={showUpdateModal}
        onClose={cancelUpdateStrategy}
        onConfirm={handleUpdateStrategy}
        description={updateStrategyDescription}
        onDescriptionChange={setUpdateStrategyDescription}
        isGenerating={updatingStrategy}
        title="修改策略"
        confirmText="修改策略"
        loadingText="正在修改策略..."
      />
      
      {/* 结果显示模态框 */}
      <ResultModal
        isOpen={showResultModal}
        onClose={closeResultModal}
        title={resultModalTitle}
        message={resultModalMessage}
        type={resultModalType}
      />
    </div>
  );
};

export default BacktestFactoryPage;