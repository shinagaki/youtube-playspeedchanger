# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome extension (Manifest V3) that automatically sets YouTube video playback speed. The extension monitors YouTube pages and applies user-configured playback rates while detecting live streams to avoid speed changes. Features real-time settings sync and modern UI.

## Architecture

### Core Components

- **content.js**: Main logic using `YouTubeSpeedController` class with sophisticated live detection and real-time settings sync
- **options.js**: Settings page using `OptionsManager` class with modern UI and user feedback
- **options.html**: Responsive settings UI with Japanese localization and status feedback
- **manifest.json**: Extension configuration with YouTube host permissions and storage access

### Key Design Patterns

- Class-based architecture with proper cleanup to prevent memory leaks
- Observer pattern using MutationObserver for DOM changes and settings changes
- Promise-based Chrome storage API wrappers with comprehensive error handling
- Real-time settings synchronization between options page and content script
- Sophisticated live stream detection using multiple reliable indicators

### Live Stream Detection

The extension uses a multi-layered approach to detect live streams:
1. **Primary indicators**: `.ytp-live` class presence
2. **URL-based detection**: `/live/` path detection
3. **Complex time format analysis**: Distinguishes between live (`•ライブ`) and recorded video (`0:26 / 10:20`) formats
4. **Fallback conditions**: Progress bar presence and duration validation

Live streams are automatically set to 1x speed while recorded videos use the configured rate.

### Real-time Settings Sync

- `chrome.storage.onChanged` listener in content script
- Immediate application of new settings to currently playing videos
- No page reload required for settings changes

## Development Commands

### Essential Commands
```bash
# Install dependencies
npm install

# Code quality check and format (primary command)
npm run check

# Individual commands
npm run lint        # Lint only
npm run format      # Format only  
npm run ci          # CI mode (no fixes applied)

# Test extension in Chrome (WSL)
./test-extension.sh
```

### Development Workflow

1. **Code changes**: Make modifications to content.js, options.js, or options.html
2. **Quality check**: Run `npm run check` to format and lint
3. **Load extension**: 
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Reload" on the extension
4. **Test**: Use `./test-extension.sh` for automated Chrome launch with test URLs

### Code Quality

- **Biome**: Used for formatting and linting with strict rules
- **Error handling**: Comprehensive error handling throughout
- **Memory management**: Proper observer cleanup and event listener management
- **Performance**: Optimized DOM queries and minimal console output

### Testing Scenarios

1. **Normal videos**: Should apply custom speed (default 1.75x)
2. **Live streams**: Should force 1x speed automatically
3. **Settings changes**: Should apply immediately to current video
4. **Page navigation**: Should maintain functionality across YouTube navigation
5. **Memory management**: No leaks during extended usage

### Debugging

Set `console.log` temporarily in `detectLiveStatus()` for troubleshooting live detection issues. The extension runs silently in production mode to avoid console pollution.

### Chrome Storage

Settings stored using `chrome.storage.sync`:
- Default playback rate: 1.75x
- Real-time sync across extension components
- Comprehensive error handling for storage operations

## Extension Testing

### Test URLs
- **Normal video**: https://www.youtube.com/watch?v=dQw4w9WgXcQ
- **Live streams**: Search for current live streams on YouTube
- **Playlists**: Use any YouTube playlist for navigation testing

### Manual Testing Checklist
See `TEST_CASES.md` for comprehensive test scenarios including:
- Basic functionality (normal videos, live detection, settings)
- Edge cases (page navigation, video state changes)
- Performance (memory leaks, multi-tab support)

### Chrome Extension Development
- Load unpacked extension from `chrome://extensions/`
- Enable "Developer mode" before loading
- Use "Reload" button after code changes
- Check console for any JavaScript errors during development