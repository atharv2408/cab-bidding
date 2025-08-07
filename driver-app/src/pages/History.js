import React from 'react';

const History = ({ appState }) => {
  const { driver } = appState;
  
  // Mock ride history data
  const rideHistory = [
    {
      id: 'ride_h1',
      date: '2024-01-07',
      customer: 'Sarah Johnson',
      pickup: 'Downtown Mall',
      drop: 'Airport Terminal',
      fare: 25.50,
      rating: 5,
      status: 'completed'
    },
    {
      id: 'ride_h2',
      date: '2024-01-07',
      customer: 'Mike Chen',
      pickup: 'University Campus',
      drop: 'Business District',
      fare: 18.75,
      rating: 4,
      status: 'completed'
    },
    {
      id: 'ride_h3',
      date: '2024-01-06',
      customer: 'Emma Wilson',
      pickup: 'Hotel Grand',
      drop: 'Shopping Center',
      fare: 22.00,
      rating: 5,
      status: 'completed'
    }
  ];
  
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-welcome">
          <h1>📋 Ride History</h1>
          <p className="dashboard-subtitle">
            View your completed rides and customer feedback.
          </p>
        </div>
      </div>

      <div className="rides-section">
        {rideHistory.map(ride => (
          <div key={ride.id} className="ride-card">
            <div className="ride-header">
              <div className="ride-customer">
                <div className="customer-avatar">
                  {ride.customer.charAt(0)}
                </div>
                <div className="customer-info">
                  <h4>{ride.customer}</h4>
                  <div className="customer-rating">
                    <span>⭐ {ride.rating}</span>
                    <span>{ride.date}</span>
                  </div>
                </div>
              </div>
              <div className="ride-price">
                <h3 className="price-value">${ride.fare}</h3>
              </div>
            </div>

            <div className="ride-route">
              <div className="route-item">
                <span className="route-icon pickup-icon">📍</span>
                <span className="route-address">{ride.pickup}</span>
              </div>
              <div className="route-item">
                <span className="route-icon drop-icon">🎯</span>
                <span className="route-address">{ride.drop}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default History;
