# 🎯 Quick Start Guide

## Step 1: Run the Application

Open your terminal in the MHMS folder and run:

```bash
npm start
```

## Step 2: You'll See the Activation Screen

The application will launch showing:

```
┌─────────────────────────────────────────────┐
│              🔒                              │
│   Application Activation Required           │
│   MHMS - Marriage Hall Management System    │
├─────────────────────────────────────────────┤
│                                              │
│   Your Hardware ID:                          │
│   ┌──────────────────────────────────────┐  │
│   │ d464c01d-3cbe-4e75-b200-2f34136ad222 │📋 │
│   └──────────────────────────────────────┘  │
│                                              │
│   Activation Key:                            │
│   ┌──────────────────────────────────────┐  │
│   │ [Enter activation key here...]       │  │
│   └──────────────────────────────────────┘  │
│                                              │
│   [ Activate Application ]                   │
│                                              │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│   🧪 Development Mode                        │
│   [ Generate Test Key ]                      │
└─────────────────────────────────────────────┘
```

## Step 3: Generate and Use Test Key

1. Click the **"Generate Test Key"** button
2. The activation key field will auto-fill with a valid key
3. Click **"Activate Application"**
4. ✅ Success! The main application will load

## Step 4: Explore the Main Application

After activation, you'll see:

```
┌─────────────────────────────────────────────────────┐
│ 🏛️ MHMS                      [🔓 Deactivate (Test)] │
│ Marriage Hall Management System                      │
├─────────────────────────────────────────────────────┤
│ 📊 Dashboard │ 📅 Bookings │ 🏢 Venues │ 💰 Financials │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ✅ Application Successfully Activated!              │
│  Your Marriage Hall Management System is ready.      │
│                                                       │
│  ┌──────────────┐ ┌──────────────┐                  │
│  │ 🗄️ SQLite DB │ │ 🔒 Hardware  │                  │
│  │ WAL Mode     │ │ Locked       │                  │
│  └──────────────┘ └──────────────┘                  │
│                                                       │
│  Database Schema Ready:                              │
│  ✓ Venues table                                      │
│  ✓ Bookings table                                    │
│  ✓ Financials table                                  │
│  ✓ Payments log                                      │
│  ✓ Extras table                                      │
│                                                       │
└─────────────────────────────────────────────────────┘
```

## 🗄️ Verify Database Creation

Check that the database was created:

**Windows:**
```bash
# View the database location
echo %AppData%\Roaming\mhms

# Access the database
sqlite3 "%AppData%\Roaming\mhms\mhms.db"

# View tables
.tables

# View sample venues
SELECT * FROM venues;
```

You should see:
```
id  name               capacity
--  ---------------    --------
1   Grand Hall         500
2   VIP Lawn          300
3   Rooftop Terrace   200
```

## 🔐 Verify License Files

**Windows:**
```bash
dir "%AppData%\Roaming\mhms"
```

You should see:
```
activation.key      # Your license file
mhms.db            # Main database
mhms.db-shm        # SQLite shared memory
mhms.db-wal        # Write-ahead log
```

## 🧪 Test Deactivation

1. In the main application, click **"Deactivate (Test)"** in the top-right
2. Confirm the dialog
3. The app will reload and show the activation screen again
4. Your license file will be deleted

## 📊 View License Status in Console

Watch the console logs when starting the app:

```
[LICENSE] Machine ID generated: d464c01d-3cbe-4e75-b200-2f34136ad222
[LICENSE] No activation key found
[LICENSE] License check: NO KEY FOUND
[MAIN] License Status: NOT ACTIVATED
[DATABASE] Initializing database at: C:\Users\...\AppData\Roaming\mhms\mhms.db
[DATABASE] All tables created successfully
```

After activation:
```
[LICENSE] Machine ID generated: d464c01d-3cbe-4e75-b200-2f34136ad222
[LICENSE] Activation key loaded from disk
[LICENSE] Key validation: SUCCESS
[LICENSE] License check: ACTIVE
[MAIN] License Status: ACTIVATED
[DATABASE] Seeding initial venue data...
```

## 🔧 Development Workflow

### Hot Reload (React Components)
Edit any `.jsx` file in `src/renderer/` and save - the UI will update instantly!

### Restart Main Process
Type `rs` in the terminal where `npm start` is running to restart the main process.

### View DevTools
DevTools opens automatically in development mode. Check the Console tab for logs.

## 📝 Common Tasks

### Add New IPC Handler

**1. In main.js:**
```javascript
ipcMain.handle('get-venues', async () => {
  const venues = db.prepare('SELECT * FROM venues').all();
  return venues;
});
```

**2. In preload.js:**
```javascript
getVenues: () => ipcRenderer.invoke('get-venues')
```

**3. In React:**
```javascript
const venues = await window.api.getVenues();
```

### Query the Database

```javascript
// In main.js (add an IPC handler)
const venues = db.prepare('SELECT * FROM venues').all();
const bookings = db.prepare('SELECT * FROM bookings WHERE venue_id = ?').all(venueId);
```

## 🎉 You're All Set!

The scaffolding is complete. You now have:

✅ Working Electron + React application  
✅ SQLite database with all tables  
✅ Hardware-locked licensing system  
✅ Secure IPC communication  
✅ Production-ready configuration  

**Next**: Start building your booking management features!

---

## 📖 Additional Resources

- [README.md](README.md) - Full documentation
- [SETUP_COMPLETE.md](SETUP_COMPLETE.md) - Implementation details
- Electron Docs: https://www.electronjs.org/docs
- better-sqlite3 API: https://github.com/WiseLibs/better-sqlite3/wiki/API

---

**Happy Coding! 🚀**
