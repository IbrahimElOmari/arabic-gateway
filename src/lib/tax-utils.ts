/**
 * VAT/tax calculation utilities.
 */

const VAT_RATES: Record<string, number> = {
  NL: 0.21,
  BE: 0.21,
  DE: 0.19,
};

export interface TaxBreakdown {
  net: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  countryCode: string;
}

/**
 * Calculate tax for a given price and country.
 * @param priceExclVat - Price excluding VAT
 * @param countryCode - ISO 2-letter country code (e.g. 'NL', 'BE', 'DE')
 */
export function calculateTax(priceExclVat: number, countryCode: string = 'NL'): TaxBreakdown {
  const code = countryCode.toUpperCase();
  const vatRate = VAT_RATES[code] ?? 0.21; // Default to 21%
  const vatAmount = Math.round(priceExclVat * vatRate * 100) / 100;

  return {
    net: priceExclVat,
    vatRate,
    vatAmount,
    total: Math.round((priceExclVat + vatAmount) * 100) / 100,
    countryCode: code,
  };
}

/**
 * Calculate price excluding VAT from an inclusive price.
 */
export function calculateNetFromGross(priceInclVat: number, countryCode: string = 'NL'): TaxBreakdown {
  const code = countryCode.toUpperCase();
  const vatRate = VAT_RATES[code] ?? 0.21;
  const net = Math.round((priceInclVat / (1 + vatRate)) * 100) / 100;
  const vatAmount = Math.round((priceInclVat - net) * 100) / 100;

  return {
    net,
    vatRate,
    vatAmount,
    total: priceInclVat,
    countryCode: code,
  };
}
