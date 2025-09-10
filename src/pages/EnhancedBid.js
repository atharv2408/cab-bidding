import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import bidLifecycleManager from '../utils/bidLifecycleManager';

function EnhancedBid({ appState }) {
  const navigate = useNavigate();
  const {
    pickup, drop, bids, setBids, selectedBid, setSelectedBid,
    biddingActive, setBiddingActive, selectionTime, setSelectionTime,
    timer, setTimer, selectionTimer, setSelectionTimer,
    suggestedPrice, useSuggestedPrice, lastBidRef
  } = appState;

  // Additional state for enhanced functionality
  const [bookingId, setBookingId] = useState(null);
  const [bookingStatus, setBookingStatus] = useState({ status: 'not_found' });
  const [validBids, setValidBids] = useState([]);
  
  // Refs for cleanup
  const statusCheckInterval = useRef(null);
  const bidLoadInterval = useRef(null);

  // Initialize booking and register with lifecycle manager
  useEffect(() => {
    if (!pickup.address || !drop.address) {
      navigate('/');
      return;
    }

    // Generate or get existing booking ID
    let currentBookingId = localStorage.getItem('currentRideRequestId');
    
    if (!currentBookingId) {
      currentBookingId = 'booking_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('currentRideRequestId', currentBookingId);
    }

    setBookingId(currentBookingId);

    // Register booking with lifecycle manager
    bidLifecycleManager.registerBooking(currentBookingId, {
      pickup: pickup.address,
      drop: drop.address,
      suggestedPrice,
      customer: localStorage.getItem('customerName') || 'Customer'
    });

    console.log('📝 Registered booking with lifecycle manager:', currentBookingId);

    // Initialize state
    setBiddingActive(true);
    setTimer(60);
    setBids([]);
    setValidBids([]);
    setSelectedBid(null);
    setSelectionTime(false);

  }, [pickup.address, drop.address, navigate, setBiddingActive, setTimer, setBids, setSelectedBid, setSelectionTime, suggestedPrice]);

  // Monitor booking status with lifecycle manager
  useEffect(() => {
    if (!bookingId) return;

    const checkBookingStatus = () => {
      const status = bidLifecycleManager.getBookingStatus(bookingId);
      setBookingStatus(status);

      // Update local state based on lifecycle manager status
      if (status.status === 'bidding_active') {
        setBiddingActive(true);
        setSelectionTime(false);
        setTimer(status.biddingTimeLeft);
      } else if (status.status === 'selection_active') {
        setBiddingActive(false);
        setSelectionTime(true);
        setSelectionTimer(status.selectionTimeLeft);
      } else if (status.status === 'expired' || status.status === 'confirmed') {
        setBiddingActive(false);
        setSelectionTime(false);
        
        if (status.status === 'expired') {
          console.log('⏰ Booking expired, cleaning up...');
          setValidBids([]);
        }
      }

      // Get valid bids from lifecycle manager
      const currentValidBids = bidLifecycleManager.getValidBids(bookingId);
      setValidBids(currentValidBids);
      
      // Update UI bids (convert to UI format)
      const uiBids = currentValidBids.map(bid => ({
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

      setBids(uiBids);
    };

    // Check immediately and then every second for precise timing
    checkBookingStatus();
    statusCheckInterval.current = setInterval(checkBookingStatus, 1000);

    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, [bookingId, setBiddingActive, setSelectionTime, setTimer, setSelectionTimer, setBids]);

  // Load bids from database and fallback sources
  useEffect(() => {
    if (!bookingId || !biddingActive) return;

    const loadBidsFromSources = async () => {
      try {
        let actualBids = [];
        
        // Try to load from database first
        if (bookingId && !bookingId.startsWith('demo_')) {
          try {
            const { supabaseDB } = await import('../utils/supabaseService');
            const { data: dbBids, error } = await supabaseDB.bids.getByBooking(bookingId);
            
            if (!error && dbBids && dbBids.length > 0) {
              console.log('✅ Found database bids:', dbBids.length);
              actualBids = dbBids.filter(bid => {
                // Only include bids that are still within the bidding timeframe
                const bidTime = new Date(bid.created_at).getTime();
                const now = Date.now();
                const biddingStart = bidTime;
                const biddingEnd = biddingStart + (60 * 1000); // 60 seconds
                
                return now <= biddingEnd;
              });
            }
          } catch (dbError) {
            console.log('⚠️ Database bids unavailable:', dbError.message);
          }
        }
        
        // Check for fallback bids in localStorage
        const fallbackBids = JSON.parse(localStorage.getItem('fallbackBids') || '[]');
        const rideSpecificBids = JSON.parse(localStorage.getItem(`bids_${bookingId}`) || '[]');
        
        // Combine fallback bids that match this ride and are still valid
        const relevantFallbackBids = [...fallbackBids, ...rideSpecificBids]
          .filter(bid => {
            if (bid.booking_id !== bookingId) return false;
            
            // Check if bid is still within timeframe
            const bidTime = new Date(bid.created_at).getTime();
            const now = Date.now();
            const biddingEnd = bidTime + (60 * 1000); // 60 seconds from when bid was placed
            
            return now <= biddingEnd;
          });
        
        // Add fallback bids to lifecycle manager
        relevantFallbackBids.forEach(bid => {
          bidLifecycleManager.addBid(bookingId, {
            id: bid.id,
            driver_id: bid.driver_id,
            driver_name: bid.driver_name,
            amount: bid.amount,
            driver_rating: bid.driver_rating,
            vehicle_type: bid.vehicle_type,
            created_at: bid.created_at
          });
        });

        // Add database bids to lifecycle manager
        actualBids.forEach(bid => {
          bidLifecycleManager.addBid(bookingId, {
            id: bid.id,
            driver_id: bid.driver_id,
            driver_name: bid.driver_name || 'Driver',
            amount: bid.amount,
            driver_rating: bid.driver_rating || 4.5,
            vehicle_type: bid.vehicle_type || 'Vehicle',
            created_at: bid.created_at
          });
        });
        
      } catch (error) {
        console.error('Error loading bids:', error);
      }
    };
    
    // Load bids immediately
    loadBidsFromSources();
    
    // Continue polling for new bids every 3 seconds during bidding
    if (biddingActive) {
      bidLoadInterval.current = setInterval(loadBidsFromSources, 3000);
    }
    
    return () => {
      if (bidLoadInterval.current) {
        clearInterval(bidLoadInterval.current);
        bidLoadInterval.current = null;
      }
    };
  }, [bookingId, biddingActive]);

  // Scroll to latest bid
  useEffect(() => {
    if (lastBidRef.current) {
      lastBidRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [validBids.length]);

  // Accept a bid using the lifecycle manager
  const acceptBid = async (bid) => {
    try {
      if (!bookingId) {
        alert('Booking not found');
        return;
      }

      console.log('🎯 Accepting bid from:', bid.driver, 'for ₹' + bid.price);
      
      // Use lifecycle manager to accept bid
      const acceptanceSuccess = bidLifecycleManager.acceptBid(bookingId, bid.id);
      
      if (!acceptanceSuccess) {
        alert('Unable to accept bid. The selection period may have expired.');
        return;
      }

      let bidAccepted = false;
      
      // Try to update database first
      try {
        const { supabaseDB } = await import('../utils/supabaseService');
        
        // Update the booking status to 'confirmed' and assign the driver
        const { data, error } = await supabaseDB.bookings.update(bookingId, {
          status: 'confirmed',
          selected_driver_id: bid.driver_id || bid.id,
          driver_name: bid.driver,
          vehicle_type: bid.car,
          driver_rating: bid.rating,
          final_fare: bid.price,
          accepted_at: new Date().toISOString()
        });
        
        if (error) {
          console.warn('Database booking update failed:', error);
          throw new Error('Database not available');
        }
        
        // Update the accepted bid status in the bids table
        if (bid.id && !bid.id.startsWith('fallback_bid_')) {
          await supabaseDB.bids.update(bid.id, {
            status: 'accepted'
          });
        }
        
        bidAccepted = true;
        console.log('✅ Bid accepted in database');
      } catch (dbError) {
        console.log('⚠️ Database unavailable, using fallback bid acceptance...');
        
        // Generate OTP for the ride
        const currentOTP = localStorage.getItem('currentRideOTP') || 
          ('0000' + Math.floor(Math.random() * 10000)).slice(-4);
        localStorage.setItem('currentRideOTP', currentOTP);
        
        // Fallback: Store acceptance in localStorage
        const acceptedBooking = {
          id: bookingId,
          status: 'confirmed',
          selected_driver_id: bid.driver_id || bid.id,
          driver_name: bid.driver,
          vehicle_type: bid.car,
          driver_rating: bid.rating,
          final_fare: bid.price,
          accepted_at: new Date().toISOString(),
          pickup_address: pickup.address,
          drop_address: drop.address,
          otp: currentOTP,
          customer_name: localStorage.getItem('customerName') || 'Customer',
          customer_phone: localStorage.getItem('customerPhone') || '+91 0000000000'
        };
        
        localStorage.setItem('acceptedBooking', JSON.stringify(acceptedBooking));
        localStorage.setItem(`booking_${bookingId}`, JSON.stringify(acceptedBooking));
        
        bidAccepted = true;
        console.log('✅ Bid accepted in fallback mode');
      }
      
      if (bidAccepted) {
        // Update local state
        setSelectedBid(bid);
        setBiddingActive(false);
        setSelectionTime(false);
        
        console.log('🚗 Ride confirmed with driver:', bid.driver);
        
        // Navigate to confirmation page
        navigate('/confirm');
      }
      
    } catch (error) {
      console.error('Error accepting bid:', error);
      alert('Failed to accept bid. Please try again.');
    }
  };

  // Auto-accept best bid when selection time expires
  useEffect(() => {
    if (bookingStatus.status === 'expired' && validBids.length > 0 && !selectedBid) {
      const bestBid = validBids.reduce((best, current) => 
        current.price < best.price ? current : best
      );
      
      console.log('⏰ Selection time expired, auto-accepting best bid:', bestBid.driver);
      acceptBid(bestBid);
    }
  }, [bookingStatus.status, validBids, selectedBid]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
      if (bidLoadInterval.current) {
        clearInterval(bidLoadInterval.current);
      }
    };
  }, []);

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

      {/* Enhanced Timer Card */}
      {bookingStatus.status === 'bidding_active' && (
        <div className="timer-card enhanced">
          <div className="timer-icon">⏰</div>
          <div className="timer-info">
            <h3 className="timer-label">Bidding in Progress</h3>
            <p className="timer-value">{bookingStatus.biddingTimeLeft} seconds remaining</p>
            <div className="timer-progress">
              <div 
                className="timer-progress-bar" 
                style={{ width: `${(bookingStatus.biddingTimeLeft / 60) * 100}%` }}
              ></div>
            </div>
            <div className="booking-info">
              <span className="booking-id">ID: {bookingId?.slice(-8)}</span>
              <span className="bid-count">{validBids.length} bids received</span>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Selection Timer */}
      {bookingStatus.status === 'selection_active' && (
        <div className="selection-card enhanced">
          <div className="selection-icon">🎯</div>
          <div className="selection-info">
            <h3 className="selection-title">Selection Time</h3>
            <p className="selection-subtitle">{bookingStatus.selectionTimeLeft} seconds to choose</p>
            <div className="selection-progress">
              <div 
                className="selection-progress-bar" 
                style={{ width: `${(bookingStatus.selectionTimeLeft / 15) * 100}%` }}
              ></div>
            </div>
            <p className="auto-select-warning">
              {bookingStatus.selectionTimeLeft <= 5 ? 
                '⚡ Auto-selecting best bid soon!' : 
                'Choose your preferred driver or we\'ll pick the best for you'
              }
            </p>
          </div>
        </div>
      )}

      {/* Expired Booking Message */}
      {bookingStatus.status === 'expired' && validBids.length === 0 && (
        <div className="expired-booking-card">
          <div className="expired-icon">⏰</div>
          <h3>Bidding Period Expired</h3>
          <p>No bids were received within the time limit.</p>
          <button 
            className="retry-btn"
            onClick={() => window.location.reload()}
          >
            🔄 Try Again
          </button>
        </div>
      )}

      {/* Enhanced Bids Section */}
      <div className="bids-section enhanced">
        <div className="bids-header">
          <h3>Driver Bids ({validBids.length})</h3>
          <p className="bids-subtitle">
            {bookingStatus.status === 'bidding_active' ? 
              (validBids.length > 0 ? 
                `${validBids.length} drivers have placed bids` : 
                'Waiting for drivers to place bids...') : 
             bookingStatus.status === 'selection_active' ? 
              'Choose your preferred driver' : 
             bookingStatus.status === 'expired' ?
              'Bidding period has ended' :
              'Processing bids...'
            }
          </p>
          {bookingStatus.status !== 'not_found' && (
            <div className="status-indicator">
              <span className={`status-dot ${bookingStatus.status}`}></span>
              <span className="status-text">{bookingStatus.status.replace('_', ' ')}</span>
            </div>
          )}
        </div>

        <div className="bids-container">
          {validBids.length === 0 && bookingStatus.status === 'bidding_active' && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🔍</div>
              <p>Waiting for drivers to place bids...</p>
              <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>
                Your ride request is active. Drivers have {bookingStatus.biddingTimeLeft} seconds to bid.
              </p>
            </div>
          )}
          
          {validBids.length === 0 && bookingStatus.status === 'expired' && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>😔</div>
              <p>No bids received</p>
              <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>
                Unfortunately, no drivers placed bids within the time limit.
              </p>
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

          {validBids.map((bid, index) => (
            <div 
              key={bid.id} 
              className={`bid-card enhanced ${selectedBid?.id === bid.id ? 'selected' : ''}`}
              ref={index === validBids.length - 1 ? lastBidRef : null}
            >
              <div className="bid-driver-info">
                <div className="bid-avatar">
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
                    disabled={bookingStatus.status !== 'selection_active' && bookingStatus.status !== 'bidding_active'}
                    style={{
                      opacity: (bookingStatus.status === 'selection_active' || bookingStatus.status === 'bidding_active') ? 1 : 0.5,
                      cursor: (bookingStatus.status === 'selection_active' || bookingStatus.status === 'bidding_active') ? 'pointer' : 'not-allowed'
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

      {/* Enhanced Styles */}
      <style jsx>{`
        .enhanced .booking-info {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          font-size: 0.8rem;
          color: #6b7280;
        }

        .booking-id {
          font-family: monospace;
          background: rgba(255, 255, 255, 0.2);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .bid-count {
          font-weight: 500;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
        }

        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: inline-block;
        }

        .status-dot.bidding_active {
          background: #10b981;
          animation: pulse 2s infinite;
        }

        .status-dot.selection_active {
          background: #f59e0b;
          animation: pulse 1s infinite;
        }

        .status-dot.expired {
          background: #ef4444;
        }

        .status-dot.confirmed {
          background: #3b82f6;
        }

        .status-text {
          color: #6b7280;
          font-weight: 500;
          text-transform: capitalize;
        }

        .auto-select-warning {
          font-size: 0.9rem;
          color: #f59e0b;
          font-weight: 500;
          margin-top: 8px;
        }

        .expired-booking-card {
          background: linear-gradient(135deg, #fef2f2, #fee2e2);
          border: 2px solid #fca5a5;
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          margin-bottom: 24px;
        }

        .expired-icon {
          font-size: 3rem;
          margin-bottom: 12px;
        }

        .retry-btn {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .retry-btn:hover {
          transform: translateY(-1px);
        }

        .bid-card.enhanced {
          border: 2px solid #e5e7eb;
          transition: all 0.3s ease;
        }

        .bid-card.enhanced:hover {
          border-color: #10b981;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
          transform: translateY(-2px);
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}

export default EnhancedBid;
