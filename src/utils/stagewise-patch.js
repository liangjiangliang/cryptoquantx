// stagewise-patch.js
// 这个文件用于解决stagewise工具栏集成时可能出现的问题
// 它会在应用启动时加载，确保stagewise工具栏正确运行

console.log('Stagewise patch loaded');

// 确保window._STAGEWISE_ENABLED变量存在，用于控制工具栏的显示
if (process.env.NODE_ENV === 'development') {
  window._STAGEWISE_ENABLED = true;
} else {
  window._STAGEWISE_ENABLED = false;
}

// 添加全局错误处理，防止stagewise工具栏错误影响应用
window.addEventListener('error', function(event) {
  if (event.filename && event.filename.includes('stagewise')) {
    console.warn('Stagewise error intercepted:', event.message);
    event.preventDefault();
    return true;
  }
}); 