# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome extension (Manifest V3) that automatically sets YouTube video playback speed. The extension monitors YouTube pages and applies user-configured playback rates while detecting live streams to avoid speed changes. Features real-time settings sync and modern UI.

## Architecture

### Core Components

- **content.js**: Main logic using `YouTubeSpeedController` class with sophisticated live detection and real-time settings sync
- **popup.js**: Popup UI manager using `PopupManager` class for quick settings access
- **popup.html**: Compact popup UI (280px width) with Japanese localization for toolbar icon
- **options.js**: Detailed settings page using `OptionsManager` class with modern UI and user feedback
- **options.html**: Full-featured settings UI with comprehensive options and status feedback
- **manifest.json**: Extension configuration with YouTube host permissions, storage access, and popup action

### Key Design Patterns

- Class-based architecture with proper cleanup to prevent memory leaks
- Observer pattern using MutationObserver for DOM changes and settings changes
- Promise-based Chrome storage API wrappers with comprehensive error handling
- Real-time settings synchronization between options page and content script
- Sophisticated live stream detection using multiple reliable indicators
- Enhanced fullscreen support with dynamic video element detection
- Robust video transition handling for playlist/queue playback

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

### Fullscreen & Playlist Support

- **Dynamic video detection**: `findVideoElement()` method supports both normal and fullscreen modes
- **Fullscreen state monitoring**: Automatic speed reapplication when entering/exiting fullscreen
- **Video transition detection**: Robust handling of playlist/queue playback with `src` change monitoring
- **Event-based tracking**: Uses `timeupdate`, `loadstart`, and `loadedmetadata` events for reliable detection

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

1. **Code changes**: Make modifications to content.js, popup.js/popup.html, or options.js/options.html
2. **Quality check**: Run `npm run check` to format and lint
3. **Load extension**: 
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Reload" on the extension
4. **Test**: Use `./test-extension.sh` for automated Chrome launch with test URLs

### Code Quality

- **Biome**: Used for formatting and linting with strict rules
- **Complexity management**: Refactored setupPlayerObserver and setupVideoObserver methods to reduce cognitive complexity
- **Method decomposition**: Large methods split into smaller, single-responsibility functions
- **Error handling**: Comprehensive error handling throughout
- **Memory management**: Proper observer cleanup and event listener management
- **Performance**: Optimized DOM queries and minimal console output

### Testing Scenarios

1. **Normal videos**: Should apply custom speed (default 1.75x)
2. **Live streams**: Should force 1x speed automatically
3. **Settings changes**: Should apply immediately to current video
4. **Page navigation**: Should maintain functionality across YouTube navigation
5. **Memory management**: No leaks during extended usage
6. **Fullscreen playlist**: Should maintain speed settings when switching videos in fullscreen mode
7. **Fullscreen transitions**: Should reapply speed when entering/exiting fullscreen
8. **Popup functionality**: Click toolbar icon to open quick settings popup
9. **Settings sync**: Changes in popup should sync with options page and vice versa

### Debugging

Set `console.log` temporarily in `detectLiveStatus()` for troubleshooting live detection issues. The extension runs silently in production mode to avoid console pollution.

### Key Methods

- **YouTubeSpeedController.findVideoElement()**: Dynamic video element detection for normal/fullscreen modes
- **YouTubeSpeedController.detectLiveStatus()**: Multi-layered live stream detection with fallback logic
- **YouTubeSpeedController.handleVideoLoad()**: Robust playback rate application with retry logic
- **YouTubeSpeedController.handlePlayerMutations()**: Refactored mutation handling with reduced complexity
- **YouTubeSpeedController.processNewVideoElement()**: Streamlined new video element processing
- **OptionsManager.setupStorageListener()**: Real-time settings sync implementation
- **PopupManager.setupEventListeners()**: Simple auto-save on dropdown change (no buttons)

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

### UI Architecture

- **Dual UI approach**: Popup for quick access, options page for detailed settings
- **Popup dimensions**: 280px width for compact toolbar integration
- **Minimalist popup**: Only dropdown selector and info text, no buttons or links
- **Auto-save behavior**: Popup automatically saves settings on dropdown change
- **Cross-component sync**: Both popup and options page share the same storage and sync in real-time
- **Settings access**: Options page accessible via chrome://extensions/ for detailed configuration

### Important Implementation Notes

- **Video element detection**: Uses progressive fallback strategy for fullscreen compatibility
- **Speed application timing**: Implements delayed retry (500ms) to handle YouTube's internal resets
- **Live detection accuracy**: Combines DOM inspection, URL analysis, and time format parsing
- **Memory management**: All observers and listeners are properly cleaned up in Set-based tracking
- **Error resilience**: Comprehensive try-catch with graceful degradation for all Chrome API calls
- **Popup lifecycle**: Popup windows are ephemeral and must handle rapid open/close cycles
- **Code maintainability**: Recent refactoring reduced method complexity from 34 to <15 for better maintainability
- **Single responsibility**: Each method now handles a specific aspect of video monitoring or UI management