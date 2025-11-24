import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyArgsqFuNhl5zfHAMtzZ_eDL78gEkov-qM",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "bukki-app.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "bukki-app",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "bukki-app.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "415727430020",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:415727430020:web:bf58c10e4007f0a6dfd5d1",
};

// Initialize Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Auth
export const auth: Auth = getAuth(app);

// Auth Providers
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

// Add scopes if needed
googleProvider.addScope('email');
googleProvider.addScope('profile');
facebookProvider.addScope('email');

export default app;

