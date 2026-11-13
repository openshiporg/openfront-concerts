export interface PublicPaymentProviderConfig {
  provider: 'stripe';
  publishableKey: string;
}

export function isPaymentProviderConfigured(code: string): boolean {
  if (code.startsWith('pp_stripe')) {
    return Boolean(
      (process.env.NEXT_PUBLIC_STRIPE_KEY || process.env.STRIPE_PUBLISHABLE_KEY) &&
      process.env.STRIPE_SECRET_KEY
    );
  }
  return false;
}

export function getPublicPaymentProviderConfig(code: string): PublicPaymentProviderConfig | null {
  if (!isPaymentProviderConfigured(code)) return null;

  if (code.startsWith('pp_stripe')) {
    return {
      provider: 'stripe',
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || '',
    };
  }
  return null;
}
