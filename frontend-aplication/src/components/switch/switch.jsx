// Switch.jsx
import React from 'react';
import './switch.css';

const Switch = ({ status, label, readOnly, id, onToggle }) => {
  const handleChange = () => {
    if (!readOnly && onToggle) {
      onToggle(id, !status);
    }
  };

  return (
    <div className="switch-container">
      <label className='switch-label'>
        {label && <span className='switch-label-text'>{label}</span>}
        <input
          type="checkbox"
          checked={status}
          onChange={handleChange}
          className="switch-input"
          disabled={readOnly}
        />
        <span className="switch-slider"></span>
      </label>
    </div>
  );
};

export default Switch;
