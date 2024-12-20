// Switch.js
import React from 'react';
import './switch.css';

const Switch = ({ status, label, readOnly, id, onToggle }) => {
  return (
    <div className="switch-container">
      <label className='switch-label'>
        <label className='switch-label'>{label}</label>
        <input
          type="checkbox"
          checked={status}
          onChange={() => onToggle(id, !status)}
          className="switch-input"
          disabled={readOnly}
        />
        <span className="switch-slider"></span>
      </label>
    </div>
  );
};

export default Switch;
