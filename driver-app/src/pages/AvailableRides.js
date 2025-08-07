import React, { useState, useEffect } from 'react';

const AvailableRides = ({ appState }) => {
  const {
    availableRides,
    setAvailableRides,
    myBids,
    setMyBids,
    socket,
    driver,
    isOnline
  } = appState;

  const [bidAmounts, setBidAmounts] = useState({});
  const [bidding, setBidding] = useState({});

  // Mock available rides for demo
  const mockRides = [
    {
      id: 'ride_1',
      customer: {
        name: 'Sarah Johnson',
        rating: 4.8,
        totalRides: 127,
        avatar: 'SJ'
      },
      pickup: {
        address: 'Downtown Shopping Mall, Main Street',
        coords: [40.7128, -74.0060]
      },
      drop: {
        address: 'JFK International Airport, Terminal 4',
        coords: [40.6413, -73.7781]
      },
      distance: '18.5 km',
      estimatedTime: '25 min',
      suggestedPrice: 35,
      requestTime: '2 min ago',
      biddingEndsAt: Date.now() + 300000, // 5 minutes from now
      currentBids: [
        { driverId: 'driver_2', amount: 32, driverName: 'Mike Wilson', rating: 4.6 },
        { driverId: 'driver_3', amount: 30, driverName: 'Lisa Chen', rating: 4.9 }
      ]
    },
    {
      id: 'ride_2',
      customer: {
        name: 'Robert Kim',
        rating: 4.5,
        totalRides: 89,
        avatar: 'RK'
      },
      pickup: {
        address: 'Central University Campus, Building A',
        coords: [40.7589, -73.9851]
      },
      drop: {
        address: 'Financial District, Wall Street Plaza',
        coords: [40.7074, -74.0113]
      },
      distance: '12.3 km',
      estimatedTime: '18 min',
      suggestedPrice: 22,
      requestTime: '5 min ago',
      biddingEndsAt: Date.now() + 180000, // 3 minutes from now
      currentBids: [
        { driverId: 'driver_4', amount: 20, driverName: 'John Davis', rating: 4.7 }
      ]
    },
    {
      id: 'ride_3',
      customer: {
        name: 'Emma Thompson',
        rating: 4.9,
        totalRides: 203,
        avatar: 'ET'
      },
      pickup: {
        address: 'Sunset Beach Resort, Ocean Drive',
        coords: [40.7282, -74.0776]
      },
      drop: {
        address: 'Grand Central Station, East 42nd St',
        coords: [40.7527, -73.9772]
      },
      distance: '8.7 km',
      estimatedTime: '15 min',
      suggestedPrice: 18,
      requestTime: '1 min ago',
      biddingEndsAt: Date.now() + 420000, // 7 minutes from now
      currentBids: []
    }
  ];

  const [rides, setRides] = useState(mockRides);

  const handleBidSubmit = (rideId) => {
    const bidAmount = parseFloat(bidAmounts[rideId]);
    
    if (!bidAmount || bidAmount <= 0) {
      alert('Please enter a valid bid amount');
      return;
    }

    setBidding(prev => ({ ...prev, [rideId]: true }));

    // Simulate bid submission
    setTimeout(() => {
      const newBid = {
        id: Date.now(),
        rideId,
        driverId: driver.id,
        amount: bidAmount,
        driverName: driver.name,
        rating: driver.rating,
        timestamp: new Date(),
        status: 'pending'
      };

      setMyBids(prev => [...prev, newBid]);

      // Update the ride with the new bid
      setRides(prev => prev.map(ride => {
        if (ride.id === rideId) {
          return {
            ...ride,
            currentBids: [...ride.currentBids, {
              driverId: driver.id,
              amount: bidAmount,
              driverName: driver.name,
              rating: driver.rating
            }]
          };
        }
        return ride;
      }));

      setBidAmounts(prev => ({ ...prev, [rideId]: '' }));
      setBidding(prev => ({ ...prev, [rideId]: false }));

      // Emit bid to server if socket is connected
      if (socket) {
        socket.emit('placeBid', newBid);
      }
    }, 1500);
  };

  const handleBidAmountChange = (rideId, amount) => {
    setBidAmounts(prev => ({ ...prev, [rideId]: amount }));
  };

  const getTimeRemaining = (endTime) => {
    const now = Date.now();
    const timeLeft = endTime - now;
    
    if (timeLeft <= 0) return 'Expired';
    
    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const [timeRemaining, setTimeRemaining] = useState({});

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeRemaining = {};
      rides.forEach(ride => {
        newTimeRemaining[ride.id] = getTimeRemaining(ride.biddingEndsAt);
      });
      setTimeRemaining(newTimeRemaining);
    }, 1000);

    return () => clearInterval(timer);
  }, [rides]);

  const hasUserBid = (rideId) => {
    return rides.find(ride => ride.id === rideId)?.currentBids
      .some(bid => bid.driverId === driver.id);
  };

  const getUserBidAmount = (rideId) => {
    const ride = rides.find(ride => ride.id === rideId);
    const userBid = ride?.currentBids.find(bid => bid.driverId === driver.id);
    return userBid?.amount;
  };

  const getLowestBid = (currentBids) => {
    if (currentBids.length === 0) return null;
    return Math.min(...currentBids.map(bid => bid.amount));
  };

  if (!isOnline) {
    return (
      <div className="dashboard-container">
        <div className="empty-state">
          <div className="empty-icon">🔴</div>
          <h3 className="empty-title">You are offline</h3>
          <p className="empty-description">
            Go online from your dashboard to view and bid on available rides.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-welcome">
          <h1>🔍 Available Rides</h1>
          <p className="dashboard-subtitle">
            Browse ride requests in your area and place competitive bids to win customers.
          </p>
        </div>
      </div>

      {rides.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3 className="empty-title">No rides available</h3>
          <p className="empty-description">
            New ride requests will appear here. Check back in a few moments!
          </p>
        </div>
      ) : (
        <div className="rides-section">
          {rides.map(ride => (
            <div key={ride.id} className="ride-card">
              {/* Ride Header */}
              <div className="ride-header">
                <div className="ride-customer">
                  <div className="customer-avatar">
                    {ride.customer.avatar}
                  </div>
                  <div className="customer-info">
                    <h4>{ride.customer.name}</h4>
                    <div className="customer-rating">
                      <span>⭐ {ride.customer.rating}</span>
                      <span>({ride.customer.totalRides} rides)</span>
                    </div>
                  </div>
                </div>
                <div className="ride-price">
                  <p className="price-label">Suggested Fare</p>
                  <h3 className="price-value">${ride.suggestedPrice}</h3>
                </div>
              </div>

              {/* Route Information */}
              <div className="ride-route">
                <div className="route-item">
                  <span className="route-icon pickup-icon">📍</span>
                  <span className="route-address">{ride.pickup.address}</span>
                </div>
                <div className="route-item">
                  <span className="route-icon drop-icon">🎯</span>
                  <span className="route-address">{ride.drop.address}</span>
                </div>
              </div>

              {/* Ride Metadata */}
              <div className="ride-meta">
                <div className="meta-item">
                  <span>📏 {ride.distance}</span>
                </div>
                <div className="meta-item">
                  <span>⏱️ {ride.estimatedTime}</span>
                </div>
                <div className="meta-item">
                  <span>🕒 {ride.requestTime}</span>
                </div>
                <div className="meta-item" style={{ color: timeRemaining[ride.id] === 'Expired' ? '#ef4444' : '#f59e0b' }}>
                  <span>⏰ {timeRemaining[ride.id] || 'Loading...'}</span>
                </div>
              </div>

              {/* Current Bids */}
              {ride.currentBids.length > 0 && (
                <div className="current-bids">
                  <h5>Current Bids ({ride.currentBids.length})</h5>
                  <div className="bids-list">
                    {ride.currentBids
                      .sort((a, b) => a.amount - b.amount)
                      .slice(0, 3)
                      .map((bid, index) => (
                        <div 
                          key={bid.driverId} 
                          className={`bid-item ${bid.driverId === driver.id ? 'user-bid' : ''} ${index === 0 ? 'lowest-bid' : ''}`}
                        >
                          <span className="bid-driver">
                            {bid.driverId === driver.id ? 'You' : bid.driverName}
                            {index === 0 && <span className="lowest-badge">Lowest</span>}
                          </span>
                          <span className="bid-amount">${bid.amount}</span>
                          <span className="bid-rating">⭐{bid.rating}</span>
                        </div>
                      ))}
                    {ride.currentBids.length > 3 && (
                      <div className="more-bids">
                        +{ride.currentBids.length - 3} more bids
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bidding Section */}
              <div className="bid-section">
                {hasUserBid(ride.id) ? (
                  <div className="bid-placed">
                    <div className="bid-status">
                      <span className="status-icon">✅</span>
                      <span>Your bid: ${getUserBidAmount(ride.id)}</span>
                    </div>
                    <p className="suggested-price">
                      {getUserBidAmount(ride.id) === getLowestBid(ride.currentBids) 
                        ? '🏆 You have the lowest bid!' 
                        : `💡 Current lowest bid: $${getLowestBid(ride.currentBids)}`
                      }
                    </p>
                  </div>
                ) : timeRemaining[ride.id] === 'Expired' ? (
                  <div className="bid-expired">
                    <span>❌ Bidding has ended</span>
                  </div>
                ) : (
                  <div className="bid-input-container">
                    <input
                      type="number"
                      placeholder="Enter bid amount"
                      value={bidAmounts[ride.id] || ''}
                      onChange={(e) => handleBidAmountChange(ride.id, e.target.value)}
                      className="bid-input"
                      min="1"
                      step="0.50"
                    />
                    <button
                      onClick={() => handleBidSubmit(ride.id)}
                      disabled={bidding[ride.id] || !bidAmounts[ride.id]}
                      className="bid-btn"
                    >
                      {bidding[ride.id] ? (
                        <>
                          <span>🔄</span>
                          Placing...
                        </>
                      ) : (
                        <>
                          <span>🎯</span>
                          Place Bid
                        </>
                      )}
                    </button>
                  </div>
                )}
                
                {!hasUserBid(ride.id) && (
                  <div className="suggested-price">
                    💡 Suggested: ${ride.suggestedPrice} | 
                    {ride.currentBids.length > 0 
                      ? ` Beat lowest: $${getLowestBid(ride.currentBids) - 0.5}` 
                      : ' Be the first to bid!'
                    }
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tips Section */}
      <div className="rides-section">
        <div className="section-header">
          <h2 className="section-title">💡 Bidding Tips</h2>
        </div>
        
        <div className="tips-grid">
          <div className="tip-card">
            <div className="tip-icon">🎯</div>
            <h4>Competitive Pricing</h4>
            <p>Bid competitively but fairly. Consider distance, traffic, and your operating costs.</p>
          </div>
          
          <div className="tip-card">
            <div className="tip-icon">⚡</div>
            <h4>Quick Response</h4>
            <p>Respond quickly to ride requests. Customers often select the first few bids they receive.</p>
          </div>
          
          <div className="tip-card">
            <div className="tip-icon">⭐</div>
            <h4>Build Reputation</h4>
            <p>Maintain high ratings to increase your chances of winning bids over other drivers.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvailableRides;
