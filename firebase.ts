// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDy9c_rBBzdJJHjWm-m3ERS17KzXYRoick",
  authDomain: "boorkin-industires.firebaseapp.com",
  projectId: "boorkin-industires",
  storageBucket: "boorkin-industires.firebasestorage.app",
  messagingSenderId: "795033757393",
  appId: "1:795033757393:web:aa8e7cbe0328e6265887f0",
  measurementId: "G-XLPED910TQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
