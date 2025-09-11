// Bid Timer Synchronization System
// This ensures real-time timer sync between customer and driver interfaces

import { supabaseDB } from './supabaseService';

class BidTimerManager {
  constructor() {
    this.timers = new Map(); // Local timer cache
    this.subscriptions = new Map(); // Active subscriptions
    this.intervals = new Map(); // Update intervals
    this.callbacks = new Map(); // Callbacks for updates
  }

  // Start tracking a bid timer
  async startTimer(bookingId, duration = 300, onUpdate = null, onExpire = null) {
    try {
      console.log(`🕐 Starting bid timer for booking ${bookingId}, duration: ${duration}s`);
      
      // Clear any existing timer for this booking
      this.stopTimer(bookingId);

      // Check if timer already exists in database
      let { data: existingTimer, error } = await supabaseDB.bidTimers.getByBookingId(bookingId);
      
      let timerData;
      
      if (error || !existingTimer) {
        // Create new timer in database
        console.log(`📝 Creating new timer for booking ${bookingId}`);
        const { data: newTimer, error: createError } = await supabaseDB.bidTimers.create(bookingId, duration);
        
        if (createError) {
          console.error('Failed to create timer:', createError);
          return null;
        }
        
        timerData = newTimer;
      } else {
        // Use existing timer
        console.log(`♻️ Using existing timer for booking ${bookingId}`);
        timerData = existingTimer;
      }

      // Calculate current remaining time
      const now = Date.now();
      const expiresAt = new Date(timerData.expires_at).getTime();
      const remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));

      // Store timer info
      const timerInfo = {
        bookingId,
        startedAt: new Date(timerData.started_at).getTime(),
        expiresAt,
        duration: timerData.timer_duration,
        remainingSeconds,
        status: remainingSeconds > 0 ? 'active' : 'expired',
        onUpdate,
        onExpire
      };

      this.timers.set(bookingId, timerInfo);

      // Set up local update interval
      this.startLocalUpdates(bookingId);

      // Set up real-time subscription
      this.subscribeToTimer(bookingId);

      // Set up database sync interval
      this.startDatabaseSync(bookingId);

      return timerInfo;

    } catch (error) {
      console.error('Error starting bid timer:', error);
      return null;
    }
  }

  // Start local timer updates (every second)
  startLocalUpdates(bookingId) {
    const intervalId = setInterval(() => {
      const timer = this.timers.get(bookingId);
      if (!timer) {
        clearInterval(intervalId);
        return;
      }

      const now = Date.now();
      const newRemainingSeconds = Math.max(0, Math.floor((timer.expiresAt - now) / 1000));
      
      // Update local cache
      timer.remainingSeconds = newRemainingSeconds;
      timer.status = newRemainingSeconds > 0 ? 'active' : 'expired';

      // Call update callback
      if (timer.onUpdate) {
        timer.onUpdate({
          bookingId,
          remainingSeconds: newRemainingSeconds,
          status: timer.status,
          isExpired: newRemainingSeconds <= 0
        });
      }

      // Handle expiration
      if (newRemainingSeconds <= 0 && timer.status === 'active') {
        console.log(`⏰ Timer expired for booking ${bookingId}`);
        timer.status = 'expired';
        
        if (timer.onExpire) {
          timer.onExpire(bookingId);
        }

        // Update database
        this.expireTimer(bookingId);
        
        // Stop this timer
        this.stopTimer(bookingId);
      }
    }, 1000);

    this.intervals.set(bookingId, intervalId);
  }

  // Subscribe to real-time timer updates from database
  subscribeToTimer(bookingId) {
    try {
      const subscription = supabaseDB.realtime.subscribeToBidTimers((payload) => {
        if (payload.new?.booking_id === bookingId) {
          console.log(`🔄 Real-time timer update for booking ${bookingId}:`, payload);
          
          const updatedTimer = payload.new;
          const timer = this.timers.get(bookingId);
          
          if (timer && updatedTimer) {
            // Update from real-time data
            const now = Date.now();
            const expiresAt = new Date(updatedTimer.expires_at).getTime();
            const remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
            
            timer.remainingSeconds = remainingSeconds;
            timer.status = updatedTimer.status;
            timer.expiresAt = expiresAt;

            // Notify callbacks
            if (timer.onUpdate) {
              timer.onUpdate({
                bookingId,
                remainingSeconds,
                status: updatedTimer.status,
                isExpired: remainingSeconds <= 0,
                source: 'realtime'
              });
            }

            // Handle expiration
            if (updatedTimer.status === 'expired' && timer.onExpire) {
              timer.onExpire(bookingId);
              this.stopTimer(bookingId);
            }
          }
        }
      });

      this.subscriptions.set(bookingId, subscription);
    } catch (error) {
      console.error('Failed to subscribe to timer updates:', error);
    }
  }

  // Sync with database every 10 seconds to ensure accuracy
  startDatabaseSync(bookingId) {
    const syncInterval = setInterval(async () => {
      try {
        const timer = this.timers.get(bookingId);
        if (!timer || timer.status === 'expired') {
          clearInterval(syncInterval);
          return;
        }

        // Update timer in database
        await supabaseDB.rpc('update_bid_timer', { p_booking_id: bookingId });
        
        // Fetch updated timer data
        const { data: updatedTimer } = await supabaseDB.bidTimers.getByBookingId(bookingId);
        
        if (updatedTimer) {
          const now = Date.now();
          const expiresAt = new Date(updatedTimer.expires_at).getTime();
          const remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
          
          // Update local cache with database values
          timer.remainingSeconds = remainingSeconds;
          timer.status = updatedTimer.status;
          timer.expiresAt = expiresAt;

          console.log(`🔄 Database sync for booking ${bookingId}: ${remainingSeconds}s remaining`);
        }
      } catch (error) {
        console.error('Database sync error:', error);
      }
    }, 10000); // Every 10 seconds

    // Store sync interval reference
    const bookingSyncKey = `${bookingId}_sync`;
    this.intervals.set(bookingSyncKey, syncInterval);
  }

  // Stop tracking a timer
  stopTimer(bookingId) {
    console.log(`⏹️ Stopping timer for booking ${bookingId}`);
    
    // Clear local updates
    const intervalId = this.intervals.get(bookingId);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(bookingId);
    }

    // Clear database sync
    const syncIntervalId = this.intervals.get(`${bookingId}_sync`);
    if (syncIntervalId) {
      clearInterval(syncIntervalId);
      this.intervals.delete(`${bookingId}_sync`);
    }

    // Unsubscribe from real-time updates
    const subscription = this.subscriptions.get(bookingId);
    if (subscription) {
      supabaseDB.realtime.unsubscribe(subscription);
      this.subscriptions.delete(bookingId);
    }

    // Remove from cache
    this.timers.delete(bookingId);
  }

  // Get current timer info
  getTimer(bookingId) {
    return this.timers.get(bookingId);
  }

  // Get remaining time for a booking
  getRemainingTime(bookingId) {
    const timer = this.timers.get(bookingId);
    if (!timer) return 0;

    const now = Date.now();
    return Math.max(0, Math.floor((timer.expiresAt - now) / 1000));
  }

  // Check if timer is expired
  isExpired(bookingId) {
    const remainingTime = this.getRemainingTime(bookingId);
    return remainingTime <= 0;
  }

  // Mark timer as expired in database
  async expireTimer(bookingId) {
    try {
      await supabaseDB.rpc('update_bid_timer', { p_booking_id: bookingId });
      console.log(`💥 Timer expired in database for booking ${bookingId}`);
    } catch (error) {
      console.error('Failed to expire timer in database:', error);
    }
  }

  // Get all active timers
  getAllTimers() {
    const activeTimers = [];
    for (const [bookingId, timer] of this.timers) {
      if (timer.status === 'active') {
        activeTimers.push({
          bookingId,
          remainingSeconds: this.getRemainingTime(bookingId),
          ...timer
        });
      }
    }
    return activeTimers;
  }

  // Clean up all timers
  cleanup() {
    console.log('🧹 Cleaning up all bid timers');
    
    for (const bookingId of this.timers.keys()) {
      this.stopTimer(bookingId);
    }

    this.timers.clear();
    this.subscriptions.clear();
    this.intervals.clear();
    this.callbacks.clear();
  }

  // Format time for display
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Batch start multiple timers
  async startMultipleTimers(bookingTimers) {
    const results = [];
    
    for (const { bookingId, duration, onUpdate, onExpire } of bookingTimers) {
      const result = await this.startTimer(bookingId, duration, onUpdate, onExpire);
      results.push({ bookingId, result });
    }

    return results;
  }
}

// Create singleton instance
const bidTimerManager = new BidTimerManager();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    bidTimerManager.cleanup();
  });
}

export default bidTimerManager;
