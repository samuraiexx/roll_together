# Roll Together
Roll Together is a browser extension for Google Chrome and Mozilla Firefox. It synchronizes Crunchyroll Videos that are being played at multiple computers.

## Browser Support
- **Chrome/Chromium**: Manifest V3 (Chrome 116+)
- **Firefox**: Manifest V2 (Firefox 109+)

## Download
- **Chrome**: [Chrome Web Store](https://chrome.google.com/webstore/detail/ilpfeljgdikoabaclkjgkbeegeoijfca)
- **Firefox**: Available as a signed add-on (coming soon)

## Development Setup

### Prerequisites
- Node.js and npm
- Git

### Building the Extension

#### For Chrome (Manifest V3):
```bash
npm install
npm run build:chrome
# Output will be in the 'build' directory
```

#### For Firefox (Manifest V2):
```bash
npm install
npm run build:firefox
# Output will be in the 'build-firefox' directory
```

#### For both browsers:
```bash
npm run build:production:chrome
npm run build:production:firefox
npm run package
# Creates rolltogether-chrome.zip and rolltogether-firefox.zip
```

### Development Mode
```bash
# Watch mode for Chrome
npm run watch:chrome

# Watch mode for Firefox
npm run watch:firefox
```

## Installation from Source

### Chrome/Chromium
1. Open the Extension Management page by navigating to chrome://extensions.
2. Enable Developer Mode by clicking the toggle switch next to Developer mode.
3. Click the LOAD UNPACKED button and select the `build` directory.

### Firefox
1. Navigate to about:debugging
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select any file in the `build-firefox` directory

![](https://developer.chrome.com/static/images/get_started/load_extension.png)

## TODO
- [x] Customizable Palette
- [x] Improve Logo/Name
- [x] Improve structure to allow more than one tab at the same time
- [x] Firefox Browser Support
- [ ] Work with autoplay
- [ ] Create a Website

## Related Repos
Backend repo: https://github.com/samuraiexx/roll_together_backend
