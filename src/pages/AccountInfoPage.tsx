import React from 'react';
import AccountInfoPanel from '../components/AccountInfo/AccountInfoPanel';
import './AccountInfoPage.css';

const AccountInfoPage: React.FC = () => {
  return (
    <div className="account-info-page">
      <h1 className="page-title">账户信息</h1>
      <div className="page-content">
        <AccountInfoPanel />
      </div>
    </div>
  );
};

export default AccountInfoPage; 