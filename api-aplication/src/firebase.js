import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

const firebaseConfig = {
  apiKey: "AIzaSyBFZvQeulc-HcJ0mg4pkJ3PaYT6fjkau6U",
  authDomain: "projectairguard.firebaseapp.com",
  projectId: "projectairguard",
  databaseURL: "https://projectairguard-default-rtdb.firebaseio.com",
  storageBucket: "projectairguard.appspot.com",
  messagingSenderId: "676272574243",
  appId: "1:676272574243:web:14e7455fcda2cdabba4696"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const db = firebase.database();
