import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';
import './GlobalNavbar.css';

const GlobalNavbar: React.FC = () => {
  const location = useLocation();
  
  return (
    <div className="global-navbar">
      <div className="navbar-left">
        <Logo />
        <Link to="/backtest-summaries" className="nav-link backtest-nav-link">
          历史回测
        </Link>
        <Link to="/backtest-factory" className="nav-link backtest-nav-link">
          策略工厂
        </Link>
        <Link to="/batch-backtest" className="nav-link backtest-nav-link batch-backtest-link">
          批量回测
        </Link>
      </div>
      <div className="navbar-right">
      </div>
    </div>
  );
};

export default GlobalNavbar;