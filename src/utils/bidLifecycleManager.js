// Enhanced Bid Lifecycle Management System
// Handles automatic cleanup of expired bids and booking states

class BidLifecycleManager {
  constructor() {
    this.activeBookings = new Map(); // Track active bookings with timestamps
    this.cleanupInterval = null;
    this.isRunning = false;
  }

  // Initialize the lifecycle manager
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚀 Bid Lifecycle Manager started');
    
    // Run cleanup every 5 seconds
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 5000);
    
    // Initial cleanup
    this.performCleanup();
  }

  // Stop the lifecycle manager
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    console.log('🛑 Bid Lifecycle Manager stopped');
  }

  // Register a new booking with its timing constraints
  registerBooking(bookingId, bookingData) {
    const now = Date.now();
    const booking = {
      id: bookingId,
      createdAt: now,
      biddingEndTime: now + (60 * 1000), // 60 seconds for bidding
      selectionEndTime: now + (75 * 1000), // 15 additional seconds for selection
      status: 'bidding_active',
      data: bookingData,
      bids: []
    };
    
    this.activeBookings.set(bookingId, booking);
    console.log('📝 Registered booking:', bookingId, 'Status: bidding_active');
    
    return booking;
  }

  // Add a bid to a booking
  addBid(bookingId, bidData) {
    const booking = this.activeBookings.get(bookingId);
    if (!booking) {
      console.warn('⚠️  Booking not found:', bookingId);
      return false;
    }

    const now = Date.now();
    
    // Check if bidding is still active
    if (now > booking.biddingEndTime) {
      console.log('⏰ Bidding period expired for booking:', bookingId);
      return false;
    }

    // Add timestamp to bid
    const bidWithTimestamp = {
      ...bidData,
      timestamp: now,
      bookingId: bookingId
    };

    booking.bids.push(bidWithTimestamp);
    console.log('💰 Added bid to booking:', bookingId, 'Driver:', bidData.driver_name);
    
    return true;
  }

  // Get valid bids for a booking (only if still within timeframe)
  getValidBids(bookingId) {
    const booking = this.activeBookings.get(bookingId);
    if (!booking) {
      return [];
    }

    const now = Date.now();
    
    // If booking is confirmed or expired, return empty array
    if (booking.status === 'confirmed' || booking.status === 'expired') {
      return [];
    }

    // If bidding is active, return all bids
    if (now <= booking.biddingEndTime) {
      return booking.bids;
    }

    // If in selection phase, return all bids
    if (now <= booking.selectionEndTime && booking.bids.length > 0) {
      return booking.bids;
    }

    // Selection time expired, no valid bids
    return [];
  }

  // Accept a bid and mark booking as confirmed
  acceptBid(bookingId, bidId) {
    const booking = this.activeBookings.get(bookingId);
    if (!booking) {
      console.warn('⚠️  Booking not found:', bookingId);
      return false;
    }

    const now = Date.now();
    
    // Check if still in selection phase
    if (now > booking.selectionEndTime) {
      console.log('⏰ Selection period expired for booking:', bookingId);
      return false;
    }

    // Find the accepted bid
    const acceptedBid = booking.bids.find(bid => bid.id === bidId);
    if (!acceptedBid) {
      console.warn('⚠️  Bid not found:', bidId);
      return false;
    }

    // Mark booking as confirmed
    booking.status = 'confirmed';
    booking.confirmedAt = now;
    booking.acceptedBid = acceptedBid;

    console.log('✅ Bid accepted for booking:', bookingId, 'Driver:', acceptedBid.driver_name);
    
    // Clean up this booking from active bidding
    this.cleanupBooking(bookingId);
    
    return true;
  }

  // Get booking status and timing information
  getBookingStatus(bookingId) {
    const booking = this.activeBookings.get(bookingId);
    if (!booking) {
      return { status: 'not_found' };
    }

    const now = Date.now();
    const biddingTimeLeft = Math.max(0, booking.biddingEndTime - now);
    const selectionTimeLeft = Math.max(0, booking.selectionEndTime - now);

    let currentStatus = booking.status;
    
    // Auto-update status based on timing
    if (currentStatus === 'bidding_active' && now > booking.biddingEndTime) {
      if (booking.bids.length > 0) {
        currentStatus = 'selection_active';
        booking.status = 'selection_active';
      } else {
        currentStatus = 'expired';
        booking.status = 'expired';
      }
    }

    if (currentStatus === 'selection_active' && now > booking.selectionEndTime) {
      currentStatus = 'expired';
      booking.status = 'expired';
    }

    return {
      status: currentStatus,
      biddingTimeLeft: Math.ceil(biddingTimeLeft / 1000), // Convert to seconds
      selectionTimeLeft: Math.ceil(selectionTimeLeft / 1000),
      bidCount: booking.bids.length,
      isExpired: currentStatus === 'expired' || currentStatus === 'confirmed'
    };
  }

  // Perform cleanup of expired bookings and bids
  performCleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [bookingId, booking] of this.activeBookings) {
      const status = this.getBookingStatus(bookingId);
      
      if (status.isExpired) {
        this.cleanupBooking(bookingId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log('🧹 Cleaned up', cleanedCount, 'expired bookings');
    }

    // Also cleanup localStorage
    this.cleanupLocalStorage();
  }

  // Clean up a specific booking
  cleanupBooking(bookingId) {
    this.activeBookings.delete(bookingId);
    
    // Clean up localStorage entries
    try {
      localStorage.removeItem(`bids_${bookingId}`);
      localStorage.removeItem(`ride_request_${bookingId}`);
      localStorage.removeItem(`booking_${bookingId}`);
      
      // Remove from fallback bids
      const fallbackBids = JSON.parse(localStorage.getItem('fallbackBids') || '[]');
      const cleanedFallbackBids = fallbackBids.filter(bid => bid.booking_id !== bookingId);
      localStorage.setItem('fallbackBids', JSON.stringify(cleanedFallbackBids));
      
      console.log('🧹 Cleaned up localStorage for booking:', bookingId);
    } catch (error) {
      console.warn('⚠️  Error cleaning localStorage:', error);
    }
  }

  // Clean up localStorage of expired data
  cleanupLocalStorage() {
    try {
      const keysToCheck = [];
      
      // Get all localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('bids_') || key.startsWith('ride_request_') || key.startsWith('booking_'))) {
          keysToCheck.push(key);
        }
      }

      // Check each key for expiry
      keysToCheck.forEach(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          
          if (data.created_at || data.createdAt) {
            const createdTime = new Date(data.created_at || data.createdAt).getTime();
            const expiredTime = createdTime + (90 * 1000); // 90 seconds total (60 + 15 + buffer)
            
            if (Date.now() > expiredTime) {
              localStorage.removeItem(key);
              console.log('🧹 Removed expired localStorage key:', key);
            }
          }
        } catch (error) {
          // Remove corrupted data
          localStorage.removeItem(key);
          console.log('🧹 Removed corrupted localStorage key:', key);
        }
      });

      // Clean expired fallback bids
      const fallbackBids = JSON.parse(localStorage.getItem('fallbackBids') || '[]');
      const validFallbackBids = fallbackBids.filter(bid => {
        if (bid.created_at) {
          const createdTime = new Date(bid.created_at).getTime();
          const expiredTime = createdTime + (90 * 1000);
          return Date.now() <= expiredTime;
        }
        return false; // Remove bids without timestamps
      });

      if (validFallbackBids.length !== fallbackBids.length) {
        localStorage.setItem('fallbackBids', JSON.stringify(validFallbackBids));
        console.log('🧹 Cleaned expired fallback bids');
      }

    } catch (error) {
      console.warn('⚠️  Error during localStorage cleanup:', error);
    }
  }

  // Get all active bookings (for debugging)
  getActiveBookings() {
    return Array.from(this.activeBookings.values());
  }

  // Force cleanup all expired data
  forceCleanupAll() {
    console.log('🧹 Force cleaning all expired data...');
    
    // Clear all active bookings that are expired
    const now = Date.now();
    for (const [bookingId, booking] of this.activeBookings) {
      if (now > booking.selectionEndTime || booking.status === 'confirmed') {
        this.cleanupBooking(bookingId);
      }
    }

    // Clean localStorage
    this.cleanupLocalStorage();
    
    console.log('✅ Force cleanup completed');
  }
}

// Create singleton instance
const bidLifecycleManager = new BidLifecycleManager();

// Auto-start when imported
if (typeof window !== 'undefined') {
  // Start only in browser environment
  bidLifecycleManager.start();
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    bidLifecycleManager.stop();
  });
}

export default bidLifecycleManager;
