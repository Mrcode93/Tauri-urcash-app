import { useState, useCallback, useEffect } from 'react';
import { Palette, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// Types
interface ColorOption {
  name: string;
  value: string;
  hex: string;
}

interface ColorCombination {
  name: string;
  primary: string;
  secondary: string;
}

interface ColorManagerProps {
  onColorChange: (colors: { primaryColor: string; secondaryColor: string }) => void;
  initialPrimary?: string;
  initialSecondary?: string;
}

// Constants
const COLOR_PRESETS: Record<'primary' | 'secondary', ColorOption[]> = {
  primary: [
    { name: 'أزرق', value: 'blue', hex: '#3b82f6' },
    { name: 'أخضر', value: 'green', hex: '#22c55e' },
    { name: 'أحمر', value: 'red', hex: '#ef4444' },
    { name: 'بنفسجي', value: 'purple', hex: '#a855f7' },
    { name: 'برتقالي', value: 'orange', hex: '#f97316' },
    { name: 'سماوي', value: 'sky', hex: '#0ea5e9' },
    { name: 'وردي', value: 'pink', hex: '#ec4899' },
    { name: 'فوشيا', value: 'fuchsia', hex: '#d946ef' },
    { name: 'كهرماني', value: 'amber', hex: '#f59e0b' },
    { name: 'نيلي', value: 'indigo', hex: '#6366f1' },
    { name: 'أزرق داكن', value: 'blue-dark', hex: '#1e40af' },
    { name: 'أخضر داكن', value: 'green-dark', hex: '#166534' },
    { name: 'أحمر داكن', value: 'red-dark', hex: '#b91c1c' },
    { name: 'بنفسجي داكن', value: 'purple-dark', hex: '#6b21a8' },
    { name: 'برتقالي داكن', value: 'orange-dark', hex: '#c2410c' },
  ],
  secondary: [
    { name: 'رمادي', value: 'gray', hex: '#6b7280' },
    { name: 'أزرق فاتح', value: 'sky', hex: '#0ea5e9' },
    { name: 'وردي', value: 'pink', hex: '#ec4899' },
    { name: 'فوشيا', value: 'fuchsia', hex: '#d946ef' },
    { name: 'كهرماني', value: 'amber', hex: '#f59e0b' },
    { name: 'نيلي', value: 'indigo', hex: '#6366f1' },
    { name: 'أزرق سماوي', value: 'cyan', hex: '#06b6d4' },
    { name: 'أخضر فاتح', value: 'emerald', hex: '#10b981' },
    { name: 'أحمر فاتح', value: 'rose', hex: '#f43f5e' },
    { name: 'أصفر', value: 'yellow', hex: '#eab308' },
    { name: 'رمادي فاتح', value: 'slate', hex: '#94a3b8' },
    { name: 'رمادي داكن', value: 'zinc', hex: '#71717a' },
    { name: 'رمادي متوسط', value: 'neutral', hex: '#737373' },
    { name: 'رمادي فاتح جداً', value: 'stone', hex: '#a8a29e' },
    { name: 'رمادي داكن جداً', value: 'gray-dark', hex: '#374151' },
  ],
};

const COLOR_COMBINATIONS: ColorCombination[] = [
  { name: 'أزرق ورمادي', primary: 'blue', secondary: 'gray' },
  { name: 'أخضر وأزرق سماوي', primary: 'green', secondary: 'slate' },
  { name: 'أحمر ورمادي', primary: 'red', secondary: 'zinc' },
  { name: 'بنفسجي ورمادي', primary: 'purple', secondary: 'neutral' },
  { name: 'برتقالي ورمادي', primary: 'orange', secondary: 'stone' },
  { name: 'وردي ورمادي', primary: 'pink', secondary: 'gray' },
];

// Components
const ColorSwatch = ({ color, selected, onClick }: { color: ColorOption; selected: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      'relative h-12 w-full rounded-lg transition-all hover:scale-105',
      `bg-${color.value}-500`,
      selected && 'ring-2 ring-offset-2 ring-primary'
    )}
    style={{ backgroundColor: color.hex }}
  >
    <span className="absolute inset-0 flex items-center justify-center text-white font-medium">
      {color.name}
    </span>
  </button>
);

const ColorCombinationCard = ({ combination, onClick }: { combination: ColorCombination; onClick: () => void }) => {
  // Find the hex colors from COLOR_PRESETS
  const primaryColor = COLOR_PRESETS.primary.find(c => c.value === combination.primary);
  const secondaryColor = COLOR_PRESETS.secondary.find(c => c.value === combination.secondary);
  
  return (
    <button
      onClick={onClick}
      className="p-4 rounded-lg border transition-all hover:scale-105 hover:shadow-md"
    >
      <div className="flex gap-2 mb-2">
        <div 
          className="w-6 h-6 rounded-full" 
          style={{ backgroundColor: primaryColor?.hex || '#3b82f6' }} 
        />
        <div 
          className="w-6 h-6 rounded-full" 
          style={{ backgroundColor: secondaryColor?.hex || '#6b7280' }} 
        />
      </div>
      <span className="text-sm font-medium">{combination.name}</span>
    </button>
  );
};

const ColorManager = ({ onColorChange, initialPrimary = 'blue', initialSecondary = 'gray' }: ColorManagerProps) => {
  const [activeTab, setActiveTab] = useState('presets');
  const [primaryColor, setPrimaryColor] = useState(initialPrimary);
  const [secondaryColor, setSecondaryColor] = useState(initialSecondary);

  const handleColorChange = useCallback((type: 'primary' | 'secondary', color: string) => {
    if (type === 'primary') {
      setPrimaryColor(color);
      localStorage.setItem('primaryColor', color);
    } else {
      setSecondaryColor(color);
      localStorage.setItem('secondaryColor', color);
    }
    
    // Trigger theme update immediately
    window.dispatchEvent(new Event('themeColorsChanged'));
    
    // Call parent callback
    onColorChange({ primaryColor: type === 'primary' ? color : primaryColor, secondaryColor: type === 'secondary' ? color : secondaryColor });
  }, [primaryColor, secondaryColor, onColorChange]);

  const handleCombinationSelect = useCallback((combination: ColorCombination) => {
    setPrimaryColor(combination.primary);
    setSecondaryColor(combination.secondary);
    
    // Save to localStorage
    localStorage.setItem('primaryColor', combination.primary);
    localStorage.setItem('secondaryColor', combination.secondary);
    
    // Trigger theme update immediately
    window.dispatchEvent(new Event('themeColorsChanged'));
    
    // Call parent callback
    onColorChange({ primaryColor: combination.primary, secondaryColor: combination.secondary });
  }, [onColorChange]);

  // Load saved colors on mount
  useEffect(() => {
    const savedPrimary = localStorage.getItem('primaryColor');
    const savedSecondary = localStorage.getItem('secondaryColor');
    
    if (savedPrimary) setPrimaryColor(savedPrimary);
    if (savedSecondary) setSecondaryColor(savedSecondary);
  }, []);

  return (
    <Card className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="presets" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            الألوان الأساسية
          </TabsTrigger>
          <TabsTrigger value="combinations" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            التركيبات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="presets" className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">اللون الأساسي</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {COLOR_PRESETS.primary.map((color) => (
                <ColorSwatch
                  key={color.value}
                  color={color}
                  selected={primaryColor === color.value}
                  onClick={() => handleColorChange('primary', color.value)}
                />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3">اللون الثانوي</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {COLOR_PRESETS.secondary.map((color) => (
                <ColorSwatch
                  key={color.value}
                  color={color}
                  selected={secondaryColor === color.value}
                  onClick={() => handleColorChange('secondary', color.value)}
                />
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="combinations" className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {COLOR_COMBINATIONS.map((combination) => (
              <ColorCombinationCard
                key={combination.name}
                combination={combination}
                onClick={() => handleCombinationSelect(combination)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview Section */}
      <div className="mt-6 p-4 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">معاينة</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-4">
            <Button className={`w-full bg-${primaryColor}-500 hover:bg-${primaryColor}-600`}>
              زر أساسي
            </Button>
            <div className={`p-4 rounded-lg bg-${primaryColor}-50 text-${primaryColor}-700`}>
              خلفية أساسية
            </div>
          </div>
          <div className="space-y-4">
            <Button variant="outline" className={`w-full border-${secondaryColor}-500 text-${secondaryColor}-700`}>
              زر ثانوي
            </Button>
            <div className={`p-4 rounded-lg bg-${secondaryColor}-50 text-${secondaryColor}-700`}>
              خلفية ثانوية
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ColorManager; 