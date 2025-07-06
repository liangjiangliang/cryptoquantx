// /**
//  * 这个文件用于修复 stagewise 插件中的 null 检查问题
//  * 应用启动后自动执行补丁
//  */

// (function patchStagewiseReactPlugin() {
//   // 等待文档加载完成
//   window.addEventListener('DOMContentLoaded', () => {
//     // 给一些时间让 stagewise 加载
//     setTimeout(() => {
//       try {
//         // 找到原始的 getSelectedElementsPrompt 函数
//         const originalModule = window.stagewise_plugins_react;
        
//         if (originalModule && originalModule.ReactPlugin && originalModule.ReactPlugin.onPromptSend) {
//           console.log('找到 stagewise-react 插件，应用补丁...');
          
//           // 保存原始函数引用
//           const originalOnPromptSend = originalModule.ReactPlugin.onPromptSend;
          
//           // 替换为安全版本
//           originalModule.ReactPlugin.onPromptSend = function(prompt) {
//             try {
//               // 确保 contextElements 存在并且是数组
//               if (!prompt || !prompt.contextElements || !Array.isArray(prompt.contextElements)) {
//                 console.log('stagewise 补丁: contextElements 无效，返回空数组');
//                 return { contextSnippets: [] };
//               }
              
//               // 调用原始函数，但捕获任何错误
//               return originalOnPromptSend(prompt);
//             } catch (error) {
//               console.error('stagewise 补丁: 捕获到错误:', error);
//               // 出现错误时返回空结果
//               return { contextSnippets: [] };
//             }
//           };
          
//           console.log('stagewise-react 补丁应用成功');
//         } else {
//           console.warn('未找到 stagewise-react 插件，无法应用补丁');
//         }
//       } catch (error) {
//         console.error('应用 stagewise 补丁时出错:', error);
//       }
//     }, 2000); // 延迟 2 秒以确保 stagewise 已加载
//   });
// })(); 