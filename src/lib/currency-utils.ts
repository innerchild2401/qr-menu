// Currency formatting utilities
export type Currency = 'RON' | 'EUR' | 'USD' | 'GBP';

export const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: 'RON', label: 'Romanian Leu', symbol: 'RON' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'GBP', label: 'British Pound', symbol: '£' }
];

export const formatCurrency = (amount: number, currency: Currency = 'RON'): string => {
  const currencyInfo = CURRENCIES.find(c => c.value === currency);
  const symbol = currencyInfo?.symbol || currency;
  
  // Format with proper spacing: "140 RON" instead of "RON140"
  return `${amount.toFixed(2)} ${symbol}`;
};

// Language utilities for nutritional values
export type NutritionLanguage = 'EN' | 'RO' | 'FR' | 'DE' | 'ES';

export const NUTRITION_LANGUAGES: { value: NutritionLanguage; label: string }[] = [
  { value: 'EN', label: 'English' },
  { value: 'RO', label: 'Română' },
  { value: 'FR', label: 'Français' },
  { value: 'DE', label: 'Deutsch' },
  { value: 'ES', label: 'Español' }
];

export const NUTRITION_LABELS: Record<NutritionLanguage, Record<string, string>> = {
  EN: {
    calories: 'cal',
    protein: 'P',
    carbs: 'C',
    fat: 'F',
    sugars: 'S',
    salts: 'Na'
  },
  RO: {
    calories: 'cal',
    protein: 'P',
    carbs: 'C',
    fat: 'G',
    sugars: 'Z',
    salts: 'Na'
  },
  FR: {
    calories: 'cal',
    protein: 'P',
    carbs: 'G',
    fat: 'L',
    sugars: 'S',
    salts: 'Na'
  },
  DE: {
    calories: 'kcal',
    protein: 'P',
    carbs: 'K',
    fat: 'F',
    sugars: 'Z',
    salts: 'Na'
  },
  ES: {
    calories: 'cal',
    protein: 'P',
    carbs: 'C',
    fat: 'G',
    sugars: 'A',
    salts: 'Na'
  }
};

export const getNutritionLabel = (key: string, language: NutritionLanguage = 'EN'): string => {
  return NUTRITION_LABELS[language]?.[key] || NUTRITION_LABELS.EN[key] || key;
};
