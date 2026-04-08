// =============================================
//  StudySync — Authentication System
//  File: js/auth.js
//  Functions: Register, Login, Logout, Profile Management
// =============================================

import { auth, db, storage } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ============================================================================
// 1️⃣  REGISTER USER
// ============================================================================
// Naya user account banao aur database mein profile save karo

export async function registerUser({ 
  name, 
  email, 
  password, 
  location, 
  language,      // "Hindi" or "English"
  category,      // "JEE" or "NEET"
  subject,       // "Maths", "Physics", "Chemistry", "Biology"
  imageFile      // Profile picture (optional)
}) {
  try {
    console.log("📝 Registering user:", email);

    // Step 1: Firebase Auth mein user create karo
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    
    console.log("✅ User account created:", uid);

    // Step 2: Profile picture upload karo (agar di gai to)
    let photoURL = "";
    if (imageFile) {
      const imgRef = ref(storage, `avatars/${uid}`);
      await uploadBytes(imgRef, imageFile);
      photoURL = await getDownloadURL(imgRef);
      console.log("✅ Profile image uploaded");
    }

    // Step 3: Firestore database mein user profile save karo
    await setDoc(doc(db, "users", uid), {
      uid: uid,
      name: name,
      email: email,
      location: location,
      language: language,
      category: category,
      subject: subject,
      photoURL: photoURL || "https://via.placeholder.com/150",
      online: true,
      createdAt: serverTimestamp()
    });
    
    console.log("✅ User profile saved");

    return { success: true, uid: uid };

  } catch (err) {
    console.error("❌ Registration failed:", err.message);
    
    // User-friendly error messages
    let errorMsg = err.message;
    if (err.code === "auth/email-already-in-use") {
      errorMsg = "Ye email already registered hai!";
    } else if (err.code === "auth/weak-password") {
      errorMsg = "Password 6+ characters ka hona chahiye";
    } else if (err.code === "auth/invalid-email") {
      errorMsg = "Email galat hai";
    }
    
    return { success: false, error: errorMsg };
  }
}

// ============================================================================
// 2️⃣  LOGIN USER
// ============================================================================
// Existing user ko login karo

export async function loginUser(email, password) {
  try {
    console.log("🔐 Logging in user:", email);

    await signInWithEmailAndPassword(auth, email, password);
    
    console.log("✅ User logged in successfully");
    return { success: true };

  } catch (err) {
    console.error("❌ Login failed:", err.message);
    
    let errorMsg = err.message;
    if (err.code === "auth/user-not-found") {
      errorMsg = "Ye email registered nahi hai";
    } else if (err.code === "auth/wrong-password") {
      errorMsg = "Password galat hai";
    } else if (err.code === "auth/invalid-email") {
      errorMsg = "Email galat hai";
    }
    
    return { success: false, error: errorMsg };
  }
}

// ============================================================================
// 3️⃣  LOGOUT USER
// ============================================================================
// User ko logout karo aur online status update karo

export async function logoutUser() {
  try {
    const uid = auth.currentUser?.uid;
    
    // Database mein user ka status offline karo
    if (uid) {
      const { updateDoc, doc: dRef } = await import(
        "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
      );
      
      await updateDoc(doc(db, "users", uid), { 
        online: false,
        lastSeen: serverTimestamp()
      });
      console.log("✅ User status updated to offline");
    }

    // Firebase se logout karo
    await signOut(auth);
    console.log("✅ User logged out");

    // Login page par redirect karo
    window.location.href = "../auth/login.html";

  } catch (err) {
    console.error("❌ Logout error:", err.message);
  }
}

// ============================================================================
// 4️⃣  GET CURRENT USER PROFILE
// ============================================================================
// Currently logged-in user ka profile data fetch karo

export async function getCurrentUserProfile() {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      console.log("❌ No user logged in");
      return null;
    }

    // Firestore se user ka document fetch karo
    const snap = await getDoc(doc(db, "users", user.uid));
    
    if (snap.exists()) {
      console.log("✅ User profile retrieved");
      return snap.data();
    } else {
      console.log("❌ User profile not found in database");
      return null;
    }

  } catch (err) {
    console.error("❌ Error fetching profile:", err.message);
    return null;
  }
}

// ============================================================================
// 5️⃣  UPDATE USER PROFILE
// ============================================================================
// User ka profile update karo (name, location, subject, etc)

export async function updateUserProfile(updates) {
  try {
    const uid = auth.currentUser?.uid;
    
    if (!uid) {
      return { success: false, error: "User not logged in" };
    }

    // Database mein update karo
    await updateDoc(doc(db, "users", uid), {
      ...updates,
      updatedAt: serverTimestamp()
    });

    console.log("✅ Profile updated");
    return { success: true };

  } catch (err) {
    console.error("❌ Update error:", err.message);
    return { success: false, error: err.message };
  }
}

// ============================================================================
// 6️⃣  REQUIRE AUTH
// ============================================================================
// Protected pages ke liye - agar logged in nahi to login page par redirect

export function requireAuth(redirectTo = "../auth/login.html") {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      console.log("⚠️ User not authenticated, redirecting...");
      window.location.href = redirectTo;
    } else {
      console.log("✅ User authenticated");
    }
  });
}

// ============================================================================
// 7️⃣  REDIRECT IF LOGGED IN
// ============================================================================
// Login/Register pages ke liye - agar logged in hai to dashboard par redirect

export function redirectIfLoggedIn(redirectTo = "../dashboard/dashboard.html") {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("✅ User already logged in, redirecting...");
      window.location.href = redirectTo;
    }
  });
}

// ============================================================================
// 8️⃣  GET CURRENT USER ID
// ============================================================================
// Current user ka UID lo

export function getCurrentUserId() {
  return auth.currentUser?.uid || null;
}

// ============================================================================
// 9️⃣  CHECK IF USER EXISTS
// ============================================================================
// Database mein user exist karta hai ya nahi check karo

export async function userExists(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists();
  } catch (err) {
    console.error("❌ Error checking user:", err.message);
    return false;
  }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*

// ===== REGISTER PAGE (register.html) =====
import { registerUser, redirectIfLoggedIn } from "./auth.js";

// Agar already logged in hai to dashboard par bhej do
redirectIfLoggedIn();

// Register button click handler
document.getElementById("registerBtn").addEventListener("click", async () => {
  const result = await registerUser({
    name: document.getElementById("nameInput").value,
    email: document.getElementById("emailInput").value,
    password: document.getElementById("passwordInput").value,
    location: document.getElementById("locationInput").value,
    language: document.getElementById("languageSelect").value,
    category: document.getElementById("categorySelect").value,
    subject: document.getElementById("subjectSelect").value,
    imageFile: document.getElementById("imageInput").files[0] // Profile pic
  });
  
  if (result.success) {
    alert("✅ Account successfully created!");
    window.location.href = "../dashboard/dashboard.html";
  } else {
    alert("❌ Error: " + result.error);
  }
});

// ===== LOGIN PAGE (login.html) =====
import { loginUser, redirectIfLoggedIn } from "./auth.js";

redirectIfLoggedIn();

document.getElementById("loginBtn").addEventListener("click", async () => {
  const result = await loginUser(
    document.getElementById("emailInput").value,
    document.getElementById("passwordInput").value
  );
  
  if (result.success) {
    alert("✅ Login successful!");
    window.location.href = "../dashboard/dashboard.html";
  } else {
    alert("❌ Error: " + result.error);
  }
});

// ===== DASHBOARD PAGE (dashboard.html) =====
import { requireAuth, getCurrentUserProfile, logoutUser } from "./auth.js";

// Protect this page - agar logged in nahi to login.html par bhej do
requireAuth();

// Current user ka profile lo
const userProfile = await getCurrentUserProfile();

if (userProfile) {
  console.log("Hello,", userProfile.name);
  console.log("Subject:", userProfile.subject);
  console.log("Category:", userProfile.category);
  
  // Display user info in UI
  document.getElementById("userName").textContent = userProfile.name;
  document.getElementById("userPhoto").src = userProfile.photoURL;
}

// Logout button
document.getElementById("logoutBtn").addEventListener("click", () => {
  if (confirm("Logout karoge?")) {
    logoutUser();
  }
});

*/
