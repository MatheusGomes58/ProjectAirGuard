import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiPlay,
  FiSmartphone,
  FiFolder,
  FiFolderPlus,
  FiChevronRight,
  FiHome,
  FiSun,
  FiMoon,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import {
  getAllPresentations,
  deletePresentation,
  savePresentation,
  getAllFolders,
  saveFolder,
  deleteFolder,
} from '../services/presentationService';
import { DEFAULT_THEMES } from '../utils/themes';
import { useTheme } from '../contexts/ThemeContext.jsx';
import styles from './Home.module.css';

export default function Home() {
  const [presentations, setPresentations] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [presData, folderData] = await Promise.all([
        getAllPresentations(),
        getAllFolders(),
      ]);
      setPresentations(presData);
      setFolders(folderData);
    } catch (error) {
      toast.error('Erro ao carregar dados');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    const folder = {
      id: uuidv4(),
      name: newFolderName.trim(),
      parentId: currentFolderId,
      createdAt: Date.now(),
    };
    try {
      await saveFolder(folder);
      setFolders((prev) => [...prev, folder]);
      setNewFolderName('');
      setShowNewFolder(false);
      toast.success('Pasta criada!');
    } catch (error) {
      toast.error('Erro ao criar pasta');
      console.error(error);
    }
  }

  async function handleDeleteFolder(folderId) {
    if (!confirm('Excluir esta pasta? As apresentações dentro dela ficarão sem pasta.')) return;
    try {
      await deleteFolder(folderId);
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      const affectedPres = presentations.filter((p) => p.folderId === folderId);
      for (const p of affectedPres) {
        await savePresentation({ ...p, folderId: null });
      }
      setPresentations((prev) =>
        prev.map((p) => (p.folderId === folderId ? { ...p, folderId: null } : p))
      );
      toast.success('Pasta excluída');
    } catch (error) {
      toast.error('Erro ao excluir pasta');
      console.error(error);
    }
  }

  async function handleCreate() {
    const id = uuidv4();
    const themeData = DEFAULT_THEMES[0];
    const newPresentation = {
      id,
      title: 'Nova Apresentação',
      folderId: currentFolderId || null,
      slides: [
        {
          id: uuidv4(),
          order: 0,
          background: themeData.defaultBackground,
          elements: [
            {
              id: uuidv4(),
              type: 'title',
              x: 10,
              y: 35,
              width: 80,
              height: 20,
              content: 'Título da Apresentação',
              style: {
                fontSize: 48,
                fontWeight: '700',
                color: themeData.primaryColor,
                textAlign: 'center',
              },
            },
          ],
        },
      ],
      theme: themeData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    try {
      await savePresentation(newPresentation);
      navigate(`/editor/${id}`);
    } catch (error) {
      toast.error('Erro ao criar apresentação');
      console.error(error);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Tem certeza que deseja excluir esta apresentação?')) return;
    try {
      await deletePresentation(id);
      setPresentations((prev) => prev.filter((p) => p.id !== id));
      toast.success('Apresentação excluída');
    } catch (error) {
      toast.error('Erro ao excluir');
      console.error(error);
    }
  }

  function handleConnectRemote() {
    navigate('/remote');
  }

  const currentFolders = folders.filter((f) => f.parentId === currentFolderId);
  const currentPresentations = presentations.filter(
    (p) => (p.folderId || null) === currentFolderId
  );

  function getBreadcrumb() {
    const crumbs = [];
    let fId = currentFolderId;
    while (fId) {
      const folder = folders.find((f) => f.id === fId);
      if (folder) {
        crumbs.unshift(folder);
        fId = folder.parentId;
      } else break;
    }
    return crumbs;
  }

  const breadcrumb = getBreadcrumb();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>
            <FiPlay className={styles.logoIcon} size={20} />
            <span className={styles.logoText}>Slide Presenter</span>
          </h1>
          <div className={styles.headerActions}>
            <button onClick={toggleTheme} className={styles.themeBtn} title="Alternar tema">
              {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
            </button>
            <button onClick={handleConnectRemote} className={styles.connectBtn}>
              <FiSmartphone size={16} />
              Controle Remoto
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.breadcrumb}>
          <button
            className={styles.breadcrumbItem}
            onClick={() => setCurrentFolderId(null)}
          >
            <FiHome size={14} />
            <span>Início</span>
          </button>
          {breadcrumb.map((folder) => (
            <span key={folder.id} className={styles.breadcrumbSep}>
              <FiChevronRight size={12} />
              <button
                className={styles.breadcrumbItem}
                onClick={() => setCurrentFolderId(folder.id)}
              >
                {folder.name}
              </button>
            </span>
          ))}
        </div>

        <div className={styles.toolbar}>
          <h2>
            {currentFolderId
              ? folders.find((f) => f.id === currentFolderId)?.name || 'Pasta'
              : 'Minhas Apresentações'}
          </h2>
          <div className={styles.toolbarActions}>
            <button
              onClick={() => setShowNewFolder(true)}
              className={styles.folderBtn}
            >
              <FiFolderPlus size={16} />
              <span className={styles.btnLabel}>Nova Pasta</span>
            </button>
            <button onClick={handleCreate} className={styles.createBtn}>
              <FiPlus size={18} />
              <span className={styles.btnLabel}>Nova Apresentação</span>
            </button>
          </div>
        </div>

        {showNewFolder && (
          <div className={styles.newFolderRow}>
            <input
              type="text"
              placeholder="Nome da pasta"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
            <button onClick={handleCreateFolder} className={styles.confirmBtn}>
              Criar
            </button>
            <button
              onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}
              className={styles.cancelBtn}
            >
              Cancelar
            </button>
          </div>
        )}

        {loading ? (
          <div className={styles.loading}>Carregando...</div>
        ) : (
          <>
            {currentFolders.length > 0 && (
              <div className={styles.foldersGrid}>
                {currentFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className={styles.folderCard}
                    onClick={() => setCurrentFolderId(folder.id)}
                  >
                    <FiFolder size={28} className={styles.folderIcon} />
                    <span className={styles.folderName}>{folder.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                      className={styles.folderDeleteBtn}
                    >
                      <FiTrash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {currentPresentations.length === 0 && currentFolders.length === 0 ? (
              <div className={styles.empty}>
                <p>Nenhuma apresentação aqui.</p>
                <p>Crie uma nova apresentação ou pasta para começar!</p>
              </div>
            ) : (
              <div className={styles.grid}>
                {currentPresentations.map((p) => (
                  <div key={p.id} className={styles.card}>
                    <div
                      className={styles.cardPreview}
                      style={{
                        background:
                          p.theme?.defaultBackground?.type === 'gradient'
                            ? `linear-gradient(${p.theme.defaultBackground.gradientDirection || '135deg'}, ${p.theme.defaultBackground.value}, ${p.theme.defaultBackground.secondaryValue})`
                            : p.theme?.defaultBackground?.value || '#1a1a2e',
                      }}
                    >
                      <span className={styles.slideCount}>
                        {p.slides?.length || 0} slide{(p.slides?.length || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className={styles.cardBody}>
                      <h3>{p.title}</h3>
                      <p className={styles.cardDate}>
                        {new Date(p.updatedAt).toLocaleDateString('pt-BR')}
                      </p>
                      <div className={styles.cardActions}>
                        <button onClick={() => navigate(`/editor/${p.id}`)} className={styles.actionBtn} title="Editar">
                          <FiEdit2 size={15} />
                        </button>
                        <button onClick={() => navigate(`/present/${p.id}`)} className={styles.actionBtnPlay} title="Apresentar">
                          <FiPlay size={15} />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className={styles.actionBtnDanger} title="Excluir">
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
