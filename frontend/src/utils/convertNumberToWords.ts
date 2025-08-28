/**
 * Convert a number to Arabic words
 * @param num - The number to convert
 * @returns The number in Arabic words
 */
export const convertNumberToWords = (num: number): string => {
  // Handle invalid input
  if (num === null || num === undefined || isNaN(num)) {
    return 'صفر';
  }
  
  // Convert to integer (same as BillReceipt.tsx logic)
  const integerPart = Math.floor(num);
  
  // Convert the integer part only (no decimal handling)
  return convertIntegerToWords(integerPart);
};

/**
 * Convert an integer to Arabic words
 * @param num - The integer to convert
 * @returns The integer in Arabic words
 */
const convertIntegerToWords = (num: number): string => {
  const units = [
    'صفر', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة',
    'ستة', 'سبعة', 'ثمانية', 'تسعة'
  ];
  const teens = [
    'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر',
    'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'
  ];
  const tens = [
    '', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون',
    'ستون', 'سبعون', 'ثمانون', 'تسعون'
  ];
  
  if (num < 0) return 'رقم سالب';
  if (num === 0) return units[0];
  if (num > 999999999) return 'رقم كبير جداً';
  
  const convertGroup = (n: number): string => {
    let result = '';
    
    if (n >= 100) {
      const hundreds = Math.floor(n / 100);
      if (hundreds === 1) {
        result += 'مائة';
      } else if (hundreds === 2) {
        result += 'مئتان';
      } else {
        result += units[hundreds] + 'مائة';
      }
      n %= 100;
      if (n > 0) result += ' ';
    }
    
    if (n >= 20) {
      const tensDigit = Math.floor(n / 10);
      const unitsDigit = n % 10;
      
      if (unitsDigit > 0) {
        result += units[unitsDigit] + ' و' + tens[tensDigit];
      } else {
        result += tens[tensDigit];
      }
    } else if (n >= 10) {
      result += teens[n - 10];
    } else if (n > 0) {
      result += units[n];
    }
    
    return result.trim();
  };
  
  let words = '';
  
  if (num >= 1000000) {
    const millions = Math.floor(num / 1000000);
    const millionText = convertGroup(millions);
    if (millions === 1) {
      words += 'مليون';
    } else if (millions === 2) {
      words += 'مليونان';
    } else if (millions <= 10) {
      words += millionText + ' ملايين';
    } else {
      words += millionText + ' مليون';
    }
    num %= 1000000;
    if (num > 0) words += ' و';
  }
  
  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    const thousandText = convertGroup(thousands);
    if (thousands === 1) {
      words += 'ألف';
    } else if (thousands === 2) {
      words += 'ألفان';
    } else if (thousands <= 10) {
      words += thousandText + ' آلاف';
    } else {
      words += thousandText + ' ألف';
    }
    num %= 1000;
    if (num > 0) words += ' و';
  }
  
  if (num > 0) {
    words += convertGroup(num);
  }
  
  return words.trim();
};
