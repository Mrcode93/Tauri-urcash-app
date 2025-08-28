import React from 'react';
import { Keyboard, X } from 'lucide-react';
import { useKeyboard } from '../contexts/KeyboardContext';

interface KeyboardToggleButtonProps {
  variant?: 'default' | 'floating' | 'minimal' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  position?: 'fixed' | 'relative';
  className?: string;
  showLabel?: boolean;
}

const KeyboardToggleButton: React.FC<KeyboardToggleButtonProps> = ({
  variant = 'default',
  size = 'md',
  position = 'relative',
  className = '',
  showLabel = true
}) => {
  try {
    const { isKeyboardVisible, toggleKeyboard } = useKeyboard();

    const sizeClasses = {
      sm: 'h-8 w-8 text-sm',
      md: 'h-10 w-10 text-base',
      lg: 'h-12 w-12 text-lg'
    };

  const variantClasses = {
    default: 'bg-blue-500 hover:bg-blue-600 text-white shadow-md',
    floating: 'bg-white hover:bg-gray-50 text-gray-700 shadow-lg border border-gray-200',
    minimal: 'bg-transparent hover:bg-gray-100 text-gray-600',
    outline: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
  };

  const positionClasses = position === 'fixed' 
    ? 'fixed bottom-4 right-4 z-40' 
    : '';

  const baseClasses = `
    flex items-center justify-center rounded-lg transition-all duration-200 
    ${sizeClasses[size]} 
    ${variantClasses[variant]} 
    ${positionClasses}
    ${className}
  `;

  return (
    <button
      onClick={toggleKeyboard}
      className={baseClasses}
      title={isKeyboardVisible ? 'إخفاء لوحة المفاتيح' : 'إظهار لوحة المفاتيح'}
      aria-label={isKeyboardVisible ? 'إخفاء لوحة المفاتيح' : 'إظهار لوحة المفاتيح'}
    >
      {isKeyboardVisible ? (
        <X className="w-5 h-5" />
      ) : (
        <Keyboard className="w-5 h-5" />
      )}
      {showLabel && size !== 'sm' && (
        <span className="mr-2 hidden sm:inline">
          {isKeyboardVisible ? 'إخفاء' : 'لوحة المفاتيح'}
        </span>
      )}
    </button>
  );
  } catch (error) {
    console.error('KeyboardToggleButton error:', error);
    // Fallback render if context is not available
    return (
      <button
        className={`
          flex items-center justify-center rounded-lg transition-all duration-200 
          h-10 w-10 bg-gray-200 text-gray-600 hover:bg-gray-300
          ${className}
        `}
        onClick={() => {}}
        title="Keyboard not available"
      >
        <Keyboard className="w-5 h-5" />
      </button>
    );
  }
};

export default KeyboardToggleButton;
