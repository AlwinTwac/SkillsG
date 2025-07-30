import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBDLaqwRX3WS1qQOyY3pSbzBND3gt-iedY",
  authDomain: "skillssg-9f2bf.firebaseapp.com",
  projectId: "skillssg-9f2bf",
  storageBucket: "skillssg-9f2bf.firebasestorage.app",
  messagingSenderId: "966597589839",
  appId: "1:966597589839:web:69d3612632a12d2dc7a33a",
  measurementId: "G-KDEP7ZPBR5"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
});

export const auth = getAuth(app);
export { db };
export const storage = getStorage(app);

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