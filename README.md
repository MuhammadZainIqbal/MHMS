# MHMS - Marriage Hall Management System

A professional, offline-first Desktop Management System for Pakistani Marriage Halls/Marquees built with Electron, React, and SQLite.

## 🏗️ Tech Stack

- **Electron Forge** - Application framework
- **Vite** - Build tool and dev server
- **React 18** - UI library
- **better-sqlite3** - Embedded database (with WAL mode)
- **node-machine-id** - Hardware-based licensing
- **Node.js crypto** - SHA-256 key validation

## ✨ Features

### ✅ Completed (Scaffolding Phase)

- **Hardware-Locked Licensing System**
  - Machine-specific activation using hardware ID
  - SHA-256 cryptographic key validation
  - Activation key stored in AppData/userData
  - Persistent license validation across app restarts
  - Test key generation (for development)

- **SQLite Database Schema**
  - All data stored locally in `%AppData%/Roaming/MHMS/mhms.db`
  - WAL (Write-Ahead Logging) mode enabled for performance
  - Foreign key constraints enforced
  
  **Tables:**
  - `venues` - Hall/Marquee information (id, name, capacity)
  - `bookings` - Customer bookings (venue, customer, timing, service mode, status)
  - `financials` - Pricing data (guaranteed/actual guests, rates, rent)
  - `payments_log` - Payment tracking (amount, date, notes)
  - `extras` - Additional items/services

- **Secure IPC Architecture**
  - Context Isolation enabled
  - Node Integration disabled in renderer
  - Secure contextBridge API exposure
  - Production-ready Electron security practices

- **React UI**
  - Activation screen (locked state)
  - Main application dashboard (unlicensed state)
  - Responsive, modern design
  - Auto-updates on license status change

## 📁 Project Structure

```
MHMS/
├── src/
│   ├── main.js              # Main process (Database + License + IPC)
│   ├── preload.js           # IPC bridge (contextBridge)
│   ├── renderer/            # React UI
│   │   ├── renderer.jsx     # Entry point
│   │   ├── App.jsx          # Root component
│   │   ├── ActivationView.jsx   # License activation UI
│   │   ├── MainApp.jsx      # Main application UI
│   │   └── *.css            # Styles
│   ├── db/                  # Database modules (for reference)
│   │   └── database.js
│   └── main/                # License modules (for reference)
│       └── license.js
├── forge.config.js          # Electron Forge configuration
├── vite.main.config.mjs     # Vite config for main process
├── vite.preload.config.mjs  # Vite config for preload
├── vite.renderer.config.mjs # Vite config for renderer (React)
└── package.json
```

> **Note:** Database and license logic are currently inlined in `main.js` for build simplicity. The separate module files in `/db` and `/main` are provided for reference and future refactoring.

## 🚀 Getting Started

### Installation

```bash
cd MHMS
npm install
```

### Development

```bash
npm start
```

This will:
1. Start Vite dev server for the renderer process
2. Launch the Electron app
3. Open DevTools automatically
4. Enable hot-reload for React components

### First Run (Activation)

When you first run the app:

1. The **Activation View** will appear (since no license key exists)
2. You'll see your **Machine ID** (hardware identifier)
3. Click **"Generate Test Key"** to create a valid activation key for this machine
4. Click **"Activate Application"** to activate
5. The app will switch to the **Main Application View**

> ⚠️ **Production Note:** The "Generate Test Key" button should be removed in production builds. In a real deployment, keys would be generated server-side based on customer's Machine ID.

## 🔐 Licensing System

### How It Works

1. **Machine ID Generation**
   - Uses `node-machine-id` to generate a unique, permanent hardware ID
   - ID remains consistent across app restarts
   - Based on hardware fingerprint (motherboard, CPU, etc.)

2. **Key Validation**
   - Activation key = `SHA-256(Machine ID)`
   - Key is validated against the current machine's hardware ID
   - Invalid keys are rejected immediately

3. **Key Storage**
   - Valid keys are stored in: `%AppData%/Roaming/MHMS/activation.key`
   - File is checked on every app startup
   - No internet connection required after activation

4. **Gatekeeper Logic**
   - App checks license status before creating the window
   - If unlicensed → shows Activation View
   - If licensed → shows Main Application

### Testing the License System

```javascript
// Available IPC methods (accessible via window.api in React):
window.api.getMachineId()           // Get hardware ID
window.api.checkLicenseStatus()     // Check if activated
window.api.activateApp(key)         // Activate with key
window.api.generateTestKey()        // Generate test key (dev only)
window.api.deactivateApp()          // Deactivate (dev only)
```

## 🗄️ Database

### Location

- **Development:** `%AppData%/Roaming/Electron/mhms.db`
- **Production:** `%AppData%/Roaming/MHMS/mhms.db`

### Configuration

- **Journal Mode:** WAL (Write-Ahead Logging)
- **Foreign Keys:** Enabled
- **Verbose Logging:** Enabled (shows SQL in console)

### Accessing the Database

You can access the database using any SQLite client:

```bash
# Using sqlite3 CLI
sqlite3 "%AppData%\Roaming\MHMS\mhms.db"

# Example queries
.tables                          # List all tables
SELECT * FROM venues;            # View venues
SELECT * FROM bookings;          # View bookings
```

### Sample Data

Three venues are auto-seeded on first activation:
- Grand Hall (500 capacity)
- VIP Lawn (300 capacity)
- Rooftop Terrace (200 capacity)

## ⚙️ Configuration

### Vite Configuration

**vite.main.config.mjs:**
```javascript
external: ['better-sqlite3', 'node-machine-id']
```
Native modules are externalized to avoid bundling issues.

**forge.config.js:**
```javascript
asarUnpack: [
  '**/node_modules/better-sqlite3/**/*',
  '**/node_modules/node-machine-id/**/*'
]
```
Native binaries are unpacked from `.asar` archive for runtime access.

## 📦 Building for Production

```bash
# Create distributable packages
npm run make
```

This will generate installers in the `/out` directory for Windows.

### Build Artifacts

- **Squirrel (Windows):** `.exe` installer
- **Zip:** Portable version

## 🔒 Security Best Practices Implemented

- ✅ Context Isolation enabled
- ✅ Node Integration disabled in renderer
- ✅ Secure IPC via contextBridge
- ✅ Renderer process sandboxing considered
- ✅ No eval() or unsafe code execution
- ✅ All IPC handlers properly validated

## 🐛 Troubleshooting

### Issue: "Cannot find module better-sqlite3"

**Solution:** Native modules must be rebuilt for Electron:
```bash
npm rebuild better-sqlite3 --runtime=electron --target=<electron-version>
```

### Issue: "Database is locked"

**Solution:** Close all connections before quitting:
- The app automatically calls `closeDatabase()` on `before-quit`
- Check that no other process is accessing the `.db` file

### Issue: "Activation key invalid"

**Solution:** 
- Ensure you're using the test key generator
- Verify the machine ID matches
- Check that the key wasn't corrupted (trim whitespace)

## 📋 Next Steps (Roadmap)

### Phase 2: Core Features
- [ ] Booking management (CRUD operations)
- [ ] Venue assignment and conflict detection
- [ ] Customer database
- [ ] Calendar/Timeline view
- [ ] Financial calculations (guests × rate + extras)

### Phase 3: Advanced Features
- [ ] Payment tracking and receipts
- [ ] Reports and analytics
- [ ] Search and filters
- [ ] Export to PDF/Excel
- [ ] Backup/restore functionality

### Phase 4: Pakistani Market Customization
- [ ] Urdu language support
- [ ] Pakistani Rupee (PKR) formatting
- [ ] Local date/time formats
- [ ] Mehndi, Barat, Walima event types
- [ ] Food menu templates

## 📝 License

Proprietary - All rights reserved

## 🛠️ Development Notes

### Key Files to Modify

- **src/main.js** - Add database CRUD operations here
- **src/renderer/MainApp.jsx** - Build your main UI features here
- **src/renderer/ActivationView.jsx** - Customize activation screen

### IPC Pattern

To add new IPC handlers:

1. **In main.js:**
```javascript
ipcMain.handle('my-action', async (event, arg) => {
  // Handle the action
  return result;
});
```

2. **In preload.js:**
```javascript
contextBridge.exposeInMainWorld('api', {
  myAction: (arg) => ipcRenderer.invoke('my-action', arg)
});
```

3. **In React:**
```javascript
const result = await window.api.myAction(arg);
```

## 📞 Support

For issues or questions about the scaffolding, refer to:
- Electron Documentation: https://www.electronjs.org/docs
- Vite Documentation: https://vitejs.dev
- better-sqlite3 Documentation: https://github.com/WiseLibs/better-sqlite3

---

**Built with ❤️ for the Pakistani event management industry**
