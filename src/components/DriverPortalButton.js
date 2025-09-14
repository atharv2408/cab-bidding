import React from 'react';

const DriverPortalButton = ({ 
  className = 'driver-portal-btn', 
  children = '🚙 Driver Portal',
  variant = 'default',
  onClick,
  style = {} 
}) => {
  const handleDriverPortalClick = (e) => {
    console.log('🚗 Driver Portal button clicked');
    
    // Call any custom onClick handler first
    if (onClick) {
      onClick(e);
    }
    
    // Use direct navigation since we need to switch between different apps
    console.log('🔄 Navigating to driver portal...');
    
    try {
      // Direct navigation approach for switching between Customer and Driver apps
      window.location.pathname = '/driver/login';
      console.log('✅ Navigation initiated to /driver/login');
    } catch (error) {
      console.log('⚠️ Primary navigation failed, using href fallback:', error);
      window.location.href = '/driver/login';
    }
  };

  // Different styling variants
  const getButtonClass = () => {
    const baseClass = className;
    switch (variant) {
      case 'menu-item':
        return `${baseClass} account-menu-item driver-link`;
      case 'primary':
        return `${baseClass} btn-primary driver-portal-primary`;
      case 'secondary':
        return `${baseClass} btn-secondary driver-portal-secondary`;
      case 'link':
        return `${baseClass} driver-portal-link`;
      default:
        return baseClass;
    }
  };

  return (
    <button
      className={getButtonClass()}
      onClick={handleDriverPortalClick}
      style={style}
      title="Access the Driver Portal to manage rides and earnings"
    >
      {children}
    </button>
  );
};

// Utility function for programmatic navigation
export const navigateToDriverPortal = () => {
  console.log('🚗 Programmatic driver portal navigation triggered');
  
  try {
    window.location.pathname = '/driver/login';
    console.log('✅ Navigated to driver portal');
  } catch (error) {
    console.log('⚠️ Navigation failed, using href fallback:', error);
    window.location.href = '/driver/login';
  }
};

export default DriverPortalButton;
