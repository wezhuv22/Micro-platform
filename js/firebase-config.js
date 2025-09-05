// Import Firebase SDKs - Using version 9 modular SDK
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js';
import { getFirestore, collection, getDocs, doc, setDoc, addDoc, query, where, orderBy, limit } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-storage.js';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC_GByWj7RhbKfyiwvxnjDTOQAEOdm6S_c",
  authDomain: "micro-platform-adbf4.firebaseapp.com",
  projectId: "micro-platform-adbf4",
  storageBucket: "micro-platform-adbf4.firebasestorage.app",
  messagingSenderId: "775679378440",
  appId: "1:775679378440:web:e1cbb6a7e8855923acfdbd",
  measurementId: "G-K3NH3THYR8"
};

// Initialize Firebase
let app;
let auth;
let db;
let storage;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
}

// Make Firebase services globally available with error handling
window.firebase = {
  app,
  auth,
  db,
  storage,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  collection,
  getDocs,
  doc,
  setDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  ref,
  uploadBytes,
  getDownloadURL,
  initialized: true
};

// Initialize authentication state listener
function setupAuthListener() {
  if (!auth) {
    console.error('Auth not initialized');
    return;
  }
  
  onAuthStateChanged(auth, (user) => {
    console.log('Auth state changed:', user ? `User: ${user.email}` : 'No user');
    
    const loginNav = document.getElementById('login-nav');
    const userNav = document.getElementById('user-nav');
    const userEmail = document.getElementById('user-email');
    
    if (user) {
      // User is signed in
      if (loginNav) loginNav.classList.add('d-none');
      if (userNav) userNav.classList.remove('d-none');
      if (userEmail) userEmail.textContent = user.email;
      
      // Update user last active time
      updateUserLastActive(user.uid);
      
    } else {
      // User is signed out
      if (loginNav) loginNav.classList.remove('d-none');
      if (userNav) userNav.classList.add('d-none');
    }
    
    // Trigger custom event for other parts of the app
    window.dispatchEvent(new CustomEvent('authStateChanged', { detail: user }));
  });
}

// Update user's last active timestamp
async function updateUserLastActive(uid) {
  if (!db) return;
  
  try {
    await setDoc(doc(db, 'users', uid), {
      lastActive: new Date()
    }, { merge: true });
  } catch (error) {
    console.error('Error updating user last active:', error);
  }
}

// Wait for DOM to be ready before setting up auth
function initializeAuth() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAuthListener);
  } else {
    setupAuthListener();
  }
}

// Start auth initialization
initializeAuth();

// Global error handler for Firebase operations
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && typeof event.reason === 'object' && event.reason.code) {
    console.error('Firebase error:', event.reason.code, event.reason.message);
    
    // Prevent the error from appearing in console if it's a Firebase auth error
    if (event.reason.code && event.reason.code.startsWith('auth/')) {
      event.preventDefault();
    }
  }
});

// Test Firebase connection
async function testFirebaseConnection() {
  try {
    if (!db) {
      console.warn('Firestore not initialized');
      return false;
    }
    
    // Try to read from a collection
    await getDocs(collection(db, 'test'));
    console.log('Firebase connection test successful');
    return true;
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return false;
  }
}

// Export for debugging (only in development)
if (window.location.hostname === 'localhost' || window.location.hostname.includes('github.io')) {
  window.firebaseApp = app;
  window.firebaseAuth = auth;
  window.firebaseDb = db;
  window.testFirebaseConnection = testFirebaseConnection;
}

// Signal that Firebase config is loaded
window.firebaseConfigLoaded = true;
console.log('Firebase config module loaded');
