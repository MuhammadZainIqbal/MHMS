# Icon Placeholder

Place your application icons in this folder:

## Required Icons

1. **icon.ico** (Windows)
   - Recommended size: 256x256 pixels
   - Format: .ico file with multiple sizes (16, 32, 48, 64, 128, 256)
   - Used for: Application icon, taskbar, shortcuts

2. **icon.icns** (macOS - Optional)
   - Recommended size: 512x512 pixels
   - Format: .icns
   - Used for: macOS application icon

3. **loading.gif** (Optional)
   - Recommended size: 300x300 pixels
   - Format: Animated GIF
   - Used for: Windows installer loading screen

## How to Create Icons

### Online Tools:
- [ICO Convert](https://icoconvert.com/) - Convert PNG to ICO
- [CloudConvert](https://cloudconvert.com/) - Multi-format converter
- [Canva](https://www.canva.com/) - Design icons from scratch

### Desktop Software:
- Adobe Photoshop
- GIMP (Free)
- Inkscape (Free, vector)

## Tips

1. Use a simple, recognizable design
2. Ensure the icon looks good at small sizes (16x16, 32x32)
3. Use high contrast colors
4. Avoid complex details that won't be visible when scaled down

## Current Status

⚠️ **No icon files present** - The application will use default Electron icon until you add your own.

To add your icon:
1. Create or obtain your icon file
2. Name it `icon.ico` (for Windows)
3. Place it in this `assets/` folder
4. Rebuild the application with `npm run make`

---

For more information on icons in Electron Forge:
https://www.electronforge.io/guides/create-and-add-icons
