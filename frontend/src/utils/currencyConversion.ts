/**
 * Currency conversion utilities for POS
 * Handles conversion between USD and local currency based on exchange rate
 */

export interface CurrencyConversionOptions {
  exchangeRate: number;
  localCurrency: string;
  usdCurrency: string;
}

/**
 * Convert USD price to local currency
 * @param usdPrice - Price in USD
 * @param exchangeRate - Exchange rate (local currency per USD)
 * @returns Price in local currency
 */
export const convertUsdToLocal = (usdPrice: number, exchangeRate: number): number => {
  // Debug logging
  
  
  // Validate inputs
  if (!usdPrice || !exchangeRate || exchangeRate <= 0) {
    console.warn('Invalid inputs for convertUsdToLocal:', { usdPrice, exchangeRate });
    return usdPrice;
  }
  
  // Limit exchange rate to reasonable values (1 to 10000)
  const safeExchangeRate = Math.min(Math.max(exchangeRate, 1), 10000);
  
  
  const result = usdPrice * safeExchangeRate;
  
  
  // Check for infinity or extremely large values
  if (!isFinite(result) || result > 1000000000) {
    console.warn('Converted price too large:', { usdPrice, exchangeRate, result });
    return usdPrice * 1000; // Fallback to reasonable value
  }
  
  return result;
};

/**
 * Convert local currency price to USD
 * @param localPrice - Price in local currency
 * @param exchangeRate - Exchange rate (local currency per USD)
 * @returns Price in USD
 */
export const convertLocalToUsd = (localPrice: number, exchangeRate: number): number => {
  return localPrice / exchangeRate;
};

/**
 * Get the appropriate price for a product based on its currency flag
 * @param product - Product with price and is_dolar flag
 * @param exchangeRate - Exchange rate from settings
 * @param options - Currency conversion options
 * @returns Object with converted price and currency information
 */
export const getProductPrice = (
  product: { selling_price: number; is_dolar?: boolean },
  exchangeRate: number,
  options: CurrencyConversionOptions
) => {
  const { localCurrency, usdCurrency } = options;
  

  
  // Validate inputs
  if (!product || !product.selling_price || product.selling_price < 0) {
    console.warn('Invalid product data:', product);
    return {
      price: 0,
      originalPrice: 0,
      currency: localCurrency,
      originalCurrency: localCurrency,
      isConverted: false,
      exchangeRate: 1
    };
  }
  
  // Validate exchange rate
  if (!exchangeRate || exchangeRate <= 0 || !isFinite(exchangeRate)) {
    console.warn('Invalid exchange rate:', exchangeRate);
    exchangeRate = 1000; // Default fallback for IQD
  }
  
  // Additional validation for extremely high exchange rates
  if (exchangeRate > 10000) {
    console.warn('Exchange rate too high, limiting to 10000:', exchangeRate);
    exchangeRate = 10000;
  }
  
  if (product.is_dolar) {
    // Product is priced in USD, convert to local currency
    const localPrice = convertUsdToLocal(product.selling_price, exchangeRate);
    return {
      price: localPrice,
      originalPrice: product.selling_price,
      currency: localCurrency,
      originalCurrency: usdCurrency,
      isConverted: true,
      exchangeRate
    };
  } else {
    // Product is already in local currency
    return {
      price: product.selling_price,
      originalPrice: product.selling_price,
      currency: localCurrency,
      originalCurrency: localCurrency,
      isConverted: false,
      exchangeRate: 1
    };
  }
};

/**
 * Format price with currency symbol and conversion indicator
 * @param priceInfo - Price information from getProductPrice
 * @param language - Language for formatting ('ar' or 'en')
 * @returns Formatted price string
 */
export const formatConvertedPrice = (
  priceInfo: ReturnType<typeof getProductPrice>,
  language: string = 'ar'
) => {
  const { price, originalPrice, currency, originalCurrency, isConverted, exchangeRate } = priceInfo;
  
  // Handle extremely large numbers
  if (!isFinite(price) || price > 1000000000) {
    return `0.00 ${currency}`;
  }
  
  if (isConverted) {
    const formattedPrice = price >= 1000 
      ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : price.toFixed(2);
      
    if (language === 'ar') {
      return `${formattedPrice} ${currency} (${originalPrice.toFixed(2)} ${originalCurrency})`;
    } else {
      return `${formattedPrice} ${currency} (${originalPrice.toFixed(2)} ${originalCurrency})`;
    }
  } else {
    const formattedPrice = price >= 1000 
      ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : price.toFixed(2);
    return `${formattedPrice} ${currency}`;
  }
};

/**
 * Get a simplified price display for POS
 * @param priceInfo - Price information from getProductPrice
 * @returns Simple price string
 */
export const getSimplePriceDisplay = (priceInfo: ReturnType<typeof getProductPrice>): string => {
  const { price, currency } = priceInfo;
  
  // Handle extremely large numbers
  if (!isFinite(price) || price > 1000000000) {
    return `0.00 ${currency}`;
  }
  
  // Format large numbers with commas for readability
  if (price >= 1000) {
    return `${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  }
  
  return `${price.toFixed(2)} ${currency}`;
};

/**
 * Get currency indicator for display
 * @param isDolar: boolean - Whether product is priced in USD
 * @param language: string - Language for display
 * @returns Currency indicator string
 */
export const getCurrencyIndicator = (isDolar: boolean, language: string = 'ar'): string => {
  if (isDolar) {
    return language === 'ar' ? 'USD' : 'USD';
  }
  return '';
}; 