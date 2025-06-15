import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// 创建一个包含App的组件
const AppWrapper = () => {
  return (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

// 初始化工具栏（与React渲染分开）
const initStagewiseToolbar = async () => {
  if (process.env.NODE_ENV === 'development') {
    try {
      // 动态导入工具栏
      const toolbarModule = await import('@stagewise/toolbar');
      const { initToolbar } = toolbarModule;
      
      if (initToolbar) {
        // 使用默认配置初始化
        initToolbar();
        console.log('Stagewise toolbar initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize Stagewise toolbar:', error);
    }
  }
};

// 初始化工具栏
initStagewiseToolbar();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(<AppWrapper />);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
