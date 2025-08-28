# On-Screen Keyboard System

A comprehensive Arabic-English on-screen keyboard system built for touch-screen interfaces and accessibility.

## Features

### 🌐 Multi-Language Support
- **Arabic**: Full Arabic keyboard layout with proper character mapping
- **English**: QWERTY layout with uppercase/lowercase support
- **Easy Language Toggle**: Switch between languages with one click

### ⌨️ Comprehensive Key Support
- **Standard Keys**: All letters, numbers, and common symbols
- **Special Keys**: Space, Backspace, Enter, Tab
- **Modifier Keys**: Shift, Caps Lock (for English)
- **Symbols**: Punctuation and special characters

### 🎯 Smart Input Detection
- Automatically detects active input fields
- Works with text inputs, textareas, and other form elements
- Maintains cursor position and text selection
- Triggers proper change events for form validation

### 📱 Responsive Design
- Optimized for touch interfaces
- Works on all screen sizes
- Clean, modern UI with visual feedback
- Customizable positioning (bottom, floating)

## Components

### 1. KeyboardContext
Global state management for keyboard visibility and language settings.

```tsx
import { useKeyboard } from '@/contexts/KeyboardContext';

const { isKeyboardVisible, showKeyboard, hideKeyboard, language, setLanguage } = useKeyboard();
```

### 2. OnScreenKeyboard
Main keyboard component with full functionality.

```tsx
import OnScreenKeyboard from '@/components/OnScreenKeyboard';

<OnScreenKeyboard 
  onClose={() => setShowKeyboard(false)}
  position="bottom" // or "floating"
/>
```

### 3. KeyboardToggleButton
Reusable button component to show/hide keyboard.

```tsx
import KeyboardToggleButton from '@/components/KeyboardToggleButton';

<KeyboardToggleButton 
  variant="default" // "default" | "floating" | "minimal"
  size="md" // "sm" | "md" | "lg"
  position="relative" // "relative" | "fixed"
  showLabel={true}
/>
```

### 4. GlobalKeyboard
App-wide keyboard component that responds to context state.

```tsx
import GlobalKeyboard from '@/components/GlobalKeyboard';

// Automatically shown/hidden based on keyboard context
<GlobalKeyboard />
```

## Setup

### 1. Add Provider to App
```tsx
import { KeyboardProvider } from '@/contexts/KeyboardContext';
import GlobalKeyboard from '@/components/GlobalKeyboard';

function App() {
  return (
    <KeyboardProvider>
      {/* Your app components */}
      <GlobalKeyboard />
    </KeyboardProvider>
  );
}
```

### 2. Add Toggle Button
```tsx
import KeyboardToggleButton from '@/components/KeyboardToggleButton';

// In your component
<KeyboardToggleButton variant="floating" position="fixed" />
```

## Usage Examples

### POS System Integration
The keyboard is integrated into the POS system with a dedicated toggle button in the quick actions toolbar.

### Form Pages
Any page with form inputs can benefit from the floating keyboard button that appears automatically.

### Custom Implementation
```tsx
import { useKeyboard } from '@/contexts/KeyboardContext';

const MyComponent = () => {
  const { showKeyboard, language, setLanguage } = useKeyboard();
  
  return (
    <div>
      <input 
        type="text" 
        onFocus={() => showKeyboard()} 
        dir={language === 'AR' ? 'rtl' : 'ltr'}
      />
    </div>
  );
};
```

## Keyboard Layouts

### Arabic Layout
```
ض ص ث ق ف غ ع ه خ ح
ش س ي ب ل ا ت ن م ك  
ئ ء ؤ ر لا ى ة و ز ظ
```

### English Layout
```
Q W E R T Y U I O P
A S D F G H J K L
Z X C V B N M
```

## Styling

The keyboard uses Tailwind CSS classes and can be customized through:

- **CSS Classes**: Override default classes
- **Tailwind Configuration**: Modify colors and spacing
- **Props**: Variant, size, and position options

## Accessibility

- **ARIA Labels**: Proper accessibility labels
- **Keyboard Navigation**: Support for keyboard users
- **Focus Management**: Maintains proper focus handling
- **Screen Reader Support**: Compatible with assistive technologies

## Browser Support

- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Mobile Browsers**: iOS Safari, Chrome Mobile
- **Touch Events**: Full touch screen support
- **Input Events**: Proper form integration

## Performance

- **Lazy Loading**: Components load only when needed
- **Optimized Re-renders**: React.memo and useCallback optimization
- **Event Handling**: Efficient event delegation
- **Memory Management**: Proper cleanup of event listeners

## Troubleshooting

### Common Issues

1. **Keyboard not showing**: Ensure KeyboardProvider wraps your app
2. **Language not switching**: Check language state in context
3. **Input not responding**: Verify input field is properly focused
4. **Styling issues**: Check Tailwind CSS is properly configured

### Debug Mode

Enable console logging to debug keyboard behavior:

```tsx
// In development, add console logs to track keyboard state
useEffect(() => {
  
}, [isKeyboardVisible, language]);
```

## Future Enhancements

- [ ] Voice input integration
- [ ] Emoji keyboard
- [ ] Number pad mode
- [ ] Customizable layouts
- [ ] Themes support
- [ ] Animation improvements
- [ ] Gesture support
- [ ] Multi-language typing predictions
