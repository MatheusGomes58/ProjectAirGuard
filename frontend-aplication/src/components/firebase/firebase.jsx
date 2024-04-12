import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import 'firebase/compat/database';

const firebaseConfig = {
  apiKey: "AIzaSyBFZvQeulc-HcJ0mg4pkJ3PaYT6fjkau6U",
  authDomain: "projectairguard.firebaseapp.com",
  projectId: "projectairguard",
  storageBucket: "projectairguard.appspot.com",
  messagingSenderId: "676272574243",
  appId: "1:676272574243:web:14e7455fcda2cdabba4696",
  measurementId: "G-EC2QV72RV4"
};

const app = firebase.initializeApp(firebaseConfig, 'app');
const auth = firebase.initializeApp(firebaseConfig).auth();
const db = app.firestore();
const realTimeDB = app.database();
const storage = app.storage();



export { db, storage, app, auth, realTimeDB };

