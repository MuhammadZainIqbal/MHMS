import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import started from 'electron-squirrel-startup';
import { createRequire } from 'node:module';
import crypto from 'crypto';
import fs from 'fs';

// Use require for native modules to avoid Vite bundling issues
const require = createRequire(import.meta.url);

// ===== MANUAL NATIVE MODULE BRIDGE =====
// Hard-coded path resolution for better-sqlite3 to bypass ASAR/Vite conflicts
let Database;
try {
  if (app.isPackaged) {
    // Production: Load from physical node_modules in resources/app
    const nativePath = path.join(
      process.resourcesPath,
      'app',
      'node_modules',
      'better-sqlite3',
      'build',
      'Release',
      'better_sqlite3.node'
    );
    
    console.log('[NATIVE-BRIDGE] Production mode detected');
    console.log('[NATIVE-BRIDGE] Attempting to load from:', nativePath);
    console.log('[NATIVE-BRIDGE] process.resourcesPath:', process.resourcesPath);
    
    // Check if binary exists
    if (!fs.existsSync(nativePath)) {
      const errorMsg = `Native module not found at expected path:\n${nativePath}\n\nFull resources path: ${process.resourcesPath}`;
      console.error('[NATIVE-BRIDGE] CRITICAL:', errorMsg);
      dialog.showErrorBox('Critical System Error', errorMsg);
      app.quit();
    }
    
    // Load the entire better-sqlite3 module (not just the .node file)
    const modulePath = path.join(process.resourcesPath, 'app', 'node_modules', 'better-sqlite3');
    console.log('[NATIVE-BRIDGE] Loading module from:', modulePath);
    Database = require(modulePath);
    console.log('[NATIVE-BRIDGE] ✓ better-sqlite3 loaded successfully');
    
  } else {
    // Development: Standard require
    console.log('[NATIVE-BRIDGE] Development mode - using standard require');
    Database = require('better-sqlite3');
  }
} catch (error) {
  console.error('[NATIVE-BRIDGE] FATAL ERROR:', error);
  console.error('[NATIVE-BRIDGE] Error stack:', error.stack);
  
  const errorDetails = `
Database Engine (SQLite) failed to start.

Error: ${error.message}

Technical Details:
- Process Resources Path: ${process.resourcesPath}
- App Packaged: ${app.isPackaged}
- Platform: ${process.platform}
- Arch: ${process.arch}

Please try:
1. Running the app as Administrator
2. Reinstalling the application
3. Contacting support with the error details above
  `.trim();
  
  dialog.showErrorBox('Critical System Error', errorDetails);
  app.quit();
}

const { machineIdSync } = require('node-machine-id');

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// ==================== DATABASE MODULE (INLINE) ====================
let db = null;
let dbHealthy = true;

function initDatabase() {
  try {
    const userDataPath = app.getPath('userData');
    
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    const dbPath = path.join(userDataPath, 'mhms.db');
    console.log('[DATABASE] Initializing database at:', dbPath);

    db = new Database(dbPath, { verbose: console.log });
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    createTables();
    
    // Verify database integrity
    const result = db.pragma('integrity_check');
    if (result[0]?.integrity_check !== 'ok') {
      console.error('[DATABASE] Integrity check failed:', result);
      dbHealthy = false;
      throw new Error('Database integrity check failed');
    }

    dbHealthy = true;
    console.log('[DATABASE] Database initialized successfully');
    return db;
  } catch (error) {
    console.error('[DATABASE] Failed to initialize database:', error);
    dbHealthy = false;
    throw error;
  }
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS venues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      capacity INTEGER NOT NULL,
      ladies_privacy INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venue_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      buffer_mins INTEGER DEFAULT 0,
      service_mode TEXT NOT NULL CHECK(service_mode IN ('Food', 'HallOnly')),
      status TEXT DEFAULT 'Confirmed' CHECK(status IN ('Confirmed', 'Cancelled', 'Completed')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_bookings_venue ON bookings(venue_id, start_time, end_time)`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS financials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL UNIQUE,
      guaranteed_guests INTEGER DEFAULT 0,
      actual_guests INTEGER DEFAULT 0,
      rate_per_head INTEGER DEFAULT 0,
      flat_rent INTEGER DEFAULT 0,
      hall_only_mode TEXT DEFAULT 'flat' CHECK(hall_only_mode IN ('flat', 'perhead')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS payments_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      note TEXT,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments_log(booking_id, date)`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS extras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      price INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    )
  `);

  console.log('[DATABASE] All tables created successfully');
  migrateDatabase();
}

function migrateDatabase() {
  console.log('[DATABASE] Running schema migrations...');
  
  // Check venues table for missing columns
  const venuesColumns = db.pragma('table_info(venues)');
  const columnNames = venuesColumns.map(col => col.name);
  
  if (!columnNames.includes('ladies_privacy')) {
    console.log('[DATABASE] Adding ladies_privacy column to venues');
    db.exec('ALTER TABLE venues ADD COLUMN ladies_privacy INTEGER DEFAULT 0');
  }
  
  if (!columnNames.includes('is_active')) {
    console.log('[DATABASE] Adding is_active column to venues');
    db.exec('ALTER TABLE venues ADD COLUMN is_active INTEGER DEFAULT 1');
  }
  
  // Check bookings table for missing columns
  const bookingsColumns = db.pragma('table_info(bookings)');
  const bookingColumnNames = bookingsColumns.map(col => col.name);
  
  if (!bookingColumnNames.includes('notes')) {
    console.log('[DATABASE] Adding notes column to bookings');
    db.exec('ALTER TABLE bookings ADD COLUMN notes TEXT');
  }
  
  // Migrate currency columns from REAL to INTEGER (Paisa storage)
  const financialsColumns = db.pragma('table_info(financials)');
  const financialColumnNames = financialsColumns.map(col => col.name);
  const rateColumn = financialsColumns.find(col => col.name === 'rate_per_head');
  
  // Check if rate_per_head is still REAL type (needs migration)
  if (rateColumn && rateColumn.type === 'REAL') {
    console.log('[DATABASE] Migrating financials table to INTEGER currency...');
    
    db.exec(`
      BEGIN TRANSACTION;
      
      -- Add new INTEGER columns
      ALTER TABLE financials ADD COLUMN rate_per_head_new INTEGER DEFAULT 0;
      ALTER TABLE financials ADD COLUMN flat_rent_new INTEGER DEFAULT 0;
      ALTER TABLE financials ADD COLUMN hall_only_mode TEXT DEFAULT 'flat';
      
      -- Migrate data: multiply by 100 and round
      UPDATE financials SET rate_per_head_new = CAST(ROUND(rate_per_head * 100) AS INTEGER);
      UPDATE financials SET flat_rent_new = CAST(ROUND(flat_rent * 100) AS INTEGER);
      
      -- Create new table with correct schema
      CREATE TABLE financials_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER NOT NULL UNIQUE,
        guaranteed_guests INTEGER DEFAULT 0,
        actual_guests INTEGER DEFAULT 0,
        rate_per_head INTEGER DEFAULT 0,
        flat_rent INTEGER DEFAULT 0,
        hall_only_mode TEXT DEFAULT 'flat' CHECK(hall_only_mode IN ('flat', 'perhead')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
      );
      
      -- Copy migrated data
      INSERT INTO financials_new (id, booking_id, guaranteed_guests, actual_guests, rate_per_head, flat_rent, hall_only_mode, created_at)
      SELECT id, booking_id, guaranteed_guests, actual_guests, rate_per_head_new, flat_rent_new, hall_only_mode, created_at
      FROM financials;
      
      -- Replace old table
      DROP TABLE financials;
      ALTER TABLE financials_new RENAME TO financials;
      
      COMMIT;
    `);
    
    console.log('[DATABASE] Financials table migrated to INTEGER currency');
  }
  
  // Add hall_only_mode column if missing (for new tables)
  if (!financialColumnNames.includes('hall_only_mode')) {
    console.log('[DATABASE] Adding hall_only_mode column to financials');
    db.exec('ALTER TABLE financials ADD COLUMN hall_only_mode TEXT DEFAULT \'flat\'');
  }
  
  // Migrate payments_log to INTEGER
  const paymentsColumns = db.pragma('table_info(payments_log)');
  const amountColumn = paymentsColumns.find(col => col.name === 'amount');
  
  if (amountColumn && amountColumn.type === 'REAL') {
    console.log('[DATABASE] Migrating payments_log to INTEGER currency...');
    
    db.exec(`
      BEGIN TRANSACTION;
      
      CREATE TABLE payments_log_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        note TEXT,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
      );
      
      INSERT INTO payments_log_new (id, booking_id, amount, date, note)
      SELECT id, booking_id, CAST(ROUND(amount * 100) AS INTEGER), date, note
      FROM payments_log;
      
      DROP TABLE payments_log;
      ALTER TABLE payments_log_new RENAME TO payments_log;
      
      CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments_log(booking_id, date);
      
      COMMIT;
    `);
    
    console.log('[DATABASE] Payments_log migrated to INTEGER currency');
  }
  
  // Migrate extras to INTEGER
  const extrasColumns = db.pragma('table_info(extras)');
  const priceColumn = extrasColumns.find(col => col.name === 'price');
  
  if (priceColumn && priceColumn.type === 'REAL') {
    console.log('[DATABASE] Migrating extras to INTEGER currency...');
    
    db.exec(`
      BEGIN TRANSACTION;
      
      CREATE TABLE extras_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER NOT NULL,
        item_name TEXT NOT NULL,
        price INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
      );
      
      INSERT INTO extras_new (id, booking_id, item_name, price, created_at)
      SELECT id, booking_id, item_name, CAST(ROUND(price * 100) AS INTEGER), created_at
      FROM extras;
      
      DROP TABLE extras;
      ALTER TABLE extras_new RENAME TO extras;
      
      COMMIT;
    `);
    
    console.log('[DATABASE] Extras migrated to INTEGER currency');
  }
  
  console.log('[DATABASE] Schema migrations completed');
}

function seedInitialData() {
  // No seed data - database starts empty
  // Venues and bookings should be added manually by the user
  console.log('[DATABASE] Skipping seed data - database starts empty');
}

function closeDatabase() {
  if (db) {
    db.close();
    console.log('[DATABASE] Database connection closed');
    db = null;
  }
}

// ==================== LICENSE MODULE (INLINE) ====================

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

function getActivationKeyPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'activation.key');
}

function validateKey(machineId, activationKey) {
  try {
    const expectedHash = crypto.createHash('sha256').update(machineId + SECRET_SALT).digest('hex');
    const isValid = expectedHash.toLowerCase() === activationKey.toLowerCase().trim();
    console.log('[LICENSE] Key validation:', isValid ? 'SUCCESS' : 'FAILED');
    return isValid;
  } catch (error) {
    console.error('[LICENSE] Key validation error:', error);
    return false;
  }
}

// Secret salt for activation key generation - KEEP THIS SECRET!
const SECRET_SALT = 'mhms-secret-salt-2026-grandpalace';

function generateActivationKey(machineId) {
  return crypto.createHash('sha256').update(machineId + SECRET_SALT).digest('hex');
}

function saveActivationKey(activationKey) {
  try {
    const keyPath = getActivationKeyPath();
    const userDataPath = app.getPath('userData');

    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    fs.writeFileSync(keyPath, activationKey.trim(), 'utf8');
    console.log('[LICENSE] Activation key saved to:', keyPath);
    return true;
  } catch (error) {
    console.error('[LICENSE] Failed to save activation key:', error);
    return false;
  }
}

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

function activateApp(activationKey) {
  try {
    const machineId = getMachineId();
    
    if (!validateKey(machineId, activationKey)) {
      return {
        success: false,
        message: 'Invalid activation key for this machine'
      };
    }

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

// ==================== ELECTRON APP LOGIC ====================

let mainWindow = null;
let isLicensed = false;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 900,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      devTools: !app.isPackaged // Disable DevTools in production
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Only open DevTools in development mode
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL && !app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('license-status-changed', isLicensed);
  });
};

async function initializeApp() {
  try {
    console.log('[MAIN] Initializing application...');

    isLicensed = checkLicenseStatus();
    console.log('[MAIN] License Status:', isLicensed ? 'ACTIVATED' : 'NOT ACTIVATED');

    try {
      initDatabase();
    } catch (dbError) {
      console.error('[MAIN] Database initialization failed:', dbError);
      dbHealthy = false;
      // Don't quit - let the app show the repair screen
    }
    
    if (isLicensed && dbHealthy) {
      seedInitialData();
    }

    console.log('[MAIN] Application initialized successfully');
  } catch (error) {
    console.error('[MAIN] Initialization failed:', error);
    // Don't quit immediately - show error to user
  }
}

function setupIpcHandlers() {
  ipcMain.handle('check-database-health', async () => {
    return dbHealthy;
  });

  ipcMain.handle('get-machine-id', async () => {
    try {
      return getMachineId();
    } catch (error) {
      console.error('[IPC] Failed to get machine ID:', error);
      throw error;
    }
  });

  ipcMain.handle('activate-app', async (event, key) => {
    try {
      const result = activateApp(key);
      
      if (result.success) {
        isLicensed = true;
        seedInitialData();
        
        if (mainWindow) {
          mainWindow.webContents.send('license-status-changed', true);
        }
      }
      
      return result;
    } catch (error) {
      console.error('[IPC] Activation failed:', error);
      return {
        success: false,
        message: 'Activation failed: ' + error.message
      };
    }
  });

  ipcMain.handle('check-license-status', async () => {
    try {
      isLicensed = checkLicenseStatus();
      return isLicensed;
    } catch (error) {
      console.error('[IPC] Failed to check license:', error);
      return false;
    }
  });

  ipcMain.handle('generate-test-key', async () => {
    try {
      const machineId = getMachineId();
      const testKey = generateActivationKey(machineId);
      console.log('[IPC] Test key generated:', testKey);
      return testKey;
    } catch (error) {
      console.error('[IPC] Failed to generate test key:', error);
      throw error;
    }
  });

  ipcMain.handle('deactivate-app', async () => {
    try {
      const result = deactivateApp();
      if (result) {
        isLicensed = false;
        if (mainWindow) {
          mainWindow.webContents.send('license-status-changed', false);
        }
      }
      return result;
    } catch (error) {
      console.error('[IPC] Failed to deactivate:', error);
      return false;
    }
  });

  console.log('[MAIN] IPC handlers registered');
}

function setupDatabaseHandlers() {
  // Get all venues
  ipcMain.handle('db:getVenues', async (event, { includeInactive = false } = {}) => {
    try {
      if (!db) throw new Error('Database not initialized');
      
      let query = 'SELECT * FROM venues';
      if (!includeInactive) {
        query += ' WHERE is_active = 1';
      }
      query += ' ORDER BY name';
      
      const venues = db.prepare(query).all();
      console.log('[IPC] Retrieved venues:', venues.length, '(All active venues regardless of bookings)');
      return {
        success: true,
        venues: venues
      };
    } catch (error) {
      console.error('[IPC] Failed to get venues:', error);
      throw error;
    }
  });

  // Add a new venue
  ipcMain.handle('db:addVenue', async (event, { name, capacity, ladiesPrivacy }) => {
    try {
      if (!db) throw new Error('Database not initialized');
      
      // Validate inputs
      if (!name || !name.trim()) {
        throw new Error('Venue name is required');
      }
      if (!capacity || capacity < 1) {
        throw new Error('Capacity must be at least 1');
      }

      const stmt = db.prepare('INSERT INTO venues (name, capacity, ladies_privacy) VALUES (?, ?, ?)');
      const result = stmt.run(name.trim(), capacity, ladiesPrivacy ? 1 : 0);
      
      console.log('[IPC] Venue added:', name, 'ID:', result.lastInsertRowid);
      
      return {
        success: true,
        id: result.lastInsertRowid,
        message: 'Venue added successfully'
      };
    } catch (error) {
      console.error('[IPC] Failed to add venue:', error);
      
      // Handle unique constraint violation
      if (error.message.includes('UNIQUE constraint failed')) {
        throw new Error('A venue with this name already exists');
      }
      
      throw error;
    }
  });

  // Update an existing venue
  ipcMain.handle('db:updateVenue', async (event, { id, name, capacity, ladiesPrivacy }) => {
    try {
      if (!db) throw new Error('Database not initialized');
      
      if (!name || !name.trim()) {
        throw new Error('Venue name is required');
      }
      if (!capacity || capacity < 1) {
        throw new Error('Capacity must be at least 1');
      }

      const stmt = db.prepare('UPDATE venues SET name = ?, capacity = ?, ladies_privacy = ? WHERE id = ?');
      const result = stmt.run(name.trim(), capacity, ladiesPrivacy ? 1 : 0, id);
      
      if (result.changes === 0) {
        throw new Error('Venue not found');
      }
      
      console.log('[IPC] Venue updated:', id);
      return {
        success: true,
        message: 'Venue updated successfully'
      };
    } catch (error) {
      console.error('[IPC] Failed to update venue:', error);
      
      if (error.message.includes('UNIQUE constraint failed')) {
        throw new Error('A venue with this name already exists');
      }
      
      throw error;
    }
  });

  // Delete or deactivate a venue
  ipcMain.handle('db:deleteVenue', async (event, { id }) => {
    try {
      if (!db) throw new Error('Database not initialized');
      
      // Check if venue has any FUTURE bookings (end_time > now)
      const now = new Date().toISOString();
      const futureBookings = db.prepare(
        'SELECT COUNT(*) as count FROM bookings WHERE venue_id = ? AND end_time > ?'
      ).get(id, now);
      
      if (futureBookings.count > 0) {
        // Block deletion - show warning
        console.log('[IPC] Venue deletion blocked - has future bookings:', id);
        return {
          success: false,
          blocked: true,
          futureBookingsCount: futureBookings.count,
          message: `Cannot delete venue. It has ${futureBookings.count} upcoming booking${futureBookings.count > 1 ? 's' : ''}. Please reassign or cancel those bookings first.`
        };
      }
      
      // No future bookings - proceed with soft delete (deactivate)
      const stmt = db.prepare('UPDATE venues SET is_active = 0 WHERE id = ?');
      const result = stmt.run(id);
      
      if (result.changes === 0) {
        throw new Error('Venue not found');
      }
      
      console.log('[IPC] Venue deactivated:', id);
      return {
        success: true,
        softDelete: true,
        message: 'Venue deactivated successfully'
      };
    } catch (error) {
      console.error('[IPC] Failed to delete venue:', error);
      
      return {
        success: false,
        message: error.message || 'Failed to delete venue'
      };
    }
  });

  // Reactivate a deactivated venue
  ipcMain.handle('db:reactivateVenue', async (event, { id }) => {
    try {
      if (!db) throw new Error('Database not initialized');
      
      const stmt = db.prepare('UPDATE venues SET is_active = 1 WHERE id = ?');
      const result = stmt.run(id);
      
      if (result.changes === 0) {
        throw new Error('Venue not found');
      }
      
      console.log('[IPC] Venue reactivated:', id);
      return {
        success: true,
        message: 'Venue reactivated successfully'
      };
    } catch (error) {
      console.error('[IPC] Failed to reactivate venue:', error);
      
      // Return clean error message instead of raw database error
      return {
        success: false,
        message: error.message || 'Failed to reactivate venue'
      };
    }
  });

  // Check availability with buffer logic
  ipcMain.handle('db:checkAvailability', async (event, { venueId, startTime, endTime, bufferMins, excludeBookingId = null }) => {
    try {
      if (!db) throw new Error('Database not initialized');

      // Calculate the occupied window for the new booking
      const newStart = new Date(startTime).getTime();
      const newEnd = new Date(endTime).getTime() + (bufferMins * 60 * 1000);

      console.log('[IPC] Checking availability:', {
        venueId,
        newStart: new Date(newStart).toISOString(),
        newEnd: new Date(newEnd).toISOString()
      });

      // Get all bookings for this venue (excluding cancelled and optionally a specific booking ID)
      let query = `
        SELECT id, start_time, end_time, buffer_mins, customer_name, status
        FROM bookings 
        WHERE venue_id = ? 
        AND status != 'Cancelled'
      `;
      
      const params = [venueId];
      
      if (excludeBookingId) {
        query += ' AND id != ?';
        params.push(excludeBookingId);
      }

      const existingBookings = db.prepare(query).all(...params);

      // Check for collisions
      for (const booking of existingBookings) {
        const existingStart = new Date(booking.start_time).getTime();
        const existingEnd = new Date(booking.end_time).getTime() + (booking.buffer_mins * 60 * 1000);

        // Collision occurs if:
        // 1. New booking starts before existing ends (including buffer)
        // 2. New booking ends after existing starts
        // Note: If new start exactly equals existing end, it's allowed (no collision)
        const hasCollision = newStart < existingEnd && newEnd > existingStart;

        if (hasCollision) {
          console.log('[IPC] Collision detected with booking:', booking.id);
          return {
            available: false,
            conflict: {
              bookingId: booking.id,
              customerName: booking.customer_name,
              occupiedFrom: new Date(existingStart).toISOString(),
              occupiedUntil: new Date(existingEnd).toISOString()
            }
          };
        }
      }

      console.log('[IPC] Venue is available');
      return { available: true };
    } catch (error) {
      console.error('[IPC] Failed to check availability:', error);
      throw error;
    }
  });

  // Create a new booking with financial details
  ipcMain.handle('db:createBooking', async (event, bookingData) => {
    try {
      if (!db) throw new Error('Database not initialized');

      const {
        venueId,
        customerName,
        phone,
        startTime,
        endTime,
        bufferMins,
        serviceMode,
        ratePerHead,
        guaranteedGuests,
        flatRent,
        bayanah = 0,
        notes = ''
      } = bookingData;

      // Validate required fields
      if (!venueId || !customerName || !phone || !startTime || !endTime) {
        throw new Error('Missing required booking information');
      }

      if (serviceMode !== 'Food' && serviceMode !== 'HallOnly') {
        throw new Error('Invalid service mode');
      }

      // Double-check availability before creating
      const availability = await ipcMain.emit('db:checkAvailability', event, {
        venueId,
        startTime,
        endTime,
        bufferMins: bufferMins || 0
      });

      // Convert currency to Paisa (INTEGER storage)
      const ratePerHeadPaisa = Math.round((ratePerHead || 0) * 100);
      const flatRentPaisa = Math.round((flatRent || 0) * 100);
      const bayanahPaisa = Math.round((bayanah || 0) * 100);

      // Start transaction
      const transaction = db.transaction(() => {
        // Insert booking
        const bookingStmt = db.prepare(`
          INSERT INTO bookings (
            venue_id, customer_name, phone, start_time, end_time, 
            buffer_mins, service_mode, status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const bookingResult = bookingStmt.run(
          venueId,
          customerName.trim(),
          phone.trim(),
          startTime,
          endTime,
          bufferMins || 0,
          serviceMode,
          'Confirmed',
          notes.trim()
        );

        const bookingId = bookingResult.lastInsertRowid;

        // Determine hall_only_mode from bookingData
        const hallOnlyMode = bookingData.hallOnlyMode || 'flat';

        // Insert financial details
        const financialStmt = db.prepare(`
          INSERT INTO financials (
            booking_id, guaranteed_guests, actual_guests, 
            rate_per_head, flat_rent, hall_only_mode
          ) VALUES (?, ?, ?, ?, ?, ?)
        `);

        financialStmt.run(
          bookingId,
          serviceMode === 'Food' ? guaranteedGuests : (hallOnlyMode === 'perhead' ? guaranteedGuests : 0),
          0, // actual_guests filled later
          serviceMode === 'Food' ? ratePerHeadPaisa : (hallOnlyMode === 'perhead' ? ratePerHeadPaisa : 0),
          hallOnlyMode === 'flat' ? flatRentPaisa : 0,
          hallOnlyMode
        );

        // If bayanah > 0, log initial payment
        if (bayanahPaisa > 0) {
          const paymentStmt = db.prepare(`
            INSERT INTO payments_log (booking_id, amount, note)
            VALUES (?, ?, ?)
          `);

          paymentStmt.run(
            bookingId,
            bayanahPaisa,
            'Initial Advance (Bayanah)'
          );

          console.log('[IPC] Initial payment logged (Paisa):', bayanahPaisa);
        }

        return bookingId;
      });

      const bookingId = transaction();

      console.log('[IPC] Booking created successfully:', bookingId);

      return {
        success: true,
        bookingId,
        message: 'Booking created successfully'
      };
    } catch (error) {
      console.error('[IPC] Failed to create booking:', error);
      throw error;
    }
  });

  // Update booking notes
  ipcMain.handle('db:updateBookingNotes', async (event, { bookingId, notes }) => {
    try {
      if (!db) throw new Error('Database not initialized');
      
      const stmt = db.prepare('UPDATE bookings SET notes = ? WHERE id = ?');
      const result = stmt.run(notes.trim(), bookingId);
      
      if (result.changes === 0) {
        throw new Error('Booking not found');
      }
      
      console.log('[IPC] Booking notes updated:', bookingId);
      return {
        success: true,
        message: 'Notes updated successfully'
      };
    } catch (error) {
      console.error('[IPC] Failed to update booking notes:', error);
      throw error;
    }
  });

  // Get all bookings with venue and financial details
  ipcMain.handle('db:getBookings', async (event, filters = {}) => {
    try {
      if (!db) throw new Error('Database not initialized');

      let query = `
        SELECT 
          b.*,
          v.name as venue_name,
          v.capacity as venue_capacity,
          f.guaranteed_guests,
          f.actual_guests,
          f.rate_per_head,
          f.flat_rent,
          f.hall_only_mode,
          -- Calculate grand_total (base + extras)
          CASE 
            WHEN b.service_mode = 'Food' THEN (f.rate_per_head * f.guaranteed_guests)
            WHEN b.service_mode = 'HallOnly' AND f.hall_only_mode = 'perhead' THEN (f.rate_per_head * f.guaranteed_guests)
            WHEN b.service_mode = 'HallOnly' AND f.hall_only_mode = 'flat' THEN f.flat_rent
            ELSE 0
          END + COALESCE((SELECT SUM(price) FROM extras WHERE booking_id = b.id), 0) as grand_total,
          -- Calculate total_paid
          COALESCE((SELECT SUM(amount) FROM payments_log WHERE booking_id = b.id), 0) as total_paid,
          -- Calculate balance_due
          (CASE 
            WHEN b.service_mode = 'Food' THEN (f.rate_per_head * f.guaranteed_guests)
            WHEN b.service_mode = 'HallOnly' AND f.hall_only_mode = 'perhead' THEN (f.rate_per_head * f.guaranteed_guests)
            WHEN b.service_mode = 'HallOnly' AND f.hall_only_mode = 'flat' THEN f.flat_rent
            ELSE 0
          END + COALESCE((SELECT SUM(price) FROM extras WHERE booking_id = b.id), 0)) - 
          COALESCE((SELECT SUM(amount) FROM payments_log WHERE booking_id = b.id), 0) as balance_due
        FROM bookings b
        LEFT JOIN venues v ON b.venue_id = v.id
        LEFT JOIN financials f ON b.id = f.booking_id
        WHERE 1=1
      `;

      const params = [];

      if (filters.venueId) {
        query += ' AND b.venue_id = ?';
        params.push(filters.venueId);
      }

      if (filters.status) {
        query += ' AND b.status = ?';
        params.push(filters.status);
      }

      if (filters.fromDate) {
        query += ' AND b.start_time >= ?';
        params.push(filters.fromDate);
      }

      if (filters.toDate) {
        query += ' AND b.end_time <= ?';
        params.push(filters.toDate);
      }

      query += ' ORDER BY b.start_time DESC';

      const bookings = db.prepare(query).all(...params);
      console.log('[IPC] Retrieved bookings:', bookings.length);
      
      return bookings;
    } catch (error) {
      console.error('[IPC] Failed to get bookings:', error);
      throw error;
    }
  });

  // Get single booking with all details
  ipcMain.handle('db:getBooking', async (event, bookingId) => {
    try {
      if (!db) throw new Error('Database not initialized');

      const booking = db.prepare(`
        SELECT 
          b.*,
          v.name as venue_name,
          v.capacity as venue_capacity,
          f.guaranteed_guests,
          f.actual_guests,
          f.rate_per_head,
          f.flat_rent,
          f.hall_only_mode,
          -- Calculate grand_total (base + extras) - IN PAISA (INTEGER)
          CAST((
            CASE 
              WHEN b.service_mode = 'Food' THEN (CAST(f.rate_per_head AS INTEGER) * CAST(f.guaranteed_guests AS INTEGER))
              WHEN b.service_mode = 'HallOnly' AND f.hall_only_mode = 'perhead' THEN (CAST(f.rate_per_head AS INTEGER) * CAST(f.guaranteed_guests AS INTEGER))
              WHEN b.service_mode = 'HallOnly' AND f.hall_only_mode = 'flat' THEN CAST(f.flat_rent AS INTEGER)
              ELSE 0
            END + COALESCE((SELECT SUM(CAST(price AS INTEGER)) FROM extras WHERE booking_id = b.id), 0)
          ) AS INTEGER) as grand_total,
          -- Calculate total_paid - IN PAISA (INTEGER)
          CAST(COALESCE((SELECT SUM(CAST(amount AS INTEGER)) FROM payments_log WHERE booking_id = b.id), 0) AS INTEGER) as total_paid,
          -- Calculate balance_due - IN PAISA (INTEGER)
          CAST((
            CASE 
              WHEN b.service_mode = 'Food' THEN (CAST(f.rate_per_head AS INTEGER) * CAST(f.guaranteed_guests AS INTEGER))
              WHEN b.service_mode = 'HallOnly' AND f.hall_only_mode = 'perhead' THEN (CAST(f.rate_per_head AS INTEGER) * CAST(f.guaranteed_guests AS INTEGER))
              WHEN b.service_mode = 'HallOnly' AND f.hall_only_mode = 'flat' THEN CAST(f.flat_rent AS INTEGER)
              ELSE 0
            END + COALESCE((SELECT SUM(CAST(price AS INTEGER)) FROM extras WHERE booking_id = b.id), 0)
          ) - COALESCE((SELECT SUM(CAST(amount AS INTEGER)) FROM payments_log WHERE booking_id = b.id), 0) AS INTEGER) as balance_due
        FROM bookings b
        LEFT JOIN venues v ON b.venue_id = v.id
        LEFT JOIN financials f ON b.id = f.booking_id
        WHERE b.id = ?
      `).get(bookingId);

      if (!booking) {
        throw new Error('Booking not found');
      }

      console.log('[IPC] Loaded booking ID:', bookingId, '| grand_total (Paisa):', booking.grand_total, '| total_paid (Paisa):', booking.total_paid, '| balance_due (Paisa):', booking.balance_due);

      // Get payments
      const payments = db.prepare(`
        SELECT * FROM payments_log 
        WHERE booking_id = ? 
        ORDER BY date DESC
      `).all(bookingId);

      // Get extras
      const extras = db.prepare(`
        SELECT * FROM extras 
        WHERE booking_id = ? 
        ORDER BY created_at DESC
      `).all(bookingId);

      return {
        ...booking,
        payments,
        extras
      };
    } catch (error) {
      console.error('[IPC] Failed to get booking:', error);
      throw error;
    }
  });

  // Add payment to a booking
  ipcMain.handle('db:addPayment', async (event, { bookingId, amount, note }) => {
    try {
      if (!db) throw new Error('Database not initialized');

      if (!amount || amount <= 0) {
        throw new Error('Payment amount must be greater than 0');
      }

      // Convert to Paisa (INTEGER storage)
      const amountPaisa = Math.round(amount * 100);

      const stmt = db.prepare(`
        INSERT INTO payments_log (booking_id, amount, note)
        VALUES (?, ?, ?)
      `);

      const result = stmt.run(bookingId, amountPaisa, note || '');

      console.log('[IPC] Payment added (Paisa):', amountPaisa, 'to booking:', bookingId);

      return {
        success: true,
        id: result.lastInsertRowid,
        message: 'Payment recorded successfully'
      };
    } catch (error) {
      console.error('[IPC] Failed to add payment:', error);
      throw error;
    }
  });

  // Add extra item to a booking
  ipcMain.handle('db:addExtra', async (event, { bookingId, itemName, price }) => {
    try {
      if (!db) throw new Error('Database not initialized');

      if (!itemName || !itemName.trim()) {
        throw new Error('Item name is required');
      }

      if (price < 0) {
        throw new Error('Price cannot be negative');
      }

      // Convert to Paisa (INTEGER storage)
      const pricePaisa = Math.round((price || 0) * 100);

      const stmt = db.prepare(`
        INSERT INTO extras (booking_id, item_name, price)
        VALUES (?, ?, ?)
      `);

      const result = stmt.run(bookingId, itemName.trim(), pricePaisa);

      console.log('[IPC] Extra added:', itemName, 'to booking:', bookingId);

      return {
        success: true,
        id: result.lastInsertRowid,
        message: 'Extra item added successfully'
      };
    } catch (error) {
      console.error('[IPC] Failed to add extra:', error);
      throw error;
    }
  });

  // Delete extra item
  ipcMain.handle('db:deleteExtra', async (event, { extraId }) => {
    try {
      if (!db) throw new Error('Database not initialized');

      const stmt = db.prepare('DELETE FROM extras WHERE id = ?');
      const result = stmt.run(extraId);

      if (result.changes === 0) {
        throw new Error('Extra item not found');
      }

      console.log('[IPC] Extra deleted:', extraId);

      return {
        success: true,
        message: 'Extra item deleted successfully'
      };
    } catch (error) {
      console.error('[IPC] Failed to delete extra:', error);
      throw error;
    }
  });

  // Get bookings by specific date (for timeline view)
  ipcMain.handle('db:getBookingsByDate', async (event, { date }) => {
    try {
      if (!db) throw new Error('Database not initialized');

      // Use local date directly (YYYY-MM-DD string from frontend)
      console.log('[IPC] Loading bookings for date (localtime):', date);

      const stmt = db.prepare(`
        SELECT 
          b.*,
          v.name as venue_name,
          v.capacity as venue_capacity,
          b.service_mode,
          f.rate_per_head,
          f.guaranteed_guests,
          f.flat_rent,
          f.hall_only_mode,
          -- Calculate grand_total (base + extras) - ALL VALUES IN PAISA (INTEGER)
          CAST((
            CASE 
              WHEN b.service_mode = 'Food' THEN (CAST(f.rate_per_head AS INTEGER) * CAST(f.guaranteed_guests AS INTEGER))
              WHEN b.service_mode = 'HallOnly' AND f.hall_only_mode = 'perhead' THEN (CAST(f.rate_per_head AS INTEGER) * CAST(f.guaranteed_guests AS INTEGER))
              WHEN b.service_mode = 'HallOnly' AND f.hall_only_mode = 'flat' THEN CAST(f.flat_rent AS INTEGER)
              ELSE 0
            END + COALESCE((SELECT SUM(CAST(price AS INTEGER)) FROM extras WHERE booking_id = b.id), 0)
          ) AS INTEGER) as grand_total,
          -- Calculate total_paid - IN PAISA (INTEGER)
          CAST(COALESCE((SELECT SUM(CAST(amount AS INTEGER)) FROM payments_log WHERE booking_id = b.id), 0) AS INTEGER) as total_paid,
          -- Calculate balance_due - IN PAISA (INTEGER)
          CAST((
            CASE 
              WHEN b.service_mode = 'Food' THEN (CAST(f.rate_per_head AS INTEGER) * CAST(f.guaranteed_guests AS INTEGER))
              WHEN b.service_mode = 'HallOnly' AND f.hall_only_mode = 'perhead' THEN (CAST(f.rate_per_head AS INTEGER) * CAST(f.guaranteed_guests AS INTEGER))
              WHEN b.service_mode = 'HallOnly' AND f.hall_only_mode = 'flat' THEN CAST(f.flat_rent AS INTEGER)
              ELSE 0
            END + COALESCE((SELECT SUM(CAST(price AS INTEGER)) FROM extras WHERE booking_id = b.id), 0)
          ) - COALESCE((SELECT SUM(CAST(amount AS INTEGER)) FROM payments_log WHERE booking_id = b.id), 0) AS INTEGER) as balance_due
        FROM bookings b
        LEFT JOIN venues v ON b.venue_id = v.id
        LEFT JOIN financials f ON b.id = f.booking_id
        WHERE b.status = 'Confirmed'
        AND date(b.start_time, 'localtime') = date(?)
        ORDER BY b.start_time ASC
      `);

      const bookings = stmt.all(date);

      console.log('[IPC] Retrieved bookings for date:', date, '- Count:', bookings.length);
      if (bookings.length > 0) {
        console.log('[IPC] Sample booking grand_total (Paisa):', bookings[0].grand_total, '| balance_due (Paisa):', bookings[0].balance_due);
      }

      return {
        success: true,
        bookings: bookings
      };
    } catch (error) {
      console.error('[IPC] Failed to get bookings by date:', error);
      throw error;
    }
  });

  // Get monthly schedule data with conflict detection
  ipcMain.handle('db:getMonthlyScheduleData', async (event, year, month) => {
    try {
      if (!db) throw new Error('Database not initialized');

      // Get all venues
      const venues = db.prepare('SELECT id FROM venues').all();
      const venueIds = venues.map(v => v.id);

      // Get first and last day of month
      const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      // Get all bookings for the month
      const stmt = db.prepare(`
        SELECT 
          id,
          venue_id,
          date(start_time, 'localtime') as booking_date,
          start_time,
          end_time,
          buffer_mins
        FROM bookings
        WHERE date(start_time, 'localtime') >= ? AND date(start_time, 'localtime') <= ?
        ORDER BY start_time
      `);
      
      const bookings = stmt.all(firstDay, lastDayStr);

      // Build daily data structure
      const dailyData = {};

      // Initialize all days in month
      for (let day = 1; day <= lastDay; day++) {
        const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dailyData[dateKey] = {
          bookingCount: 0,
          hasConflict: false,
          allHallsFree: venueIds.length > 0
        };
      }

      // Process bookings and detect conflicts
      bookings.forEach(booking => {
        const dateKey = booking.booking_date;
        
        if (!dailyData[dateKey]) {
          dailyData[dateKey] = {
            bookingCount: 0,
            hasConflict: false,
            allHallsFree: false
          };
        }

        dailyData[dateKey].bookingCount++;
        dailyData[dateKey].allHallsFree = false;

        // Check for buffer conflicts in same venue
        const bookingStart = new Date(booking.start_time);
        const bookingEnd = new Date(booking.end_time);
        const bufferEnd = new Date(bookingEnd.getTime() + (booking.buffer_mins || 0) * 60000);

        // Check against other bookings in same venue on same day
        const sameVenueBookings = bookings.filter(b => 
          b.venue_id === booking.venue_id && 
          b.booking_date === dateKey &&
          b.id !== booking.id
        );

        for (const other of sameVenueBookings) {
          const otherStart = new Date(other.start_time);
          const otherEnd = new Date(other.end_time);
          const otherBufferEnd = new Date(otherEnd.getTime() + (other.buffer_mins || 0) * 60000);

          // Check if this booking's buffer overlaps with other booking's time or buffer
          const thisBufferOverlapsOther = bufferEnd > otherStart && bookingStart < otherBufferEnd;
          const otherBufferOverlapsThis = otherBufferEnd > bookingStart && otherStart < bufferEnd;

          if (thisBufferOverlapsOther || otherBufferOverlapsThis) {
            dailyData[dateKey].hasConflict = true;
            break;
          }
        }
      });

      console.log('[IPC] Monthly schedule data generated:', year, month, '- Days with data:', Object.keys(dailyData).length);

      return {
        success: true,
        data: dailyData
      };
    } catch (error) {
      console.error('[IPC] Failed to get monthly schedule data:', error);
      throw error;
    }
  });

  // Get today's statistics for dashboard (Pure SQL - Source of Truth)
  ipcMain.handle('db:getTodayStats', async (event) => {
    try {
      if (!db) throw new Error('Database not initialized');

      // Single robust SQL transaction for all dashboard stats
      const statsQuery = db.prepare(`
        SELECT
          -- Events Today: Count of bookings starting today (excluding cancelled)
          (
            SELECT CAST(COUNT(*) AS INTEGER)
            FROM bookings
            WHERE date(start_time) = date('now', 'localtime')
            AND status != 'Cancelled'
          ) as events_today,
          
          -- Bayanah Collected Today: All payments made today (NULL-safe with 0 fallback)
          CAST(COALESCE(
            (
              SELECT SUM(CAST(amount AS INTEGER))
              FROM payments_log
              WHERE date(date) = date('now', 'localtime')
            ), 0
          ) AS INTEGER) as bayanah_collected_today,
          
          -- Balance Due Today: (Grand Total - Total Paid) for bookings starting today
          CAST(COALESCE(
            (
              SELECT SUM(
                -- Grand Total (Base Rate + Extras)
                (
                  CASE 
                    WHEN b.service_mode = 'Food' THEN CAST(f.rate_per_head AS INTEGER) * CAST(f.guaranteed_guests AS INTEGER)
                    WHEN b.service_mode = 'HallOnly' AND f.hall_only_mode = 'perhead' THEN CAST(f.rate_per_head AS INTEGER) * CAST(f.guaranteed_guests AS INTEGER)
                    WHEN b.service_mode = 'HallOnly' AND f.hall_only_mode = 'flat' THEN CAST(f.flat_rent AS INTEGER)
                    ELSE 0
                  END + COALESCE(
                    (SELECT SUM(CAST(price AS INTEGER)) FROM extras WHERE booking_id = b.id), 0
                  )
                )
                -- Subtract Total Paid
                - COALESCE(
                  (SELECT SUM(CAST(amount AS INTEGER)) FROM payments_log WHERE booking_id = b.id), 0
                )
              )
              FROM bookings b
              LEFT JOIN financials f ON b.id = f.booking_id
              WHERE date(b.start_time) = date('now', 'localtime')
              AND b.status != 'Cancelled'
            ), 0
          ) AS INTEGER) as balance_due_today
      `);

      const result = statsQuery.get();

      console.log('[IPC] Dashboard Stats (Pure SQL) - Events:', result.events_today, '| Cash Collected (Paisa):', result.bayanah_collected_today, '| Balance Due (Paisa):', result.balance_due_today);

      return {
        success: true,
        stats: {
          todayBookingsCount: result.events_today,
          todayBayanah: result.bayanah_collected_today, // In Paisa (INTEGER)
          todayBalanceDue: result.balance_due_today // In Paisa (INTEGER)
        }
      };
    } catch (error) {
      console.error('[IPC] Failed to get today stats:', error);
      throw error;
    }
  });

  // Export database backup
  ipcMain.handle('db:exportBackup', async () => {
    try {
      if (!db) throw new Error('Database not initialized');

      const userDataPath = app.getPath('userData');
      const dbPath = path.join(userDataPath, 'mhms.db');

      // Show save dialog
      const result = await dialog.showSaveDialog({
        title: 'Backup Database',
        defaultPath: `MHMS_Backup_${new Date().toISOString().split('T')[0]}.mhms-backup`,
        filters: [
          { name: 'MHMS Backup Files', extensions: ['mhms-backup'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, message: 'Backup cancelled' };
      }

      // Close database to ensure all data is written
      db.close();
      
      // Copy database file to selected location
      fs.copyFileSync(dbPath, result.filePath);
      
      // Reopen database
      db = new Database(dbPath, { verbose: console.log });
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');

      console.log('[IPC] Database backed up to:', result.filePath);

      return {
        success: true,
        message: 'Backup created successfully',
        path: result.filePath
      };
    } catch (error) {
      console.error('[IPC] Failed to export backup:', error);
      
      // Try to reopen database if it was closed
      try {
        if (!db || !db.open) {
          const userDataPath = app.getPath('userData');
          const dbPath = path.join(userDataPath, 'mhms.db');
          db = new Database(dbPath, { verbose: console.log });
          db.pragma('journal_mode = WAL');
          db.pragma('foreign_keys = ON');
        }
      } catch (reopenError) {
        console.error('[IPC] Failed to reopen database:', reopenError);
      }
      
      throw error;
    }
  });

  // Import database backup
  ipcMain.handle('db:importBackup', async (event, { confirmed }) => {
    try {
      if (!confirmed) {
        throw new Error('Restore not confirmed');
      }

      // Show open dialog
      const result = await dialog.showOpenDialog({
        title: 'Restore Database Backup',
        filters: [
          { name: 'MHMS Backup Files', extensions: ['mhms-backup'] },
          { name: 'Database Files', extensions: ['db'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, message: 'Restore cancelled' };
      }

      const backupPath = result.filePaths[0];
      const userDataPath = app.getPath('userData');
      const dbPath = path.join(userDataPath, 'mhms.db');

      // Verify the backup file exists and is readable
      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup file not found');
      }

      // Close current database
      if (db) {
        db.close();
      }

      // Create a safety backup of current database before replacing
      const safetyBackupPath = path.join(userDataPath, `mhms_pre_restore_${Date.now()}.db`);
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, safetyBackupPath);
        console.log('[IPC] Safety backup created at:', safetyBackupPath);
      }

      // Replace current database with backup
      fs.copyFileSync(backupPath, dbPath);
      
      console.log('[IPC] Database restored from:', backupPath);

      // Reopen database
      db = new Database(dbPath, { verbose: console.log });
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');

      return {
        success: true,
        message: 'Database restored successfully. Please restart the application.',
        requiresRestart: true
      };
    } catch (error) {
      console.error('[IPC] Failed to import backup:', error);
      
      // Try to reopen database if it was closed
      try {
        if (!db || !db.open) {
          const userDataPath = app.getPath('userData');
          const dbPath = path.join(userDataPath, 'mhms.db');
          if (fs.existsSync(dbPath)) {
            db = new Database(dbPath, { verbose: console.log });
            db.pragma('journal_mode = WAL');
            db.pragma('foreign_keys = ON');
          }
        }
      } catch (reopenError) {
        console.error('[IPC] Failed to reopen database:', reopenError);
      }
      
      throw error;
    }
  });

  // Force Synchronize Financials - Refresh dashboard with Source of Truth queries
  ipcMain.handle('db:forceSyncFinancials', async (event) => {
    try {
      if (!db) throw new Error('Database not initialized');

      console.log('[IPC] Running Force Synchronize Financials - recalculating all dashboard stats from raw data...');

      // Run the exact same query as getTodayStats to force fresh calculation
      const statsQuery = db.prepare(`
        SELECT
          -- Events Today: Count of bookings starting today (excluding cancelled)
          (
            SELECT CAST(COUNT(*) AS INTEGER)
            FROM bookings
            WHERE date(start_time) = date('now', 'localtime')
            AND status != 'Cancelled'
          ) as events_today,
          
          -- Bayanah Collected Today: All payments made today (NULL-safe with 0 fallback)
          CAST(COALESCE(
            (
              SELECT SUM(CAST(amount AS INTEGER))
              FROM payments_log
              WHERE date(date) = date('now', 'localtime')
            ), 0
          ) AS INTEGER) as bayanah_collected_today,
          
          -- Balance Due Today: (Grand Total - Total Paid) for bookings starting today
          CAST(COALESCE(
            (
              SELECT SUM(
                -- Grand Total (Base Rate + Extras)
                (
                  CASE 
                    WHEN b.service_mode = 'Food' THEN CAST(f.rate_per_head AS INTEGER) * CAST(f.guaranteed_guests AS INTEGER)
                    WHEN b.service_mode = 'HallOnly' AND f.hall_only_mode = 'perhead' THEN CAST(f.rate_per_head AS INTEGER) * CAST(f.guaranteed_guests AS INTEGER)
                    WHEN b.service_mode = 'HallOnly' AND f.hall_only_mode = 'flat' THEN CAST(f.flat_rent AS INTEGER)
                    ELSE 0
                  END + COALESCE(
                    (SELECT SUM(CAST(price AS INTEGER)) FROM extras WHERE booking_id = b.id), 0
                  )
                )
                -- Subtract Total Paid
                - COALESCE(
                  (SELECT SUM(CAST(amount AS INTEGER)) FROM payments_log WHERE booking_id = b.id), 0
                )
              )
              FROM bookings b
              LEFT JOIN financials f ON b.id = f.booking_id
              WHERE date(b.start_time) = date('now', 'localtime')
              AND b.status != 'Cancelled'
            ), 0
          ) AS INTEGER) as balance_due_today
      `);

      const result = statsQuery.get();

      console.log('[IPC] Force Sync Complete - Events:', result.events_today, '| Cash:', result.bayanah_collected_today, '| Due:', result.balance_due_today);

      return {
        success: true,
        message: 'Dashboard financials synchronized successfully',
        stats: {
          todayBookingsCount: result.events_today,
          todayBayanah: result.bayanah_collected_today,
          todayBalanceDue: result.balance_due_today
        }
      };
    } catch (error) {
      console.error('[IPC] Force sync failed:', error);
      return {
        success: false,
        message: 'Failed to synchronize: ' + error.message
      };
    }
  });

  // Reset Database - Hard reset for dev/troubleshooting
  // Nuclear Reset - Complete database wipe and recreation
  ipcMain.handle('db:nuclearReset', async () => {
    try {
      console.log('[IPC] NUCLEAR RESET requested - wiping all data...');
      
      // Close existing database connection
      if (db) {
        db.close();
        console.log('[DATABASE] Closed existing connection');
        db = null;
        dbHealthy = false;
      }

      // Get database path
      const userDataPath = app.getPath('userData');
      const dbPath = path.join(userDataPath, 'mhms.db');

      // Delete the database file and WAL/SHM files
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        console.log('[DATABASE] Deleted mhms.db');
      }
      
      const walPath = dbPath + '-wal';
      const shmPath = dbPath + '-shm';
      if (fs.existsSync(walPath)) {
        fs.unlinkSync(walPath);
        console.log('[DATABASE] Deleted WAL file');
      }
      if (fs.existsSync(shmPath)) {
        fs.unlinkSync(shmPath);
        console.log('[DATABASE] Deleted SHM file');
      }

      // Clear any in-memory cache (force garbage collection hint)
      if (global.gc) {
        global.gc();
        console.log('[DATABASE] Memory cleared');
      }

      // Re-initialize fresh database with strict INTEGER schema
      db = initDatabase();
      dbHealthy = true;
      
      console.log('[DATABASE] NUCLEAR RESET COMPLETE - Fresh database with ZERO data');
      
      return {
        success: true,
        message: 'Database reset successfully! All data wiped.'
      };
    } catch (error) {
      console.error('[IPC] Failed to reset database:', error);
      return {
        success: false,
        message: 'Failed to reset database: ' + error.message
      };
    }
  });

  console.log('[MAIN] Database IPC handlers registered');
}

app.whenReady().then(async () => {
  await initializeApp();
  setupIpcHandlers();
  setupDatabaseHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  closeDatabase();
});

