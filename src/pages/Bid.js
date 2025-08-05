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

  // Simulate incoming bids
  useEffect(() => {
    if (!biddingActive) return;
    
    const bidders = [
      { name: 'Rajesh Kumar', rating: 4.5, avatar: '🧔', car: 'Maruti Swift', experience: '5 years' },
      { name: 'Priya Singh', rating: 4.7, avatar: '👩', car: 'Honda City', experience: '3 years' },
      { name: 'Amit Sharma', rating: 4.2, avatar: '👨', car: 'Hyundai Creta', experience: '7 years' },
      { name: 'Neha Patel', rating: 4.8, avatar: '👩‍💼', car: 'Toyota Innova', experience: '4 years' },
      { name: 'Vikash Yadav', rating: 4.3, avatar: '🧑', car: 'Maruti Dzire', experience: '6 years' }
    ];
    
    const basePrices = [120, 135, 150, 165, 180];
    let bidIndex = 0;
    
    const addBid = () => {
      if (bidIndex < bidders.length && biddingActive) {
        const bidder = bidders[bidIndex];
        const basePrice = basePrices[bidIndex];
        const variation = Math.floor(Math.random() * 30) - 15; // ±15 variation
        const finalPrice = Math.max(basePrice + variation, 100);
        
        const newBid = {
          id: bidIndex + 1,
          driver: bidder.name,
          price: finalPrice,
          rating: bidder.rating,
          avatar: bidder.avatar,
          car: bidder.car,
          experience: bidder.experience,
          eta: Math.floor(Math.random() * 10) + 3, // 3-13 minutes
          distance: (Math.random() * 2 + 0.5).toFixed(1) // 0.5-2.5 km
        };
        
        setBids(prev => {
          const updated = [...prev, newBid].sort((a, b) => a.price - b.price);
          return updated;
        });
        
        bidIndex++;
        
        // Schedule next bid
        if (bidIndex < bidders.length) {
          setTimeout(addBid, Math.random() * 8000 + 2000); // 2-10 seconds
        }
      }
    };
    
    // Start first bid after 2 seconds
    const initialTimeout = setTimeout(addBid, 2000);
    
    return () => {
      clearTimeout(initialTimeout);
    };
  }, [biddingActive, setBids]);

  // Scroll to latest bid
  useEffect(() => {
    if (lastBidRef.current) {
      lastBidRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [bids.length]);

  const acceptBid = (bid) => {
    setSelectedBid(bid);
    setBiddingActive(false);
    setSelectionTime(false);
    navigate('/confirm');
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
              <p>Searching for nearby drivers...</p>
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
                    disabled={biddingActive && !selectionTime}
                    style={{
                      opacity: (biddingActive && !selectionTime) ? 0.5 : 1,
                      cursor: (biddingActive && !selectionTime) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {biddingActive && !selectionTime ? 'Bidding...' : 'Select'}
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
