// Import Firebase SDKs
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, getDocs, doc, setDoc, addDoc, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Make Firebase services globally available
window.firebase = {
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
  ref,
  uploadBytes,
  getDownloadURL
};

// Initialize auth state listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in
    document.getElementById('login-nav').classList.add('d-none');
    document.getElementById('user-nav').classList.remove('d-none');
    document.getElementById('user-email').textContent = user.email;
    console.log('User signed in:', user.email);
  } else {
    // User is signed out
    document.getElementById('login-nav').classList.remove('d-none');
    document.getElementById('user-nav').classList.add('d-none');
    console.log('User signed out');
  }
});

console.log('Firebase initialized successfully');
