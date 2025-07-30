import admin from 'firebase-admin';

// Check if the app is already initialized to prevent re-initialization errors.
if (!admin.apps.length) {
  try {
    // --- MODIFIED: Initialize the app by passing credentials directly ---
    // This is a more direct method that can solve stubborn initialization issues.
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // The private key from the .env.local file needs to have its newline characters properly formatted.
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log("Firebase Admin SDK initialized successfully!");
  } catch (error: any) {
    console.error('Firebase admin initialization error:', error.message);
  }
}

// It's safer to export the services from within a function to ensure initialization has completed.
const getAdminDb = () => admin.firestore();
const getAdminAuth = () => admin.auth();

export { getAdminDb, getAdminAuth };
