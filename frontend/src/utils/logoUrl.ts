/**
 * Utility function to get the correct logo URL for both development and Electron production
 * @param logoPath - The logo path from the settings
 * @returns The full URL to access the logo
 */
export const getLogoUrl = (logoPath: string | null | undefined): string => {
  if (!logoPath) return '';
  if (logoPath.startsWith('http')) return logoPath;
  if (logoPath.startsWith('blob:')) return logoPath;

  const normalizedPath = logoPath.startsWith('/') ? logoPath : `/${logoPath}`;

  // Check if running in Electron
  const isElectron = typeof window !== 'undefined' && (
    ((window as any).process?.type === 'renderer') ||
    navigator.userAgent.toLowerCase().includes('electron')
  );

  if (isElectron) {
    const isProduction = import.meta.env.PROD || window.location.protocol === 'file:';
    const port = isProduction ? 39000 : 39000; // Use the same port for both modes
    return `http://localhost:39000${normalizedPath}`;
  }

  return `http://localhost:39000${normalizedPath}`;
};

/**
 * Alternative function that detects production by checking multiple indicators
 */
export const getLogoUrlSafe = (logoPath: string | null | undefined): string => {
  if (!logoPath) return '';
  if (logoPath.startsWith('http')) return logoPath;
  if (logoPath.startsWith('blob:')) return logoPath;

  const normalizedPath = logoPath.startsWith('/') ? logoPath : `/${logoPath}`;

  // Check if running in Electron
  const isElectron = typeof window !== 'undefined' && (
    ((window as any).process?.type === 'renderer') ||
    navigator.userAgent.toLowerCase().includes('electron')
  );

  if (isElectron) {
    const isProduction = import.meta.env.PROD || window.location.protocol === 'file:';
    const port = isProduction ? 39000 : 8000;
    
    return `http://localhost:39000${normalizedPath}`;
  }

  const url = `${import.meta.env.VITE_API_URL || 'http://localhost:39000'}${normalizedPath}`;
  
  return url;
};
