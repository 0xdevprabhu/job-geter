import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Read Firebase Web configuration from Vite environment variables (.env)
// Falls back to empty strings if not configured yet
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// Check if actual configuration has been provided
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== "your-api-key" &&
  firebaseConfig.projectId !== "your-project-id"
);

let app = null;
let db = null;

if (isFirebaseConfigured) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    console.log("🔥 Connected to Firebase Firestore project:", firebaseConfig.projectId);
  } catch (err) {
    console.error("Failed to initialize Firebase:", err);
  }
} else {
  console.warn(
    "⚠️ Firebase configuration is missing or incomplete.\n" +
    "Copy .env.example to .env in /frontend-portal and fill in your Firebase Web App credentials."
  );
}

export { app, db };
