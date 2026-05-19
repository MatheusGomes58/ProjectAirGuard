import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FiPlus, FiTrash2, FiX, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import styles from './ScriptEditor.module.css';

export default function ScriptEditor({ script, slides, onChange, onClose }) {
  const [sections, setSections] = useState(script || []);

  function update(newSections) {
    setSections(newSections);
    onChange(newSections);
  }

  function addSection() {
    update([...sections, {
      id: uuidv4(),
      type: 'section',
      title: 'Nova Seção',
      subtitle: '',
      slideRef: null,
      content: '',
    }]);
  }

  function addTitle() {
    update([...sections, {
      id: uuidv4(),
      type: 'title',
      title: 'Título',
      subtitle: '',
    }]);
  }

  function removeItem(id) {
    update(sections.filter((s) => s.id !== id));
  }

  function updateItem(id, updates) {
    update(sections.map((s) => s.id === id ? { ...s, ...updates } : s));
  }

  function moveItem(index, direction) {
    const newSections = [...sections];
    const target = index + direction;
    if (target < 0 || target >= newSections.length) return;
    [newSections[index], newSections[target]] = [newSections[target], newSections[index]];
    update(newSections);
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Roteiro da Apresentação</h2>
          <button onClick={onClose} className={styles.closeBtn}><FiX size={18} /></button>
        </div>

        <p className={styles.description}>
          Crie um roteiro estruturado com títulos e seções. Seções podem referenciar slides para navegação rápida no controle remoto.
        </p>

        <div className={styles.actions}>
          <button onClick={addTitle} className={styles.addBtn}>
            <FiPlus size={14} /> Título
          </button>
          <button onClick={addSection} className={styles.addBtn}>
            <FiPlus size={14} /> Seção
          </button>
        </div>

        <div className={styles.list}>
          {sections.length === 0 && (
            <p className={styles.empty}>Nenhum item no roteiro. Adicione títulos e seções.</p>
          )}
          {sections.map((item, index) => (
            <div key={item.id} className={`${styles.item} ${item.type === 'title' ? styles.itemTitle : styles.itemSection}`}>
              <div className={styles.itemHeader}>
                <span className={styles.itemType}>{item.type === 'title' ? 'TÍTULO' : 'SEÇÃO'}</span>
                <div className={styles.itemActions}>
                  <button onClick={() => moveItem(index, -1)} disabled={index === 0} className={styles.moveBtn}><FiChevronUp size={14} /></button>
                  <button onClick={() => moveItem(index, 1)} disabled={index === sections.length - 1} className={styles.moveBtn}><FiChevronDown size={14} /></button>
                  <button onClick={() => removeItem(item.id)} className={styles.removeBtn}><FiTrash2 size={14} /></button>
                </div>
              </div>

              <input
                type="text"
                value={item.title}
                onChange={(e) => updateItem(item.id, { title: e.target.value })}
                placeholder={item.type === 'title' ? 'Título principal' : 'Nome da seção'}
                className={styles.titleInput}
              />

              {item.type === 'title' && (
                <input
                  type="text"
                  value={item.subtitle || ''}
                  onChange={(e) => updateItem(item.id, { subtitle: e.target.value })}
                  placeholder="Subtítulo (opcional)"
                  className={styles.subtitleInput}
                />
              )}

              {item.type === 'section' && (
                <>
                  <div className={styles.slideRefRow}>
                    <label>Slide referenciado:</label>
                    <select
                      value={item.slideRef ?? ''}
                      onChange={(e) => updateItem(item.id, { slideRef: e.target.value ? Number(e.target.value) : null })}
                    >
                      <option value="">Nenhum</option>
                      {slides.map((_, i) => (
                        <option key={i} value={i}>Slide {i + 1}</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={item.content || ''}
                    onChange={(e) => updateItem(item.id, { content: e.target.value })}
                    placeholder="Conteúdo / anotações desta seção..."
                    rows={3}
                    className={styles.contentInput}
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
