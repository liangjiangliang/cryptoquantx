import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// 1. Import the toolbar using dynamic import to avoid TypeScript module resolution issues
// 2. Define your toolbar configuration 
const stagewiseConfig = { 
  plugins: [], 
}; 

// 3. Initialize the toolbar when your app starts 
// Framework-agnostic approach - call this when your app initializes 
function setupStagewise() { 
  // Only initialize once and only in development mode 
  if (process.env.NODE_ENV === 'development') { 
    // Use dynamic import to load the toolbar at runtime
    // @ts-ignore - Skip TypeScript module resolution for optional dependency
    import('@stagewise/toolbar')
      .then((module: any) => {
        if (module && module.initToolbar) {
          module.initToolbar(stagewiseConfig);
        }
      })
      .catch((error) => {
        console.log('Stagewise toolbar not available:', error);
      });
  } 
} 

// Call the setup function when appropriate for your framework 
setupStagewise();

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
