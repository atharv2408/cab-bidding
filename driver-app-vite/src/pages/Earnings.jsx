import React, { useState } from 'react';

const Earnings = ({ appState }) => {
  const { driver, earnings } = appState;
  
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  
  // Mock earnings data
  const earningsData = {
    today: {
      totalEarnings: 142.75,
      totalRides: 8,
      averageRide: 17.84,
      onlineHours: 6.5,
      rides: [
        { id: 1, customer: 'Sarah Johnson', fare: 25.50, time: '09:15 AM', rating: 5 },
        { id: 2, customer: 'Mike Chen', fare: 18.75, time: '10:30 AM', rating: 4 },
        { id: 3, customer: 'Emma Wilson', fare: 32.00, time: '12:45 PM', rating: 5 },
        { id: 4, customer: 'David Lee', fare: 15.25, time: '02:15 PM', rating: 4 },
        { id: 5, customer: 'Lisa Wang', fare: 28.50, time: '03:30 PM', rating: 5 },
        { id: 6, customer: 'John Smith', fare: 12.75, time: '05:00 PM', rating: 4 },
        { id: 7, customer: 'Anna Brown', fare: 22.00, time: '06:20 PM', rating: 5 },
        { id: 8, customer: 'Tom Davis', fare: 19.00, time: '07:45 PM', rating: 4 }
      ]
    },
    week: {
      totalEarnings: 1248.50,
      totalRides: 67,
      averageRide: 18.63,
      onlineHours: 42.5,
      dailyBreakdown: [
        { day: 'Monday', earnings: 165.25, rides: 9 },
        { day: 'Tuesday', earnings: 198.75, rides: 12 },
        { day: 'Wednesday', earnings: 142.00, rides: 8 },
        { day: 'Thursday', earnings: 223.50, rides: 13 },
        { day: 'Friday', earnings: 187.25, rides: 10 },
        { day: 'Saturday', earnings: 189.00, rides: 9 },
        { day: 'Sunday', earnings: 142.75, rides: 8 }
      ]
    },
    month: {
      totalEarnings: 5247.80,
      totalRides: 287,
      averageRide: 18.29,
      onlineHours: 168.5,
      weeklyBreakdown: [
        { week: 'Week 1', earnings: 1342.25, rides: 73 },
        { week: 'Week 2', earnings: 1456.50, rides: 79 },
        { week: 'Week 3', earnings: 1201.55, rides: 68 },
        { week: 'Week 4', earnings: 1247.50, rides: 67 }
      ]
    }
  };

  const currentData = earningsData[selectedPeriod];

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      default: return 'This Week';
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-welcome">
          <h1>💰 Earnings Dashboard</h1>
          <p className="dashboard-subtitle">
            Track your income, analyze performance, and maximize your earnings.
          </p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="period-selector">
        <button 
          className={`period-btn ${selectedPeriod === 'today' ? 'active' : ''}`}
          onClick={() => setSelectedPeriod('today')}
        >
          Today
        </button>
        <button 
          className={`period-btn ${selectedPeriod === 'week' ? 'active' : ''}`}
          onClick={() => setSelectedPeriod('week')}
        >
          This Week
        </button>
        <button 
          className={`period-btn ${selectedPeriod === 'month' ? 'active' : ''}`}
          onClick={() => setSelectedPeriod('month')}
        >
          This Month
        </button>
      </div>

      {/* Earnings Overview */}
      <div className="stats-grid">
        <div className="stat-card earnings-card">
          <div className="stat-header">
            <div className="stat-icon">💰</div>
            <h3 className="stat-title">Total Earnings</h3>
          </div>
          <div className="stat-value">${currentData.totalEarnings.toFixed(2)}</div>
          <p className="stat-subtitle">{getPeriodLabel()}</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon">🚗</div>
            <h3 className="stat-title">Total Rides</h3>
          </div>
          <div className="stat-value">{currentData.totalRides}</div>
          <p className="stat-subtitle">Completed trips</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon">📊</div>
            <h3 className="stat-title">Average per Ride</h3>
          </div>
          <div className="stat-value">${currentData.averageRide.toFixed(2)}</div>
          <p className="stat-subtitle">Per completed trip</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon">⏰</div>
            <h3 className="stat-title">Online Hours</h3>
          </div>
          <div className="stat-value">{currentData.onlineHours}h</div>
          <p className="stat-subtitle">${(currentData.totalEarnings / currentData.onlineHours).toFixed(2)}/hour</p>
        </div>
      </div>

      {/* Breakdown Charts */}
      {selectedPeriod === 'week' && (
        <div className="rides-section">
          <div className="section-header">
            <h2 className="section-title">📈 Weekly Breakdown</h2>
          </div>
          
          <div className="breakdown-chart">
            {currentData.dailyBreakdown.map(day => (
              <div key={day.day} className="chart-item">
                <div className="chart-bar-container">
                  <div 
                    className="chart-bar"
                    style={{ 
                      height: `${(day.earnings / 250) * 100}%`,
                      minHeight: '20px'
                    }}
                  ></div>
                </div>
                <div className="chart-label">
                  <div className="chart-day">{day.day.slice(0, 3)}</div>
                  <div className="chart-earnings">${day.earnings.toFixed(0)}</div>
                  <div className="chart-rides">{day.rides} rides</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedPeriod === 'month' && (
        <div className="rides-section">
          <div className="section-header">
            <h2 className="section-title">📈 Monthly Breakdown</h2>
          </div>
          
          <div className="breakdown-chart">
            {currentData.weeklyBreakdown.map(week => (
              <div key={week.week} className="chart-item">
                <div className="chart-bar-container">
                  <div 
                    className="chart-bar"
                    style={{ 
                      height: `${(week.earnings / 1500) * 100}%`,
                      minHeight: '20px'
                    }}
                  ></div>
                </div>
                <div className="chart-label">
                  <div className="chart-day">{week.week}</div>
                  <div className="chart-earnings">${week.earnings.toFixed(0)}</div>
                  <div className="chart-rides">{week.rides} rides</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Rides Detail */}
      {selectedPeriod === 'today' && (
        <div className="rides-section">
          <div className="section-header">
            <h2 className="section-title">🚗 Today's Rides</h2>
          </div>
          
          <div className="rides-list">
            {currentData.rides.map(ride => (
              <div key={ride.id} className="earnings-ride-card">
                <div className="ride-info">
                  <div className="ride-customer">
                    <div className="customer-avatar">
                      {ride.customer.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="customer-details">
                      <h4>{ride.customer}</h4>
                      <p>{ride.time}</p>
                    </div>
                  </div>
                  
                  <div className="ride-rating">
                    <div className="stars">
                      {'⭐'.repeat(ride.rating)}
                    </div>
                  </div>
                  
                  <div className="ride-fare">
                    <h4>${ride.fare.toFixed(2)}</h4>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Methods */}
      <div className="rides-section">
        <div className="section-header">
          <h2 className="section-title">💳 Payment Summary</h2>
        </div>
        
        <div className="payment-summary">
          <div className="payment-card">
            <div className="payment-icon">💳</div>
            <div className="payment-info">
              <h4>Digital Payments</h4>
              <p>${(currentData.totalEarnings * 0.85).toFixed(2)} (85%)</p>
            </div>
          </div>
          
          <div className="payment-card">
            <div className="payment-icon">💵</div>
            <div className="payment-info">
              <h4>Cash Payments</h4>
              <p>${(currentData.totalEarnings * 0.15).toFixed(2)} (15%)</p>
            </div>
          </div>
          
          <div className="payment-card">
            <div className="payment-icon">🎯</div>
            <div className="payment-info">
              <h4>Tips Received</h4>
              <p>${(currentData.totalEarnings * 0.08).toFixed(2)} (8%)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Earnings Goals */}
      <div className="rides-section">
        <div className="section-header">
          <h2 className="section-title">🎯 Weekly Goals</h2>
        </div>
        
        <div className="goals-grid">
          <div className="goal-card">
            <div className="goal-header">
              <span className="goal-icon">💰</span>
              <h4>Earnings Goal</h4>
            </div>
            <div className="goal-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${(earningsData.week.totalEarnings / 1500) * 100}%` }}
                ></div>
              </div>
              <div className="progress-text">
                ${earningsData.week.totalEarnings.toFixed(2)} / $1,500
              </div>
            </div>
          </div>
          
          <div className="goal-card">
            <div className="goal-header">
              <span className="goal-icon">🚗</span>
              <h4>Rides Goal</h4>
            </div>
            <div className="goal-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${(earningsData.week.totalRides / 75) * 100}%` }}
                ></div>
              </div>
              <div className="progress-text">
                {earningsData.week.totalRides} / 75 rides
              </div>
            </div>
          </div>
          
          <div className="goal-card">
            <div className="goal-header">
              <span className="goal-icon">⏰</span>
              <h4>Hours Goal</h4>
            </div>
            <div className="goal-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${(earningsData.week.onlineHours / 50) * 100}%` }}
                ></div>
              </div>
              <div className="progress-text">
                {earningsData.week.onlineHours}h / 50h
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Earnings;
