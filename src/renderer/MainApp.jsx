import React, { useState } from 'react';
import VenueManager from './VenueManager';
import BookingForm from './BookingForm';
import FinancialTab from './FinancialTab';
import CalendarSchedule from './CalendarSchedule';
import DashboardStats from './DashboardStats';
import SettingsTab from './SettingsTab';
import './MainApp.css';

/**
 * MainApp Component
 * The main application view shown after successful activation
 */
function MainApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedBookingId, setSelectedBookingId] = useState(null);

  const handleDeactivate = async () => {
    if (confirm('Are you sure you want to deactivate this application? This is for testing only.')) {
      const result = await window.api.deactivateApp();
      if (result) {
        window.location.reload();
      }
    }
  };

  const handleBookingCreated = (bookingId) => {
    // Switch to financials tab after booking is created
    setActiveTab('financials');
  };

  const handleViewBookingDetails = (bookingId) => {
    setSelectedBookingId(bookingId);
    setActiveTab('financials');
  };

  // Make this available globally for ScheduleTimeline
  React.useEffect(() => {
    window.onViewBookingDetails = handleViewBookingDetails;
    return () => {
      delete window.onViewBookingDetails;
    };
  }, []);

  return (
    <div className="main-app">
      <header className="app-header">
        <div className="header-content">
          <h1>🏛️ MHMS</h1>
          <p>Marriage Hall Management System</p>
        </div>
        <div className="header-actions">
          <button onClick={handleDeactivate} className="btn-deactivate">
            🔓 Deactivate (Test)
          </button>
        </div>
      </header>

      <nav className="app-nav">
        <button 
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button 
          className={`nav-item ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          🗓️ Schedule
        </button>
        <button 
          className={`nav-item ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          📅 Bookings
        </button>
        <button 
          className={`nav-item ${activeTab === 'venues' ? 'active' : ''}`}
          onClick={() => setActiveTab('venues')}
        >
          🏢 Venues
        </button>
        <button 
          className={`nav-item ${activeTab === 'financials' ? 'active' : ''}`}
          onClick={() => setActiveTab('financials')}
        >
          💰 Financials
        </button>
        <button 
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
      </nav>

      <main className="app-main">
        <div className="content-container">
          {activeTab === 'dashboard' && (
            <div className="tab-content">
              <h2>Welcome to MHMS</h2>
              
              {/* Today's Stats Widget */}
              <DashboardStats />

              <div className="success-box">
                <p>✅ <strong>Application Successfully Activated!</strong></p>
                <p>Your Marriage Hall Management System is ready to use.</p>
              </div>

              <div className="feature-grid">
                <div className="feature-card">
                  <h3>🗄️ SQLite Database</h3>
                  <p>All data stored locally in your AppData folder with WAL mode enabled for optimal performance.</p>
                </div>
                <div className="feature-card">
                  <h3>🔒 Hardware Locked</h3>
                  <p>License tied to this specific machine using hardware ID validation.</p>
                </div>
                <div className="feature-card">
                  <h3>⚡ Offline First</h3>
                  <p>Works completely offline - no internet required after activation.</p>
                </div>
                <div className="feature-card">
                  <h3>🔐 Secure IPC</h3>
                  <p>Context isolation enabled with secure IPC bridge between main and renderer processes.</p>
                </div>
              </div>

              <div className="info-box">
                <h3>Database Schema Ready</h3>
                <ul>
                  <li>✓ Venues table (id, name, capacity)</li>
                  <li>✓ Bookings table (venue, customer, timing, service mode, status)</li>
                  <li>✓ Financials table (guests, rates, rent)</li>
                  <li>✓ Payments log (amount, date, notes)</li>
                  <li>✓ Extras table (additional items/services)</li>
                </ul>
              </div>

              <div className="next-steps">
                <h3>🚀 Quick Start</h3>
                <p>Get started with your bookings:</p>
                <ol>
                  <li>Go to <strong>Venues</strong> tab to add your halls/marquees</li>
                  <li>View the <strong>Schedule</strong> timeline to see all bookings</li>
                  <li>Use <strong>Bookings</strong> tab to create new bookings</li>
                  <li>Manage payments and extras in <strong>Financials</strong> tab</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="tab-content">
              <CalendarSchedule />
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="tab-content">
              <BookingForm onBookingCreated={handleBookingCreated} />
            </div>
          )}

          {activeTab === 'venues' && (
            <div className="tab-content">
              <VenueManager />
            </div>
          )}

          {activeTab === 'financials' && (
            <div className="tab-content">
              <FinancialTab initialBookingId={selectedBookingId} />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="tab-content">
              <SettingsTab />
            </div>
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p>© 2026 MHMS - Marriage Hall Management System. Licensed and Activated.</p>
      </footer>
    </div>
  );
}

export default MainApp;
