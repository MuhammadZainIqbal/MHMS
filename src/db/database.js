const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db = null;

/**
 * Initialize the SQLite database in the user's AppData folder
 * All tables are created with proper schema and relationships
 */
function initDatabase() {
  try {
    // Get the userData path (e.g., %AppData%/Roaming/MHMS on Windows)
    const userDataPath = app.getPath('userData');
    
    // Ensure the directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    const dbPath = path.join(userDataPath, 'mhms.db');
    console.log('[DATABASE] Initializing database at:', dbPath);

    // Initialize database with WAL mode for better performance
    db = new Database(dbPath, { verbose: console.log });
    
    // Enable Write-Ahead Logging for concurrent read/write performance
    db.pragma('journal_mode = WAL');
    
    // Enable foreign key constraints
    db.pragma('foreign_keys = ON');

    // Create all tables
    createTables();

    console.log('[DATABASE] Database initialized successfully');
    return db;
  } catch (error) {
    console.error('[DATABASE] Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Create all required tables for the MHMS system
 */
function createTables() {
  // Venues table - stores hall/marquee information
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

  // Bookings table - core booking information
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

  // Create index for faster venue and date-based queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_bookings_venue 
    ON bookings(venue_id, start_time, end_time)
  `);

  // Financials table - pricing and guest information
  db.exec(`
    CREATE TABLE IF NOT EXISTS financials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL UNIQUE,
      guaranteed_guests INTEGER DEFAULT 0,
      actual_guests INTEGER DEFAULT 0,
      rate_per_head REAL DEFAULT 0,
      flat_rent REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    )
  `);

  // Payments log table - tracks all payments
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      note TEXT,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    )
  `);

  // Create index for payment queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_payments_booking 
    ON payments_log(booking_id, date)
  `);

  // Extras table - additional items/services
  db.exec(`
    CREATE TABLE IF NOT EXISTS extras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    )
  `);

  console.log('[DATABASE] All tables created successfully');
  
  // Migrate existing tables to add new columns if they don't exist
  migrateDatabase();
}

/**
 * Migrate existing database to add new columns
 */
function migrateDatabase() {
  try {
    // Check and add ladies_privacy to venues
    const venuesColumns = db.pragma('table_info(venues)');
    const hasLadiesPrivacy = venuesColumns.some(col => col.name === 'ladies_privacy');
    const hasIsActive = venuesColumns.some(col => col.name === 'is_active');
    
    if (!hasLadiesPrivacy) {
      db.exec('ALTER TABLE venues ADD COLUMN ladies_privacy INTEGER DEFAULT 0');
      console.log('[DATABASE] Added ladies_privacy column to venues');
    }
    
    if (!hasIsActive) {
      db.exec('ALTER TABLE venues ADD COLUMN is_active INTEGER DEFAULT 1');
      console.log('[DATABASE] Added is_active column to venues');
    }
    
    // Check and add notes to bookings
    const bookingsColumns = db.pragma('table_info(bookings)');
    const hasNotes = bookingsColumns.some(col => col.name === 'notes');
    
    if (!hasNotes) {
      db.exec('ALTER TABLE bookings ADD COLUMN notes TEXT');
      console.log('[DATABASE] Added notes column to bookings');
    }
    
    console.log('[DATABASE] Migration completed successfully');
  } catch (error) {
    console.error('[DATABASE] Migration error:', error);
    // Non-fatal, continue
  }
}

/**
 * Get the database instance
 */
function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close the database connection
 */
function closeDatabase() {
  if (db) {
    db.close();
    console.log('[DATABASE] Database connection closed');
    db = null;
  }
}

/**
 * Seed initial data (optional - for demo purposes)
 */
function seedInitialData() {
  const db = getDatabase();
  
  // Check if venues already exist
  const venueCount = db.prepare('SELECT COUNT(*) as count FROM venues').get();
  
  if (venueCount.count === 0) {
    console.log('[DATABASE] Seeding initial venue data...');
    
    const insertVenue = db.prepare('INSERT INTO venues (name, capacity) VALUES (?, ?)');
    
    const venues = [
      ['Grand Hall', 500],
      ['VIP Lawn', 300],
      ['Rooftop Terrace', 200]
    ];
    
    venues.forEach(venue => {
      insertVenue.run(venue);
    });
    
    console.log('[DATABASE] Initial data seeded successfully');
  }
}

/**
 * Reset database - delete and recreate
 */
function resetDatabase() {
  try {
    // Close existing connection
    if (db) {
      db.close();
      console.log('[DATABASE] Closed existing connection');
      db = null;
    }

    // Get database path
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'mhms.db');

    // Delete the database file if it exists
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log('[DATABASE] Deleted old database file');
    }

    // Delete WAL and SHM files if they exist
    const walPath = dbPath + '-wal';
    const shmPath = dbPath + '-shm';
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

    // Re-initialize fresh database
    const newDb = initDatabase();
    console.log('[DATABASE] Fresh database created successfully');
    
    return newDb;
  } catch (error) {
    console.error('[DATABASE] Reset failed:', error);
    throw error;
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase,
  seedInitialData,
  resetDatabase
};
