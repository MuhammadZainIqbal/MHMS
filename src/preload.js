// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose secure IPC methods to the renderer process
 * This is the ONLY way the renderer can communicate with the main process
 * Following Electron's security best practices with Context Isolation
 */
contextBridge.exposeInMainWorld('api', {
  /**
   * Check database health status
   * @returns {Promise<boolean>}
   */
  checkDatabaseHealth: () => {
    return ipcRenderer.invoke('check-database-health');
  },

  /**
   * Check if app is in production mode (packaged)
   * Used to hide development features like test key generation
   * 
   * @returns {boolean}
   */
  isProduction: () => {
    return process.env.NODE_ENV === 'production' || !process.defaultApp;
  },

  /**
   * Get the unique machine ID for this computer
   * Used to display the hardware ID to the user for activation
   * 
   * @returns {Promise<string>} - The machine ID
   */
  getMachineId: () => {
    return ipcRenderer.invoke('get-machine-id');
  },

  /**
   * Activate the application with a provided key
   * 
   * @param {string} key - The activation key to validate
   * @returns {Promise<{success: boolean, message: string}>}
   */
  activateApp: (key) => {
    return ipcRenderer.invoke('activate-app', key);
  },

  /**
   * Check if the application is currently activated
   * 
   * @returns {Promise<boolean>} - True if activated, false otherwise
   */
  checkLicenseStatus: () => {
    return ipcRenderer.invoke('check-license-status');
  },

  /**
   * For testing purposes - generate a valid key for current machine
   * In production, this would NOT be exposed - keys generated server-side only
   * 
   * @returns {Promise<string>} - A valid activation key
   */
  generateTestKey: () => {
    return ipcRenderer.invoke('generate-test-key');
  },

  /**
   * Deactivate the app (for testing/development)
   * 
   * @returns {Promise<boolean>}
   */
  deactivateApp: () => {
    return ipcRenderer.invoke('deactivate-app');
  },

  /**
   * Listen for license status changes
   * This allows the UI to react when activation succeeds
   */
  onLicenseStatusChanged: (callback) => {
    ipcRenderer.on('license-status-changed', (event, isActivated) => {
      callback(isActivated);
    });
  },

  // ==================== DATABASE OPERATIONS ====================

  /**
   * Get all venues
   * @param {object} options - {includeInactive: boolean}
   * @returns {Promise<Array>} - List of all venues
   */
  getVenues: (options = {}) => {
    return ipcRenderer.invoke('db:getVenues', options);
  },

  /**
   * Add a new venue
   * @param {object} venue - {name, capacity, ladiesPrivacy}
   * @returns {Promise<{success: boolean, id: number, message: string}>}
   */
  addVenue: (venue) => {
    return ipcRenderer.invoke('db:addVenue', venue);
  },

  /**
   * Update an existing venue
   * @param {object} venue - {id, name, capacity, ladiesPrivacy}
   * @returns {Promise<{success: boolean, message: string}>}
   */
  updateVenue: (venue) => {
    return ipcRenderer.invoke('db:updateVenue', venue);
  },

  /**
   * Delete or deactivate a venue
   * @param {number} id - Venue ID
   * @returns {Promise<{success: boolean, softDelete: boolean, message: string}>}
   */
  deleteVenue: (id) => {
    return ipcRenderer.invoke('db:deleteVenue', { id });
  },

  /**
   * Reactivate a deactivated venue
   * @param {number} id - Venue ID
   * @returns {Promise<{success: boolean, message: string}>}
   */
  reactivateVenue: (id) => {
    return ipcRenderer.invoke('db:reactivateVenue', { id });
  },

  /**
   * Check if a venue is available for given time slot
   * @param {object} params - {venueId, startTime, endTime, bufferMins, excludeBookingId}
   * @returns {Promise<{available: boolean, conflict?: object}>}
   */
  checkAvailability: (params) => {
    return ipcRenderer.invoke('db:checkAvailability', params);
  },

  /**
   * Create a new booking with financial details
   * @param {object} bookingData - Complete booking information
   * @returns {Promise<{success: boolean, bookingId: number, message: string}>}
   */
  createBooking: (bookingData) => {
    return ipcRenderer.invoke('db:createBooking', bookingData);
  },

  /**
   * Get all bookings with optional filters
   * @param {object} filters - {venueId, status, fromDate, toDate}
   * @returns {Promise<Array>} - List of bookings with venue and financial details
   */
  getBookings: (filters) => {
    return ipcRenderer.invoke('db:getBookings', filters);
  },

  /**
   * Update booking notes
   * @param {object} params - {bookingId, notes}
   * @returns {Promise<{success: boolean, message: string}>}
   */
  updateBookingNotes: (params) => {
    return ipcRenderer.invoke('db:updateBookingNotes', params);
  },

  /**
   * Get a single booking with all details (payments, extras)
   * @param {number} bookingId
   * @returns {Promise<object>} - Complete booking details
   */
  getBooking: (bookingId) => {
    return ipcRenderer.invoke('db:getBooking', bookingId);
  },

  /**
   * Add a payment to a booking
   * @param {object} payment - {bookingId, amount, note}
   * @returns {Promise<{success: boolean, id: number, message: string}>}
   */
  addPayment: (payment) => {
    return ipcRenderer.invoke('db:addPayment', payment);
  },

  /**
   * Add an extra item to a booking
   * @param {object} extra - {bookingId, itemName, price}
   * @returns {Promise<{success: boolean, id: number, message: string}>}
   */
  addExtra: (extra) => {
    return ipcRenderer.invoke('db:addExtra', extra);
  },

  /**
   * Delete an extra item
   * @param {number} extraId - ID of the extra to delete
   * @returns {Promise<{success: boolean, message: string}>}
   */
  deleteExtra: (extraId) => {
    return ipcRenderer.invoke('db:deleteExtra', { extraId });
  },

  /**
   * Get bookings for a specific date (for timeline view)
   * @param {string} date - ISO date string
   * @returns {Promise<{success: boolean, bookings: Array}>}
   */
  getBookingsByDate: (date) => {
    return ipcRenderer.invoke('db:getBookingsByDate', { date });
  },

  /**
   * Get monthly schedule data with conflict detection
   * @param {number} year - Year (e.g., 2026)
   * @param {number} month - Month (1-12)
   * @returns {Promise<{success: boolean, data: object}>}
   */
  getMonthlyScheduleData: (year, month) => {
    return ipcRenderer.invoke('db:getMonthlyScheduleData', year, month);
  },

  /**
   * Get today's statistics for dashboard
   * @returns {Promise<{success: boolean, stats: object}>}
   */
  getTodayStats: () => {
    return ipcRenderer.invoke('db:getTodayStats');
  },

  /**
   * Export database backup
   * @returns {Promise<{success: boolean, message: string, path?: string}>}
   */
  exportBackup: () => {
    return ipcRenderer.invoke('db:exportBackup');
  },

  /**
   * Import database backup (restore)
   * @param {boolean} confirmed - User confirmation flag
   * @returns {Promise<{success: boolean, message: string, requiresRestart?: boolean}>}
   */
  importBackup: (confirmed) => {
    return ipcRenderer.invoke('db:importBackup', { confirmed });
  },

  /**
   * Nuclear Reset - WIPE ALL DATA and recreate fresh schema with strict INTEGER types
   * @returns {Promise<{success: boolean, message: string}>}
   */
  nuclearReset: () => {
    return ipcRenderer.invoke('db:nuclearReset');
  },

  /**
   * Force Synchronize Financials - Refresh dashboard by recalculating stats from raw data
   * Clears ghost numbers from previous buggy versions
   * @returns {Promise<{success: boolean, message: string, stats?: object}>}
   */
  forceSyncFinancials: () => {
    return ipcRenderer.invoke('db:forceSyncFinancials');
  }
});

console.log('[PRELOAD] IPC Bridge initialized successfully');

