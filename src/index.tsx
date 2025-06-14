import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Initialize the toolbar when your app starts 
// Framework-agnostic approach - call this when your app initializes 
function setupStagewise() { 
  // Only initialize once and only in development mode 
  if (process.env.NODE_ENV === 'development') { 
    console.log('Initializing Stagewise toolbar...');
    
    // Use dynamic import to load the toolbar at runtime
    Promise.all([
      // @ts-ignore - Skip TypeScript module resolution for optional dependency
      import('@stagewise/toolbar'),
      // @ts-ignore - Skip TypeScript module resolution for optional dependency  
      import('@stagewise-plugins/react')
    ])
      .then(([toolbarModule, reactPluginModule]: any[]) => {
        if (toolbarModule && toolbarModule.initToolbar) {
          // Add React plugin if available
          const config = { 
            plugins: reactPluginModule?.ReactPlugin ? [reactPluginModule.ReactPlugin] : [],
          };
          
          console.log('Stagewise config:', config);
          toolbarModule.initToolbar(config);
          console.log('Stagewise toolbar initialized successfully');
        }
      })
      .catch((error) => {
        console.log('Stagewise toolbar not available:', error.message);
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
