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

## Development Notes

### Code Quality

- **Biome**: Used for formatting and linting (`npm run check`)
- **Error handling**: Comprehensive error handling throughout
- **Memory management**: Proper observer cleanup and event listener management
- **Performance**: Optimized DOM queries and minimal console output

### Testing Changes

1. Load extension in Chrome developer mode
2. Run `npm run check` for code quality
3. Test scenarios:
   - Normal videos (should apply custom speed)
   - Live streams (should force 1x speed)
   - Settings changes (should apply immediately)
   - Page navigation (should maintain functionality)

### Debugging

Set `console.log` temporarily in `detectLiveStatus()` for troubleshooting live detection issues. The extension runs silently in production mode.

### Chrome Storage

Settings stored using `chrome.storage.sync`:
- Default playback rate: 1.75x
- Real-time sync across extension components
- Comprehensive error handling for storage operations