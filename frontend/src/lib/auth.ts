/**
 * Authentication token storage module
 * Handles token persistence for both Tauri desktop apps and web browsers
 */

// Check if running in Tauri environment
const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__;

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

/**
 * Save authentication token
 * @param token - JWT token to save
 */
export async function saveToken(token: string): Promise<void> {
  try {
    // For now, use localStorage for both Tauri and web
    // TODO: Implement Tauri store when the plugin is properly configured
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
    }
  } catch (error) {
    console.error('Failed to save token:', error);
  }
}

/**
 * Retrieve authentication token
 * @returns Promise<string | null> - JWT token or null if not found
 */
export async function getToken(): Promise<string | null> {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  } catch (error) {
    console.error('Failed to get token:', error);
    return null;
  }
}

/**
 * Clear authentication token
 */
export async function clearToken(): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (error) {
    console.error('Failed to clear token:', error);
  }
}

/**
 * Save user data
 * @param user - User object to save
 */
export async function saveUser(user: any): Promise<void> {
  try {
    const userData = JSON.stringify(user);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(USER_KEY, userData);
    }
  } catch (error) {
    console.error('Failed to save user:', error);
  }
}

/**
 * Retrieve user data
 * @returns Promise<any | null> - User object or null if not found
 */
export async function getUser(): Promise<any | null> {
  try {
    if (typeof localStorage !== 'undefined') {
      const userData = localStorage.getItem(USER_KEY);
      if (userData) {
        return JSON.parse(userData);
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to get user:', error);
    return null;
  }
}

/**
 * Clear user data
 */
export async function clearUser(): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(USER_KEY);
    }
  } catch (error) {
    console.error('Failed to clear user:', error);
  }
}

/**
 * Clear all authentication data
 */
export async function clearAuth(): Promise<void> {
  await Promise.all([
    clearToken(),
    clearUser()
  ]);
}

/**
 * Check if running in Tauri environment
 * @returns boolean - true if running in Tauri
 */
export function isTauriEnvironment(): boolean {
  return isTauri;
}

/**
 * Initialize the auth storage
 * Call this at app startup
 */
export async function initAuthStorage(): Promise<void> {
  // For now, just use localStorage
  // TODO: Implement Tauri store when the plugin is properly configured
  console.log('Auth storage initialized: localStorage');
}

export default {
  saveToken,
  getToken,
  clearToken,
  saveUser,
  getUser,
  clearUser,
  clearAuth,
  isTauriEnvironment,
  initAuthStorage
};