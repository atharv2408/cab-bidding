import React from 'react';
import '../styles/CarLoadingAnimation.css';

const CarLoadingAnimation = ({ 
  message = "Please wait...", 
  type = "default", // "login", "register", "default"
  darkMode = true,
  showProgress = true,
  autoProgress = true
}) => {
  const [progress, setProgress] = React.useState(0);
  
  React.useEffect(() => {
    if (!autoProgress) return;
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 0; // Reset for demo
        return prev + Math.random() * 15 + 5; // Random progress increment
      });
    }, 300);
    
    return () => clearInterval(interval);
  }, [autoProgress]);
  const getCarColor = () => {
    switch (type) {
      case "driver-login":
      case "driver-register":
        return { main: '#f59e0b', top: '#d97706' }; // Orange for drivers
      case "login":
        return { main: '#3b82f6', top: '#2563eb' }; // Blue for customer login
      case "register":
        return { main: '#10b981', top: '#059669' }; // Green for registration
      default:
        return { main: '#6b7280', top: '#4b5563' }; // Gray for default
    }
  };
  
  const carColors = getCarColor();
  
  const getLoadingMessage = () => {
    switch (type) {
      case "login":
        return "Signing you in...";
      case "register":
        return "Creating your account...";
      case "driver-login":
        return "Connecting to driver portal...";
      case "driver-register":
        return "Setting up your driver profile...";
      default:
        return message;
    }
  };

  return (
    <div className={`car-loading-container ${darkMode ? 'dark' : 'light'}`}>
      <div className="car-loading-content">
        {/* Main Car Animation */}
        <div className="car-animation-wrapper">
          <div className="road">
            <div className="road-line"></div>
            <div className="road-line"></div>
            <div className="road-line"></div>
          </div>
          
          <div className="car">
            <div className="car-body">
              <div className="car-top" style={{ background: `linear-gradient(135deg, ${carColors.top}, ${carColors.main})` }}></div>
              <div className="car-main" style={{ background: `linear-gradient(135deg, ${carColors.main}, ${carColors.top})` }}></div>
              <div className="car-windshield"></div>
              <div className="car-lights">
                <div className="headlight"></div>
                <div className="taillight"></div>
              </div>
            </div>
            <div className="car-wheels">
              <div className="wheel front-wheel">
                <div className="wheel-center"></div>
              </div>
              <div className="wheel rear-wheel">
                <div className="wheel-center"></div>
              </div>
            </div>
            <div className="car-shadow"></div>
          </div>

          {/* Exhaust Smoke */}
          <div className="exhaust-smoke">
            <div className="smoke-particle"></div>
            <div className="smoke-particle"></div>
            <div className="smoke-particle"></div>
          </div>

          {/* Speed Lines */}
          <div className="speed-lines">
            <div className="speed-line"></div>
            <div className="speed-line"></div>
            <div className="speed-line"></div>
            <div className="speed-line"></div>
          </div>
        </div>

        {/* Loading Progress */}
        <div className="loading-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }}></div>
          </div>
          {showProgress && (
            <div className="progress-percentage">
              {Math.round(Math.min(progress, 100))}%
            </div>
          )}
          <div className="progress-dots">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        </div>

        {/* Loading Message */}
        <div className="loading-message">
          <h3>{getLoadingMessage()}</h3>
          <p>Powered by BidCab Technology</p>
        </div>

        {/* Floating Icons */}
        <div className="floating-icons">
          <div className="icon-wrapper">
            <span className="floating-icon">🚕</span>
          </div>
          <div className="icon-wrapper">
            <span className="floating-icon">🗺️</span>
          </div>
          <div className="icon-wrapper">
            <span className="floating-icon">💳</span>
          </div>
          <div className="icon-wrapper">
            <span className="floating-icon">⭐</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarLoadingAnimation;