import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { StagewiseToolbar } from '@stagewise/toolbar-react';

// 错误回退组件
const ErrorFallback = ({ error }: { error: Error }) => {
  return (
    <div style={{ padding: '10px', color: '#ff6b6b', backgroundColor: '#1e222d', borderRadius: '4px' }}>
      <p>Stagewise工具栏加载失败:</p>
      <pre style={{ fontSize: '12px' }}>{error.message}</pre>
    </div>
  );
};

const StagewiseToolbarWrapper: React.FC = () => {
  useEffect(() => {
    // 防止重复加载
    if (document.getElementById('stagewise-root')) {
      return;
    }

    try {
      // 创建独立的DOM节点
      const toolbarRoot = document.createElement('div');
      toolbarRoot.id = 'stagewise-root';
      document.body.appendChild(toolbarRoot);

      // 使用createRoot API创建React根
      const root = createRoot(toolbarRoot);
      
      // 渲染Stagewise工具栏
      root.render(
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <StagewiseToolbar config={{
            plugins: []
          }} />
        </ErrorBoundary>
      );
      
      // 组件卸载时清理
      return () => {
        if (toolbarRoot.parentNode) {
          toolbarRoot.parentNode.removeChild(toolbarRoot);
        }
      };
    } catch (error) {
      console.error('Error initializing Stagewise toolbar:', error);
    }
  }, []);

  // 此组件不渲染任何内容
  return null;
};

// 导出带有错误边界的组件
const StagewiseToolbarWrapperWithErrorBoundary: React.FC = () => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <StagewiseToolbarWrapper />
    </ErrorBoundary>
  );
};

export default StagewiseToolbarWrapperWithErrorBoundary; 