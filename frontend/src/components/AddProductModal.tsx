import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import AddProductForm from './AddProductForm';
import { Button } from './ui/button';
import { Product } from '@/features/inventory/inventoryService';

interface AddProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialBarcode?: string;
  onSuccess: (product?: Product) => void;
}

const AddProductModal = ({ open, onOpenChange, initialBarcode, onSuccess }: AddProductModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center">
            إضافة منتج جديد
          </DialogTitle>
          <DialogDescription className="text-center">
            يرجى تعبئة بيانات المنتج الجديد.
          </DialogDescription>
        </DialogHeader>
        <AddProductForm
          initialBarcode={initialBarcode}
          onSuccess={(product) => {
            onOpenChange(false);
            onSuccess(product);
          }}
          onCancel={() => onOpenChange(false)}
        />
       
      </DialogContent>
    </Dialog>
  );
};

export default AddProductModal; 