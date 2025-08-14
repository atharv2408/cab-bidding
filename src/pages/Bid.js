import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function Bid({ appState }) {
  const navigate = useNavigate();
  const {
    pickup, drop, bids, setBids, selectedBid, setSelectedBid,
    biddingActive, setBiddingActive, selectionTime, setSelectionTime,
    timer, setTimer, selectionTimer, setSelectionTimer,
    suggestedPrice, useSuggestedPrice, lastBidRef
  } = appState;

  // Start bidding when component mounts
  useEffect(() => {
    if (!pickup.address || !drop.address) {
      navigate('/');
      return;
    }
    setBiddingActive(true);
    setTimer(60); // 1-minute bidding
    setBids([]);
    setSelectedBid(null);
    setSelectionTime(false);
  }, []);

  // Bidding timer
  useEffect(() => {
    if (!biddingActive) return;
    
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setBiddingActive(false);
          setSelectionTime(true);
          setSelectionTimer(15);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [biddingActive, setBiddingActive, setTimer, setSelectionTime, setSelectionTimer]);

  // Selection timer
  useEffect(() => {
    if (!selectionTime) return;
    
    const interval = setInterval(() => {
      setSelectionTimer((prev) => {
        if (prev <= 1) {
          setSelectionTime(false);
          if (bids.length > 0) {
            const bestBid = bids.reduce((best, current) => 
              current.price < best.price ? current : best
            );
            setSelectedBid(bestBid);
            navigate('/confirm');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [selectionTime, bids, setSelectedBid, setSelectionTime, setSelectionTimer, navigate]);

  // Load real bids from database
  useEffect(() => {
    
    const loadBids = async () => {
      try {
        // Get the current ride request ID from localStorage or state
        const rideRequestId = localStorage.getItem('currentRideRequestId');
        if (!rideRequestId) return;
        
        // Import supabaseDB
        const { supabaseDB } = await import('../utils/supabaseService');
        const { data: dbBids, error } = await supabaseDB.bids.getByBooking(rideRequestId);
        
        if (!error && dbBids) {
          const formattedBids = dbBids.map(bid => ({
            id: bid.id,
            driver_id: bid.driver_id,
            driver: bid.driver_name,
            price: bid.amount,
            rating: bid.driver_rating || 4.5,
            avatar: bid.driver_name ? bid.driver_name[0].toUpperCase() : '👤',
            car: bid.vehicle_type || 'Vehicle',
            experience: '3+ years',
            eta: Math.floor(Math.random() * 10) + 3,
            distance: (Math.random() * 2 + 0.5).toFixed(1)
          })).sort((a, b) => a.price - b.price);
          
          setBids(formattedBids);
        }
      } catch (error) {
        console.error('Error loading bids:', error);
      }
    };
    
    // Load bids immediately
    loadBids();
    
    // Poll for new bids every 5 seconds
    const interval = setInterval(loadBids, 5000);
    
    return () => clearInterval(interval);
  }, [biddingActive, setBids]);

  // Scroll to latest bid
  useEffect(() => {
    if (lastBidRef.current) {
      lastBidRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [bids.length]);

  const acceptBid = async (bid) => {
    try {
      // Get the current ride request ID
      const rideRequestId = localStorage.getItem('currentRideRequestId');
      if (!rideRequestId) {
        alert('Ride request not found');
        return;
      }

      // Import supabaseDB
      const { supabaseDB } = await import('../utils/supabaseService');
      
      // Update the booking status to 'confirmed' and assign the driver
      const { data, error } = await supabaseDB.bookings.update(rideRequestId, {
        status: 'confirmed',
        selected_driver_id: bid.driver_id || bid.id,
        driver_name: bid.driver,
        vehicle_type: bid.car,
        driver_rating: bid.rating,
        final_fare: bid.price,
        accepted_at: new Date().toISOString()
      });
      
      if (error) {
        console.error('Error accepting bid:', error);
        alert('Failed to accept bid. Please try again.');
        return;
      }
      
      // Update the accepted bid status in the bids table
      await supabaseDB.bids.update(bid.id, {
        status: 'accepted'
      });
      
      // Update local state
      setSelectedBid(bid);
      setBiddingActive(false);
      setSelectionTime(false);
      
      // Navigate to confirmation page
      navigate('/confirm');
    } catch (error) {
      console.error('Error accepting bid:', error);
      alert('Failed to accept bid. Please try again.');
    }
  };

  if (!pickup.address || !drop.address) {
    return (
      <div className="container">
        <h2>No Route Selected</h2>
        <p>Please select pickup and drop locations first.</p>
        <button onClick={() => navigate('/')}>Go Back to Home</button>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Route Summary */}
      <div className="route-summary">
        <div className="route-item">
          <span className="route-icon">📍</span>
          <div>
            <div className="route-label">Pickup</div>
            <div className="route-address">{pickup.address}</div>
          </div>
        </div>
        <div className="route-connector">→</div>
        <div className="route-item">
          <span className="route-icon">🏁</span>
          <div>
            <div className="route-label">Drop</div>
            <div className="route-address">{drop.address}</div>
          </div>
        </div>
      </div>

      {/* Timer Card */}
      {biddingActive && (
        <div className="timer-card">
          <div className="timer-icon">⏰</div>
          <div className="timer-info">
            <h3 className="timer-label">Bidding in Progress</h3>
            <p className="timer-value">{timer} seconds remaining</p>
            <div className="timer-progress">
              <div 
                className="timer-progress-bar" 
                style={{ width: `${(timer / 60) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Selection Timer */}
      {selectionTime && (
        <div className="selection-card">
          <div className="selection-icon">🎯</div>
          <div className="selection-info">
            <h3 className="selection-title">Selection Time</h3>
            <p className="selection-subtitle">{selectionTimer} seconds to choose</p>
            <div className="selection-progress">
              <div 
                className="selection-progress-bar" 
                style={{ width: `${(selectionTimer / 15) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Bids Section */}
      <div className="bids-section">
        <div className="bids-header">
          <h3>Available Drivers ({bids.length})</h3>
          <p className="bids-subtitle">
            {biddingActive ? 'Drivers are bidding for your ride' : 
             selectionTime ? 'Choose your preferred driver' : 
             'Bidding completed'}
          </p>
        </div>

        <div className="bids-container">
          {bids.length === 0 && biddingActive && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🔍</div>
              <p>Waiting for drivers to place bids...</p>
              <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>Your ride request has been sent to nearby drivers. They will bid on your trip shortly.</p>
            </div>
          )}
          
          {bids.length === 0 && !biddingActive && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>😔</div>
              <p>No bids received</p>
              <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>Unfortunately, no drivers placed bids for this ride. Please try again later.</p>
              <button 
                onClick={() => navigate('/')} 
                style={{ 
                  marginTop: '20px', 
                  padding: '10px 20px', 
                  background: '#667eea', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  cursor: 'pointer' 
                }}
              >
                Back to Home
              </button>
            </div>
          )}

          {bids.map((bid, index) => (
            <div 
              key={bid.id} 
              className={`bid-card ${selectedBid?.id === bid.id ? 'selected' : ''}`}
              ref={index === bids.length - 1 ? lastBidRef : null}
            >
              <div className="bid-driver-info">
                <div className="bid-avatar" style={{ 
                  fontSize: '2rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: '#f0f0f0',
                  borderRadius: '50%',
                  width: '50px',
                  height: '50px'
                }}>
                  {bid.avatar}
                </div>
                <div className="bid-details">
                  <div className="bid-driver-name">{bid.driver}</div>
                  <div className="bid-rating">⭐ {bid.rating} • {bid.experience}</div>
                  <div className="bid-info-grid">
                    <div className="bid-info-item">
                      <span className="bid-info-icon">🚗</span>
                      <span>{bid.car}</span>
                    </div>
                    <div className="bid-info-item">
                      <span className="bid-info-icon">📍</span>
                      <span>{bid.distance} km</span>
                    </div>
                    <div className="bid-info-item">
                      <span className="bid-info-icon">⏱️</span>
                      <span>{bid.eta} min</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bid-actions">
                <div style={{ textAlign: 'right', marginBottom: '10px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2e7d32' }}>
                    ₹{bid.price}
                  </div>
                  {useSuggestedPrice && suggestedPrice && (
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>
                      {bid.price <= parseInt(suggestedPrice) ? '✅ Within budget' : '⚡ Above budget'}
                    </div>
                  )}
                </div>
                
                {selectedBid?.id === bid.id ? (
                  <div className="bid-accepted">
                    <span className="accepted-icon">✅</span>
                    <span>Selected</span>
                  </div>
                ) : (
                  <button 
                    className="accept-bid-btn"
                    onClick={() => acceptBid(bid)}
                    style={{
                      opacity: 1,
                      cursor: 'pointer'
                    }}
                  >
                    Accept Bid
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {bids.length > 0 && !biddingActive && !selectionTime && !selectedBid && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button 
            className="start-bidding-btn"
            onClick={() => navigate('/confirm')}
          >
            Continue with Best Offer
          </button>
        </div>
      )}
    </div>
  );
}

export default Bid;
