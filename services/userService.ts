import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "./firebase";
import { loadStripe, Stripe } from "@stripe/stripe-js";

// Get Stripe Publishable Key from environment variables
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

// Initialize Stripe gracefully (Lazy Loaded)
let stripePromise: Promise<Stripe | null> | null = null;

const getStripe = (): Promise<Stripe | null> => {
  if (stripePromise) return stripePromise;

  // If we don't have a key, don't attempt to load
  if (!STRIPE_PUBLISHABLE_KEY) {
      console.log("Stripe Key not configured. Payment system will be disabled.");
      stripePromise = Promise.resolve(null);
      return stripePromise;
  }

  // Attempt to load Stripe
  stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY).catch(err => {
      console.error("Failed to load Stripe SDK:", err);
      return null;
  });
  
  return stripePromise;
};

export interface UserProfile {
  uid: string;
  email: string;
  credits: number;
  subscriptionStatus: 'free' | 'premium';
  createdAt: string;
}

const STORAGE_KEY_PREFIX = 'vm_user_profile_';

// --- Local Storage Helpers ---

const getLocalProfile = (uid: string): UserProfile | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_PREFIX + uid);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

const saveLocalProfile = (uid: string, data: UserProfile) => {
  localStorage.setItem(STORAGE_KEY_PREFIX + uid, JSON.stringify(data));
};

const createDefaultProfile = (uid: string, email: string): UserProfile => ({
  uid,
  email,
  credits: 1000,
  subscriptionStatus: 'free',
  createdAt: new Date().toISOString()
});

// --- Service Methods ---

export const initializeUserProfile = async (uid: string, email: string): Promise<UserProfile> => {
  let localProfile = getLocalProfile(uid);

  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data() as UserProfile;
      saveLocalProfile(uid, data);
      return data;
    } else {
      const newUser = localProfile || createDefaultProfile(uid, email);
      await setDoc(userRef, newUser);
      saveLocalProfile(uid, newUser);
      return newUser;
    }
  } catch (error: any) {
    console.warn(`Firestore Error (${error.code}): Defaulting to Local Storage.`);
    if (!localProfile) {
      localProfile = createDefaultProfile(uid, email);
      saveLocalProfile(uid, localProfile);
    }
    return localProfile;
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data() as UserProfile;
      saveLocalProfile(uid, data);
      return data;
    }
    return getLocalProfile(uid);
  } catch (error) {
    return getLocalProfile(uid);
  }
};

export const deductCredits = async (uid: string, amount: number) => {
  const local = getLocalProfile(uid);
  if (local) {
    local.credits = Math.max(0, local.credits - amount);
    saveLocalProfile(uid, local);
  }

  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      credits: increment(-amount)
    });
  } catch (error) {
    // Ignore remote errors
  }
};

export const addCredits = async (uid: string, amount: number) => {
  const local = getLocalProfile(uid);
  if (local) {
    local.credits += amount;
    saveLocalProfile(uid, local);
  }

  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      credits: increment(amount)
    });
  } catch (error) {
    // Ignore remote errors
  }
};

// --- REAL STRIPE INTEGRATION ---

export const initiateStripeCheckout = async (priceId: string) => {
  console.log(`Initializing REAL Stripe transaction for ${priceId}...`);
  
  if (!STRIPE_PUBLISHABLE_KEY || STRIPE_PUBLISHABLE_KEY.includes('PLACEHOLDER')) {
    throw new Error("Payment Gateway Configuration Missing. Please set STRIPE_PUBLISHABLE_KEY in source.");
  }

  // Get Stripe instance (Lazy Loaded)
  const stripe = await getStripe();
  
  if (!stripe) {
    throw new Error("Payment Gateway Offline. Failed to load Stripe SDK.");
  }

  // Uses Stripe's hosted checkout page via loaded module
  const { error } = await stripe.redirectToCheckout({
    lineItems: [{ price: priceId, quantity: 1 }],
    mode: 'payment',
    // Construct absolute URL for redirection
    successUrl: `${window.location.origin}/#/payment-success?session_id={CHECKOUT_SESSION_ID}&price_id=${priceId}`,
    cancelUrl: `${window.location.origin}/#/app/dashboard`,
  });

  if (error) {
    console.error("Stripe Redirect Error:", error);
    throw new Error(error.message);
  }
};

export const verifyTransaction = (sessionId: string): boolean => {
  // Client-side verification simply checks for the existence of the session ID.
  return !!sessionId;
};