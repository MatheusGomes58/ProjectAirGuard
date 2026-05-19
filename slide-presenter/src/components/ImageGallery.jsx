import { useEffect, useState } from 'react';
import { FiX, FiRefreshCw } from 'react-icons/fi';
import { getUploadedImages, invalidateCache } from '../services/galleryService';
import styles from './ImageGallery.module.css';

export default function ImageGallery({ onSelect, onClose }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadImages();
  }, []);

  async function loadImages() {
    setLoading(true);
    const urls = await getUploadedImages();
    setImages(urls);
    setLoading(false);
  }

  async function handleRefresh() {
    invalidateCache();
    await loadImages();
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Galeria de Imagens</h3>
          <div className={styles.headerActions}>
            <button onClick={handleRefresh} className={styles.refreshBtn} title="Atualizar">
              <FiRefreshCw size={14} />
            </button>
            <button onClick={onClose} className={styles.closeBtn}>
              <FiX size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>Carregando imagens...</div>
        ) : images.length === 0 ? (
          <div className={styles.empty}>
            <p>Nenhuma imagem enviada ainda.</p>
            <p>Faça upload de imagens para vê-las aqui.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {images.map((url, index) => (
              <button
                key={index}
                className={styles.imageItem}
                onClick={() => { onSelect(url); onClose(); }}
              >
                <img src={url} alt={`Imagem ${index + 1}`} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
