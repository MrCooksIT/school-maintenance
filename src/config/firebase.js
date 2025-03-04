// Add these logs to src/config/firebase.js to verify configuration loading
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Add debug logs to verify config
console.log("Firebase config loading:", {
    apiKeyExists: !!import.meta.env.VITE_FIREBASE_API_KEY,
    authDomainExists: !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURLExists: !!import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectIdExists: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucketExists: !!import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);

// Log services initialization
console.log("Firebase services initialized:", {
    authInitialized: !!auth,
    databaseInitialized: !!database,
    storageInitialized: !!storage
});

// Export services
export { auth, database, storage };
export default app;