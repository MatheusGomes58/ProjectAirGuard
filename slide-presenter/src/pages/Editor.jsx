import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import {
  FiArrowLeft,
  FiSave,
  FiPlay,
  FiPlus,
  FiTrash2,
  FiType,
  FiImage,
  FiFilm,
  FiGrid,
  FiSquare,
  FiCode,
  FiSun,
  FiMoon,
  FiMenu,
  FiX,
  FiUpload,
  FiFileText,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import {
  getPresentation,
  savePresentation,
} from '../services/presentationService';
import { uploadFile } from '../services/uploadService';
import { invalidateCache } from '../services/galleryService';
import { DEFAULT_THEMES } from '../utils/themes';
import { useTheme } from '../contexts/ThemeContext.jsx';
import SlideCanvas from '../components/SlideCanvas.jsx';
import ElementProperties from '../components/ElementProperties.jsx';
import ImageGallery from '../components/ImageGallery.jsx';
import ScriptEditor from '../components/ScriptEditor.jsx';
import styles from './Editor.module.css';

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [presentation, setPresentation] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const [showBgGallery, setShowBgGallery] = useState(false);
  const [showScriptEditor, setShowScriptEditor] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const bgFileInputRef = useRef(null);

  useEffect(() => {
    if (id) loadPresentation(id);
  }, [id]);

  async function loadPresentation(presentationId) {
    try {
      const data = await getPresentation(presentationId);
      if (data) {
        setPresentation(data);
      } else {
        toast.error('Apresentação não encontrada');
        navigate('/');
      }
    } catch (error) {
      toast.error('Erro ao carregar');
      console.error(error);
      navigate('/');
    }
  }

  async function handleSave() {
    if (!presentation) return;
    setSaving(true);
    try {
      await savePresentation(presentation);
      toast.success('Salvo!');
    } catch (error) {
      toast.error('Erro ao salvar');
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  function addSlide() {
    if (!presentation) return;
    const newSlide = {
      id: uuidv4(),
      order: presentation.slides.length,
      background: presentation.theme.defaultBackground,
      elements: [],
    };
    setPresentation({
      ...presentation,
      slides: [...presentation.slides, newSlide],
    });
    setCurrentSlideIndex(presentation.slides.length);
  }

  function duplicateSlide(index) {
    if (!presentation) return;
    const original = presentation.slides[index];
    const duplicated = {
      ...JSON.parse(JSON.stringify(original)),
      id: uuidv4(),
      order: index + 1,
    };
    duplicated.elements = duplicated.elements.map((el) => ({ ...el, id: uuidv4() }));
    const newSlides = [...presentation.slides];
    newSlides.splice(index + 1, 0, duplicated);
    setPresentation({ ...presentation, slides: newSlides });
    setCurrentSlideIndex(index + 1);
  }

  function deleteSlide(index) {
    if (!presentation || presentation.slides.length <= 1) {
      toast.error('Precisa ter pelo menos 1 slide');
      return;
    }
    const newSlides = presentation.slides.filter((_, i) => i !== index);
    setPresentation({ ...presentation, slides: newSlides });
    if (currentSlideIndex >= newSlides.length) {
      setCurrentSlideIndex(newSlides.length - 1);
    }
  }

  function addElement(type) {
    if (!presentation) return;
    const slide = presentation.slides[currentSlideIndex];
    let newElement;

    switch (type) {
      case 'title':
        newElement = {
          id: uuidv4(), type: 'title', x: 10, y: 10, width: 80, height: 15,
          content: 'Novo Título',
          style: { fontSize: 42, fontWeight: '700', color: presentation.theme.primaryColor, textAlign: 'center' },
        };
        break;
      case 'text':
        newElement = {
          id: uuidv4(), type: 'text', x: 10, y: 40, width: 60, height: 20,
          content: 'Texto aqui...',
          style: { fontSize: 18, fontWeight: '400', color: presentation.theme.primaryColor, textAlign: 'left' },
        };
        break;
      case 'image':
        newElement = {
          id: uuidv4(), type: 'image', x: 20, y: 20, width: 40, height: 50,
          content: '',
          style: { objectFit: 'cover', borderRadius: 8 },
        };
        break;
      case 'video':
        newElement = {
          id: uuidv4(), type: 'video', x: 15, y: 15, width: 50, height: 50,
          content: '',
          style: { borderRadius: 8 },
        };
        break;
      case 'iframe':
        newElement = {
          id: uuidv4(), type: 'iframe', x: 10, y: 10, width: 60, height: 60,
          content: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
          style: { borderRadius: 8 },
        };
        break;
      case 'table':
        newElement = {
          id: uuidv4(), type: 'table', x: 10, y: 30, width: 60, height: 40,
          content: JSON.stringify({
            rows: 3, cols: 3,
            data: [['Col 1', 'Col 2', 'Col 3'], ['Dado', 'Dado', 'Dado'], ['Dado', 'Dado', 'Dado']],
          }),
          style: { fontSize: 14, color: presentation.theme.primaryColor, border: `1px solid ${presentation.theme.secondaryColor}` },
        };
        break;
      case 'shape':
        newElement = {
          id: uuidv4(), type: 'shape', x: 30, y: 30, width: 20, height: 20,
          content: 'rectangle',
          style: { backgroundColor: presentation.theme.secondaryColor, borderRadius: 0, opacity: 0.8 },
        };
        break;
      default:
        return;
    }

    const updatedSlide = { ...slide, elements: [...slide.elements, newElement] };
    const newSlides = [...presentation.slides];
    newSlides[currentSlideIndex] = updatedSlide;
    setPresentation({ ...presentation, slides: newSlides });
    setSelectedElementId(newElement.id);
    setShowProperties(true);
  }

  const updateElement = useCallback(
    (elementId, updates) => {
      setPresentation((prev) => {
        if (!prev) return prev;
        const slide = prev.slides[currentSlideIndex];
        const updatedElements = slide.elements.map((el) =>
          el.id === elementId ? { ...el, ...updates } : el
        );
        const newSlides = [...prev.slides];
        newSlides[currentSlideIndex] = { ...slide, elements: updatedElements };
        return { ...prev, slides: newSlides };
      });
    },
    [currentSlideIndex]
  );

  function deleteElement(elementId) {
    if (!presentation) return;
    const slide = presentation.slides[currentSlideIndex];
    const updatedElements = slide.elements.filter((el) => el.id !== elementId);
    const newSlides = [...presentation.slides];
    newSlides[currentSlideIndex] = { ...slide, elements: updatedElements };
    setPresentation({ ...presentation, slides: newSlides });
    setSelectedElementId(null);
  }

  function updateSlideBackground(type, value, secondary) {
    if (!presentation) return;
    const newSlides = [...presentation.slides];
    // When switching type, reset value appropriately
    let finalValue = value;
    if (type === 'image' && value && value.startsWith('#')) {
      finalValue = ''; // Clear color value when switching to image
    }
    if (type === 'color' && value && !value.startsWith('#')) {
      finalValue = '#1a1a2e'; // Default color
    }
    newSlides[currentSlideIndex] = {
      ...newSlides[currentSlideIndex],
      background: { type, value: finalValue, secondaryValue: secondary || null, gradientDirection: '135deg' },
    };
    setPresentation({ ...presentation, slides: newSlides });
  }

  async function handleBgFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máx 50MB)');
      return;
    }
    setUploadingBg(true);
    try {
      const url = await uploadFile(file, 'images');
      invalidateCache();
      updateSlideBackground('image', url);
      toast.success('Fundo atualizado!');
    } catch (error) {
      toast.error('Erro no upload');
      console.error(error);
    } finally {
      setUploadingBg(false);
    }
  }

  if (!presentation) {
    return <div className={styles.loading}>Carregando...</div>;
  }

  const currentSlide = presentation.slides[currentSlideIndex];
  const selectedElement = currentSlide?.elements.find((el) => el.id === selectedElementId);

  return (
    <div className={styles.container}>
      {/* Top Bar */}
      <header className={styles.topBar}>
        <div className={styles.topLeft}>
          <button onClick={() => setShowSidebar(!showSidebar)} className={styles.menuBtn}>
            <FiMenu size={18} />
          </button>
          <button onClick={() => navigate('/')} className={styles.backBtn}>
            <FiArrowLeft size={16} />
          </button>
          <input
            type="text"
            value={presentation.title}
            onChange={(e) => setPresentation({ ...presentation, title: e.target.value })}
            className={styles.titleInput}
          />
        </div>
        <div className={styles.topRight}>
          <button onClick={() => setShowScriptEditor(true)} className={styles.iconBtn} title="Roteiro">
            <FiFileText size={16} />
          </button>
          <button onClick={toggleTheme} className={styles.iconBtn} title="Tema">
            {theme === 'dark' ? <FiSun size={16} /> : <FiMoon size={16} />}
          </button>
          <button onClick={handleSave} className={styles.saveBtn} disabled={saving}>
            <FiSave size={15} />
            <span className={styles.btnText}>{saving ? 'Salvando...' : 'Salvar'}</span>
          </button>
          <button onClick={() => navigate(`/present/${id}`)} className={styles.presentBtn}>
            <FiPlay size={15} />
            <span className={styles.btnText}>Apresentar</span>
          </button>
        </div>
      </header>

      <div className={styles.workspace}>
        {/* Slide List Sidebar */}
        <aside className={`${styles.slideList} ${showSidebar ? styles.slideListOpen : ''}`}>
          <div className={styles.slideListHeader}>
            <span>Slides</span>
            <div className={styles.slideListActions}>
              <button onClick={addSlide} className={styles.addSlideBtn}><FiPlus size={14} /></button>
              <button onClick={() => setShowSidebar(false)} className={styles.closeSidebarBtn}><FiX size={14} /></button>
            </div>
          </div>
          <div className={styles.slideListItems}>
            {presentation.slides.map((slide, index) => (
              <div
                key={slide.id}
                className={`${styles.slideThumb} ${index === currentSlideIndex ? styles.slideThumbActive : ''}`}
                onClick={() => { setCurrentSlideIndex(index); setSelectedElementId(null); setShowSidebar(false); }}
              >
                <span className={styles.slideNumber}>{index + 1}</span>
                <div
                  className={styles.slideThumbPreview}
                  style={{
                    background:
                      slide.background.type === 'gradient'
                        ? `linear-gradient(${slide.background.gradientDirection || '135deg'}, ${slide.background.value}, ${slide.background.secondaryValue})`
                        : slide.background.type === 'image'
                          ? `url(${slide.background.value}) center/cover`
                          : slide.background.value,
                  }}
                />
                <div className={styles.slideThumbActions}>
                  <button onClick={(e) => { e.stopPropagation(); duplicateSlide(index); }} className={styles.dupSlideBtn} title="Duplicar">⧉</button>
                  {presentation.slides.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); deleteSlide(index); }} className={styles.deleteSlideBtn}><FiTrash2 size={10} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Canvas */}
        <main className={styles.canvasArea}>
          <div className={styles.elementToolbar}>
            <button onClick={() => addElement('title')} title="Título"><FiType size={16} /><span>Título</span></button>
            <button onClick={() => addElement('text')} title="Texto"><FiType size={13} /><span>Texto</span></button>
            <button onClick={() => addElement('image')} title="Imagem"><FiImage size={16} /><span>Imagem</span></button>
            <button onClick={() => addElement('video')} title="Vídeo"><FiFilm size={16} /><span>Vídeo</span></button>
            <button onClick={() => addElement('iframe')} title="Iframe"><FiCode size={16} /><span>Iframe</span></button>
            <button onClick={() => addElement('table')} title="Tabela"><FiGrid size={16} /><span>Tabela</span></button>
            <button onClick={() => addElement('shape')} title="Forma"><FiSquare size={16} /><span>Forma</span></button>
          </div>

          <SlideCanvas
            slide={currentSlide}
            selectedElementId={selectedElementId}
            onSelectElement={(id) => { setSelectedElementId(id); if (id) setShowProperties(true); }}
            onUpdateElement={updateElement}
            theme={presentation.theme}
          />
        </main>

        {/* Properties Panel */}
        <aside className={`${styles.propertiesPanel} ${showProperties ? styles.propertiesPanelOpen : ''}`}>
          <button className={styles.closePropsBtn} onClick={() => setShowProperties(false)}>
            <FiX size={16} />
          </button>
          {selectedElement ? (
            <ElementProperties
              element={selectedElement}
              onUpdate={(updates) => updateElement(selectedElement.id, updates)}
              onDelete={() => deleteElement(selectedElement.id)}
            />
          ) : (
            <div className={styles.slideProperties}>
              <h3>Propriedades do Slide</h3>
              <div className={styles.propGroup}>
                <label>Fundo</label>
                <select
                  value={currentSlide.background.type}
                  onChange={(e) => updateSlideBackground(e.target.value, currentSlide.background.value, currentSlide.background.secondaryValue)}
                >
                  <option value="color">Cor Sólida</option>
                  <option value="gradient">Gradiente</option>
                  <option value="image">Imagem</option>
                </select>
              </div>
              {currentSlide.background.type === 'color' && (
                <div className={styles.propGroup}>
                  <label>Cor</label>
                  <input type="color" value={currentSlide.background.value} onChange={(e) => updateSlideBackground('color', e.target.value)} />
                </div>
              )}
              {currentSlide.background.type === 'gradient' && (
                <>
                  <div className={styles.propGroup}>
                    <label>Cor 1</label>
                    <input type="color" value={currentSlide.background.value} onChange={(e) => updateSlideBackground('gradient', e.target.value, currentSlide.background.secondaryValue)} />
                  </div>
                  <div className={styles.propGroup}>
                    <label>Cor 2</label>
                    <input type="color" value={currentSlide.background.secondaryValue || '#000000'} onChange={(e) => updateSlideBackground('gradient', currentSlide.background.value, e.target.value)} />
                  </div>
                </>
              )}
              {currentSlide.background.type === 'image' && (
                <>
                  <div className={styles.propGroup}>
                    <label>Upload Imagem de Fundo</label>
                    <input
                      ref={bgFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleBgFileUpload}
                      style={{ display: 'none' }}
                    />
                    <button
                      onClick={() => bgFileInputRef.current?.click()}
                      className={styles.bgUploadBtn}
                      disabled={uploadingBg}
                    >
                      <FiUpload size={14} />
                      {uploadingBg ? 'Enviando...' : 'Upload Imagem'}
                    </button>
                  </div>
                  <div className={styles.propGroup}>
                    <button onClick={() => setShowBgGallery(true)} className={styles.bgGalleryBtn}>
                      <FiImage size={14} />
                      Galeria
                    </button>
                  </div>
                  <div className={styles.propGroup}>
                    <label>Ou cole a URL</label>
                    <input type="text" value={currentSlide.background.value} onChange={(e) => updateSlideBackground('image', e.target.value)} placeholder="https://..." />
                  </div>
                  {currentSlide.background.value && (
                    <div className={styles.bgPreview}>
                      <img src={currentSlide.background.value} alt="Preview" />
                    </div>
                  )}
                </>
              )}
              <div className={styles.propGroup}>
                <label>Tema</label>
                <select
                  value={presentation.theme.name}
                  onChange={(e) => {
                    const t = DEFAULT_THEMES.find((t) => t.name === e.target.value);
                    if (t) setPresentation({ ...presentation, theme: t });
                  }}
                >
                  {DEFAULT_THEMES.map((t) => (<option key={t.name} value={t.name}>{t.name}</option>))}
                </select>
              </div>
              <div className={styles.propGroup}>
                <label>Notas do Slide</label>
                <textarea
                  value={currentSlide.notes || ''}
                  onChange={(e) => {
                    const newSlides = [...presentation.slides];
                    newSlides[currentSlideIndex] = { ...newSlides[currentSlideIndex], notes: e.target.value };
                    setPresentation({ ...presentation, slides: newSlides });
                  }}
                  placeholder="Anotações para este slide..."
                  rows={4}
                  className={styles.notesTextarea}
                />
              </div>
              <div className={styles.propGroup}>
                <label>Áudio do Slide</label>
                <div className={styles.audioUploadRow}>
                  <input
                    type="file"
                    accept="audio/*"
                    style={{ display: 'none' }}
                    id="audio-upload"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 50 * 1024 * 1024) { toast.error('Máx 50MB'); return; }
                      try {
                        const url = await uploadFile(file, 'audio');
                        const newSlides = [...presentation.slides];
                        newSlides[currentSlideIndex] = { ...newSlides[currentSlideIndex], audio: url };
                        setPresentation({ ...presentation, slides: newSlides });
                        toast.success('Áudio adicionado');
                      } catch { toast.error('Erro no upload'); }
                    }}
                  />
                  <button onClick={() => document.getElementById('audio-upload').click()} className={styles.bgUploadBtn}>
                    <FiUpload size={14} /> Upload Áudio
                  </button>
                </div>
                <input
                  type="text"
                  value={currentSlide.audio || ''}
                  onChange={(e) => {
                    const newSlides = [...presentation.slides];
                    newSlides[currentSlideIndex] = { ...newSlides[currentSlideIndex], audio: e.target.value };
                    setPresentation({ ...presentation, slides: newSlides });
                  }}
                  placeholder="Ou cole a URL do áudio..."
                  style={{ marginTop: '6px' }}
                />
                {currentSlide.audio && (
                  <div className={styles.audioPreview}>
                    <audio src={currentSlide.audio} controls style={{ width: '100%', height: '32px', marginTop: '6px' }} />
                    <button onClick={() => {
                      const newSlides = [...presentation.slides];
                      newSlides[currentSlideIndex] = { ...newSlides[currentSlideIndex], audio: null };
                      setPresentation({ ...presentation, slides: newSlides });
                    }} className={styles.audioRemoveBtn}>Remover áudio</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Mobile properties toggle */}
      {selectedElement && !showProperties && (
        <button className={styles.mobilePropsToggle} onClick={() => setShowProperties(true)}>
          Propriedades
        </button>
      )}

      {/* Background Gallery Modal */}
      {showBgGallery && (
        <ImageGallery
          onSelect={(url) => updateSlideBackground('image', url)}
          onClose={() => setShowBgGallery(false)}
        />
      )}

      {showScriptEditor && (
        <ScriptEditor
          script={presentation.script || []}
          slides={presentation.slides}
          onChange={(newScript) => setPresentation({ ...presentation, script: newScript })}
          onClose={() => setShowScriptEditor(false)}
        />
      )}
    </div>
  );
}
