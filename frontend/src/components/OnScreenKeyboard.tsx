import React, { useState, useEffect, useCallback } from 'react';
import { Keyboard, X, Languages, Delete, Space, CornerDownLeft } from 'lucide-react';
import { useKeyboard } from '../contexts/KeyboardContext';

interface OnScreenKeyboardProps {
  onClose?: () => void;
  position?: 'bottom' | 'floating';
  className?: string;
}

const OnScreenKeyboard: React.FC<OnScreenKeyboardProps> = ({ 
  onClose, 
  position = 'bottom',
  className = '' 
}) => {
  const { language, setLanguage } = useKeyboard();
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [currentInput, setCurrentInput] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Enhanced layouts with more comprehensive keys
  const layouts: Record<'EN' | 'AR', { 
    numbers: string[], 
    row1: string[], 
    row2: string[], 
    row3: string[],
    symbols: string[]
  }> = {
    EN: {
      numbers: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      row1: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      row2: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      row3: ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
      symbols: ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')']
    },
    AR: {
      numbers: ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '٠'],
      row1: ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح'],
      row2: ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك'],
      row3: ['ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ'],
      symbols: ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')']
    }
  };

  // Track active input element
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        setCurrentInput(target);
      }
    };

    const handleBlur = (e: FocusEvent) => {
      // Small delay to allow keyboard interactions before clearing
      setTimeout(() => {
        const activeElement = document.activeElement;
        if (!(activeElement instanceof HTMLInputElement) && !(activeElement instanceof HTMLTextAreaElement)) {
          setCurrentInput(null);
        }
      }, 100);
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);

    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, []);

  const handleKeyPress = useCallback((key: string) => {
    const active = currentInput || document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
    if (!active || (!('value' in active))) return;

    const start = active.selectionStart || 0;
    const end = active.selectionEnd || 0;
    
    // Store original value for React compatibility
    const originalValue = active.value;
    
    // Enhanced change trigger that works with React
    const triggerChange = (newValue: string) => {
      // React-compatible way to trigger change
      // This simulates a user typing by setting the value and triggering events
      
      // Use React's way of setting value to trigger change detection
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 
        'value'
      )?.set;
      
      const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 
        'value'
      )?.set;
      
      if (active instanceof HTMLInputElement && nativeInputValueSetter) {
        nativeInputValueSetter.call(active, newValue);
      } else if (active instanceof HTMLTextAreaElement && nativeTextAreaValueSetter) {
        nativeTextAreaValueSetter.call(active, newValue);
      }
      
      // Create and dispatch input event (React listens to this)
      const inputEvent = new Event('input', { 
        bubbles: true, 
        cancelable: true 
      });
      
      // Add React-specific properties to the event
      Object.defineProperty(inputEvent, 'target', {
        writable: false,
        value: active
      });
      
      Object.defineProperty(inputEvent, 'currentTarget', {
        writable: false,
        value: active
      });
      
      // Dispatch the event
      active.dispatchEvent(inputEvent);
      
      // Also dispatch change event for form validation
      const changeEvent = new Event('change', { 
        bubbles: true, 
        cancelable: true 
      });
      
      Object.defineProperty(changeEvent, 'target', {
        writable: false,
        value: active
      });
      
      active.dispatchEvent(changeEvent);
    };

    let newValue = originalValue;
    let newCursorPos = start;
    let shouldTriggerChange = true;

    switch (key) {
      case 'Space':
        newValue = originalValue.slice(0, start) + ' ' + originalValue.slice(end);
        newCursorPos = start + 1;
        break;
      case 'Backspace':
        if (start > 0) {
          newValue = originalValue.slice(0, start - 1) + originalValue.slice(end);
          newCursorPos = start - 1;
        } else {
          shouldTriggerChange = false;
        }
        break;
      case 'Enter':
        if (active instanceof HTMLTextAreaElement) {
          newValue = originalValue.slice(0, start) + '\n' + originalValue.slice(end);
          newCursorPos = start + 1;
        } else {
          shouldTriggerChange = false;
        }
        break;
      case 'Tab':
        newValue = originalValue.slice(0, start) + '\t' + originalValue.slice(end);
        newCursorPos = start + 1;
        break;
      case 'Shift':
        setIsShiftPressed(!isShiftPressed);
        shouldTriggerChange = false;
        break;
      case 'CapsLock':
        setCapsLock(!capsLock);
        shouldTriggerChange = false;
        break;
      default:
        let charToInsert = key;
        if ((isShiftPressed || capsLock) && language === 'EN') {
          charToInsert = key.toUpperCase();
        }
        newValue = originalValue.slice(0, start) + charToInsert + originalValue.slice(end);
        newCursorPos = start + charToInsert.length;
        break;
    }
    
    // Reset shift after key press (unless it's caps lock)
    if (key !== 'Shift' && key !== 'CapsLock' && isShiftPressed && !capsLock) {
      setIsShiftPressed(false);
    }
    
    // Apply changes if needed
    if (shouldTriggerChange && newValue !== originalValue) {
      triggerChange(newValue);
      // Set cursor position after React has updated
      setTimeout(() => {
        active.setSelectionRange(newCursorPos, newCursorPos);
        active.focus();
      }, 0);
    } else {
      active.focus();
    }
  }, [currentInput, isShiftPressed, capsLock, language]);

  const handleLanguageToggle = () => {
    setLanguage(language === 'EN' ? 'AR' : 'EN');
    setIsShiftPressed(false);
    setCapsLock(false);
  };

  const KeyButton = ({ 
    keyValue, 
    displayText, 
    className = '', 
    icon, 
    isActive = false 
  }: { 
    keyValue: string; 
    displayText?: string; 
    className?: string; 
    icon?: React.ReactNode;
    isActive?: boolean;
  }) => (
    <button
      className={`
        flex items-center justify-center p-2 bg-white hover:bg-gray-50 
        rounded-md shadow-sm border transition-all duration-150 text-sm font-medium
        ${isActive ? 'bg-blue-100 border-blue-300' : 'border-gray-200'}
        ${className}
      `}
      onClick={() => handleKeyPress(keyValue)}
      onMouseDown={(e) => e.preventDefault()} // Prevent losing focus
    >
      {icon || displayText || keyValue}
    </button>
  );

  const baseClasses = position === 'bottom' 
    ? "fixed bottom-0 left-0 right-0 z-[99999] scrollbar-hide" 
    : "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50";

  return (
    <div className={`${baseClasses} bg-gray-100 border border-gray-300 rounded-t-lg shadow-xl p-4 ${className} scrollbar-hide`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
            onClick={handleLanguageToggle}
          >
            <Languages className="w-4 h-4" />
            {language === 'EN' ? 'العربية' : 'English'}
          </button>
          
          <div className="text-sm text-gray-600 flex items-center gap-1">
            <Keyboard className="w-4 h-4" />
            {language === 'EN' ? 'English' : 'العربية'}
          </div>
        </div>
        
        {onClose && (
          <button
            className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
            إغلاق
          </button>
        )}
      </div>

      {/* Keyboard Layout */}
      <div className="space-y-2">
        {/* Numbers Row */}
        <div className="flex gap-1 justify-between">
          {layouts[language].numbers.map((key, index) => (
            <KeyButton 
              key={`num-${index}`} 
              keyValue={key} 
              className="flex-1 min-w-0"
            />
          ))}
          <KeyButton 
            keyValue="Backspace" 
            displayText=""
            icon={<Delete className="w-4 h-4" />}
            className="flex-1 min-w-0 bg-gray-200"
          />
        </div>

        {/* First Row */}
        <div className="flex gap-1">
          <KeyButton keyValue="Tab" displayText="Tab" className="w-16 bg-gray-200" />
          {layouts[language].row1.map((key, index) => (
            <KeyButton 
              key={`row1-${index}`} 
              keyValue={key} 
              displayText={(isShiftPressed || capsLock) && language === 'EN' ? key.toUpperCase() : key}
              className="flex-1 min-w-0"
            />
          ))}
        </div>

        {/* Second Row */}
        <div className="flex gap-1">
          <KeyButton 
            keyValue="CapsLock" 
            displayText="Caps" 
            className="w-20 bg-gray-200"
            isActive={capsLock}
          />
          {layouts[language].row2.map((key, index) => (
            <KeyButton 
              key={`row2-${index}`} 
              keyValue={key} 
              displayText={(isShiftPressed || capsLock) && language === 'EN' ? key.toUpperCase() : key}
              className="flex-1 min-w-0"
            />
          ))}
          <KeyButton 
            keyValue="Enter" 
            displayText=""
            icon={<CornerDownLeft className="w-4 h-4" />}
            className="w-20 bg-gray-200"
          />
        </div>

        {/* Third Row */}
        <div className="flex gap-1">
          <KeyButton 
            keyValue="Shift" 
            displayText="Shift" 
            className="w-24 bg-gray-200"
            isActive={isShiftPressed}
          />
          {layouts[language].row3.map((key, index) => (
            <KeyButton 
              key={`row3-${index}`} 
              keyValue={key} 
              displayText={(isShiftPressed || capsLock) && language === 'EN' ? key.toUpperCase() : key}
              className="flex-1 min-w-0"
            />
          ))}
          <KeyButton 
            keyValue="Shift" 
            displayText="Shift" 
            className="w-24 bg-gray-200"
            isActive={isShiftPressed}
          />
        </div>

        {/* Bottom Row */}
        <div className="flex gap-1">
          <KeyButton keyValue="123" displayText="123" className="w-16 bg-gray-200" />
          <KeyButton 
            keyValue="Space" 
            displayText=""
            icon={<Space className="w-4 h-4" />}
            className="flex-1 bg-gray-200"
          />
          <KeyButton keyValue="." displayText="." className="w-12" />
          <KeyButton keyValue="," displayText="," className="w-12" />
        </div>
      </div>
      
      {/* Input indicator */}
      {currentInput && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          الكتابة في: {currentInput.placeholder || currentInput.name || 'حقل نص'}
        </div>
      )}
    </div>
  );
};

export default OnScreenKeyboard;
