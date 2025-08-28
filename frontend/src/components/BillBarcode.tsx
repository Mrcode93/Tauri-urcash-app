import React from 'react';
import Barcode from 'react-barcode';

interface BillBarcodeProps {
  value: string;
  width?: number;
  height?: number;
  fontSize?: number;
  margin?: number;
  displayValue?: boolean;
  className?: string;
}

const BillBarcode: React.FC<BillBarcodeProps> = ({
  value,
  width = 2.5,
  height = 120,
  fontSize = 24,
  margin = 10,
  displayValue = true,
  className = ''
}) => {
  if (!value) return null;

  // The barcode is now generated as a numeric value by the backend
  // If it's already numeric, use it directly; otherwise extract numbers as fallback
  const isNumeric = /^\d+$/.test(value);
  const finalBarcode = isNumeric ? value : value.replace(/[^0-9]/g, '');
  
  // Ensure we have a valid barcode
  if (!finalBarcode || finalBarcode.length === 0) {
    console.warn('Invalid barcode value:', value);
    return null;
  }

  try {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <Barcode
          value={finalBarcode}
          format="CODE128"
          width={width}
          height={height}
          fontSize={fontSize}
          margin={margin}
          displayValue={displayValue}
          background="#ffffff"
          lineColor="#000000"
        />
      </div>
    );
  } catch (error) {
    console.error('Barcode generation error:', error);
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <div className="p-2 border border-black text-center">
          <div className="text-xs font-mono">{value}</div>
          <div className="text-xs text-gray-500">Barcode Error</div>
        </div>
      </div>
    );
  }
};

export default BillBarcode; 