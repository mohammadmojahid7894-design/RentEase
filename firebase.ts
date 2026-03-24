import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBB1qTEYx4pAv4rVuuR8_Gwkpc06BM9XxQ",
    authDomain: "ghar-ka-system.firebaseapp.com",
    projectId: "ghar-ka-system",
    storageBucket: "ghar-ka-system.firebasestorage.app",
    messagingSenderId: "941070969721",
    appId: "1:941070969721:web:0ab4778630220044a79da8",
    measurementId: "G-MFDTBJFMJ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;