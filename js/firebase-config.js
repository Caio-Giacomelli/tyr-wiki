// Firebase Configuration - CDN compat version (no bundler needed)
const firebaseConfig = {
    apiKey: "AIzaSyCwLPPt561QRfP9IisymDZyow8J7T7osd0",
    authDomain: "tyr-wiki.firebaseapp.com",
    projectId: "tyr-wiki",
    storageBucket: "tyr-wiki.firebasestorage.app",
    messagingSenderId: "305977597842",
    appId: "1:305977597842:web:2215d3550059f971396b4b"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
