import React, { createContext, useContext, useEffect, useState } from 'react';

export type CurrencyCode = 'USD' | 'GBP' | 'EUR' | 'MDL' | 'RON';

/** Exchange rates to USD (1 USD = X in foreign currency). Prices stored in DB are in USD. */
const RATES_TO_USD: Record<CurrencyCode, number> = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
  RON: 4.6,
  MDL: 17.8,
};

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  GBP: '£',
  EUR: '€',
  RON: 'lei',
  MDL: 'L',
};

const STORAGE_KEY = 'bukki-currency';

type CurrencyContextType = {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  formatPrice: (amountUsd: number, decimals?: number) => string;
  /** Format min-max price range (e.g. "$10 - $50") */
  formatPriceRange: (minUsd: number, maxUsd: number, decimals?: number) => string;
  /** For price range labels: 1 = budget, 2 = moderate, 3 = premium */
  formatPriceTier: (level: 1 | 2 | 3) => string;
};

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
      if (stored && ['USD', 'GBP', 'EUR', 'MDL', 'RON'].includes(stored)) return stored;
    } catch {}
    return 'USD';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, currency);
    } catch {}
  }, [currency]);

  const setCurrency = (c: CurrencyCode) => setCurrencyState(c);

  const formatPrice = (amountUsd: number, decimals = 2): string => {
    const n = Number(amountUsd);
    if (isNaN(n)) return CURRENCY_SYMBOLS[currency] + '0.00';
    const rate = RATES_TO_USD[currency];
    const converted = n * rate;
    const symbol = CURRENCY_SYMBOLS[currency];
    if (currency === 'RON' || currency === 'MDL') {
      return `${converted.toFixed(decimals)} ${symbol}`;
    }
    return `${symbol}${converted.toFixed(decimals)}`;
  };

  const formatPriceRange = (minUsd: number, maxUsd: number, decimals = 2): string => {
    const min = Number(minUsd);
    const max = Number(maxUsd);
    if (isNaN(min) || isNaN(max) || min === max) return formatPrice(min);
    return `${formatPrice(min, decimals)} – ${formatPrice(max, decimals)}`;
  };

  const formatPriceTier = (level: 1 | 2 | 3): string => {
    const symbol = CURRENCY_SYMBOLS[currency];
    if (currency === 'RON' || currency === 'MDL') {
      return symbol.repeat(level);
    }
    return symbol.repeat(level);
  };

  const value: CurrencyContextType = { currency, setCurrency, formatPrice, formatPriceRange, formatPriceTier };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}

export { CURRENCY_SYMBOLS, RATES_TO_USD };
