import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDiumej583nHIuH6476cyAHAB3hChs7B-s",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "voice-agents-545fc.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "voice-agents-545fc",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "voice-agents-545fc.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "519070850162",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:519070850162:web:caa8800e3dbcbd859236eb",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-7GG6BJWYK1"
};

// Initialize Firebase
// Check if app is already initialized to avoid "Component auth has not been registered yet" errors in HMR
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const analytics = getAnalytics(app);
export const db = getFirestore(app);