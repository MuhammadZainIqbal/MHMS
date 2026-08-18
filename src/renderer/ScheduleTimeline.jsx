import React, { useState, useEffect, useRef } from 'react';
import { formatCurrency } from '../utils/currency';
import './ScheduleTimeline.css';

/**
 * ScheduleTimeline Component - "Receptionist-First" Gantt Chart
 * Professional visual timeline with real-time updates
 * 30-minute intervals from 8:00 AM to 2:00 AM next day
 */
function ScheduleTimeline() {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [venues, setVenues] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentTimePosition, setCurrentTimePosition] = useState(0);
  const timeMarkerIntervalRef = useRef(null);

  // Generate time slots (8:00 AM to 2:00 AM next day = 36 slots of 30 minutes)
  const timeSlots = generateTimeSlots();

  useEffect(() => {
    loadVenues();
    
    // Start real-time current time marker (updates every 60 seconds)
    updateCurrentTimeMarker();
    timeMarkerIntervalRef.current = setInterval(updateCurrentTimeMarker, 60000);
    
    return () => {
      if (timeMarkerIntervalRef.current) {
        clearInterval(timeMarkerIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadBookingsForDate();
    }
  }, [selectedDate]);

  function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function updateCurrentTimeMarker() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Convert to timeline minutes (starting from 8 AM = 0)
    let timelineMinutes = hours * 60 + minutes;
    
    // If before 8 AM, it's from previous day - adjust
    if (hours < 8) {
      timelineMinutes += 24 * 60; // Add 24 hours
    }
    
    // Subtract 8 AM offset (8 * 60 = 480 minutes)
    timelineMinutes -= 8 * 60;
    
    // Convert to percentage (timeline is 18 hours = 1080 minutes)
    const percentage = (timelineMinutes / 1080) * 100;
    
    setCurrentTimePosition(percentage);
  }

  function generateTimeSlots() {
    const slots = [];
    const startHour = 8; // 8 AM
    const endHour = 26; // 2 AM next day (26 hours in 24-hour format)

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const displayHour = hour > 23 ? hour - 24 : hour;
        const period = hour < 12 || hour >= 24 ? 'AM' : 'PM';
        const displayHour12 = displayHour === 0 ? 12 : displayHour > 12 ? displayHour - 12 : displayHour;
        const timeString = `${displayHour12}:${minute.toString().padStart(2, '0')} ${period}`;
        
        slots.push({
          hour: hour,
          minute: minute,
          display: timeString,
          value: hour * 60 + minute // minutes from start of timeline
        });
      }
    }

    return slots;
  }

  async function loadVenues() {
    try {
      const result = await window.api.getVenues();
      if (result.success) {
        setVenues(result.venues);
      }
    } catch (error) {
      console.error('Failed to load venues:', error);
      alert('Failed to load venues');
    }
  }

  async function loadBookingsForDate() {
    setLoading(true);
    try {
      const result = await window.api.getBookingsByDate(selectedDate);
      if (result.success) {
        setBookings(result.bookings);
      }
    } catch (error) {
      console.error('Failed to load bookings:', error);
      alert('Failed to load bookings for selected date');
    } finally {
      setLoading(false);
    }
  }

  function getTimePosition(dateTimeString) {
    const dt = new Date(dateTimeString);
    const hours = dt.getHours();
    const minutes = dt.getMinutes();
    
    // Convert to timeline minutes (starting from 8 AM = 0)
    let timelineMinutes = hours * 60 + minutes;
    
    // If before 8 AM, it's from previous day - adjust
    if (hours < 8) {
      timelineMinutes += 24 * 60; // Add 24 hours
    }
    
    // Subtract 8 AM offset (8 * 60 = 480 minutes)
    timelineMinutes -= 8 * 60;
    
    return timelineMinutes;
  }

  function getBookingStyle(booking) {
    const startPos = getTimePosition(booking.start_time);
    const endPos = getTimePosition(booking.end_time);
    const duration = endPos - startPos;
    
    // Each slot is 30 minutes
    const slotWidth = 100 / timeSlots.length; // percentage
    const left = (startPos / 30) * slotWidth;
    const width = (duration / 30) * slotWidth;
    
    return {
      left: `${left}%`,
      width: `${width}%`
    };
  }

  function getBufferStyle(booking) {
    const endPos = getTimePosition(booking.end_time);
    const bufferMins = booking.buffer_mins || 0;
    
    // Each slot is 30 minutes
    const slotWidth = 100 / timeSlots.length;
    const left = (endPos / 30) * slotWidth;
    const width = (bufferMins / 30) * slotWidth;
    
    return {
      left: `${left}%`,
      width: `${width}%`
    };
  }

  function handleBookingClick(booking) {
    setSelectedBooking(booking);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setSelectedBooking(null);
  }

  function goToFinancials(bookingId) {
    closeModal();
    // Switch to Financials tab with pre-selected booking
    if (window.onViewBookingDetails) {
      window.onViewBookingDetails(bookingId);
    }
  }

  function handleTodayClick() {
    setSelectedDate(getTodayDate());
    loadBookingsForDate();
  }

  function handleRefreshClick() {
    // Preserve selected date - just refresh bookings
    loadBookingsForDate();
  }
  return (
    <div className="schedule-timeline">
      {/* Header with Date Selector */}
      <div className="timeline-header">
        <h2>📅 Schedule Timeline</h2>
        <div className="date-controls">
          <button className="btn-today" onClick={handleTodayClick}>
            📍 Today
          </button>
          <label htmlFor="timeline-date">Select Date:</label>
          <input
            id="timeline-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <button className="btn-refresh" onClick={handleRefreshClick} disabled={loading}>
            {loading ? '⏳ Loading...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Clean Header Legend */}
      <div className="timeline-legend">
        <div className="legend-item">
          <div className="legend-box booking-legend"></div>
          <span>Booking</span>
        </div>
        <div className="legend-item">
          <div className="legend-box buffer-legend"></div>
          <span>Cleanup Buffer</span>
        </div>
      </div>

      {/* Main Timeline Grid Container */}
      <div className="timeline-container">
        <div className="timeline-grid">
          {/* Header row with time slots (sticky) */}
          <div className="timeline-row header-row">
            <div className="venue-label-header">VENUE</div>
            <div className="timeline-slots-header">
              {timeSlots.map((slot, index) => (
                <div key={index} className="time-slot-label">
                  {slot.display}
                </div>
              ))}
            </div>
          </div>

          {/* Venue rows with bookings */}
          {venues.length === 0 ? (
            <div className="timeline-empty">
              <p>⚠️ No venues found. Please add venues first in the Venues tab.</p>
            </div>
          ) : (
            venues.map((venue) => (
              <div key={venue.id} className="timeline-row venue-row">
                {/* Sticky venue label */}
                <div className="venue-label-sticky">
                  <strong className="venue-name">{venue.name}</strong>
                  <small className="venue-capacity">Cap: {venue.capacity}</small>
                </div>
                
                {/* Timeline slots with bookings */}
                <div className="timeline-slots-container">
                  {/* Background grid */}
                  <div className="timeline-slots-grid">
                    {timeSlots.map((slot, index) => (
                      <div key={index} className="time-slot-bg"></div>
                    ))}
                  </div>
                  
                  {/* Current time marker (red vertical line) */}
                  {selectedDate === getTodayDate() && currentTimePosition >= 0 && currentTimePosition <= 100 && (
                    <div 
                      className="current-time-marker" 
                      style={{ left: `${currentTimePosition}%` }}
                      title={`Current Time: ${new Date().toLocaleTimeString()}`}
                    ></div>
                  )}
                  
                  {/* Render bookings for this venue */}
                  {bookings
                    .filter(b => b.venue_id === venue.id)
                    .map((booking) => (
                      <React.Fragment key={booking.id}>
                        {/* Main booking block - Deep Blue gradient */}
                        <div
                          className="booking-block-premium"
                          style={getBookingStyle(booking)}
                          onClick={() => handleBookingClick(booking)}
                          title={`Click for details: ${booking.customer_name}`}
                        >
                          <div className="booking-content-premium">
                            <strong className="booking-customer-name">{booking.customer_name}</strong>
                            <span className="booking-event-type">{booking.event_type || booking.service_mode}</span>
                          </div>
                        </div>
                        
                        {/* Buffer block - Grey diagonal stripes (no text) */}
                        {booking.buffer_mins > 0 && (
                          <div
                            className="buffer-block-premium"
                            style={getBufferStyle(booking)}
                            title={`Cleanup Buffer: ${booking.buffer_mins} minutes`}
                          ></div>
                        )}
                      </React.Fragment>
                    ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick-View Modal (Clean, Centered, Premium) */}
      {showModal && selectedBooking && (
        <div className="modal-overlay-premium" onClick={closeModal}>
          <div className="modal-content-premium" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-premium">
              <h3>📋 Booking Details</h3>
              <button className="modal-close-btn" onClick={closeModal}>×</button>
            </div>
            
            <div className="modal-body-premium">
              <div className="modal-detail-row">
                <span className="modal-label">Customer Name:</span>
                <span className="modal-value">{selectedBooking.customer_name}</span>
              </div>
              
              <div className="modal-detail-row">
                <span className="modal-label">Phone:</span>
                <span className="modal-value">{selectedBooking.customer_phone}</span>
              </div>
              
              <div className="modal-detail-row">
                <span className="modal-label">Guaranteed Guests:</span>
                <span className="modal-value">{selectedBooking.guaranteed_guests || 'N/A'}</span>
              </div>
              
              <div className="modal-detail-row">
                <span className="modal-label">Total Remaining Balance:</span>
                <span className={`modal-value ${selectedBooking.balance_due > 0 ? 'balance-due-red' : ''}`}>
                  {selectedBooking.balance_due !== undefined 
                    ? formatCurrency(selectedBooking.balance_due / 100) 
                    : 'Loading...'}
                </span>
              </div>
              
              <div className="modal-detail-row">
                <span className="modal-label">Event Time:</span>
                <span className="modal-value">
                  {new Date(selectedBooking.start_time).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                  {' - '}
                  {new Date(selectedBooking.end_time).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
            
            <div className="modal-actions-premium">
              <button className="btn-go-to-financials" onClick={() => goToFinancials(selectedBooking.id)}>
                💰 Go to Financials
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScheduleTimeline;
