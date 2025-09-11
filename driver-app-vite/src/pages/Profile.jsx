import React, { useState } from 'react';

const Profile = ({ appState }) => {
  const { driver } = appState;
  
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-welcome">
          <h1>👤 Driver Profile</h1>
          <p className="dashboard-subtitle">
            Manage your profile information and vehicle details.
          </p>
        </div>
      </div>

      <div className="profile-card">
        <div className="profile-info">
          <div className="profile-avatar">
            {driver?.avatar || driver?.name?.charAt(0) || 'D'}
          </div>
          <div className="profile-details">
            <h2>{driver?.name || 'Driver Name'}</h2>
            <p>⭐ {driver?.rating || 4.8} • {driver?.totalRides || 245} rides completed</p>
            <p>📧 {driver?.email || 'driver@example.com'}</p>
            <p>📞 {driver?.phone || '+1234567890'}</p>
          </div>
        </div>
      </div>

      <div className="vehicle-info">
        <h3>🚗 Vehicle Information</h3>
        <p>Model: {driver?.vehicleModel || 'Toyota Camry'}</p>
        <p>Color: {driver?.vehicleColor || 'White'}</p>
        <p>Type: {driver?.vehicleType || 'Sedan'}</p>
        <p>Plate: {driver?.plateNumber || 'ABC-123'}</p>
      </div>
    </div>
  );
};

export default Profile;
