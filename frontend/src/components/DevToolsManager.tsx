import React, { useEffect } from 'react';
import { useGlobalShortcuts, SHORTCUT_KEYS } from '../hooks/useGlobalShortcuts';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

const DevToolsManager: React.FC = () => {
  const handleToggleDevtools = async () => {
    try {
      const result = await invoke('toggle_devtools');
      toast.info('DevTools', {
        description: 'Right-click → Inspect Element, or press Ctrl+Shift+I (Cmd+Option+I on Mac)',
        duration: 4000,
      });
      console.log('DevTools toggle result:', result);
    } catch (error) {
      console.error('Failed to toggle devtools:', error);
      toast.error('DevTools Error', {
        description: 'Failed to toggle developer tools',
      });
    }
  };

  useGlobalShortcuts([
    {
      key: SHORTCUT_KEYS.TOGGLE_DEVTOOLS,
      callback: handleToggleDevtools,
      allowInForms: true,
      description: 'Toggle Developer Tools'
    }
  ]);

  // Also add a keyboard listener for the common devtools shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+I (Windows/Linux) or Cmd+Option+I (Mac)
      const isDevToolsShortcut = 
        event.key === 'I' && 
        (
          (event.ctrlKey && event.shiftKey && !event.metaKey) || // Windows/Linux
          (event.metaKey && event.altKey && !event.ctrlKey)    // Mac
        );

      if (isDevToolsShortcut) {
        event.preventDefault();
        handleToggleDevtools();
      }

      // F12 shortcut
      if (event.key === 'F12') {
        event.preventDefault();
        handleToggleDevtools();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return null; // This component doesn't render anything
};

export default DevToolsManager;