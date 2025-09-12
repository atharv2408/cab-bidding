import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createApiUrl, API_ENDPOINTS } from '../config/api';

const RideStatusMonitor = ({ appState }) => {
  const navigate = useNavigate();
  const [activeRide, setActiveRide] = useState(null);
  const [rideCompleted, setRideCompleted] = useState(false);

  useEffect(() => {
    // Check for active ride in localStorage
    const checkActiveRide = () => {
      const confirmedBooking = JSON.parse(localStorage.getItem('confirmedBooking') || '{}');
      const currentRideOTP = localStorage.getItem('currentRideOTP');
      
      if (confirmedBooking.id && currentRideOTP && !rideCompleted) {
        setActiveRide(confirmedBooking);
        
        // Set up polling to check for ride completion
        const pollForCompletion = setInterval(async () => {
          try {
            // Check if ride was completed via API
            const token = localStorage.getItem('customerToken') || localStorage.getItem('authToken');
            if (token) {
              const response = await fetch(createApiUrl(API_ENDPOINTS.CUSTOMER_HISTORY), {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (response.ok) {
                const data = await response.json();
                if (data.success && data.history) {
                  const completedRide = data.history.find(h => 
                    h.id === confirmedBooking.id && h.status === 'completed'
                  );
                  
                  if (completedRide && !rideCompleted) {
                    handleRideCompletion(completedRide);
                    clearInterval(pollForCompletion);
                  }
                }
              }
            }
            
            // Also check localStorage for completion marker
            const rideCompletedFlag = localStorage.getItem(`ride_completed_${confirmedBooking.id}`) ||
                                    localStorage.getItem(`ride_completed_${confirmedBooking.bookingId}`);
            
            if (rideCompletedFlag && !rideCompleted) {
              handleRideCompletion(confirmedBooking);
              clearInterval(pollForCompletion);
            }
          } catch (error) {
            console.error('Error checking ride status:', error);
          }
        }, 5000); // Poll every 5 seconds
        
        return () => clearInterval(pollForCompletion);
      }
    };

    checkActiveRide();
  }, [rideCompleted]);

  const handleRideCompletion = (completedRideData) => {
    if (rideCompleted) return; // Prevent multiple notifications
    
    setRideCompleted(true);
    
    // Update ride status in localStorage
    const updatedBooking = {
      ...activeRide,
      ...completedRideData,
      status: 'completed',
      completed_at: new Date().toISOString()
    };
    
    // Save to history
    const existingHistory = JSON.parse(localStorage.getItem('customerRideHistory') || '[]');
    const filteredHistory = existingHistory.filter(h => h.id !== updatedBooking.id);
    filteredHistory.unshift(updatedBooking);
    localStorage.setItem('customerRideHistory', JSON.stringify(filteredHistory));
    
    // Clear active booking
    localStorage.removeItem('confirmedBooking');
    localStorage.removeItem('currentRideOTP');
    localStorage.removeItem('rideOTP');
    
    // Show completion notification
    const completionMessage = `🎉 Ride Completed Successfully!

Driver: ${completedRideData.driver_name || activeRide.driverName || 'Your Driver'}
Fare: ₹${completedRideData.final_fare || completedRideData.estimated_fare || activeRide.price}
Payment: Processed automatically

Thank you for using our service!`;

    alert(completionMessage);
    
    // Navigate to history page
    setTimeout(() => {
      navigate('/history');
    }, 2000);
  };

  // This component doesn't render anything visible
  return null;
};

export default RideStatusMonitor;
