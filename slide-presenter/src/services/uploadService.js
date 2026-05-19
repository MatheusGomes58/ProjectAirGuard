import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { v4 as uuidv4 } from 'uuid';

export async function uploadFile(file, folder = 'media') {
  const ext = file.name.split('.').pop();
  const fileName = `${folder}/${uuidv4()}.${ext}`;
  const storageRef = ref(storage, fileName);
  
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
}

export function getAcceptTypes(type) {
  if (type === 'image') return 'image/*';
  if (type === 'video') return 'video/*';
  return '*/*';
}
