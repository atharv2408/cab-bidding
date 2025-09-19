/**
 * OTP Manager - Pre-generate and manage OTPs for faster ride acceptance
 */

class OTPManager {
  constructor() {
    this.otpQueue = [];
    this.activeOTPs = new Map();
    this.preGenerateOTPs();
  }

  // Pre-generate a queue of OTPs for instant use
  preGenerateOTPs(count = 10) {
    console.log('🔐 Pre-generating OTPs for faster ride acceptance...');
    
    for (let i = 0; i < count; i++) {
      const otp = this.generateSecureOTP();
      this.otpQueue.push({
        otp,
        generated: Date.now(),
        used: false
      });
    }
    
    console.log(`✅ Pre-generated ${count} OTPs`);
  }

  // Generate a secure 4 or 6 digit OTP
  generateSecureOTP(digits = 4) {
    if (digits === 4) {
      return ('0000' + Math.floor(Math.random() * 10000)).slice(-4);
    } else {
      return Math.floor(100000 + Math.random() * 900000).toString();
    }
  }

  // Get an instant OTP (from pre-generated queue)
  getInstantOTP(bookingId, driverId) {
    // Get an unused OTP from queue
    let otpData = this.otpQueue.find(item => !item.used);
    
    if (!otpData) {
      console.log('⚠️ OTP queue empty, generating fresh OTP');
      otpData = {
        otp: this.generateSecureOTP(),
        generated: Date.now(),
        used: false
      };
      this.otpQueue.push(otpData);
    }

    // Mark as used
    otpData.used = true;
    otpData.bookingId = bookingId;
    otpData.driverId = driverId;
    otpData.assigned = Date.now();

    // Store in active OTPs
    this.activeOTPs.set(bookingId, otpData);

    // Refill queue if running low
    if (this.otpQueue.filter(item => !item.used).length < 3) {
      this.preGenerateOTPs(10);
    }

    console.log(`🚀 Instant OTP assigned: ${otpData.otp} for booking ${bookingId}`);
    return otpData.otp;
  }

  // Verify OTP
  verifyOTP(bookingId, inputOTP) {
    const otpData = this.activeOTPs.get(bookingId);
    
    if (!otpData) {
      console.log(`❌ No OTP found for booking ${bookingId}`);
      return false;
    }

    // Normalize both OTPs for comparison
    const normalizedInput = String(inputOTP).trim();
    const normalizedStored = String(otpData.otp).trim();

    const isValid = normalizedInput === normalizedStored;
    
    if (isValid) {
      console.log(`✅ OTP verified successfully for booking ${bookingId}`);
      // Mark as verified
      otpData.verified = Date.now();
    } else {
      console.log(`❌ OTP mismatch for booking ${bookingId}: ${normalizedInput} vs ${normalizedStored}`);
    }

    return isValid;
  }

  // Get OTP for a booking
  getOTPForBooking(bookingId) {
    const otpData = this.activeOTPs.get(bookingId);
    return otpData ? otpData.otp : null;
  }

  // Clear OTP after ride completion
  clearOTP(bookingId) {
    const otpData = this.activeOTPs.get(bookingId);
    if (otpData) {
      this.activeOTPs.delete(bookingId);
      console.log(`🗑️ OTP cleared for booking ${bookingId}`);
    }
  }

  // Get statistics
  getStats() {
    const totalGenerated = this.otpQueue.length;
    const available = this.otpQueue.filter(item => !item.used).length;
    const activeCount = this.activeOTPs.size;

    return {
      totalGenerated,
      available,
      activeCount,
      used: totalGenerated - available
    };
  }

  // Cleanup old OTPs
  cleanup() {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes (reduced from 30 for urgency)

    // Remove old active OTPs
    for (const [bookingId, otpData] of this.activeOTPs.entries()) {
      if (now - otpData.assigned > maxAge) {
        this.activeOTPs.delete(bookingId);
        console.log(`🧹 Cleaned up expired OTP for booking ${bookingId}`);
      }
    }

    // Clean old queue items
    this.otpQueue = this.otpQueue.filter(item => 
      !item.used || (now - item.generated < maxAge)
    );

    // Refill if needed
    if (this.otpQueue.filter(item => !item.used).length < 5) {
      this.preGenerateOTPs(10);
    }
  }
}

// Create singleton instance
const otpManager = new OTPManager();

// Setup cleanup interval
setInterval(() => {
  otpManager.cleanup();
}, 2 * 60 * 1000); // Clean every 2 minutes (reduced from 5 for faster cleanup)

export default otpManager;
