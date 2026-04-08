// =============================================
//  StudySync — Firebase Configuration
//  File: js/firebase-config.js
//  Last Updated: 2024
// =============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// 🔴 STEP 1: FIREBASE CONFIG YAHAN PASTE KARO
// 1. Go to: https://console.firebase.google.com
// 2. Create new project or open existing
// 3. Go to Project Settings (⚙️ icon)
// 4. Copy Web app config from "firebaseConfig" object
// 5. Replace below values with your config

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",                          // 🔴 Replace this
  authDomain: "YOUR_PROJECT.firebaseapp.com",     // 🔴 Replace this
  projectId: "YOUR_PROJECT_ID",                   // 🔴 Replace this
  storageBucket: "YOUR_PROJECT.appspot.com",      // 🔴 Replace this
  messagingSenderId: "YOUR_SENDER_ID",            // 🔴 Replace this
  appId: "YOUR_APP_ID",                           // 🔴 Replace this
  measurementId: "YOUR_MEASUREMENT_ID"            // Optional
};

// ⚠️ FIREBASE SETUP CHECKLIST:
// ✅ Go to Firebase Console
// ✅ Enable "Authentication" → Email/Password
// ✅ Enable "Firestore Database" → Start in test mode
// ✅ Enable "Cloud Storage" → Create bucket

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase services
const auth = getAuth(app);           // For login/register
const db = getFirestore(app);        // For database (messages, users, groups)
const storage = getStorage(app);     // For file uploads (avatars, documents)

// Export services for other files
export { auth, db, storage };

// =============================================
// USAGE IN OTHER FILES:
// =============================================
// import { auth, db, storage } from "./firebase-config.js";
