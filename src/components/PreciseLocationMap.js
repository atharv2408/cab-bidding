import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';

// Custom hook to handle map centering and zooming
const MapController = ({ center, zoom, bounds }) => {
  const map = useMap();
  
  useEffect(() => {
    if (bounds && bounds.length === 2) {
      map.fitBounds(bounds, { padding: [20, 20] });
    } else if (center) {
      map.setView(center, zoom || 15);
    }
  }, [map, center, zoom, bounds]);
  
  return null;
};

// Enhanced location marker component
const PreciseLocationMarker = ({ 
  position, 
  accuracy, 
  isCurrentLocation = false, 
  title, 
  icon,
  onLocationSelect 
}) => {
  const { t } = useTranslation();
  
  // Custom icon for current location
  const currentLocationIcon = L.divIcon({
    className: 'current-location-marker',
    html: `
      <div style="
        width: 20px;
        height: 20px;
        background: #4285f4;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        position: relative;
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  return (
    <>
      <Marker 
        position={position} 
        icon={isCurrentLocation ? currentLocationIcon : icon}
        eventHandlers={{
          click: () => onLocationSelect && onLocationSelect(position)
        }}
      >
        <Popup>
          <div>
            <strong>{title || (isCurrentLocation ? t('location.currentLocation') : t('location.selectedLocation'))}</strong>
            <br />
            <small>
              Lat: {position[0].toFixed(6)}<br />
              Lng: {position[1].toFixed(6)}
              {accuracy && (
                <>
                  <br />
                  {t('location.accuracy')}: ±{accuracy}m
                </>
              )}
            </small>
          </div>
        </Popup>
      </Marker>
      
      {/* Show accuracy circle for current location */}
      {isCurrentLocation && accuracy && (
        <Circle
          center={position}
          radius={accuracy}
          pathOptions={{
            color: '#4285f4',
            fillColor: '#4285f4',
            fillOpacity: 0.1,
            weight: 1
          }}
        />
      )}
    </>
  );
};

// Main map click handler
const MapClickHandler = ({ onMapClick, disabled }) => {
  useMapEvents({
    click: (e) => {
      if (!disabled && onMapClick) {
        const { lat, lng } = e.latlng;
        onMapClick([lat, lng]);
      }
    },
  });
  return null;
};

// Main component
const PreciseLocationMap = ({
  pickup,
  setPickup,
  drop,
  setDrop,
  onLocationDetected,
  onLocationError,
  ReverseGeocode,
  className = "",
  height = "400px"
}) => {
  const { t } = useTranslation();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]); // Delhi default
  const [mapZoom, setMapZoom] = useState(12);
  const [watchId, setWatchId] = useState(null);
  const mapRef = useRef();

  // Enhanced location detection with higher accuracy
  const detectPreciseLocation = async () => {
    if (!navigator.geolocation) {
      const error = t('errors.locationNotSupported');
      onLocationError && onLocationError(error);
      return;
    }

    setIsDetecting(true);
    
    // First, try to get a quick position
    const quickOptions = {
      enableHighAccuracy: false,
      timeout: 5000,
      maximumAge: 60000
    };

    // Then get a more accurate position
    const preciseOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000
    };

    try {
      // Get quick position first for immediate feedback
      const quickPosition = await getCurrentPosition(quickOptions);
      await handleLocationSuccess(quickPosition, false);

      // Then get more accurate position
      const precisePosition = await getCurrentPosition(preciseOptions);
      await handleLocationSuccess(precisePosition, true);
      
    } catch (error) {
      handleLocationError(error);
    } finally {
      setIsDetecting(false);
    }
  };

  // Promise wrapper for getCurrentPosition
  const getCurrentPosition = (options) => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  };

  // Handle successful location detection
  const handleLocationSuccess = async (position, isFinal = true) => {
    const { latitude, longitude, accuracy } = position.coords;
    const coords = [latitude, longitude];
    
    setCurrentLocation(coords);
    setLocationAccuracy(accuracy);
    setMapCenter(coords);
    setMapZoom(Math.max(15, Math.min(18, 20 - Math.log10(accuracy || 100))));

    try {
      const address = await ReverseGeocode(latitude, longitude);
      
      // Only update pickup if it's not already set or if this is the final accurate reading
      if (!pickup.coords || isFinal) {
        setPickup({
          coords: coords,
          address: address,
          accuracy: accuracy
        });
      }

      if (onLocationDetected && isFinal) {
        onLocationDetected({
          coords: coords,
          address: address,
          accuracy: accuracy
        });
      }
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      if (onLocationError) {
        onLocationError(t('errors.addressLookupFailed'));
      }
    }
  };

  // Handle location detection errors
  const handleLocationError = (error) => {
    let errorMessage;
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = t('errors.locationPermission');
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = t('errors.locationUnavailable');
        break;
      case error.TIMEOUT:
        errorMessage = t('errors.locationTimeout');
        break;
      default:
        errorMessage = t('errors.locationUnknown');
        break;
    }

    if (onLocationError) {
      onLocationError(errorMessage);
    }
  };

  // Continuous location tracking
  const startLocationTracking = () => {
    if (!navigator.geolocation || watchId) return;

    const options = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 10000
    };

    const id = navigator.geolocation.watchPosition(
      (position) => handleLocationSuccess(position, true),
      handleLocationError,
      options
    );

    setWatchId(id);
  };

  const stopLocationTracking = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  };

  // Handle map clicks for location selection
  const handleMapClick = async (coords) => {
    try {
      const address = await ReverseGeocode(coords[0], coords[1]);
      
      if (!pickup.coords) {
        setPickup({ coords, address });
      } else if (!drop.coords) {
        setDrop({ coords, address });
      } else {
        // If both are set, replace drop location
        setDrop({ coords, address });
      }
    } catch (error) {
      console.warn('Failed to get address for clicked location:', error);
    }
  };

  // Calculate bounds for showing all markers
  const calculateBounds = () => {
    const points = [];
    if (currentLocation) points.push(currentLocation);
    if (pickup.coords) points.push(pickup.coords);
    if (drop.coords) points.push(drop.coords);
    
    if (points.length < 2) return null;
    
    return points;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLocationTracking();
    };
  }, []);

  // Create custom icons for pickup and drop
  const pickupIcon = L.divIcon({
    className: 'pickup-marker',
    html: `<div style="
      width: 25px;
      height: 25px;
      background: #4CAF50;
      border: 2px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <span style="transform: rotate(45deg); color: white; font-size: 12px;">📍</span>
    </div>`,
    iconSize: [25, 25],
    iconAnchor: [12, 24]
  });

  const dropIcon = L.divIcon({
    className: 'drop-marker',
    html: `<div style="
      width: 25px;
      height: 25px;
      background: #F44336;
      border: 2px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <span style="transform: rotate(45deg); color: white; font-size: 12px;">🏁</span>
    </div>`,
    iconSize: [25, 25],
    iconAnchor: [12, 24]
  });

  return (
    <div className={`precise-location-map ${className}`}>
      {/* Location controls */}
      <div className="map-controls" style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <button
          onClick={detectPreciseLocation}
          disabled={isDetecting}
          className="map-control-btn"
          title={t('location.detectMyLocation')}
          style={{
            background: '#4285f4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '8px',
            cursor: isDetecting ? 'not-allowed' : 'pointer',
            opacity: isDetecting ? 0.6 : 1,
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
          }}
        >
          {isDetecting ? '⟳' : '🎯'}
        </button>
        
        <button
          onClick={watchId ? stopLocationTracking : startLocationTracking}
          className="map-control-btn"
          title={watchId ? t('location.stopTracking') : t('location.startTracking')}
          style={{
            background: watchId ? '#FF5722' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '8px',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
          }}
        >
          {watchId ? '⏹️' : '📡'}
        </button>
      </div>

      {/* Map container */}
      <MapContainer
        ref={mapRef}
        center={mapCenter}
        zoom={mapZoom}
        style={{ height, width: '100%' }}
        className="leaflet-container"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        <MapController 
          center={mapCenter} 
          zoom={mapZoom} 
          bounds={calculateBounds()} 
        />
        
        <MapClickHandler onMapClick={handleMapClick} />
        
        {/* Current location marker */}
        {currentLocation && (
          <PreciseLocationMarker
            position={currentLocation}
            accuracy={locationAccuracy}
            isCurrentLocation={true}
            title={t('location.currentLocation')}
          />
        )}
        
        {/* Pickup location marker */}
        {pickup.coords && (
          <PreciseLocationMarker
            position={pickup.coords}
            title={`${t('location.pickup')}: ${pickup.address}`}
            icon={pickupIcon}
            onLocationSelect={(coords) => console.log('Pickup selected:', coords)}
          />
        )}
        
        {/* Drop location marker */}
        {drop.coords && (
          <PreciseLocationMarker
            position={drop.coords}
            title={`${t('location.dropoff')}: ${drop.address}`}
            icon={dropIcon}
            onLocationSelect={(coords) => console.log('Drop selected:', coords)}
          />
        )}
      </MapContainer>
      
      {/* Location info panel */}
      {(currentLocation || pickup.coords || drop.coords) && (
        <div className="location-info-panel" style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          maxWidth: '300px',
          fontSize: '0.85rem',
          zIndex: 1000
        }}>
          {currentLocation && (
            <div style={{ marginBottom: '8px' }}>
              <strong>📍 {t('location.currentLocation')}:</strong><br />
              <span>Lat: {currentLocation[0].toFixed(6)}</span><br />
              <span>Lng: {currentLocation[1].toFixed(6)}</span>
              {locationAccuracy && (
                <><br /><span style={{ color: '#666' }}>±{locationAccuracy.toFixed(0)}m accuracy</span></>
              )}
            </div>
          )}
          
          {pickup.coords && (
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#4CAF50' }}>🚩 {t('location.pickup')}:</strong><br />
              <span>{pickup.address}</span>
            </div>
          )}
          
          {drop.coords && (
            <div>
              <strong style={{ color: '#F44336' }}>🏁 {t('location.dropoff')}:</strong><br />
              <span>{drop.address}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PreciseLocationMap;
