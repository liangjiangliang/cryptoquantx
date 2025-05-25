import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// 隐蔽初始化Stagewise工具栏
const initStagewiseToolbar = () => {
  // 避免在生产环境运行
  if (process.env.NODE_ENV !== 'development') return;
  
  // 避免重复初始化
  if (document.getElementById('stagewise-root') || 
      document.querySelector('[data-stagewise-toolbar]') ||
      (window as any).__STAGEWISE_TOOLBAR_INITIALIZED__) {
    return;
  }

  try {
    // 动态导入工具栏，避免报错影响页面
    import('@stagewise/toolbar-react').then(({ StagewiseToolbar }) => {
      (window as any).__STAGEWISE_TOOLBAR_INITIALIZED__ = true;
      
      // 创建容器元素
      const container = document.createElement('div');
      container.id = 'stagewise-root';
      container.style.display = 'none'; // 初始隐藏，避免闪烁
      document.body.appendChild(container);

      // 渲染工具栏，捕获所有可能的错误
      try {
        const root = ReactDOM.createRoot(container);
        root.render(<StagewiseToolbar config={{ plugins: [] }} />);
        
        // 短暂延迟后显示工具栏
        setTimeout(() => {
          container.style.display = '';
        }, 500);
      } catch (e) {
        // 静默处理错误，不显示任何错误信息
        console.log('Stagewise toolbar initialization suppressed');
      }
    }).catch(() => {
      // 静默处理导入错误
    });
  } catch (e) {
    // 静默处理所有错误
  }
};

// 页面加载后延迟初始化工具栏
setTimeout(initStagewiseToolbar, 1000);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
