import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const PRESENTATIONS_COLLECTION = 'presentations';
const FOLDERS_COLLECTION = 'folders';
const LIVE_SESSIONS_COLLECTION = 'liveSessions';

// Remove undefined values recursively (Firestore doesn't accept undefined)
function cleanUndefined(obj) {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(cleanUndefined);
  if (typeof obj === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanUndefined(value);
      }
    }
    return cleaned;
  }
  return obj;
}

// ===== FOLDER FUNCTIONS =====

export async function saveFolder(folder) {
  const docRef = doc(db, FOLDERS_COLLECTION, folder.id);
  await setDoc(docRef, cleanUndefined(folder));
}

export async function getAllFolders() {
  const q = query(collection(db, FOLDERS_COLLECTION), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data());
}

export async function deleteFolder(id) {
  await deleteDoc(doc(db, FOLDERS_COLLECTION, id));
}

// ===== PRESENTATION FUNCTIONS =====

export async function savePresentation(presentation) {
  const docRef = doc(db, PRESENTATIONS_COLLECTION, presentation.id);
  const data = cleanUndefined({
    ...presentation,
    updatedAt: Date.now(),
  });
  await setDoc(docRef, data);
}

export async function getPresentation(id) {
  const docRef = doc(db, PRESENTATIONS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data();
  }
  return null;
}

export async function getAllPresentations() {
  const q = query(
    collection(db, PRESENTATIONS_COLLECTION),
    orderBy('updatedAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((d) => d.data());
}

export async function deletePresentation(id) {
  await deleteDoc(doc(db, PRESENTATIONS_COLLECTION, id));
}

export async function updatePresentationField(id, field, value) {
  const docRef = doc(db, PRESENTATIONS_COLLECTION, id);
  await updateDoc(docRef, { [field]: value, updatedAt: Date.now() });
}

// ===== LIVE SESSION FUNCTIONS (Firestore + onSnapshot) =====

export function generateSessionCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function createLiveSession(presentationId) {
  const code = generateSessionCode();
  const session = {
    presentationId,
    code,
    currentSlide: 0,
    isActive: true,
    started: false,
    theme: 'dark',
    pointer: null,
    drawing: [],
    blackScreen: false,
    notes: '',
    showWhiteboard: false,
    whiteboard: [],
    whiteboardTexts: [],
    createdAt: Date.now(),
  };
  const docRef = doc(db, LIVE_SESSIONS_COLLECTION, code);
  await setDoc(docRef, session);
  return session;
}

export async function getLiveSession(code) {
  const docRef = doc(db, LIVE_SESSIONS_COLLECTION, code);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data();
  }
  return null;
}

export function subscribeLiveSession(code, callback) {
  const docRef = doc(db, LIVE_SESSIONS_COLLECTION, code);
  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    } else {
      callback(null);
    }
  });
  return unsubscribe;
}

export async function updateCurrentSlide(code, slideIndex) {
  const docRef = doc(db, LIVE_SESSIONS_COLLECTION, code);
  await updateDoc(docRef, { currentSlide: slideIndex });
}

export async function startSession(code) {
  const docRef = doc(db, LIVE_SESSIONS_COLLECTION, code);
  await updateDoc(docRef, { started: true });
}

export async function updateSessionTheme(code, theme) {
  const docRef = doc(db, LIVE_SESSIONS_COLLECTION, code);
  await updateDoc(docRef, { theme });
}

export async function updateSessionPointer(code, pointer) {
  const docRef = doc(db, LIVE_SESSIONS_COLLECTION, code);
  await updateDoc(docRef, { pointer });
}

export async function updateSessionDrawing(code, drawing) {
  const docRef = doc(db, LIVE_SESSIONS_COLLECTION, code);
  await updateDoc(docRef, { drawing });
}

export async function clearSessionDrawing(code) {
  const docRef = doc(db, LIVE_SESSIONS_COLLECTION, code);
  await updateDoc(docRef, { drawing: [], pointer: null });
}

export async function updateSessionBlackScreen(code, blackScreen) {
  const docRef = doc(db, LIVE_SESSIONS_COLLECTION, code);
  await updateDoc(docRef, { blackScreen });
}

export async function updateSessionNotes(code, notes) {
  const docRef = doc(db, LIVE_SESSIONS_COLLECTION, code);
  await updateDoc(docRef, { notes });
}

export async function updateSessionWhiteboard(code, whiteboard) {
  const docRef = doc(db, LIVE_SESSIONS_COLLECTION, code);
  await updateDoc(docRef, { whiteboard });
}

export async function updateSessionWhiteboardText(code, whiteboardTexts) {
  const docRef = doc(db, LIVE_SESSIONS_COLLECTION, code);
  await updateDoc(docRef, { whiteboardTexts });
}

export async function updateSessionShowWhiteboard(code, showWhiteboard) {
  const docRef = doc(db, LIVE_SESSIONS_COLLECTION, code);
  await updateDoc(docRef, { showWhiteboard });
}

export async function endLiveSession(code) {
  const docRef = doc(db, LIVE_SESSIONS_COLLECTION, code);
  await deleteDoc(docRef);
}
