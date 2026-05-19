import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

// Cache to avoid re-fetching
let cachedImages = null;
let lastFetch = 0;
const CACHE_DURATION = 30000; // 30 seconds

export async function getUploadedImages() {
  const now = Date.now();
  if (cachedImages && now - lastFetch < CACHE_DURATION) {
    return cachedImages;
  }

  try {
    const imagesRef = ref(storage, 'images');
    const result = await listAll(imagesRef);
    const urls = await Promise.all(
      result.items.map((item) => getDownloadURL(item))
    );
    cachedImages = urls;
    lastFetch = now;
    return urls;
  } catch (error) {
    console.error('Erro ao listar imagens:', error);
    return cachedImages || [];
  }
}

export function invalidateCache() {
  cachedImages = null;
  lastFetch = 0;
}
