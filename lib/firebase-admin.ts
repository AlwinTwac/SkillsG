import admin from "firebase-admin";
import * as path from "path";
import * as fs from "fs";

// Track initialization state so we don't re-run it
let _initAttempted = false;
let _initError: Error | null = null;

function ensureFirebaseAdminInitialized() {
  if (admin.apps.length) return;
  if (_initAttempted) {
    // If we already tried and failed, throw only when someone actually uses Firebase.
    if (_initError) throw _initError;
    return;
  }

  _initAttempted = true;

  try {
    // Try to load from service account JSON file first
    const serviceAccountPath = path.join(process.cwd(), "serviceAccountKey.json");

    if (fs.existsSync(serviceAccountPath)) {
      console.log("Loading Firebase Admin from serviceAccountKey.json");
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      console.log("✓ Firebase Admin initialized successfully from JSON file");
      return;
    }

    // Fallback to environment variables
    console.log("serviceAccountKey.json not found, trying environment variables");

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
    const privateKeyBase64 = process.env.FIREBASE_PRIVATE_KEY_BASE64;
    let privateKey: string | undefined = privateKeyRaw;

    if (!projectId || !clientEmail || (!privateKeyRaw && !privateKeyBase64)) {
      throw new Error(
        "Firebase Admin credentials are not configured. Please add serviceAccountKey.json or set environment variables."
      );
    }

    // Handle different private key formats
    if ((!privateKey || !privateKey.trim()) && privateKeyBase64) {
      privateKey = Buffer.from(privateKeyBase64, "base64").toString("utf8");
    }

    if (!privateKey || !privateKey.trim()) {
      throw new Error("Firebase Admin private key is missing or invalid.");
    }

    // Strip surrounding quotes if they exist
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }

    // Convert escaped newlines into real newlines (handles both literal '\n' and actual newlines)
    privateKey = privateKey
      .replace(/\r\n/g, "\n")
      .replace(/\n+/g, "\n")
      .replace(/\\n/g, "\n");

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });

    console.log("✓ Firebase Admin initialized successfully from environment variables");
  } catch (error: any) {
    console.error("✗ Firebase admin initialization error:", error?.message ?? error);
    _initError = error instanceof Error ? error : new Error(String(error));
    // IMPORTANT: do not throw here — we only throw when Firebase is actually used.
  }
}

/**
 * Keep the same exports (`adminDb`, `adminAuth`) without changing the rest of your app.
 * These proxies initialize Firebase only when first accessed.
 */
export const adminDb = new Proxy({} as any, {
  get(_target, prop) {
    ensureFirebaseAdminInitialized();
    const db = admin.firestore();
    return (db as any)[prop];
  },
}) as FirebaseFirestore.Firestore;

export const adminAuth = new Proxy({} as any, {
  get(_target, prop) {
    ensureFirebaseAdminInitialized();
    const auth = admin.auth();
    return (auth as any)[prop];
  },
}) as admin.auth.Auth;
