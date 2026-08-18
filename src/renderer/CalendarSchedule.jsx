import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './CalendarSchedule.css';

/**
 * CalendarSchedule Component - Professional Calendar-First Interface
 * Google Calendar-style monthly view with daily detail drill-down
 */
function CalendarSchedule() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [venues, setVenues] = useState([]);
  const [monthlyData, setMonthlyData] = useState({});
  const [dailyBookings, setDailyBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadVenues();
  }, []);

  useEffect(() => {
    loadMonthlyData(currentMonth);
  }, [currentMonth]);

  useEffect(() => {
    loadDailyDetails(selectedDate);
  }, [selectedDate, venues]);

  function getTodayDate() {
    return new Date();
  }

  function formatDateKey(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async function loadVenues() {
    try {
      const result = await window.api.getVenues();
      if (result.success) {
        setVenues(result.venues);
      }
    } catch (error) {
      console.error('Failed to load venues:', error);
    }
  }

  async function loadMonthlyData(month) {
    try {
      setLoading(true);
      const year = month.getFullYear();
      const monthNum = month.getMonth() + 1;
      
      const result = await window.api.getMonthlyScheduleData(year, monthNum);
      if (result.success) {
        setMonthlyData(result.data);
      }
    } catch (error) {
      console.error('Failed to load monthly data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadDailyDetails(date) {
    try {
      const dateKey = formatDateKey(date);
      const result = await window.api.getBookingsByDate(dateKey);
      if (result.success) {
        setDailyBookings(result.bookings);
      }
    } catch (error) {
      console.error('Failed to load daily bookings:', error);
    }
  }

  function handleDateClick(date) {
    setSelectedDate(date);
  }

  function handleTodayClick() {
    const today = getTodayDate();
    setSelectedDate(today);
    setCurrentMonth(today);
  }

  function handleActiveStartDateChange({ activeStartDate }) {
    setCurrentMonth(activeStartDate);
  }

  function getTileContent({ date, view }) {
    if (view !== 'month') return null;

    const dateKey = formatDateKey(date);
    const dayData = monthlyData[dateKey];

    if (!dayData) return null;

    // Activity Indicators
    if (dayData.hasConflict) {
      return <div className="activity-indicator conflict">⚠️</div>;
    } else if (dayData.bookingCount > 0) {
      return <div className="activity-indicator booked">●</div>;
    } else if (dayData.allHallsFree) {
      return <div className="activity-indicator available">✓</div>;
    }

    return null;
  }

  function getTileClassName({ date, view }) {
    if (view !== 'month') return '';

    const dateKey = formatDateKey(date);
    const dayData = monthlyData[dateKey];

    if (!dayData) return '';

    if (dayData.hasConflict) return 'has-conflict';
    if (dayData.bookingCount > 0) return 'has-bookings';
    if (dayData.allHallsFree) return 'all-free';

    return '';
  }

  function getBookingsForVenue(venueId) {
    return dailyBookings.filter(b => b.venue_id === venueId);
  }

  function getTimePosition(dateTimeString) {
    const dt = new Date(dateTimeString);
    const hours = dt.getHours();
    const minutes = dt.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    
    // Timeline from 8 AM (480 min) to 2 AM next day (1560 min) = 1080 min span
    const startMinutes = 8 * 60; // 8 AM
    const spanMinutes = 18 * 60; // 18 hours
    
    let adjustedMinutes = totalMinutes;
    if (totalMinutes < startMinutes) {
      adjustedMinutes += 24 * 60; // Add 24 hours for times after midnight
    }
    
    const position = ((adjustedMinutes - startMinutes) / spanMinutes) * 100;
    return Math.max(0, Math.min(100, position));
  }

  function getBookingWidth(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = (end - start) / (1000 * 60); // minutes
    
    const spanMinutes = 18 * 60; // 18 hours
    const width = (duration / spanMinutes) * 100;
    return Math.min(width, 100);
  }

  function getBufferPosition(endTime) {
    return getTimePosition(endTime);
  }

  function getBufferWidth(bufferMins) {
    const spanMinutes = 18 * 60;
    return (bufferMins / spanMinutes) * 100;
  }

  return (
    <div className="calendar-schedule">
      {/* Header */}
      <div className="calendar-header">
        <h2>📅 Calendar Schedule</h2>
        <button className="btn-today" onClick={handleTodayClick}>
          📍 Today
        </button>
      </div>

      {/* Monthly Calendar View */}
      <div className="calendar-container">
        <Calendar
          value={selectedDate}
          onClickDay={handleDateClick}
          onActiveStartDateChange={handleActiveStartDateChange}
          tileContent={getTileContent}
          tileClassName={getTileClassName}
          locale="en-PK"
          formatShortWeekday={(locale, date) => 
            ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()]
          }
        />
      </div>

      {/* Legend */}
      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-indicator conflict">⚠️</span>
          <span>Conflict (Buffer Overlap)</span>
        </div>
        <div className="legend-item">
          <span className="legend-indicator booked">●</span>
          <span>Booked</span>
        </div>
        <div className="legend-item">
          <span className="legend-indicator available">✓</span>
          <span>All Halls Available</span>
        </div>
      </div>

      {/* Daily Detail View */}
      <div className="daily-detail-container">
        <h3>
          📋 Daily Details - {selectedDate.toLocaleDateString('en-PK', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </h3>

        {venues.length === 0 ? (
          <div className="no-venues-message">
            ⚠️ No venues found. Please add venues first in the Venues tab.
          </div>
        ) : (
          <div className="venues-list">
            {venues.map((venue) => {
              const venueBookings = getBookingsForVenue(venue.id);
              
              return (
                <div key={venue.id} className="venue-detail-card">
                  <div className="venue-header">
                    <div className="venue-info">
                      <h4>{venue.name}</h4>
                      <span className="venue-capacity">Capacity: {venue.capacity}</span>
                    </div>
                    <div className="venue-status">
                      {venueBookings.length === 0 ? (
                        <span className="status-badge available">[AVAILABLE]</span>
                      ) : (
                        <span className="status-badge booked">[BOOKED]</span>
                      )}
                    </div>
                  </div>

                  {venueBookings.length > 0 ? (
                    <div className="bookings-timeline">
                      {/* Timeline ruler */}
                      <div className="timeline-ruler">
                        <span>8 AM</span>
                        <span>12 PM</span>
                        <span>4 PM</span>
                        <span>8 PM</span>
                        <span>12 AM</span>
                        <span>2 AM</span>
                      </div>

                      {/* Booking blocks */}
                      {venueBookings.map((booking) => {
                        const startPos = getTimePosition(booking.start_time);
                        const width = getBookingWidth(booking.start_time, booking.end_time);
                        const bufferPos = getBufferPosition(booking.end_time);
                        const bufferWidth = getBufferWidth(booking.buffer_mins || 0);

                        return (
                          <div key={booking.id} className="booking-timeline-row">
                            {/* Event block (solid) */}
                            <div
                              className="event-block"
                              style={{
                                left: `${startPos}%`,
                                width: `${width}%`
                              }}
                              title={`${booking.customer_name} - ${booking.customer_phone}`}
                            >
                              <div className="event-content">
                                <strong>{booking.customer_name}</strong>
                                <span>{booking.customer_phone}</span>
                                <span className="event-time">
                                  {new Date(booking.start_time).toLocaleTimeString('en-PK', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })} - {new Date(booking.end_time).toLocaleTimeString('en-PK', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </span>
                              </div>
                            </div>

                            {/* Buffer block (striped) */}
                            {booking.buffer_mins > 0 && (
                              <div
                                className="buffer-block"
                                style={{
                                  left: `${bufferPos}%`,
                                  width: `${bufferWidth}%`
                                }}
                                title={`Cleanup Buffer: ${booking.buffer_mins} minutes`}
                              >
                                <span className="buffer-label">{booking.buffer_mins}m</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="no-bookings-message">
                      ✓ This venue is completely available for the selected date.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default CalendarSchedule;
