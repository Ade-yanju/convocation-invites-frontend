// client/src/firebaseClient.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Replace with your Firebase web config from Console → Project settings → General → Web app
const firebaseConfig = {
  apiKey: "AIzaSyDLH2RdOTkJLC-Z3FwcG2xUP8cGA1RCoFE",
  authDomain: "convocation-invites.firebaseapp.com",
  projectId: "convocation-invites",
  storageBucket: "convocation-invites.firebasestorage.app",
  messagingSenderId: "882021281723",
  appId: "1:882021281723:web:9d03ab22298b7af03cde9e",
  measurementId: "G-VB1KN5X8TZ",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
