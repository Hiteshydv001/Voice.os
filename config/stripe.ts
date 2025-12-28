// Stripe Price Configuration
// 
// IMPORTANT: You need to create these products in your Stripe Dashboard
// Go to: https://dashboard.stripe.com/test/products
// 
// Create three products and copy their Price IDs here:

export const STRIPE_PRICES = {
  starter: import.meta.env.VITE_STRIPE_PRICE_STARTER || 'price_starter_real',
  growth: import.meta.env.VITE_STRIPE_PRICE_GROWTH || 'price_growth_real',
  scale: import.meta.env.VITE_STRIPE_PRICE_SCALE || 'price_scale_real',
};

// Credits awarded for each purchase
export const CREDITS_MAP = {
  [STRIPE_PRICES.starter]: 2000,
  [STRIPE_PRICES.growth]: 6000,
  [STRIPE_PRICES.scale]: 15000,
};
