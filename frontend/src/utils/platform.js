// Check if running in Electron
const isElectron = window && window.process && window.process.type;

// Get platform-specific styles
export function getPlatformStyles() {
  if (!isElectron) return {};

  const platform = window.process.platform;
  
  return {
    // Windows-specific styles
    windows: {
      titleBar: {
        WebkitAppRegion: 'drag',
        height: '32px',
      },
      content: {
        paddingTop: '32px',
      },
    },
    // macOS-specific styles
    darwin: {
      titleBar: {
        WebkitAppRegion: 'drag',
        height: '28px',
      },
      content: {
        paddingTop: '28px',
      },
    },
  }[platform] || {};
}

// Get platform-specific behaviors
export function getPlatformBehaviors() {
  if (!isElectron) return {};

  const platform = window.process.platform;
  
  return {
    // Windows-specific behaviors
    windows: {
      // Add Windows-specific behaviors here
      shouldShowTitleBar: true,
      shouldShowMenuBar: true,
    },
    // macOS-specific behaviors
    darwin: {
      // Add macOS-specific behaviors here
      shouldShowTitleBar: false,
      shouldShowMenuBar: true,
    },
  }[platform] || {};
}

// Get current platform
export function getCurrentPlatform() {
  if (!isElectron) return 'web';
  return window.process.platform;
}

// Check if running on Windows
export function isWindows() {
  return getCurrentPlatform() === 'win32';
}

// Check if running on macOS
export function isMacOS() {
  return getCurrentPlatform() === 'darwin';
}

// Check if running on Linux
export function isLinux() {
  return getCurrentPlatform() === 'linux';
} 