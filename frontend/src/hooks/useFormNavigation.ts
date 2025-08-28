import { useRef, useCallback, KeyboardEvent } from 'react';

interface UseFormNavigationProps {
  fieldOrder: string[];
  skipFields?: string[];
  onSubmit?: () => void;
}

export const useFormNavigation = ({ fieldOrder, skipFields = [], onSubmit }: UseFormNavigationProps) => {
  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});

  const setInputRef = useCallback((fieldName: string) => (ref: HTMLInputElement | HTMLTextAreaElement | null) => {
    inputRefs.current[fieldName] = ref;
  }, []);

  const focusField = useCallback((fieldName: string) => {
    const input = inputRefs.current[fieldName];
    if (input && !input.disabled && !input.readOnly) {
      input.focus();
    }
  }, []);

  const getNextField = useCallback((currentField: string): string | null => {
    const currentIndex = fieldOrder.indexOf(currentField);
    if (currentIndex === -1) return null;

    for (let i = currentIndex + 1; i < fieldOrder.length; i++) {
      const nextField = fieldOrder[i];
      if (!skipFields.includes(nextField) && inputRefs.current[nextField]) {
        const input = inputRefs.current[nextField];
        if (input && !input.disabled && !input.readOnly) {
          return nextField;
        }
      }
    }
    return null;
  }, [fieldOrder, skipFields]);

  const getPreviousField = useCallback((currentField: string): string | null => {
    const currentIndex = fieldOrder.indexOf(currentField);
    if (currentIndex === -1) return null;

    for (let i = currentIndex - 1; i >= 0; i--) {
      const prevField = fieldOrder[i];
      if (!skipFields.includes(prevField) && inputRefs.current[prevField]) {
        const input = inputRefs.current[prevField];
        if (input && !input.disabled && !input.readOnly) {
          return prevField;
        }
      }
    }
    return null;
  }, [fieldOrder, skipFields]);

  const handleKeyDown = useCallback((fieldName: string) => (e: KeyboardEvent) => {
    // Only handle specific navigation keys, let everything else pass through
    if (e.key === 'Enter') {
      // For textarea, allow normal Enter behavior
      const currentInput = inputRefs.current[fieldName];
      if (currentInput && currentInput.tagName === 'TEXTAREA') {
        return; // Allow normal Enter behavior for textarea
      }
      
      // Check if this is the last field
      const nextField = getNextField(fieldName);
      if (!nextField) {
        // This is the last field, submit the form
        if (onSubmit) {
          e.preventDefault();
          onSubmit();
        }
        return;
      }
      
      // Navigate to next field only if Enter is pressed
      e.preventDefault();
      focusField(nextField);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextField = getNextField(fieldName);
      if (nextField) {
        focusField(nextField);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevField = getPreviousField(fieldName);
      if (prevField) {
        focusField(prevField);
      }
    }
    // All other keys pass through normally - no interference with typing
  }, [getNextField, getPreviousField, focusField, onSubmit]);

  const focusFirstField = useCallback(() => {
    const firstField = fieldOrder.find(field => 
      !skipFields.includes(field) && 
      inputRefs.current[field] && 
      !inputRefs.current[field]?.disabled &&
      !inputRefs.current[field]?.readOnly
    );
    if (firstField) {
      focusField(firstField);
    }
  }, [fieldOrder, skipFields, focusField]);

  return {
    setInputRef,
    handleKeyDown,
    focusField,
    focusFirstField,
    getNextField,
    getPreviousField
  };
};

export default useFormNavigation;
