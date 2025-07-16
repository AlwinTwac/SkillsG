import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';

// Firebase config with fallback values
const firebaseConfig = {
  apiKey: "AIzaSyC92Pf1sN69WxJJALKEGX_oNNJicE6dlfc",
  authDomain: "skillsg-44ea6.firebaseapp.com",
  projectId: "skillsg-44ea6",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "skillsg-44ea6.appspot.com",
  messagingSenderId: "1018957247865",
  appId: "1:1018957247865:web:f8d873fb4a7ce95ecb6ba8"
};

// Initialize with settings for better Firestore behavior
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore with specific settings
const db = initializeFirestore(app, {
  experimentalForceLongPolling: process.env.NODE_ENV === 'test', // Only for tests
  ignoreUndefinedProperties: true // Automatically ignore undefined fields
});

export const auth = getAuth(app);
export { db };
export const storage = getStorage(app);

// Analytics initialization (SSR-safe)
let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((yes) => {
    if (yes) {
      analytics = getAnalytics(app);
    }
  });
}

export { analytics };
export default app;