// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// Uses environment variables for security, with fallback defaults
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCT9DNf71aplxi5rQaUynCT49WyK2Qt3U0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "lobby-master-690ed.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "lobby-master-690ed",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "lobby-master-690ed.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "987203694911",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:987203694911:web:83ffa43fe1c78d5c24e38a",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-VZFME5789Z"
};

// Log which source the config is using
if (import.meta.env.DEV) {
  console.log("Firebase config source:", 
    import.meta.env.VITE_FIREBASE_API_KEY ? "Environment variables" : "Fallback defaults"
  );
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (optional, but recommended)
let analytics;
try {
  analytics = getAnalytics(app);
} catch (error) {
  console.warn("Analytics not available in this environment");
}

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export { app, auth, db, analytics };
