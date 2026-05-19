import { useState, useRef } from 'react';
import { FiTrash2, FiUpload, FiAlignLeft, FiAlignCenter, FiAlignRight, FiImage } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { uploadFile } from '../services/uploadService';
import { invalidateCache } from '../services/galleryService';
import ImageGallery from './ImageGallery.jsx';
import styles from './ElementProperties.module.css';

export default function ElementProperties({ element, onUpdate, onDelete }) {
  const [uploading, setUploading] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const fileInputRef = useRef(null);

  function updateStyle(styleUpdates) {
    onUpdate({ style: { ...element.style, ...styleUpdates } });
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máx 50MB)');
      return;
    }

    setUploading(true);
    try {
      const url = await uploadFile(file, element.type === 'image' ? 'images' : 'videos');
      onUpdate({ content: url });
      invalidateCache();
      toast.success('Upload concluído!');
    } catch (error) {
      toast.error('Erro no upload');
      console.error(error);
    } finally {
      setUploading(false);
    }
  }

  // Alignment functions
  function alignHorizontal(position) {
    switch (position) {
      case 'left':
        onUpdate({ x: 0 });
        break;
      case 'center':
        onUpdate({ x: (100 - element.width) / 2 });
        break;
      case 'right':
        onUpdate({ x: 100 - element.width });
        break;
    }
  }

  function alignVertical(position) {
    switch (position) {
      case 'top':
        onUpdate({ y: 0 });
        break;
      case 'middle':
        onUpdate({ y: (100 - element.height) / 2 });
        break;
      case 'bottom':
        onUpdate({ y: 100 - element.height });
        break;
    }
  }

  const typeLabels = {
    title: 'Título',
    text: 'Texto',
    image: 'Imagem',
    video: 'Vídeo',
    iframe: 'Iframe',
    table: 'Tabela',
    shape: 'Forma',
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>{typeLabels[element.type] || 'Elemento'}</h3>
        <button onClick={onDelete} className={styles.deleteBtn} title="Excluir">
          <FiTrash2 size={14} />
        </button>
      </div>

      {/* Alignment */}
      <div className={styles.section}>
        <h4>Alinhamento no Slide</h4>
        <div className={styles.alignRow}>
          <span className={styles.alignLabel}>Horizontal</span>
          <div className={styles.alignBtns}>
            <button onClick={() => alignHorizontal('left')} className={styles.alignBtn} title="Esquerda">
              <FiAlignLeft size={14} />
            </button>
            <button onClick={() => alignHorizontal('center')} className={styles.alignBtn} title="Centro">
              <FiAlignCenter size={14} />
            </button>
            <button onClick={() => alignHorizontal('right')} className={styles.alignBtn} title="Direita">
              <FiAlignRight size={14} />
            </button>
          </div>
        </div>
        <div className={styles.alignRow}>
          <span className={styles.alignLabel}>Vertical</span>
          <div className={styles.alignBtns}>
            <button onClick={() => alignVertical('top')} className={styles.alignBtn} title="Topo">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="4" x2="20" y2="4"/><rect x="9" y="4" width="6" height="12" rx="1"/></svg>
            </button>
            <button onClick={() => alignVertical('middle')} className={styles.alignBtn} title="Meio">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="12" x2="20" y2="12"/><rect x="9" y="6" width="6" height="12" rx="1"/></svg>
            </button>
            <button onClick={() => alignVertical('bottom')} className={styles.alignBtn} title="Baixo">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="20" x2="20" y2="20"/><rect x="9" y="8" width="6" height="12" rx="1"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Position & Size */}
      <div className={styles.section}>
        <h4>Posição & Tamanho</h4>
        <div className={styles.row}>
          <div className={styles.field}>
            <label>X (%)</label>
            <input type="number" value={Math.round(element.x)} onChange={(e) => onUpdate({ x: Number(e.target.value) })} min={0} max={100} />
          </div>
          <div className={styles.field}>
            <label>Y (%)</label>
            <input type="number" value={Math.round(element.y)} onChange={(e) => onUpdate({ y: Number(e.target.value) })} min={0} max={100} />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.field}>
            <label>Largura (%)</label>
            <input type="number" value={Math.round(element.width)} onChange={(e) => onUpdate({ width: Number(e.target.value) })} min={5} max={100} />
          </div>
          <div className={styles.field}>
            <label>Altura (%)</label>
            <input type="number" value={Math.round(element.height)} onChange={(e) => onUpdate({ height: Number(e.target.value) })} min={5} max={100} />
          </div>
        </div>
      </div>

      {/* Text Content */}
      {(element.type === 'text' || element.type === 'title') && (
        <div className={styles.section}>
          <h4>Conteúdo</h4>
          <textarea
            value={element.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            rows={3}
            className={styles.textarea}
          />
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Tamanho</label>
              <input type="number" value={element.style.fontSize || 16} onChange={(e) => updateStyle({ fontSize: Number(e.target.value) })} min={8} max={120} />
            </div>
            <div className={styles.field}>
              <label>Peso</label>
              <select value={element.style.fontWeight || '400'} onChange={(e) => updateStyle({ fontWeight: e.target.value })}>
                <option value="300">Light</option>
                <option value="400">Normal</option>
                <option value="500">Medium</option>
                <option value="600">Semi-Bold</option>
                <option value="700">Bold</option>
              </select>
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Cor</label>
              <input type="color" value={element.style.color || '#ffffff'} onChange={(e) => updateStyle({ color: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label>Alinhamento Texto</label>
              <select value={element.style.textAlign || 'left'} onChange={(e) => updateStyle({ textAlign: e.target.value })}>
                <option value="left">Esquerda</option>
                <option value="center">Centro</option>
                <option value="right">Direita</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Image/Video with Upload */}
      {(element.type === 'image' || element.type === 'video') && (
        <div className={styles.section}>
          <h4>Mídia</h4>
          <div className={styles.uploadArea}>
            <input
              ref={fileInputRef}
              type="file"
              accept={element.type === 'image' ? 'image/*' : 'video/*'}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={styles.uploadBtn}
              disabled={uploading}
            >
              <FiUpload size={14} />
              {uploading ? 'Enviando...' : `Upload ${element.type === 'image' ? 'Imagem' : 'Vídeo'}`}
            </button>
          </div>
          {element.type === 'image' && (
            <button onClick={() => setShowGallery(true)} className={styles.galleryBtn}>
              <FiImage size={14} />
              Galeria de Imagens
            </button>
          )}
          <div className={styles.divider}><span>ou cole a URL</span></div>
          <div className={styles.field}>
            <label>URL</label>
            <input type="text" value={element.content} onChange={(e) => onUpdate({ content: e.target.value })} placeholder="https://..." />
          </div>
          {element.type === 'image' && (
            <div className={styles.field}>
              <label>Ajuste</label>
              <select value={element.style.objectFit || 'cover'} onChange={(e) => updateStyle({ objectFit: e.target.value })}>
                <option value="cover">Cobrir</option>
                <option value="contain">Conter</option>
                <option value="fill">Preencher</option>
              </select>
            </div>
          )}
          <div className={styles.field}>
            <label>Borda Arredondada</label>
            <input type="number" value={element.style.borderRadius || 0} onChange={(e) => updateStyle({ borderRadius: Number(e.target.value) })} min={0} max={50} />
          </div>
        </div>
      )}

      {showGallery && (
        <ImageGallery
          onSelect={(url) => onUpdate({ content: url })}
          onClose={() => setShowGallery(false)}
        />
      )}

      {/* Iframe */}
      {element.type === 'iframe' && (
        <div className={styles.section}>
          <h4>Incorporar (Iframe)</h4>
          <div className={styles.field}>
            <label>URL do Iframe</label>
            <input type="text" value={element.content} onChange={(e) => onUpdate({ content: e.target.value })} placeholder="https://www.youtube.com/embed/..." />
          </div>
          <p className={styles.hint}>Cole URLs de embed do YouTube, Google Maps, Figma, CodePen, etc.</p>
          <div className={styles.field}>
            <label>Borda Arredondada</label>
            <input type="number" value={element.style.borderRadius || 0} onChange={(e) => updateStyle({ borderRadius: Number(e.target.value) })} min={0} max={50} />
          </div>
        </div>
      )}

      {/* Shape */}
      {element.type === 'shape' && (
        <div className={styles.section}>
          <h4>Forma</h4>
          <div className={styles.field}>
            <label>Cor de Fundo</label>
            <input type="color" value={element.style.backgroundColor || '#a78bfa'} onChange={(e) => updateStyle({ backgroundColor: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label>Borda Arredondada</label>
            <input type="number" value={element.style.borderRadius || 0} onChange={(e) => updateStyle({ borderRadius: Number(e.target.value) })} min={0} max={100} />
          </div>
          <div className={styles.field}>
            <label>Opacidade ({Math.round((element.style.opacity || 1) * 100)}%)</label>
            <input type="range" value={(element.style.opacity || 1) * 100} onChange={(e) => updateStyle({ opacity: Number(e.target.value) / 100 })} min={10} max={100} />
          </div>
        </div>
      )}

      {/* Table */}
      {element.type === 'table' && (
        <div className={styles.section}>
          <h4>Tabela</h4>
          <p className={styles.hint}>Edite o JSON para alterar os dados.</p>
          <textarea
            value={element.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            rows={6}
            className={styles.textarea}
            style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}
          />
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Tamanho Fonte</label>
              <input type="number" value={element.style.fontSize || 14} onChange={(e) => updateStyle({ fontSize: Number(e.target.value) })} min={8} max={32} />
            </div>
            <div className={styles.field}>
              <label>Cor Texto</label>
              <input type="color" value={element.style.color || '#ffffff'} onChange={(e) => updateStyle({ color: e.target.value })} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
