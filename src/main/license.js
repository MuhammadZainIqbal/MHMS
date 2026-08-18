const { machineIdSync } = require('node-machine-id');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * Get the unique hardware ID of this machine
 * This ID is permanent and consistent across app restarts
 */
function getMachineId() {
  try {
    const machineId = machineIdSync({ original: true });
    console.log('[LICENSE] Machine ID generated:', machineId);
    return machineId;
  } catch (error) {
    console.error('[LICENSE] Failed to get machine ID:', error);
    throw new Error('Unable to retrieve machine ID');
  }
}

/**
 * Generate the activation key file path in userData directory
 */
function getActivationKeyPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'activation.key');
}

/**
 * Validate the activation key against the machine ID
 * Uses SHA-256 hash comparison for security
 * 
 * @param {string} machineId - The unique machine identifier
 * @param {string} activationKey - The key provided by the user
 * @returns {boolean} - True if valid, false otherwise
 */
function validateKey(machineId, activationKey) {
  try {
    // Generate expected hash from machine ID
    const expectedHash = crypto
      .createHash('sha256')
      .update(machineId)
      .digest('hex');

    // Compare with provided key (case-insensitive)
    const isValid = expectedHash.toLowerCase() === activationKey.toLowerCase().trim();
    
    console.log('[LICENSE] Key validation:', isValid ? 'SUCCESS' : 'FAILED');
    return isValid;
  } catch (error) {
    console.error('[LICENSE] Key validation error:', error);
    return false;
  }
}

/**
 * Generate a valid activation key for the current machine
 * (For testing/demo purposes - in production, this would be done server-side)
 */
function generateActivationKey(machineId) {
  return crypto
    .createHash('sha256')
    .update(machineId)
    .digest('hex');
}

/**
 * Save the activation key to disk
 * 
 * @param {string} activationKey - The validated activation key
 */
function saveActivationKey(activationKey) {
  try {
    const keyPath = getActivationKeyPath();
    const userDataPath = app.getPath('userData');

    // Ensure directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    // Write the key to file
    fs.writeFileSync(keyPath, activationKey.trim(), 'utf8');
    console.log('[LICENSE] Activation key saved to:', keyPath);
    return true;
  } catch (error) {
    console.error('[LICENSE] Failed to save activation key:', error);
    return false;
  }
}

/**
 * Load the saved activation key from disk
 * 
 * @returns {string|null} - The saved key or null if not found
 */
function loadActivationKey() {
  try {
    const keyPath = getActivationKeyPath();
    
    if (fs.existsSync(keyPath)) {
      const key = fs.readFileSync(keyPath, 'utf8').trim();
      console.log('[LICENSE] Activation key loaded from disk');
      return key;
    }
    
    console.log('[LICENSE] No activation key found');
    return null;
  } catch (error) {
    console.error('[LICENSE] Failed to load activation key:', error);
    return null;
  }
}

/**
 * Check if the application is activated
 * Validates both the existence of the key and its validity
 * 
 * @returns {boolean} - True if activated and valid, false otherwise
 */
function checkLicenseStatus() {
  try {
    const machineId = getMachineId();
    const savedKey = loadActivationKey();

    if (!savedKey) {
      console.log('[LICENSE] License check: NO KEY FOUND');
      return false;
    }

    const isValid = validateKey(machineId, savedKey);
    console.log('[LICENSE] License check:', isValid ? 'ACTIVE' : 'INVALID');
    
    return isValid;
  } catch (error) {
    console.error('[LICENSE] License check failed:', error);
    return false;
  }
}

/**
 * Activate the application with a provided key
 * 
 * @param {string} activationKey - The activation key to validate and save
 * @returns {object} - Result object with success status and message
 */
function activateApp(activationKey) {
  try {
    const machineId = getMachineId();
    
    // Validate the key
    if (!validateKey(machineId, activationKey)) {
      return {
        success: false,
        message: 'Invalid activation key for this machine'
      };
    }

    // Save the key
    const saved = saveActivationKey(activationKey);
    
    if (!saved) {
      return {
        success: false,
        message: 'Failed to save activation key'
      };
    }

    console.log('[LICENSE] Application activated successfully');
    return {
      success: true,
      message: 'Application activated successfully'
    };
  } catch (error) {
    console.error('[LICENSE] Activation failed:', error);
    return {
      success: false,
      message: 'Activation failed: ' + error.message
    };
  }
}

/**
 * Deactivate the application (remove license key)
 * Useful for testing or license transfer
 */
function deactivateApp() {
  try {
    const keyPath = getActivationKeyPath();
    
    if (fs.existsSync(keyPath)) {
      fs.unlinkSync(keyPath);
      console.log('[LICENSE] Application deactivated');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[LICENSE] Deactivation failed:', error);
    return false;
  }
}

module.exports = {
  getMachineId,
  validateKey,
  generateActivationKey,
  saveActivationKey,
  loadActivationKey,
  checkLicenseStatus,
  activateApp,
  deactivateApp
};
