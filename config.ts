// In a production environment, these should be server-side environment variables.
// For this MVP prototype, we store them here to simulate the connected configuration.

export const TWILIO_CONFIG = {
  accountSid: import.meta.env.VITE_TWILIO_ACCOUNT_SID || '',
  authToken: import.meta.env.VITE_TWILIO_AUTH_TOKEN || '',
  // Your verified number acting as the Caller ID
  phoneNumber: import.meta.env.VITE_TWILIO_PHONE_NUMBER || ''
};