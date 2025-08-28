import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';

interface KeyboardContextType {
  isKeyboardVisible: boolean;
  showKeyboard: () => void;
  hideKeyboard: () => void;
  toggleKeyboard: () => void;
  language: 'EN' | 'AR';
  setLanguage: (lang: 'EN' | 'AR') => void;
  // Global keyboard shortcuts
  registerShortcut: (key: string, callback: () => void, options?: { allowInForms?: boolean }) => void;
  unregisterShortcut: (key: string) => void;
}

const KeyboardContext = createContext<KeyboardContextType | undefined>(undefined);

export const useKeyboard = () => {
  const context = useContext(KeyboardContext);
  if (!context) {
    throw new Error('useKeyboard must be used within a KeyboardProvider');
  }
  return context;
};

interface KeyboardProviderProps {
  children: ReactNode;
}

export const KeyboardProvider: React.FC<KeyboardProviderProps> = ({ children }) => {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [language, setLanguage] = useState<'EN' | 'AR'>('AR');
  
  // Global shortcuts registry
  const [shortcuts, setShortcuts] = useState<Map<string, { callback: () => void; allowInForms: boolean }>>(new Map());

  const showKeyboard = () => setIsKeyboardVisible(true);
  const hideKeyboard = () => setIsKeyboardVisible(false);
  const toggleKeyboard = () => setIsKeyboardVisible(!isKeyboardVisible);

  // Register a global keyboard shortcut
  const registerShortcut = useCallback((key: string, callback: () => void, options: { allowInForms?: boolean } = {}) => {
    setShortcuts(prev => new Map(prev).set(key, { 
      callback, 
      allowInForms: options.allowInForms || false 
    }));
  }, []);

  // Unregister a global keyboard shortcut
  const unregisterShortcut = useCallback((key: string) => {
    setShortcuts(prev => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
  }, []);

  // Global keyboard shortcut handler
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isTypingInInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      
      // Build shortcut key
      const modifiers = [];
      if (e.ctrlKey || e.metaKey) modifiers.push('Ctrl');
      if (e.shiftKey) modifiers.push('Shift');
      if (e.altKey) modifiers.push('Alt');
      
      const shortcutKey = [...modifiers, e.key].join('+');
      
      // Check if this shortcut is registered
      const shortcut = shortcuts.get(shortcutKey);
      if (shortcut) {
        // Check if shortcut is allowed in forms
        if (isTypingInInput && !shortcut.allowInForms) {
          return; // Block shortcut when typing in forms
        }
        
        e.preventDefault();
        shortcut.callback();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [shortcuts]);

  const value: KeyboardContextType = {
    isKeyboardVisible,
    showKeyboard,
    hideKeyboard,
    toggleKeyboard,
    language,
    setLanguage,
    registerShortcut,
    unregisterShortcut,
  };

  return (
    <KeyboardContext.Provider value={value}>
      {children}
    </KeyboardContext.Provider>
  );
};
