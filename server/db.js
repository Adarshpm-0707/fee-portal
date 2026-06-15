import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Simple .env parser to load env vars in Node environment
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\r\n').join('\n').split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      if (key && !key.startsWith('#')) {
        process.env[key] = val;
      }
    }
  });
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

let db = null;
const isFirebaseConfigured = firebaseConfig.apiKey && firebaseConfig.apiKey !== 'your_firebase_api_key_here';

if (isFirebaseConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('Firebase connection initialized on backend.');
  } catch (error) {
    console.error('Failed to initialize Firebase on backend:', error);
  }
} else {
  console.warn('Firebase configuration values not set in .env yet. Running in fallback database mode.');
}

export { db, isFirebaseConfigured };
