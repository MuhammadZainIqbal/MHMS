import React, { useState, useEffect } from 'react';
import './DashboardStats.css';

/**
 * DashboardStats Component
 * "At a Glance" widget showing today's key metrics
 */
function DashboardStats() {
  const [stats, setStats] = useState({
    todayBookingsCount: 0,
    todayBayanah: 0,
    todayBalanceDue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTodayStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(loadTodayStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  async function loadTodayStats() {
    try {
      const result = await window.api.getTodayStats();
      if (result.success) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Failed to load today stats:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amountInPaisa) {
    // Division by 100 MUST be the very last step (Paisa → PKR)
    const amountInRupees = amountInPaisa / 100;
    return `Rs. ${amountInRupees.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  if (loading) {
    return (
      <div className="dashboard-stats">
        <h3>📊 At a Glance - Today's Summary</h3>
        <div className="stats-loading">Loading statistics...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-stats">
      <h3>📊 At a Glance - Today's Summary</h3>
      <div className="stats-grid">
        <div className="stat-card events-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.todayBookingsCount}</div>
            <div className="stat-label">Events Today</div>
          </div>
        </div>

        <div className="stat-card bayanah-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-value">{formatCurrency(stats.todayBayanah)}</div>
            <div className="stat-label">Bayanah Collected Today</div>
          </div>
        </div>

        <div className="stat-card balance-card">
          <div className="stat-icon">💳</div>
          <div className="stat-content">
            <div className="stat-value" style={{ color: stats.todayBalanceDue > 0 ? '#e74c3c' : 'inherit' }}>
              {formatCurrency(stats.todayBalanceDue)}
            </div>
            <div className="stat-label">Balance Due Today</div>
          </div>
        </div>
      </div>

      <div className="stats-footer">
        <p>Real-time data from today's bookings • Auto-refreshes every 30 seconds</p>
      </div>
    </div>
  );
}

export default DashboardStats;
