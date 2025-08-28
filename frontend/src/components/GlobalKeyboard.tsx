import React from 'react';
import { useKeyboard } from '../contexts/KeyboardContext';
import OnScreenKeyboard from './OnScreenKeyboard';

const GlobalKeyboard: React.FC = () => {
  const { isKeyboardVisible, hideKeyboard } = useKeyboard();

  if (!isKeyboardVisible) {
    return null;
  }

  return (
    <OnScreenKeyboard 
      onClose={hideKeyboard}
      position="bottom"
    />
  );
};

export default GlobalKeyboard;
