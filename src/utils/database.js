// Firebase Firestore database utility
// Replaces localStorage with cloud-based Firebase Firestore database

import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

class FirebaseDatabase {
  constructor() {
    this.bookingsCollection = 'bookings';
    this.driversCollection = 'drivers';
    this.usersCollection = 'users';
    this.initializeData();
  }

  // Initialize with sample data if empty
  async initializeData() {
    try {
      const driversSnapshot = await getDocs(collection(db, this.driversCollection));
      
      if (driversSnapshot.empty) {
        const sampleDrivers = [
          {
            id: 1,
            name: 'Rajesh Kumar',
            phone: '+91 98765 43210',
            rating: 4.5,
            experience: '5 years',
            avatar: '🧔',
            car: {
              model: 'Maruti Swift',
              color: 'White',
              plate: 'DL 01 AB 1234',
              type: 'Hatchback'
            },
            location: { lat: 28.6139, lng: 77.2090 },
            status: 'available',
            totalRides: 1247,
            reviews: 892
          },
          {
            id: 2,
            name: 'Priya Singh',
            phone: '+91 87654 32109',
            rating: 4.7,
            experience: '3 years',
            avatar: '👩',
            car: {
              model: 'Honda City',
              color: 'Silver',
              plate: 'DL 02 CD 5678',
              type: 'Sedan'
            },
            location: { lat: 28.6219, lng: 77.2085 },
            status: 'available',
            totalRides: 876,
            reviews: 654
          },
          {
            id: 3,
            name: 'Amit Sharma',
            phone: '+91 76543 21098',
            rating: 4.2,
            experience: '7 years',
            avatar: '👨',
            car: {
              model: 'Hyundai Creta',
              color: 'Blue',
              plate: 'DL 03 EF 9012',
              type: 'SUV'
            },
            location: { lat: 28.6129, lng: 77.2295 },
            status: 'available',
            totalRides: 2156,
            reviews: 1432
          },
          {
            id: 4,
            name: 'Neha Patel',
            phone: '+91 65432 10987',
            rating: 4.8,
            experience: '4 years',
            avatar: '👩‍💼',
            car: {
              model: 'Toyota Innova',
              color: 'Gray',
              plate: 'DL 04 GH 3456',
              type: 'MUV'
            },
            location: { lat: 28.6289, lng: 77.2065 },
            status: 'available',
            totalRides: 1543,
            reviews: 1098
          },
          {
            id: 5,
            name: 'Vikash Yadav',
            phone: '+91 54321 09876',
            rating: 4.3,
            experience: '6 years',
            avatar: '🧑',
            car: {
              model: 'Maruti Dzire',
              color: 'Red',
              plate: 'DL 05 IJ 7890',
              type: 'Sedan'
            },
            location: { lat: 28.6199, lng: 77.2175 },
            status: 'available',
            totalRides: 1789,
            reviews: 1234
          }
        ];

        // Use batch write to add all sample drivers
        const batch = writeBatch(db);
        sampleDrivers.forEach((driver) => {
          const docRef = doc(collection(db, this.driversCollection));
          batch.set(docRef, { ...driver, docId: docRef.id, createdAt: serverTimestamp() });
        });
        
        await batch.commit();
        console.log('Sample drivers initialized in Firebase');
      }
    } catch (error) {
      console.error('Error initializing sample data:', error);
    }
  }

  // Booking operations
  async saveBooking(booking) {
    try {
      const newBooking = {
        ...booking,
        timestamp: serverTimestamp(),
        status: 'confirmed',
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, this.bookingsCollection), newBooking);
      
      return {
        ...newBooking,
        id: docRef.id,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error saving booking:', error);
      throw error;
    }
  }

  async getBookings(userId = null) {
    try {
      let q;
      if (userId) {
        q = query(
          collection(db, this.bookingsCollection), 
          where('userId', '==', userId)
        );
      } else {
        q = collection(db, this.bookingsCollection);
      }
      
      const querySnapshot = await getDocs(q);
      const bookings = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        bookings.push({
          ...data,
          id: doc.id,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp
        });
      });
      
      return bookings;
    } catch (error) {
      console.error('Error getting bookings:', error);
      return [];
    }
  }

  async getBookingById(id) {
    try {
      const docRef = doc(db, this.bookingsCollection, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          id: docSnap.id,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting booking by ID:', error);
      return null;
    }
  }

  async updateBookingStatus(id, status) {
    try {
      const docRef = doc(db, this.bookingsCollection, id);
      await updateDoc(docRef, {
        status: status,
        updatedAt: serverTimestamp()
      });
      
      // Return updated booking
      return await this.getBookingById(id);
    } catch (error) {
      console.error('Error updating booking status:', error);
      return null;
    }
  }

  // Driver operations
  async getDrivers() {
    try {
      const querySnapshot = await getDocs(collection(db, this.driversCollection));
      const drivers = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        drivers.push({
          ...data,
          docId: doc.id
        });
      });
      
      return drivers;
    } catch (error) {
      console.error('Error getting drivers:', error);
      return [];
    }
  }

  async getDriverById(id) {
    try {
      const drivers = await this.getDrivers();
      return drivers.find(driver => driver.id === parseInt(id) || driver.docId === id);
    } catch (error) {
      console.error('Error getting driver by ID:', error);
      return null;
    }
  }

  async updateDriverStatus(id, status) {
    try {
      // First find the driver document
      const drivers = await this.getDrivers();
      const driver = drivers.find(d => d.id === parseInt(id) || d.docId === id);
      
      if (driver && driver.docId) {
        const docRef = doc(db, this.driversCollection, driver.docId);
        await updateDoc(docRef, {
          status: status,
          updatedAt: serverTimestamp()
        });
        
        return await this.getDriverById(id);
      }
      return null;
    } catch (error) {
      console.error('Error updating driver status:', error);
      return null;
    }
  }

  // User operations
  async getUserBookingHistory(userId) {
    try {
      const q = query(
        collection(db, this.bookingsCollection),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const bookings = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        bookings.push({
          ...data,
          id: doc.id,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp
        });
      });
      
      return bookings;
    } catch (error) {
      console.error('Error getting user booking history:', error);
      return [];
    }
  }

  // Analytics
  async getBookingStats(userId) {
    try {
      const userBookings = await this.getBookings(userId);
      
      return {
        totalBookings: userBookings.length,
        completedRides: userBookings.filter(b => b.status === 'completed').length,
        cancelledRides: userBookings.filter(b => b.status === 'cancelled').length,
        totalSpent: userBookings.reduce((sum, b) => sum + (b.price || 0), 0),
        averageRating: userBookings.reduce((sum, b) => sum + (b.userRating || 5), 0) / userBookings.length || 5
      };
    } catch (error) {
      console.error('Error getting booking stats:', error);
      return {
        totalBookings: 0,
        completedRides: 0,
        cancelledRides: 0,
        totalSpent: 0,
        averageRating: 5
      };
    }
  }
}

export const database = new FirebaseDatabase();
