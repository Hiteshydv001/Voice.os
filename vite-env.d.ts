/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string
  readonly VITE_TWILIO_ACCOUNT_SID: string
  readonly VITE_TWILIO_AUTH_TOKEN: string
  readonly VITE_TWILIO_PHONE_NUMBER: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string
  readonly VITE_STRIPE_SECRET_KEY: string
  readonly VITE_STRIPE_PRICE_STARTER: string
  readonly VITE_STRIPE_PRICE_GROWTH: string
  readonly VITE_STRIPE_PRICE_SCALE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
