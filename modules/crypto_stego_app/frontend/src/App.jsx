import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const uploadFileInChunks = async (file, onProgress) => {
  const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB chunks (seguro para defaults do Nginx/GitHub)
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const uploadId = Math.random().toString(36).substring(2) + Date.now().toString(36);
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    
    const formData = new FormData();
    formData.append("upload_id", uploadId);
    formData.append("chunk", chunk);
    
    const resp = await fetch(`${API_BASE}/crypto/upload_chunk`, {
      method: 'POST',
      body: formData,
    });
    
    if (!resp.ok) {
      throw new Error(`Falha ao fazer upload da parte ${i + 1}/${totalChunks}`);
    }
    
    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalChunks) * 100));
    }
  }
  
  return uploadId;
};


function HistoryTable({ opsFilter }) {
  const [history, setHistory] = useState([]);

  const fetchHistory = () => {
    fetch(`${API_BASE}/history/`)
      .then(res => res.json())
      .then(data => {
        let filtered = data;
        if (opsFilter) {
          filtered = data.filter(r => opsFilter.includes(r.operation));
        }
        setHistory(filtered);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchHistory();
    const int = setInterval(fetchHistory, 3000);
    return () => clearInterval(int);
  }, [opsFilter]);

  const getOpBadge = (op) => {
    const OP_MAP = {
      'sym_enc': 'CRIP. SIMÉTRICA',
      'sym_dec': 'DESCRIP. SIMÉTRICA',
      'asym_enc': 'CRIP. ASSIMÉTRICA',
      'asym_dec': 'DESCRIP. ASSIMÉTRICA',
      'stego_enc': 'OCULTAÇÃO (STEGO)',
      'stego_dec': 'EXTRAÇÃO (STEGO)',
    };
    return OP_MAP[op] || op.toUpperCase();
  };

  return (
    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-dark-700 animate-slide-up">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-300 mb-4">Registro de Operações Recentes</h3>
      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-dark-700">
        <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-dark-800">
          <thead className="bg-slate-50 dark:bg-dark-900 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-dark-700">
            <tr>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Operação</th>
              <th className="px-4 py-2">Nome do Arquivo</th>
              <th className="px-4 py-2">Tempo (ms)</th>
              <th className="px-4 py-2">Data</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 dark:border-dark-700 hover:bg-slate-50 dark:hover:bg-dark-700 transition-colors">
                <td className="px-4 py-2">{row.id}</td>
                <td className="px-4 py-2">
                  <span className="px-2 py-0.5 bg-primary-50 dark:bg-dark-900 text-primary-600 dark:text-primary-400 rounded text-xs ring-1 ring-primary-500/20">
                    {getOpBadge(row.operation)}
                  </span>
                </td>
                <td className="px-4 py-2 max-w-[120px] truncate" title={row.file_name}>{row.file_name}</td>
                <td className="px-4 py-2 font-mono text-xs">{row.execution_time_ms.toFixed(1)}</td>
                <td className="px-4 py-2 text-xs">{new Date(row.timestamp).toLocaleString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {history.length === 0 && <div className="p-4 text-center text-slate-500 text-sm">Nenhuma operação registrada ainda.</div>}
      </div>
    </div>
  );
}

function SymmetricTab() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = React.useRef(null);

  const handleAction = async (action) => {
    if (!file) return alert("Selecione um arquivo primeiro");
    setLoading(true);
    setUploadProgress(0);

    try {
      let uploadId = null;
      if (file.size > 1 * 1024 * 1024) { // acima de 1MB usa upload em partes
        uploadId = await uploadFileInChunks(file, setUploadProgress);
      }

      setUploadProgress(100);

      const formData = new FormData();
      if (uploadId) {
        formData.append("upload_id", uploadId);
        formData.append("filename", file.name);
      } else {
        formData.append("file", file);
      }

      const resp = await fetch(`${API_BASE}/crypto/symmetric/${action}`, {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.detail || `A operação de ${action === 'encrypt' ? 'criptografia' : 'descriptografia'} falhou.`);
      }

      const disposition = resp.headers.get('content-disposition');
      let filename = action === 'encrypt' ? `criptografado_${file.name}` : `descriptografado_${file.name}`;
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = disposition.match(/filename="?([^"]+)"?/);
        if (matches != null && matches[1]) {
          filename = matches[1];
        }
      }

      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      
      // Limpar o arquivo selecionado para forçar a seleção do novo arquivo processado
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      alert(`Erro: ${e.message}`);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const getButtonText = (baseText) => {
    if (!loading) return baseText;
    if (uploadProgress > 0 && uploadProgress < 100) return `Enviando: ${uploadProgress}%`;
    return 'Processando...';
  };

  return (
    <div className="card space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-primary-500">Criptografia Simétrica (AES)</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">Criptografe e descriptografe arquivos usando AES-256. A chave será gerada automaticamente e anexada ao início do arquivo criptografado.</p>

      <div className="space-y-4">
        <label className="block">
          <span className="text-slate-600 dark:text-slate-300">Arquivo Alvo</span>
          <input ref={fileInputRef} type="file" onChange={(e) => setFile(e.target.files[0])} className="input-field mt-1" />
        </label>

        <div className="flex gap-4">
          <button className="btn-primary w-full" onClick={() => handleAction('encrypt')} disabled={loading}>
            {getButtonText('Criptografar')}
          </button>
          <button className="btn-secondary w-full" onClick={() => handleAction('decrypt')} disabled={loading}>
            {getButtonText('Descriptografar')}
          </button>
        </div>
      </div>

      <HistoryTable opsFilter={["sym_enc", "sym_dec"]} />
    </div>
  );
}

function AsymmetricTab() {
  const [file, setFile] = useState(null);
  const [publicKey, setPublicKey] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = React.useRef(null);

  const generateKeys = async () => {
    const res = await fetch(`${API_BASE}/crypto/asymmetric/keys`, { method: 'POST' });
    const data = await res.json();
    alert("Chaves geradas! As chaves foram preenchidas nos campos abaixo.");
    setPublicKey(data.public_key || "");
    setPrivateKey(data.private_key || "");
  };

  const handleAction = async (action) => {
    if (!file) return alert("Selecione um arquivo primeiro");
    const keyToUse = action === 'encrypt' ? publicKey : privateKey;
    if (!keyToUse) return alert("Forneça a chave PEM primeiro (use Gerar Chaves ou cole manualmente)");

    setLoading(true);
    setUploadProgress(0);

    try {
      let uploadId = null;
      if (file.size > 1 * 1024 * 1024) { // acima de 1MB
        uploadId = await uploadFileInChunks(file, setUploadProgress);
      }

      setUploadProgress(100);

      const formData = new FormData();
      if (uploadId) {
        formData.append("upload_id", uploadId);
        formData.append("filename", file.name);
      } else {
        formData.append("file", file);
      }
      formData.append(action === 'encrypt' ? "public_key" : "private_key", keyToUse.trim());

      const resp = await fetch(`${API_BASE}/crypto/asymmetric/${action}`, {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.detail || `A operação de ${action === 'encrypt' ? 'criptografia' : 'descriptografia'} falhou.`);
      }

      const disposition = resp.headers.get('content-disposition');
      let filename = action === 'encrypt' ? `rsa_criptografado_${file.name}` : `descriptografado_${file.name}`;
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = disposition.match(/filename="?([^"]+)"?/);
        if (matches != null && matches[1]) {
          filename = matches[1];
        }
      }

      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      
      // Limpar o arquivo selecionado
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      alert(`Erro: ${e.message}`);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const getButtonText = (baseText) => {
    if (!loading) return baseText;
    if (uploadProgress > 0 && uploadProgress < 100) return `Enviando: ${uploadProgress}%`;
    return 'Processando...';
  };

  return (
    <div className="card space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-primary-500">Criptografia Assimétrica (RSA Híbrido)</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">Utiliza chaves RSA-2048 para envelopar a chave AES na hora da criptografia de forma altamente segura. Suporta arquivos grandes de até 500MB.</p>

      <div className="space-y-4">
        <label className="block">
          <span className="text-slate-600 dark:text-slate-300">Arquivo Alvo</span>
          <input ref={fileInputRef} type="file" onChange={(e) => setFile(e.target.files[0])} className="input-field mt-1" />
        </label>

        <label className="block">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-300">Chave Pública (Formato PEM)</span>
            <div className="flex gap-2">
              <button type="button" className="text-xs btn-ghost" onClick={() => navigator.clipboard && navigator.clipboard.writeText(publicKey)}>
                Copiar
              </button>
            </div>
          </div>
          <textarea
            rows="4"
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            className="input-field mt-1 font-mono text-xs"
            placeholder="Cole a chave pública PEM aqui ou gere novas chaves..."
          />
        </label>

        <label className="block">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-300">Chave Privada (Formato PEM)</span>
            <div className="flex gap-2">
              <button type="button" className="text-xs btn-ghost" onClick={() => navigator.clipboard && navigator.clipboard.writeText(privateKey)}>
                Copiar
              </button>
            </div>
          </div>
          <textarea
            rows="6"
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            className="input-field mt-1 font-mono text-xs"
            placeholder="Cole a chave privada PEM aqui (necessária para descriptografar)..."
          />
        </label>

        <div className="flex gap-4">
          <button className="btn-secondary w-full" onClick={generateKeys}>Gerar Chaves</button>
          <button className="btn-primary w-full" onClick={() => handleAction('encrypt')} disabled={loading}>{getButtonText('Criptografar')}</button>
          <button className="btn-secondary w-full" onClick={() => handleAction('decrypt')} disabled={loading}>{getButtonText('Descriptografar')}</button>
        </div>
      </div>

      <HistoryTable opsFilter={["asym_enc", "asym_dec"]} />
    </div>
  );
}

function StegoTab() {
  const [file, setFile] = useState(null);
  const [secretMsg, setSecretMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [decodedMsg, setDecodedMsg] = useState("");

  const fileInputRef = React.useRef(null);

  const handleEncode = async () => {
    if (!file || !secretMsg) return alert("Selecione uma imagem e digite uma mensagem secreta");
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("secret_message", secretMsg);

    try {
      const resp = await fetch(`${API_BASE}/stego/encode`, {
        method: 'POST',
        body: formData,
      });
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.detail || "Falha ao ocultar mensagem.");
      }

      const disposition = resp.headers.get('content-disposition');
      let filename = `stego_${file.name.split('.')[0]}.png`;
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = disposition.match(/filename="?([^"]+)"?/);
        if (matches != null && matches[1]) {
          filename = matches[1];
        }
      }

      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      
      // Limpar
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      alert(`Erro: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDecode = async () => {
    if (!file) return alert("Selecione a imagem stego primeiro");
    setLoading(true);
    setDecodedMsg("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const resp = await fetch(`${API_BASE}/stego/decode`, {
        method: 'POST',
        body: formData,
      });
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.detail || "Falha ao extrair mensagem.");
      }
      const data = await resp.json();
      setDecodedMsg(data.secret_message);
    } catch (e) {
      alert(`Erro: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-primary-500">Esteganografia em Imagens (LSB)</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">Oculte textos sigilosos profundamente dentro dos bits menos significativos da sua imagem. O download sempre prioriza extensão PNG para impedir perda de dados.</p>

      <div className="space-y-4">
        <label className="block">
          <span className="text-slate-600 dark:text-slate-300">Imagem Portadora</span>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} className="input-field mt-1" />
        </label>

        <label className="block">
          <span className="text-slate-600 dark:text-slate-300">Mensagem Secreta</span>
          <input
            type="text"
            value={secretMsg}
            onChange={(e) => setSecretMsg(e.target.value)}
            className="input-field mt-1"
            placeholder="Digite o segredo invisível aqui..."
          />
        </label>

        <div className="flex gap-4">
          <button className="btn-primary w-full" onClick={handleEncode} disabled={loading}>{loading ? 'Injetando...' : 'Ocultar Mensagem'}</button>
          <button className="btn-secondary w-full" onClick={handleDecode} disabled={loading}>{loading ? 'Extraindo...' : 'Extrair Mensagem'}</button>
        </div>

        {decodedMsg && (
          <div className="mt-4 p-4 bg-slate-100 dark:bg-dark-900 border border-primary-500/30 rounded-lg animate-slide-up">
            <span className="text-xs text-primary-500 dark:text-primary-400 uppercase font-bold tracking-wider">PAYLOAD DECODIFICADO COM SUCESSO:</span>
            <p className="mt-1 text-slate-800 dark:text-slate-200">{decodedMsg}</p>
          </div>
        )}
      </div>

      <HistoryTable opsFilter={["stego_enc", "stego_dec"]} />
    </div>
  );
}

function HistoryTab() {
  const [history, setHistory] = useState([]);

  const fetchAllHistory = () => {
    fetch(`${API_BASE}/history/`)
      .then(res => res.json())
      .then(data => setHistory(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchAllHistory();
    const int = setInterval(fetchAllHistory, 3000);
    return () => clearInterval(int);
  }, []);

  const downloadCSV = () => {
    window.location.href = `${API_BASE}/history/csv`;
  };

  const getOpBadge = (op) => {
    const OP_MAP = {
      'sym_enc': 'CRIP. SIMÉTRICA',
      'sym_dec': 'DESCRIP. SIMÉTRICA',
      'asym_enc': 'CRIP. ASSIMÉTRICA',
      'asym_dec': 'DESCRIP. ASSIMÉTRICA',
      'stego_enc': 'OCULTAÇÃO (STEGO)',
      'stego_dec': 'EXTRAÇÃO (STEGO)',
    };
    return OP_MAP[op] || op.toUpperCase();
  };

  return (
    <div className="card space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-slate-50 dark:bg-dark-900/50 p-4 rounded-xl border border-slate-200 dark:border-dark-700">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Logs de Operações Globais</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Um registro completo de auditoria para todas as tarefas criptográficas.</p>
        </div>
        <button onClick={downloadCSV} className="btn-primary !py-2 !px-4 text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          Exportar CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200 dark:ring-dark-700 bg-white dark:bg-dark-800">
        <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-dark-900 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-dark-700">
            <tr>
              <th className="px-5 py-4 font-semibold">ID</th>
              <th className="px-5 py-4 font-semibold">Operação</th>
              <th className="px-5 py-4 font-semibold">Nome do Arquivo</th>
              <th className="px-5 py-4 font-semibold">Tamanho (Bytes)</th>
              <th className="px-5 py-4 font-semibold">Tempo Exec. (ms)</th>
              <th className="px-5 py-4 font-semibold">Data e Hora</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-dark-700">
            {history.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-dark-700/50 transition-colors">
                <td className="px-5 py-3 tabular-nums">{row.id}</td>
                <td className="px-5 py-3">
                  <span className="px-2.5 py-1 bg-primary-50 dark:bg-dark-900 text-primary-600 dark:text-primary-400 rounded-md text-xs font-medium ring-1 ring-primary-500/30">
                    {getOpBadge(row.operation)}
                  </span>
                </td>
                <td className="px-5 py-3 max-w-[200px] truncate" title={row.file_name}>{row.file_name}</td>
                <td className="px-5 py-3 tabular-nums text-slate-500 dark:text-slate-400">{(row.file_size_bytes / 1024).toFixed(2)} KB</td>
                <td className="px-5 py-3 font-mono text-primary-600 dark:text-accent-400">{row.execution_time_ms.toFixed(3)}</td>
                <td className="px-5 py-3 text-slate-500 dark:text-slate-400 tabular-nums">{new Date(row.timestamp).toLocaleString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {history.length === 0 && <p className="text-center text-slate-500 py-8">Nenhum evento detectado ainda.</p>}
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('symmetric');
  const [theme, setTheme] = useState(
    localStorage.getItem('theme') || 'dark'
  );

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto space-y-8 animate-fade-in relative">

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 md:top-8 md:right-8 p-3 rounded-full bg-white dark:bg-dark-800 shadow-lg border border-slate-200 dark:border-slate-700/50 hover:scale-110 transition-transform duration-200 text-slate-700 dark:text-slate-200"
        title="Alternar Tema"
      >
        {theme === 'dark' ? (
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"></path></svg>
        ) : (
          <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
        )}
      </button>

      <header className="text-center space-y-4 pt-4">
        <h1 className="text-5xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 drop-shadow-sm">
          AirGuard <span className="text-primary-500">Criptografia</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
          Plataforma avançada de criptossistema e esteganografia. Garanta a confidencialidade dos seus dados e canais de transmissão de forma contínua através da criptografia robusta.
        </p>
      </header>

      <nav className="flex justify-center flex-wrap gap-2 p-1.5 bg-slate-100 dark:bg-dark-800 rounded-xl max-w-fit mx-auto ring-1 ring-slate-200 dark:ring-slate-800/50 shadow-xl">
        {[
          { id: 'symmetric', label: 'Simétrica' },
          { id: 'asymmetric', label: 'Assimétrica' },
          { id: 'steganography', label: 'Esteganografia' },
          { id: 'history', label: 'Histórico' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300
              ${activeTab === tab.id
                ? 'bg-primary-500 text-white shadow-lg ring-1 ring-primary-500/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-dark-700'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="mt-12 transition-all duration-500">
        {activeTab === 'symmetric' && <SymmetricTab />}
        {activeTab === 'asymmetric' && <AsymmetricTab />}
        {activeTab === 'steganography' && <StegoTab />}
        {activeTab === 'history' && <HistoryTab />}
      </main>
    </div>
  );
}
