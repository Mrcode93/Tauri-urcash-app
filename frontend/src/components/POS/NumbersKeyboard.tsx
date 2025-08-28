import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Keyboard, X, Delete, Check, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NumbersKeyboardProps {
  onNumberPress: (number: string) => void;
  onEnter: () => void;
  onClear: () => void;
  onBackspace: () => void;
  value: string;
  isOpen: boolean;
  onToggle: () => void;
  mode?: 'cart' | 'paid';
  onOperatorPress?: (operator: '+' | '-' | '*' | '÷') => void;
  showCalculator?: boolean;
  colors?: {
    primary: {
      DEFAULT: string;
      dark: string;
      light: string;
    };
    text: {
      primary: string;
      inverted: string;
      secondary: string;
    };
    background: {
      DEFAULT: string;
      light: string;
    };
    border: {
      light: string;
      DEFAULT: string;
    };
    accent: {
      success: string;
      danger: string;
    };
  };
}

const NumbersKeyboard: React.FC<NumbersKeyboardProps> = ({
  onNumberPress,
  onEnter,
  onClear,
  onBackspace,
  value,
  isOpen,
  onToggle,
  mode = 'cart',
  onOperatorPress,
  showCalculator = false,
  colors
}) => {
  // Keyboard layout
  const numbers = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['0', '00', '000']
  ];

  const operators = ['+', '-', '*', '÷', '.'];

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Check if any modal is open by looking for dialog elements
      const activeModal = document.querySelector('[role="dialog"]');
      const manualPriceModal = document.querySelector('[data-radix-dialog-content]');
      const anyModal = activeModal || manualPriceModal;
      
      // Check if the target is an input field within a modal
      const target = e.target as HTMLElement;
      const isInputInModal = target.tagName === 'INPUT' && (
        target.closest('[role="dialog"]') || 
        target.closest('[data-radix-dialog-content]') ||
        target.closest('.dialog') ||
        target.closest('[data-modal]')
      );
      
      if (anyModal || isInputInModal) {
        // If a modal is open or user is typing in modal input, don't capture keyboard input
        return;
      }

      // Prevent default behavior when keyboard is open
      if (e.key >= '0' && e.key <= '9' || e.key === '.' || operators.includes(e.key)) {
        e.preventDefault();
      }

      // Number keys
      if (e.key >= '0' && e.key <= '9') {
        onNumberPress(e.key);
      }
      // Decimal point
      else if (e.key === '.') {
        onNumberPress('.');
      }
      // Enter key
      else if (e.key === 'Enter') {
        e.preventDefault();
        onEnter();
      }
      // Backspace
      else if (e.key === 'Backspace') {
        e.preventDefault();
        onBackspace();
      }
      // Escape to clear or close
      else if (e.key === 'Escape') {
        if (value) {
          onClear();
        } else {
          onToggle();
        }
      }
      // Operators
      else if (showCalculator && onOperatorPress) {
        if (e.key === '+') onOperatorPress('+');
        else if (e.key === '-') onOperatorPress('-');
        else if (e.key === '*') onOperatorPress('*');
        else if (e.key === '/') onOperatorPress('÷');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, value, onNumberPress, onEnter, onBackspace, onClear, onToggle, onOperatorPress, showCalculator, operators]);

  // Close keyboard when modals open
  useEffect(() => {
    const checkForModals = () => {
      // Check for various types of modals
      const activeModal = document.querySelector('[role="dialog"]');
      const manualPriceModal = document.querySelector('[data-radix-dialog-content]');
      const anyModal = activeModal || manualPriceModal;
      
      if (anyModal && isOpen) {
        onToggle(); // Close the keyboard
      }
    };

    // Check immediately
    checkForModals();

    // Set up observer to watch for modal changes
    const observer = new MutationObserver(checkForModals);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-state']
    });

    return () => observer.disconnect();
  }, [isOpen, onToggle]);

  if (!isOpen) {
    return (
      <div className="w-full flex items-center justify-center">
        <Button
          variant="outline"
          className="h-16 w-full flex items-center justify-center gap-2 text-lg font-semibold border-2"
          onClick={onToggle}
          style={{
            borderColor: colors?.primary.DEFAULT || '#3B82F6',
            color: colors?.primary.DEFAULT || '#3B82F6',
            backgroundColor: colors?.primary.light || '#dbeafe'
          }}
        >
          <Calculator className="h-6 w-6" />
          <span>لوحة الأرقام</span>
          <span className="text-sm font-medium" style={{ color: colors?.text.secondary || '#64748b' }}>
            {mode === 'cart' ? 'تعديل الكمية' : 'المبلغ المدفوع'}
          </span>
        </Button>
      </div>
    );
  }

  return (
    <Card
      className="w-full shadow-xl rounded-lg overflow-hidden border-2"
      style={{
        backgroundColor: colors?.background.DEFAULT || '#ffffff',
        borderColor: colors?.primary.DEFAULT || '#3B82F6'
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-3"
        style={{
          backgroundColor: colors?.primary.DEFAULT || '#3B82F6',
          color: colors?.text.inverted || '#ffffff',
          borderBottom: `2px solid ${colors?.primary.dark || '#2563eb'}`
        }}
      >
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          <span className="font-bold text-base">
            {mode === 'cart' ? 'تعديل الكمية' : 'المبلغ المدفوع'}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 hover:bg-white/20 text-white"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Display and Keyboard Row */}
      <div className="p-4 bg-gray-50">
        <div className="flex gap-4 items-start">
          {/* Display */}
          <div
            className="flex-1 p-4 text-right text-3xl font-bold min-h-[70px] flex items-center justify-end rounded-lg border-2 shadow-inner"
            style={{
              backgroundColor: colors?.background.DEFAULT || '#ffffff',
              color: colors?.text.primary || '#1e293b',
              borderColor: colors?.border.DEFAULT || '#cbd5e1'
            }}
          >
            {value || '0'}
          </div>

          {/* Compact Keyboard */}
          <div className="flex-shrink-0">
            <div className="grid grid-cols-3 gap-3">
              {/* Number buttons */}
              {numbers.slice(0, 3).map((row, rowIndex) => (
                row.map((num, colIndex) => (
                  <Button
                    key={`${rowIndex}-${colIndex}`}
                    variant="outline"
                    className="h-12 w-14 text-xl font-bold hover:scale-105 transition-transform border-2 shadow-md"
                    onClick={() => onNumberPress(num)}
                    style={{
                      borderColor: colors?.border.DEFAULT || '#cbd5e1',
                      color: colors?.text.primary || '#1e293b',
                      backgroundColor: colors?.background.DEFAULT || '#ffffff'
                    }}
                  >
                    {num}
                  </Button>
                ))
              ))}
            </div>
            
            <div className="grid grid-cols-3 gap-3 mt-3">
              {numbers[3].map((num, colIndex) => (
                <Button
                  key={`3-${colIndex}`}
                  variant="outline"
                  className="h-12 w-14 text-xl font-bold hover:scale-105 transition-transform border-2 shadow-md"
                  onClick={() => onNumberPress(num)}
                  style={{
                    borderColor: colors?.border.DEFAULT || '#cbd5e1',
                    color: colors?.text.primary || '#1e293b',
                    backgroundColor: colors?.background.DEFAULT || '#ffffff'
                  }}
                >
                  {num}
                </Button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex-shrink-0 flex flex-col gap-3">
            <Button
              variant="outline"
              className="h-12 w-20 border-2 shadow-md"
              onClick={onBackspace}
              style={{
                borderColor: colors?.accent.danger || '#ef4444',
                color: colors?.accent.danger || '#ef4444',
                backgroundColor: colors?.background.DEFAULT || '#ffffff'
              }}
            >
              <Delete className="h-5 w-5" />
            </Button>
            
            <Button
              variant="outline"
              className="h-12 w-20 text-sm font-bold border-2 shadow-md"
              onClick={onClear}
              style={{
                borderColor: colors?.accent.danger || '#ef4444',
                color: colors?.accent.danger || '#ef4444',
                backgroundColor: colors?.background.DEFAULT || '#ffffff'
              }}
            >
              مسح
            </Button>
            
            <Button
              className="h-12 w-20 shadow-md font-bold"
              onClick={onEnter}
              style={{
                backgroundColor: colors?.accent.success || '#10b981',
                color: colors?.text.inverted || '#ffffff',
                border: `2px solid ${colors?.accent.success || '#10b981'}`
              }}
            >
              <Check className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Bottom Action Row */}
        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            className="h-12 flex-1 text-base font-bold border-2 shadow-md"
            onClick={onClear}
            style={{
              borderColor: colors?.accent.danger || '#ef4444',
              color: colors?.accent.danger || '#ef4444',
              backgroundColor: colors?.background.DEFAULT || '#ffffff'
            }}
          >
            مسح الكل
          </Button>
          <Button
            className="h-12 flex-1 text-base font-bold shadow-md border-2"
            onClick={onEnter}
            style={{
              backgroundColor: colors?.primary.DEFAULT || '#3B82F6',
              color: colors?.text.inverted || '#ffffff',
              borderColor: colors?.primary.DEFAULT || '#3B82F6'
            }}
          >
            تطبيق
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default NumbersKeyboard;
