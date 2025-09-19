/**
 * Urgent Notification Manager - Handle time-sensitive driver notifications
 */

class UrgentNotificationManager {
  constructor() {
    this.activeNotifications = new Map();
    this.notificationQueue = [];
    this.urgentTimeout = 45 * 1000; // 45 seconds for urgent OTP response (reduced from typical 60s)
    this.criticalTimeout = 30 * 1000; // 30 seconds for critical notifications
  }

  // Create urgent notification for driver when customer accepts bid
  createUrgentOTPNotification(rideData) {
    const notificationId = `urgent_otp_${rideData.id || Date.now()}`;
    
    const notification = {
      id: notificationId,
      type: 'urgent_otp',
      priority: 'critical',
      rideData,
      createdAt: Date.now(),
      timeout: this.urgentTimeout,
      status: 'active',
      retryCount: 0,
      maxRetries: 3
    };

    this.activeNotifications.set(notificationId, notification);
    
    // Start urgent countdown timer
    this.startUrgentTimer(notificationId);
    
    // Store in localStorage for persistence across page reloads
    this.persistNotification(notification);
    
    console.log(`🚨 URGENT: OTP notification created for ride ${rideData.id} - ${this.urgentTimeout/1000}s timeout`);
    
    return notification;
  }

  // Start countdown timer for urgent response
  startUrgentTimer(notificationId) {
    const notification = this.activeNotifications.get(notificationId);
    if (!notification) return;

    const startTime = Date.now();
    
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, notification.timeout - elapsed);
      
      // Update notification with remaining time
      notification.remainingTime = remaining;
      notification.remainingSeconds = Math.ceil(remaining / 1000);
      
      // Trigger callbacks if registered
      if (notification.onTick) {
        notification.onTick(notification);
      }
      
      // Handle timeout
      if (remaining <= 0) {
        clearInterval(timer);
        this.handleNotificationTimeout(notificationId);
      }
    }, 1000);

    notification.timerId = timer;
  }

  // Handle when urgent notification times out
  handleNotificationTimeout(notificationId) {
    const notification = this.activeNotifications.get(notificationId);
    if (!notification) return;

    console.log(`⏰ TIMEOUT: Urgent notification ${notificationId} expired`);
    
    notification.status = 'expired';
    
    if (notification.onTimeout) {
      notification.onTimeout(notification);
    }
    
    // Auto-retry critical notifications
    if (notification.priority === 'critical' && notification.retryCount < notification.maxRetries) {
      setTimeout(() => {
        this.retryNotification(notificationId);
      }, 5000); // Retry after 5 seconds
    } else {
      this.removeNotification(notificationId);
    }
  }

  // Retry expired urgent notification
  retryNotification(notificationId) {
    const notification = this.activeNotifications.get(notificationId);
    if (!notification) return;

    notification.retryCount++;
    notification.status = 'retrying';
    notification.timeout = Math.max(30 * 1000, notification.timeout * 0.8); // Reduce timeout by 20% each retry
    
    console.log(`🔄 RETRY ${notification.retryCount}: Urgent notification ${notificationId}`);
    
    this.startUrgentTimer(notificationId);
    
    if (notification.onRetry) {
      notification.onRetry(notification);
    }
  }

  // Mark notification as responded to
  markAsResponded(notificationId) {
    const notification = this.activeNotifications.get(notificationId);
    if (!notification) return;

    notification.status = 'responded';
    notification.respondedAt = Date.now();
    
    // Clear timer
    if (notification.timerId) {
      clearInterval(notification.timerId);
    }
    
    console.log(`✅ RESPONSE: Urgent notification ${notificationId} answered in ${(notification.respondedAt - notification.createdAt)/1000}s`);
    
    if (notification.onResponse) {
      notification.onResponse(notification);
    }
    
    // Remove after short delay
    setTimeout(() => {
      this.removeNotification(notificationId);
    }, 2000);
  }

  // Remove notification completely
  removeNotification(notificationId) {
    const notification = this.activeNotifications.get(notificationId);
    if (!notification) return;

    if (notification.timerId) {
      clearInterval(notification.timerId);
    }
    
    this.activeNotifications.delete(notificationId);
    this.unpersistNotification(notificationId);
    
    console.log(`🗑️ Removed urgent notification ${notificationId}`);
  }

  // Persist notification to localStorage
  persistNotification(notification) {
    try {
      const persistedNotifications = JSON.parse(localStorage.getItem('urgentNotifications') || '[]');
      persistedNotifications.push({
        id: notification.id,
        type: notification.type,
        rideData: notification.rideData,
        createdAt: notification.createdAt,
        timeout: notification.timeout,
        status: notification.status
      });
      localStorage.setItem('urgentNotifications', JSON.stringify(persistedNotifications.slice(-10))); // Keep last 10
    } catch (error) {
      console.error('Failed to persist urgent notification:', error);
    }
  }

  // Remove notification from localStorage
  unpersistNotification(notificationId) {
    try {
      const persistedNotifications = JSON.parse(localStorage.getItem('urgentNotifications') || '[]');
      const filtered = persistedNotifications.filter(n => n.id !== notificationId);
      localStorage.setItem('urgentNotifications', JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to unpersist urgent notification:', error);
    }
  }

  // Get all active urgent notifications
  getActiveNotifications() {
    return Array.from(this.activeNotifications.values());
  }

  // Get notification by ID
  getNotification(notificationId) {
    return this.activeNotifications.get(notificationId);
  }

  // Check for and restore persisted notifications on app start
  restorePersistedNotifications() {
    try {
      const persistedNotifications = JSON.parse(localStorage.getItem('urgentNotifications') || '[]');
      const now = Date.now();
      
      persistedNotifications.forEach(persisted => {
        const elapsed = now - persisted.createdAt;
        const remaining = persisted.timeout - elapsed;
        
        // Only restore if still within timeout and active
        if (remaining > 0 && persisted.status === 'active') {
          const notification = {
            ...persisted,
            remainingTime: remaining,
            remainingSeconds: Math.ceil(remaining / 1000),
            retryCount: 0
          };
          
          this.activeNotifications.set(persisted.id, notification);
          this.startUrgentTimer(persisted.id);
          
          console.log(`🔄 Restored urgent notification ${persisted.id} with ${Math.ceil(remaining/1000)}s remaining`);
        }
      });
      
      // Clean up expired persisted notifications
      const activeIds = new Set(Array.from(this.activeNotifications.keys()));
      const cleanPersisted = persistedNotifications.filter(p => activeIds.has(p.id));
      localStorage.setItem('urgentNotifications', JSON.stringify(cleanPersisted));
      
    } catch (error) {
      console.error('Failed to restore persisted notifications:', error);
    }
  }

  // Cleanup expired notifications
  cleanup() {
    const now = Date.now();
    const expiredNotifications = [];
    
    for (const [id, notification] of this.activeNotifications.entries()) {
      const age = now - notification.createdAt;
      if (age > 5 * 60 * 1000) { // 5 minutes max age
        expiredNotifications.push(id);
      }
    }
    
    expiredNotifications.forEach(id => this.removeNotification(id));
    
    if (expiredNotifications.length > 0) {
      console.log(`🧹 Cleaned up ${expiredNotifications.length} expired urgent notifications`);
    }
  }
}

// Create singleton instance
const urgentNotificationManager = new UrgentNotificationManager();

// Setup cleanup interval
setInterval(() => {
  urgentNotificationManager.cleanup();
}, 60 * 1000); // Clean every minute

// Restore notifications on page load
urgentNotificationManager.restorePersistedNotifications();

export default urgentNotificationManager;