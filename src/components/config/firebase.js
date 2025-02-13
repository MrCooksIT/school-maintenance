// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCdCifTm6-IU3ERw2S_AQ4_tZDf6FmdyCI",
    authDomain: "campuscare-9b9d2.firebaseapp.com",
    projectId: "campuscare-9b9d2",
    storageBucket: "campuscare-9b9d2.firebasestorage.app",
    messagingSenderId: "813279438668",
    appId: "1:813279438668:web:0230e890f6b85dbc99d1e9",
    measurementId: "G-N2501ZJ1QS"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);