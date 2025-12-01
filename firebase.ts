import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBOaK24QB_1QDThUe15Bap5TPx0g7dO--c",
  authDomain: "study-tracker-app-2d475.firebaseapp.com",
  projectId: "study-tracker-app-2d475",
  storageBucket: "study-tracker-app-2d475.firebasestorage.app",
  messagingSenderId: "548349119732",
  appId: "1:548349119732:web:2cff7d7766e4a5b57262a1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);