// Currency conversion utilities for Paisa (INTEGER) storage
// All currency is stored as Paisa (multiply by 100) to avoid floating-point precision issues

/**
 * Convert Rupees to Paisa (for database storage)
 * @param {number} rupees - Amount in Rupees
 * @returns {number} Amount in Paisa (INTEGER)
 */
export function rupeesToPaisa(rupees) {
  return Math.round(parseFloat(rupees) * 100);
}

/**
 * Convert Paisa to Rupees (for display)
 * @param {number} paisa - Amount in Paisa (INTEGER)
 * @returns {number} Amount in Rupees
 */
export function paisaToRupees(paisa) {
  return Math.round(paisa) / 100;
}

/**
 * Format currency for display with commas
 * @param {number} paisa - Amount in Paisa (INTEGER)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(paisa) {
  const rupees = paisaToRupees(paisa);
  return `Rs. ${rupees.toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Calculate total from rate per head and guests (in Paisa)
 * @param {number} ratePerHeadPaisa - Rate in Paisa
 * @param {number} guests - Number of guests
 * @returns {number} Total in Paisa
 */
export function calculatePerHeadTotal(ratePerHeadPaisa, guests) {
  return Math.round(ratePerHeadPaisa * guests);
}
