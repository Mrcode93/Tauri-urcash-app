import { useState, useCallback } from 'react';

interface FormValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

interface FormValidationRules {
  [fieldName: string]: FormValidationRule;
}

interface UseFormValidationProps {
  rules: FormValidationRules;
  onSubmit?: (data: any) => void;
}

export const useFormValidation = ({ rules, onSubmit }: UseFormValidationProps) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback((fieldName: string, value: any): string | null => {
    const rule = rules[fieldName];
    if (!rule) return null;

    // Required validation
    if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return 'هذا الحقل مطلوب';
    }

    // If value is empty and not required, skip other validations
    if (!value && !rule.required) return null;

    // String validations
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        return `يجب أن يحتوي على ${rule.minLength} أحرف على الأقل`;
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        return `يجب أن لا يتجاوز ${rule.maxLength} حرف`;
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        return 'تنسيق غير صحيح';
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        return `يجب أن يكون ${rule.min} أو أكثر`;
      }
      if (rule.max !== undefined && value > rule.max) {
        return `يجب أن يكون ${rule.max} أو أقل`;
      }
    }

    // Custom validation
    if (rule.custom) {
      return rule.custom(value);
    }

    return null;
  }, [rules]);

  const validateForm = useCallback((data: any): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    Object.keys(rules).forEach(fieldName => {
      const error = validateField(fieldName, data[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [rules, validateField]);

  const handleFieldChange = useCallback((fieldName: string, value: any, formData: any) => {
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: '' }));
    }

    // Mark field as touched
    setTouched(prev => ({ ...prev, [fieldName]: true }));

    // Validate field if it's been touched
    if (touched[fieldName]) {
      const error = validateField(fieldName, value);
      if (error) {
        setErrors(prev => ({ ...prev, [fieldName]: error }));
      }
    }
  }, [errors, touched, validateField]);

  const handleSubmit = useCallback((formData: any) => {
    const isValid = validateForm(formData);
    if (isValid && onSubmit) {
      onSubmit(formData);
    }
    return isValid;
  }, [validateForm, onSubmit]);

  const clearErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  return {
    errors,
    touched,
    validateField,
    validateForm,
    handleFieldChange,
    handleSubmit,
    clearErrors,
    hasErrors: Object.keys(errors).some(key => errors[key])
  };
};

export default useFormValidation;
