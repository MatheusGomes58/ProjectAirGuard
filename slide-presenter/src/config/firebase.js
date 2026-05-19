import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyD68wTbW6SxGVukXgND2ot3JzooCBi-iSI",
  authDomain: "hostprojects-88b99.firebaseapp.com",
  projectId: "hostprojects-88b99",
  storageBucket: "hostprojects-88b99.firebasestorage.app",
  messagingSenderId: "206328597385",
  appId: "1:206328597385:web:32e51142b0618921c06f58",
  measurementId: "G-V4FDJJDFGP"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
