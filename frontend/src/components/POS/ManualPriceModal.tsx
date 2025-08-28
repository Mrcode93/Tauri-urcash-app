import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/lib/toast';
import { formatCurrency } from '@/lib/utils';

interface ManualPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (price: number, quantity: number, notes?: string) => void;
  defaultPrice?: number;
  defaultQuantity?: number;
}

const ManualPriceModal: React.FC<ManualPriceModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  defaultPrice = 0,
  defaultQuantity = 1
}) => {
  const [price, setPrice] = useState(defaultPrice);
  const [quantity, setQuantity] = useState(defaultQuantity);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPrice(defaultPrice);
      setQuantity(defaultQuantity);
      setNotes('');
    }
  }, [isOpen, defaultPrice, defaultQuantity]);

  const handleConfirm = () => {
    if (price <= 0) {
      toast.error('يرجى إدخال سعر صحيح');
      return;
    }

    if (quantity <= 0) {
      toast.error('يرجى إدخال كمية صحيحة');
      return;
    }

    onConfirm(price, quantity, notes.trim() || undefined);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const total = price * quantity;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" onKeyDown={handleKeyPress}>
        <DialogHeader>
          <DialogTitle className="text-center">إضافة مواد أخرى</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Price Input */}
          <div className="space-y-2">
            <Label htmlFor="price">السعر</Label>
            <Input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              placeholder="أدخل السعر"
              className="text-center text-lg font-semibold"
              autoFocus
            />
          </div>

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity">الكمية</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              placeholder="أدخل الكمية"
              className="text-center"
              min="1"
            />
          </div>

          {/* Notes Input */}
          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات (اختياري)</Label>
            <Input
              id="notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أدخل ملاحظات إضافية"
              className="text-center"
            />
          </div>

          {/* Total Display */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">المجموع:</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1"
              disabled={price <= 0 || quantity <= 0}
            >
              إضافة للسلة
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualPriceModal; 