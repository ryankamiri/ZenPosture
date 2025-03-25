import React, { useState } from 'react';

const ThresholdSlider = ({ 
  value, 
  onChange, 
  min = 0, 
  max = 100, 
  step = 1, 
  label = "Threshold",
  description = ""
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const handleMouseEnter = () => setShowTooltip(true);
  const handleMouseLeave = () => setShowTooltip(false);
  
  return (
    <div className="slider-container relative">
      <div className="flex justify-between items-center mb-2">
        <label htmlFor="threshold-slider" className="font-medium text-sm">
          {label}
          <span className="slider-value">{value}</span>
        </label>
        
        {description && (
          <div 
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-400 cursor-help"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            
            {showTooltip && (
              <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-800 text-white text-xs rounded py-2 px-3 shadow-lg z-10">
                {description}
                <div className="absolute bottom-0 right-2 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <input
        id="threshold-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      
      <div className="threshold-labels">
        <span>{min}</span>
        <span>{Math.round((max - min) / 2) + min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};

export default ThresholdSlider; 