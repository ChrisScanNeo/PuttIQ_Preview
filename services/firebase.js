import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyAm5ZKp3R_F2iftmJxj5y8_KZ0oJ4-jHhI",
  authDomain: "puttiq.firebaseapp.com",
  projectId: "puttiq",
  storageBucket: "puttiq.firebasestorage.app",
  messagingSenderId: "186271237439",
  appId: "1:186271237439:web:b0e0fc33370f8966bc7f8a",
  measurementId: "G-DZM5THQDQT"
};

// Initialize Firebase
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Firestore
const db = getFirestore(app);

// Initialize Analytics (only if supported)
let analytics = null;
isSupported().then(supported => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

export { app, db, analytics };