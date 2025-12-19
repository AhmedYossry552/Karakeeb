/**
 * Price utility functions for handling buyer markup
 * Note: Backend applies 1.5x markup (50% increase) for buyers in marketplace
 * So we apply the same markup in frontend for consistency
 */

const MARKUP_MULTIPLIER = 1.5; // 1.5x markup (50% increase) to match backend marketplace

/**
 * Get the price with markup for buyers
 * @param basePrice The base price
 * @param userRole The user role ('buyer' or 'customer')
 * @returns The price with markup if buyer (1.5x), otherwise the base price
 */
export function getPriceWithMarkup(basePrice: number, userRole?: string): number {
  if (userRole !== 'buyer') {
    return basePrice;
  }

  // Apply 1.5x markup to match backend marketplace prices
  const priceWithMarkup = basePrice * MARKUP_MULTIPLIER;
  return parseFloat(priceWithMarkup.toFixed(2));
}

/**
 * Get the markup multiplier (1.5x for buyers)
 */
export function getMarkupMultiplier(): number {
  return MARKUP_MULTIPLIER;
}

/**
 * Get the markup percentage (50% for 1.5x multiplier)
 */
export function getMarkupPercentage(): number {
  return (MARKUP_MULTIPLIER - 1) * 100; // Returns 50 for 1.5x multiplier
}

