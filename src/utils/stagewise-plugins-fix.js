// /**
//  * 这是 stagewise-plugins/react 的修复版本
//  * 在 App 加载后直接覆盖原始模块中的函数
//  */

// window.fixStagewisePlugins = function() {
//   // 尝试定位和修复模块
//   setTimeout(() => {
//     try {
//       // 安全版本的 getSelectedElementsPrompt 函数
//       function safeGetSelectedElementsPrompt(elements) {
//         // 确保 elements 是一个数组
//         if (!elements || !Array.isArray(elements)) {
//           return null;
//         }
        
//         // 安全地获取组件层次结构
//         const selectedComponentHierarchies = elements.map(e => {
//           if (!e) return null;
//           try {
//             // 这里假设 getReactComponentHierarchy 是存在的
//             // 我们无法直接访问原始函数，所以这里会在运行时被跳过
//             return window.__stagewise_internal?.getReactComponentHierarchy?.(e) || null;
//           } catch (err) {
//             console.error('获取组件层次结构时出错:', err);
//             return null;
//           }
//         });
        
//         // 确保检查每个元素是否存在且有长度
//         if (selectedComponentHierarchies.some(h => h && h.length > 0)) {
//           const content = `This is additional information on the elements that the user selected. Use this information to find the correct element in the codebase.

//   ${selectedComponentHierarchies.map((h, index) => {
//     if (!h) return `\n<element index="${index + 1}">\n  No React component detected\n</element>\n    `;
//     return `
// <element index="${index + 1}">
//   ${h.length === 0 ? "No React component as parent detected" : `React component tree (from closest to farthest, 3 closest elements): ${h.map(c => `{name: ${c.name}, type: ${c.type}}`).join(" child of ")}`}
// </element>
//     `;
//   })}
//   `;
//           return content;
//         }
//         return null;
//       }
      
//       // 直接替换原始的 onPromptSend
//       const replaceStagewisePlugins = () => {
//         // 尝试找到所有可能加载的 stagewise 插件
//         const possibleModules = [
//           window.stagewise_plugins_react,
//           window.ReactPlugin
//         ];
        
//         let found = false;
        
//         possibleModules.forEach(module => {
//           if (module && module.ReactPlugin && typeof module.ReactPlugin.onPromptSend === 'function') {
//             console.log('找到 stagewise 插件，直接替换...');
            
//             // 完全替换 onPromptSend
//             module.ReactPlugin.onPromptSend = function(prompt) {
//               try {
//                 if (!prompt || !prompt.contextElements) {
//                   return { contextSnippets: [] };
//                 }
                
//                 const content = safeGetSelectedElementsPrompt(prompt.contextElements);
                
//                 if (!content) {
//                   return { contextSnippets: [] };
//                 }
                
//                 return {
//                   contextSnippets: [
//                     {
//                       promptContextName: "elements-react-component-info",
//                       content
//                     }
//                   ]
//                 };
//               } catch (error) {
//                 console.error('stagewise 修复的 onPromptSend 出错:', error);
//                 return { contextSnippets: [] };
//               }
//             };
            
//             found = true;
//             console.log('stagewise 插件修复成功完成');
//           }
//         });
        
//         // if (!found) {
//         //   console.log('尚未找到 stagewise 插件，将在 500ms 后重试');
//         //   setTimeout(replaceStagewisePlugins, 500);
//         // }
//       };
      
//       // 启动修复程序
//       replaceStagewisePlugins();
      
//     } catch (error) {
//       console.error('修复 stagewise 插件时出错:', error);
//     }
//   }, 1000);
// };

// // 页面加载后执行修复
// window.addEventListener('load', () => {
//   console.log('开始修复 stagewise 插件...');
//   window.fixStagewisePlugins();
// }); 