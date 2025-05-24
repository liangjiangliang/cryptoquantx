import React from 'react';
import './IndicatorSelector.css';

export type IndicatorType = 'none' | 'macd' | 'rsi' | 'kdj' | 'boll';

interface IndicatorSelectorProps {
  type: 'main' | 'sub'; // 主图指标或副图指标
  value: IndicatorType;
  onChange: (value: IndicatorType) => void;
  disabled?: boolean;
}

const IndicatorSelector: React.FC<IndicatorSelectorProps> = ({
  type,
  value,
  onChange,
  disabled = false
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value as IndicatorType);
  };

  return (
    <div className="indicator-selector">
      <label>{type === 'main' ? '主图指标' : '副图指标'}:</label>
      <select
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className="indicator-select"
      >
        <option value="none">无</option>
        {type === 'main' && (
          <>
            <option value="boll">布林带(BOLL)</option>
          </>
        )}
        {type === 'sub' && (
          <>
            <option value="macd">MACD</option>
            <option value="rsi">RSI</option>
            <option value="kdj">KDJ</option>
          </>
        )}
      </select>
    </div>
  );
};

export default IndicatorSelector;
