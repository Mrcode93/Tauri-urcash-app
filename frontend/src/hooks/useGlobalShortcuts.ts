import { useEffect } from 'react';
import { useKeyboard } from '../contexts/KeyboardContext';

interface ShortcutConfig {
  key: string;
  callback: () => void;
  allowInForms?: boolean;
  description?: string;
}

export const useGlobalShortcuts = (shortcuts: ShortcutConfig[]) => {
  const { registerShortcut, unregisterShortcut } = useKeyboard();

  useEffect(() => {
    // Register all shortcuts
    shortcuts.forEach(({ key, callback, allowInForms }) => {
      registerShortcut(key, callback, { allowInForms });
    });

    // Cleanup: unregister all shortcuts
    return () => {
      shortcuts.forEach(({ key }) => {
        unregisterShortcut(key);
      });
    };
  }, [shortcuts, registerShortcut, unregisterShortcut]);
};

// Predefined shortcut keys for consistency
export const SHORTCUT_KEYS = {
  // Navigation
  SHOW_HELP: 'F1',
  ESCAPE: 'Escape',
  
  // POS shortcuts
  SHOW_KEYBOARD_SHORTCUTS: 'Ctrl+K',
  TOGGLE_VIEW_MODE: 'Ctrl+G',
  START_BARCODE_SCAN: 'Ctrl+B',
  NEW_CART: 'Ctrl+N',
  CREATE_SALE: 'Ctrl+D',
  PRINT_SALE: 'Ctrl+P',
  
  // Form shortcuts
  SUBMIT_FORM: 'Ctrl+Enter',
  CANCEL_FORM: 'Escape',
  
  // General shortcuts
  SAVE: 'Ctrl+S',
  UNDO: 'Ctrl+Z',
  REDO: 'Ctrl+Y',
  COPY: 'Ctrl+C',
  PASTE: 'Ctrl+V',
  CUT: 'Ctrl+X',
  SELECT_ALL: 'Ctrl+A',
  FIND: 'Ctrl+F',
  REFRESH: 'F5',
  
  // Developer tools
  TOGGLE_DEVTOOLS: 'F12',
} as const; 