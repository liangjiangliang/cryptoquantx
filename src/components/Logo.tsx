import React from 'react';
import { Link } from 'react-router-dom';
import './Logo.css';

const Logo: React.FC = () => {
  return (
    <Link to="/" className="logo-container">
      <div className="logo-icon">
        <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* 渐变背景 */}
          <defs>
            <linearGradient id="bitcoinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF9500" />
              <stop offset="100%" stopColor="#F7931A" />
            </linearGradient>
          </defs>
          
          {/* 外圆 - 比特币金币效果 */}
          <circle cx="21" cy="21" r="20" fill="url(#bitcoinGradient)" />
          
          {/* 比特币B符号 */}
          <path d="M21 10V32M21 10H17M21 10H25M21 32H17M21 32H25" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <path d="M29 17C29 13.5 26 12 21 12C16 12 13 13.5 13 17C13 20.5 16 22 21 22C26 22 29 23.5 29 27C29 30.5 26 32 21 32C16 32 13 30.5 13 27" 
              stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          
          {/* 边缘纹理 - 币的质感 */}
          <path d="M37 21C37 29.8366 29.8366 37 21 37C12.1634 37 5 29.8366 5 21C5 12.1634 12.1634 5 21 5C29.8366 5 37 12.1634 37 21Z" 
              stroke="white" strokeWidth="0.5" strokeDasharray="2 2" />
        </svg>
      </div>
      <div className="logo-text">
        <span className="logo-text-crypto">crypto</span>
        <span className="logo-text-quant">quant</span>
        <span className="logo-text-x">x</span>
      </div>
    </Link>
  );
};

export default Logo; 