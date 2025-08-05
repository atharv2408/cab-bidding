import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Polyline } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AutoLocationMarker = ({ pickupSet, dropSet, setPickup, setDrop, ReverseGeocode }) => {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      const address = await ReverseGeocode(lat, lng);
      if (!pickupSet) {
        setPickup({ coords: [lat, lng], address });
      } else if (!dropSet) {
        setDrop({ coords: [lat, lng], address });
      }
    },
  });
  return null;
};

const Home = ({ appState }) => {
  const navigate = useNavigate();
  const {
    pickup, setPickup, drop, setDrop, suggestedPrice, setSuggestedPrice,
    useSuggestedPrice, setUseSuggestedPrice, locationLoading, setLocationLoading,
    locationError, setLocationError, ReverseGeocode
  } = appState;

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
          const address = await ReverseGeocode(latitude, longitude);
          setPickup({ coords: [latitude, longitude], address });
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

  const startBidding = () => {
    if (!pickup.address || !drop.address) {
      alert('Please set both pickup and drop locations before starting bidding.');
      return;
    }
    navigate('/bids');
  };

  return (
    <div className="home-page">
      {/* Location detection button */}
      <div className="location-detect-section">
        <button 
          onClick={detectLocation} 
          disabled={locationLoading}
          className="detect-location-btn"
          title="Detect my current location"
        >
          {locationLoading ? (
            <>
              <span className="btn-icon spinning">🔄</span>
              <span className="btn-text">Detecting...</span>
            </>
          ) : (
            <>
              <span className="btn-icon">📍</span>
              <span className="btn-text">Detect My Location</span>
            </>
          )}
        </button>
        {locationError && (
          <div className="location-error">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{locationError}</span>
          </div>
        )}
      </div>

      <div className="pickup-input-container">
        <label>Pickup Location</label>
        <div className="input-group pickup-group" style={{ position: 'relative' }}>
          <input
            type="text"
            value={pickup.address}
            onChange={e => setPickup({ ...pickup, address: e.target.value })}
            placeholder="Enter pickup location"
            className="pickup-input"
            style={{ paddingRight: '2.5rem' }} // Add space for icon
          />
          <button
            type="button"
            className="detect-location-btn"
            onClick={detectLocation}
            style={{
              position: 'absolute',
              right: '0.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0
            }}
            title="Detect My Location"
            tabIndex={0}
          >
            <span role="img" aria-label="Detect Location" style={{ fontSize: '1.5rem' }}>📍</span>
          </button>
        </div>
      </div>
      
      <div className="drop-input-container">
        <label>Drop Location</label>
        <div className="input-with-icon">
          <span className="input-icon drop-icon">🏁</span>
          <input
            value={drop.address}
            onChange={(e) => setDrop({ ...drop, address: e.target.value })}
            onBlur={() => geocodeAddress(drop.address, setDrop)}
            placeholder="Type address or click on map"
            className="location-input"
          />
        </div>
      </div>

      <div style={{ margin: '10px 0' }}>
        <label>
          <input
            type="checkbox"
            checked={useSuggestedPrice}
            onChange={e => setUseSuggestedPrice(e.target.checked)}
            style={{ marginRight: 6 }}
          />
          Suggest a Price
        </label>
        {useSuggestedPrice && (
          <input
            type="number"
            min="0"
            value={suggestedPrice}
            onChange={e => setSuggestedPrice(e.target.value)}
            placeholder="Enter suggested price in ₹"
            style={{ width: 120, marginLeft: 10 }}
          />
        )}
      </div>

      <MapContainer center={[28.61, 77.23]} zoom={12} style={{ height: '400px', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {pickup.coords && <Marker position={pickup.coords} />}
        {drop.coords && <Marker position={drop.coords} />}
        {pickup.coords && drop.coords && (
          <Polyline positions={[pickup.coords, drop.coords]} color="blue" />
        )}
        <AutoLocationMarker
          pickupSet={!!pickup.coords}
          dropSet={!!drop.coords}
          setPickup={setPickup}
          setDrop={setDrop}
          ReverseGeocode={ReverseGeocode}
        />
      </MapContainer>

      <div className="start-bidding-section">
        <button onClick={startBidding} className="start-bidding-btn">
          <span className="btn-icon">🚕</span>
          <span className="btn-text">Find My Bid</span>
          <span className="btn-subtitle">Get competitive offers</span>
        </button>
      </div>
    </div>
  );
};

export default Home;