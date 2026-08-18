# MHMS License Key Generator

## Overview
This tool generates activation keys for MHMS (Marriage Hall Management System) clients.

## ⚠️ IMPORTANT - Keep This Secret!
- **DO NOT** share this tool with clients
- **DO NOT** commit this to public repositories
- Keep the SECRET_SALT value private and secure
- This tool should only be used by authorized developers

## Usage

### Step 1: Get Machine ID from Client
Ask the client to run the MHMS application. On the activation screen, they will see their **Hardware ID** (Machine ID).

Example Machine ID:
```
d464c01d-3cbe-4e75-b200-2f34136ad222
```

### Step 2: Generate Activation Key
Run the keygen script with the client's Machine ID:

```bash
node keygen.js <MACHINE-ID>
```

**Example:**
```bash
node keygen.js d464c01d-3cbe-4e75-b200-2f34136ad222
```

### Step 3: Output
The script will output the activation key:

```
========================================
   ACTIVATION KEY GENERATED
========================================

Machine ID:
  d464c01d-3cbe-4e75-b200-2f34136ad222

Activation Key:
  a7f3c8e9b2d4f5a1c8e7b9d3f6a2c5e8b1d4f7a3c9e6b2d5f8a1c4e7b9d2f6a3

========================================

Copy the activation key above and send it to your client.
They should enter it in the MHMS activation screen.
```

### Step 4: Send to Client
Copy the **Activation Key** and send it to your client via:
- Email
- WhatsApp
- SMS
- Any secure channel

**Important:** Each activation key is hardware-locked and will ONLY work on the specific machine that generated the Machine ID.

## Security Notes

1. **Secret Salt:** The `SECRET_SALT` constant in keygen.js is critical. If you change it, all previously generated keys will become invalid.

2. **One Key Per Machine:** Each activation key is unique to a specific machine. If the client changes their hardware significantly (motherboard replacement, etc.), they will need a new key.

3. **No Expiration:** Generated keys do not expire. They remain valid indefinitely for the specific machine.

## Customization

If you want to change the secret salt (for enhanced security):

1. Open `keygen.js`
2. Find the line: `const SECRET_SALT = 'mhms-secret-salt-2026-grandpalace';`
3. Replace with your own unique string
4. **IMPORTANT:** After changing the salt, you must also update the same salt value in `src/main.js` (search for the same string)
5. All previously issued keys will become invalid

## Troubleshooting

**Q: Client says "Invalid activation key"**
- Verify you copied the correct Machine ID from their system
- Ensure you didn't accidentally add spaces or line breaks when copying
- Confirm the client entered the full activation key without modifications

**Q: Can I generate keys offline?**
- Yes! This tool works completely offline. No internet connection required.

**Q: How many keys can I generate?**
- Unlimited. Generate as many as needed for your clients.

## Support

For technical issues or questions:
- Email: zainiqbal7007@gmail.com
- Keep this tool backed up in a secure location

---

© 2026 Zain Iqbal - MHMS Developer Tool
