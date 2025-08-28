/**
 * Authentication token storage module
 * Handles token persistence for both Tauri desktop apps and web browsers
 */

import { S } from 'node_modules/framer-motion/dist/types.d-Cjd591yU';
import { Store as TauriStore } from 'tauri-plugin-store-api'




// Check if running in Tauri environment
const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__;

// Tauri store imports (only available in Tauri environment)
let Store: typeof TauriStore | null = null;
let store: TauriStore | null = null;

// Initialize Tauri store if available - will be done in initAuthStorage
// This avoids build-time issues when Tauri store isn't available

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

/**
 * Save authentication token
 * @param token - JWT token to save
 */
export async function saveToken(token: string): Promise<void> {
  try {
    if (isTauri && store) {
      // Use Tauri store for desktop app
      await store.set(TOKEN_KEY, token);
      await store.save();
    } else {
      // Use localStorage for web browser
      localStorage.setItem(TOKEN_KEY, token);
    }
  } catch (error) {
    console.error('Failed to save token:', error);
    // Fallback to localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
    }
  }
}

/**
 * Retrieve authentication token
 * @returns Promise<string | null> - JWT token or null if not found
 */
export async function getToken(): Promise<string | null> {
  try {
    if (isTauri && store) {
      // Use Tauri store for desktop app
      const token = await store.get(TOKEN_KEY);
      return token || null;
    } else {
      // Use localStorage for web browser
      return localStorage.getItem(TOKEN_KEY);
    }
  } catch (error) {
    console.error('Failed to get token:', error);
    // Fallback to localStorage
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  }
}

/**
 * Clear authentication token
 */
export async function clearToken(): Promise<void> {
  try {
    if (isTauri && store) {
      // Use Tauri store for desktop app
      await store.delete(TOKEN_KEY);
      await store.save();
    } else {
      // Use localStorage for web browser
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (error) {
    console.error('Failed to clear token:', error);
    // Fallback to localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
    }
  }
}

/**
 * Save user data
 * @param user - User object to save
 */
export async function saveUser(user: any): Promise<void> {
  try {
    const userData = JSON.stringify(user);
    if (isTauri && store) {
      // Use Tauri store for desktop app
      await store.set(USER_KEY, userData);
      await store.save();
    } else {
      // Use localStorage for web browser
      localStorage.setItem(USER_KEY, userData);
    }
  } catch (error) {
    console.error('Failed to save user:', error);
    // Fallback to localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }
}

/**
 * Retrieve user data
 * @returns Promise<any | null> - User object or null if not found
 */
export async function getUser(): Promise<any | null> {
  try {
    let userData: string | null = null;
    
    if (isTauri && store) {
      // Use Tauri store for desktop app
      userData = await store.get(USER_KEY);
    } else {
      // Use localStorage for web browser
      userData = localStorage.getItem(USER_KEY);
    }
    
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  } catch (error) {
    console.error('Failed to get user:', error);
    // Fallback to localStorage
    if (typeof localStorage !== 'undefined') {
      const userData = localStorage.getItem(USER_KEY);
      if (userData) {
        try {
          return JSON.parse(userData);
        } catch (parseError) {
          console.error('Failed to parse user data:', parseError);
          return null;
        }
      }
    }
    return null;
  }
}

/**
 * Clear user data
 */
export async function clearUser(): Promise<void> {
  try {
    if (isTauri && store) {
      // Use Tauri store for desktop app
      await store.delete(USER_KEY);
      await store.save();
    } else {
      // Use localStorage for web browser
      localStorage.removeItem(USER_KEY);
    }
  } catch (error) {
    console.error('Failed to clear user:', error);
    // Fallback to localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(USER_KEY);
    }
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
  if (isTauri && !store) {
    try {
      // Use a more dynamic approach to avoid build-time issues
      const importPath = '@tauri-apps/plugin-store';
      const importFunc = new Function('path', 'return import(path)');
      
      const tauriStore = await importFunc(importPath).catch((error: any) => {
        console.warn('Tauri store plugin not available:', error.message);
        return null;
      });
      
      if (tauriStore) {
        Store = tauriStore.Store;
        store = new Store('auth.dat');
        console.log('Tauri auth storage initialized');
      } else {
        console.warn('Tauri store plugin not available, using localStorage fallback');
      }
    } catch (error) {
      console.warn('Failed to initialize Tauri store, falling back to localStorage:', error);
    }
  }
  
  // Always log what storage method we're using
  console.log('Auth storage initialized:', isTauri && store ? 'Tauri Store' : 'localStorage');
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