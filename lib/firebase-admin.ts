import admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

if (!admin.apps.length) {
  try {
    // Try to load from service account JSON file first
    const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      console.log("Loading Firebase Admin from serviceAccountKey.json");
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("✓ Firebase Admin initialized successfully from JSON file");
    } else {
      // Fallback to environment variables
      console.log("serviceAccountKey.json not found, trying environment variables");
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error("Firebase Admin credentials are not configured. Please add serviceAccountKey.json or set environment variables.");
      }

      // Handle different private key formats
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
      
      privateKey = privateKey.replace(/\\n/g, '\n');

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log("✓ Firebase Admin initialized successfully from environment variables");
    }
  } catch (error: any) {
    console.error("✗ Firebase admin initialization error:", error.message);
    throw error;
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();