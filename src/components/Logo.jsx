import React from 'react';
import './Logo.css';

const Logo = ({ size = 'medium', showText = true, className = '' }) => {
  const sizeClasses = {
    small: 'logo-small',
    medium: 'logo-medium',
    large: 'logo-large'
  };

  return (
    <div className={`logo-container ${sizeClasses[size]} ${className}`}>
      <div className="logo-icon">
        <span className="logo-emoji">✈️</span>
      </div>
      {showText && (
        <div className="logo-text">
          <span className="site-name">IntelliTrip</span>
        </div>
      )}
    </div>
  );
};

export default Logo;