import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';


// Firebase config using env variable for storageBucket
const firebaseConfig = {
  apiKey: "AIzaSyC92Pf1sN69WxJJALKEGX_oNNJicE6dlfc",
  authDomain: "skillsg-44ea6.firebaseapp.com",
  projectId: "skillsg-44ea6",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, 
  messagingSenderId: "1018957247865",
  appId: "1:1018957247865:web:f8d873fb4a7ce95ecb6ba8"
};

// Preventing re initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

//Setup Analytics only in browser (SSR-safe)
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
