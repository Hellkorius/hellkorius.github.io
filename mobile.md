# Mobile Family Tree Builder

The mobile version of the Family Tree Builder is a standalone, touch-optimized experience built for mobile devices.

## File Structure

```
mobile/
├── index.html        # Mobile HTML with PWA features, critical CSS
└── mobile-app.js      # Complete React app (vanilla JS, no build process)
```

## Architecture

- **Standalone**: No build process required - direct HTML/JS files
- **Vanilla React**: Uses React from CDN for fast loading
- **Data Compatible**: Shares localStorage with desktop version
- **PWA Ready**: Includes mobile-specific meta tags and app manifest

## Development Workflow

1. **Edit Files Directly**: Modify `mobile/index.html` or `mobile/mobile-app.js`
2. **Test Locally**: Open `mobile/index.html` in browser or serve locally
3. **Deploy**: Files are already in git root, deploy with normal process:
   ```bash
   git add mobile/ && git commit -m "Update mobile" && git push
   ```

## Key Features

### Touch Interactions
- **Navigate Mode**: Drag canvas to pan, long-press people to edit
- **Add Mode**: Tap anywhere to add new people
- **Connect Mode**: Tap people to create relationships, drag canvas to pan

### Mobile UI Components
- **MobilePersonNode**: Touch-optimized person cards with long-press editing
- **MobileCanvas**: Canvas with pan/zoom touch handling
- **MobileMenu**: Beautiful bottom-sheet menu (tap ⋯ button)
- **Modal Forms**: Full-screen forms for adding/editing people

### Auto-Redirect
Desktop site automatically redirects mobile devices to `/mobile/index.html` via detection script in `public/index.html`.

## Development Notes

- **No Build Step**: Edit JS directly, no transpilation needed
- **React Elements**: Uses `React.createElement()` instead of JSX
- **Inline Styles**: All styling done via JavaScript style objects
- **Data Sync**: Uses same localStorage key as desktop version
- **Version Info**: Shows "Mobile | [name] v[version]" loaded from `/version.json`

## File Locations

- **Mobile App**: `/mobile/` (standalone, in git root)
- **Desktop App**: `/src/` (React app, requires build)
- **Deploy**: Both versions deployed from git root to GitHub Pages