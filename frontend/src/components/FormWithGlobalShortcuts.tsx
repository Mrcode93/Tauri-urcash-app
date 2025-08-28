import React, { useState } from 'react';
import { useGlobalShortcuts, SHORTCUT_KEYS } from '../hooks/useGlobalShortcuts';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { toast } from '../lib/toast';

const FormWithGlobalShortcuts: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  // Register global shortcuts that work even when typing in forms
  useGlobalShortcuts([
    {
      key: SHORTCUT_KEYS.SHOW_HELP,
      callback: () => {
        toast.success('Help shortcut triggered! You can use F1 even when typing in forms.');
      },
      allowInForms: true, // This shortcut works even when typing
    },
    {
      key: SHORTCUT_KEYS.ESCAPE,
      callback: () => {
        toast.info('Escape shortcut triggered! This works even when typing in forms.');
      },
      allowInForms: true, // This shortcut works even when typing
    },
    {
      key: SHORTCUT_KEYS.SAVE,
      callback: () => {
        toast.success('Save shortcut triggered! This is blocked when typing in forms.');
      },
      allowInForms: false, // This shortcut is blocked when typing
    },
    {
      key: SHORTCUT_KEYS.SUBMIT_FORM,
      callback: () => {
        toast.success('Form submitted via Ctrl+Enter!');
        // Handle form submission
      },
      allowInForms: true, // Allow form submission shortcut when typing
    },
  ]);

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Form submitted!');
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Form with Global Shortcuts</CardTitle>
        <CardDescription>
          Try these shortcuts while typing in the form:
          <br />
          • <kbd className="px-2 py-1 bg-gray-100 rounded text-sm">F1</kbd> - Show help (works in forms)
          <br />
          • <kbd className="px-2 py-1 bg-gray-100 rounded text-sm">Escape</kbd> - Trigger escape (works in forms)
          <br />
          • <kbd className="px-2 py-1 bg-gray-100 rounded text-sm">Ctrl+S</kbd> - Save (blocked in forms)
          <br />
          • <kbd className="px-2 py-1 bg-gray-100 rounded text-sm">Ctrl+Enter</kbd> - Submit form (works in forms)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={handleInputChange('name')}
              placeholder="Type here and try the shortcuts..."
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              placeholder="Try shortcuts while typing..."
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={handleInputChange('message')}
              placeholder="Try shortcuts in this textarea..."
              rows={3}
            />
          </div>
          
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              Submit
            </Button>
            <Button type="button" variant="outline" onClick={() => setFormData({ name: '', email: '', message: '' })}>
              Clear
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default FormWithGlobalShortcuts; 