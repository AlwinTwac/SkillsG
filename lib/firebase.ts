import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

//cofig
const firebaseConfig = {
  apiKey: "AIzaSyBK9O93vr8jrrCjR_zpb2oiGsRmaUa5kkA",
  authDomain: "skillsg-platform-97f26.firebaseapp.com",
  projectId: "skillsg-platform-97f26",
  storageBucket: "skillsg-platform-97f26.firebasestorage.app",
  messagingSenderId: "755441486648",
  appId: "1:755441486648:web:6d2ded80afd7957782cfcd",
  measurementId: "G-JNFQ6SP470"
};

//prevent reinit
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];


export const auth = getAuth(app);
export const db = getFirestore(app);

// Analytics must be initialized only in the browser
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
