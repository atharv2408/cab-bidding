import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import PreciseLocationMap from '../components/PreciseLocationMap';
import { supabaseDB } from '../utils/supabaseService';
import { createApiUrl, API_ENDPOINTS } from '../config/api';

const Home = ({ appState }) => {
  const navigate = useNavigate();
  const {
    pickup, setPickup, drop, setDrop, suggestedPrice, setSuggestedPrice,
    useSuggestedPrice, setUseSuggestedPrice, locationLoading, setLocationLoading,
    locationError, setLocationError, ReverseGeocode
  } = appState;
  
  // The PreciseLocationMap component handles location detection and map centering
  // We keep the detectLocation function for the manual location button

  const geocodeAddress = async (address, setLocation) => {
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/search`, {
        params: { q: address, format: 'json', limit: 1 },
      });
      if (res.data[0]) {
        const { lat, lon } = res.data[0];
        setLocation({ address, coords: [parseFloat(lat), parseFloat(lon)] });
      }
    } catch (err) {
      console.warn('Geocoding failed:', err);
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }

    setLocationLoading(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const coords = [latitude, longitude];
          const address = await ReverseGeocode(latitude, longitude);
          
          // Update pickup location (PreciseLocationMap will handle map centering)
          setPickup({ coords, address });
          
          setLocationLoading(false);
        } catch (error) {
          setLocationError('Failed to get address for your location.');
          setLocationLoading(false);
        }
      },
      (error) => {
        let errorMessage = 'Unable to retrieve your location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permission.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
          default:
            errorMessage = 'An unknown error occurred while retrieving location.';
            break;
        }
        setLocationError(errorMessage);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const startBidding = async () => {
    if (!pickup.address || !drop.address) {
      alert('Please set both pickup and drop locations before starting bidding.');
      return;
    }

    try {
      // Calculate estimated distance and fare
      const calculateDistance = (pickup, drop) => {
        if (!pickup.coords || !drop.coords) return 5; // Default distance
        const R = 6371; // Earth's radius in kilometers
        const dLat = (drop.coords[0] - pickup.coords[0]) * Math.PI / 180;
        const dLng = (drop.coords[1] - pickup.coords[1]) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(pickup.coords[0] * Math.PI / 180) * Math.cos(drop.coords[0] * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };

      const distance = calculateDistance(pickup, drop);
      const estimatedFare = Math.round(distance * 15 + 50); // Base fare calculation

      // Get user data from localStorage if available
      const userData = JSON.parse(localStorage.getItem('customerData') || '{}');
      const customerToken = localStorage.getItem('customerToken');

      // Create ride request data
      const rideRequestData = {
        customer_name: userData.full_name || userData.name || 'Customer',
        customer_phone: userData.phone || '+91 0000000000',
        pickup_address: pickup.address,
        drop_address: drop.address,
        pickup_location: pickup.coords ? { lat: pickup.coords[0], lng: pickup.coords[1] } : null,
        drop_location: drop.coords ? { lat: drop.coords[0], lng: drop.coords[1] } : null,
        distance: distance,
        estimated_fare: useSuggestedPrice && suggestedPrice ? parseFloat(suggestedPrice) : estimatedFare,
        status: 'pending',
        payment_method: 'cash'
      };

      let rideRequestId = null;

      // Try Supabase database first
      try {
        const { data, error } = await supabaseDB.bookings.add(rideRequestData);
        
        if (error) {
          console.warn('Supabase booking failed:', error);
          throw new Error('Supabase booking failed');
        }

        rideRequestId = data[0].id;
        console.log('✅ Ride request created in Supabase:', rideRequestId);
      } catch (supabaseError) {
        console.log('Supabase unavailable, trying backend API...');
        
        // Fallback to backend API if available
        try {
          // If user is authenticated, use the bid endpoint
          if (customerToken) {
            const response = await axios.post(createApiUrl(API_ENDPOINTS.BID), {
              pickup: pickup.address,
              drop: drop.address,
              ...rideRequestData
            }, {
              headers: {
                'Authorization': `Bearer ${customerToken}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (response.data) {
              console.log('✅ Ride request processed via backend API');
              // Use a mock ID for now
              rideRequestId = 'backend_' + Date.now();
            }
          } else {
            // No authentication, proceed with demo data
            console.log('📝 No authentication - proceeding with demo mode');
            rideRequestId = 'demo_' + Date.now();
          }
        } catch (apiError) {
          console.log('Backend API unavailable, proceeding with demo mode...');
          rideRequestId = 'demo_' + Date.now();
        }
      }

      // Store the ride request ID for later use
      localStorage.setItem('currentRideRequestId', rideRequestId);
      localStorage.setItem('currentRideRequest', JSON.stringify(rideRequestData));
      
      console.log('🚗 Ride request created with ID:', rideRequestId);
      
      // Navigate to bidding page
      navigate('/bids');
    } catch (error) {
      console.error('Error starting bidding:', error);
      alert(`Failed to create ride request: ${error.message}. Please check your connection and try again.`);
    }
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <div className="hero-section">
        <h1 className="hero-title">🚕 BidCab</h1>
        <p className="hero-subtitle">
          Get the best ride deals with competitive bidding. 
          Set your destination and let drivers compete for your ride!
        </p>
      </div>

      {/* Location error display */}
      {locationError && (
        <div className="location-error-display">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{locationError}</span>
        </div>
      )}

      {/* Location Input Section */}
      <div className="location-section">
        <div className="pickup-input-container location-input-container">
          <label>Pickup Location</label>
          <div className="input-with-icon">
            <input
              type="text"
              value={pickup.address}
              onChange={e => setPickup({ ...pickup, address: e.target.value })}
              onBlur={() => geocodeAddress(pickup.address, setPickup)}
              placeholder="Enter pickup location or detect current location"
              className="location-input form-input"
            />
            <button
              type="button"
              className="location-detect-icon btn btn-primary"
              onClick={detectLocation}
              disabled={locationLoading}
              title="Detect my current location"
            >
              {locationLoading ? (
                <span className="detect-icon animate-spin">⟳</span>
              ) : (
                <span className="detect-icon">📍</span>
              )}
            </button>
          </div>
        </div>
        
        <div className="drop-input-container location-input-container">
          <label>Drop Location</label>
          <div className="input-with-icon">
            <input
              value={drop.address}
              onChange={(e) => setDrop({ ...drop, address: e.target.value })}
              onBlur={() => geocodeAddress(drop.address, setDrop)}
              placeholder="Enter your destination"
              className="location-input form-input"
            />
          </div>
        </div>
      </div>

      {/* Price Suggestion Section */}
      <div className="price-suggestion card">
        <label className="checkbox-wrapper">
          <input
            type="checkbox"
            checked={useSuggestedPrice}
            onChange={e => setUseSuggestedPrice(e.target.checked)}
            className="checkbox-input"
          />
          <span className="checkbox-label">💰 Suggest Your Own Price</span>
        </label>
        {useSuggestedPrice && (
          <input
            type="number"
            min="0"
            value={suggestedPrice}
            onChange={e => setSuggestedPrice(e.target.value)}
            placeholder="Enter price in ₹"
            className="form-input"
          />
        )}
      </div>

      {/* Map Container */}
      <PreciseLocationMap
        pickup={pickup}
        setPickup={setPickup}
        drop={drop}
        setDrop={setDrop}
        onLocationDetected={(locationData) => {
          console.log('Precise location detected:', locationData);
        }}
        onLocationError={(error) => {
          setLocationError(error);
          console.error('Location error:', error);
        }}
        ReverseGeocode={ReverseGeocode}
        className="home-map"
        height="400px"
      />

      {/* Start Bidding Section */}
      <div className="start-bidding-section">
        <button onClick={startBidding} className="start-bidding-btn btn btn-xl">
          <span className="btn-icon">🚕</span>
          <div>
            <div className="btn-text">Find My Ride</div>
            <div className="btn-subtitle">Get competitive offers</div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default Home;