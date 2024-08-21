import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import 'firebase/compat/database';
import data from '../../data/config.json';

const firebaseConfig = data.firebaseConfig;

// Inicialize o Firebase apenas se ele ainda não foi inicializado
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Exporte os serviços necessários
const app = firebase.app();
const auth = firebase.auth();
const db = firebase.firestore();
const realTimeDB = firebase.database();
const storage = firebase.storage();

export { app, auth, db, realTimeDB, storage };
