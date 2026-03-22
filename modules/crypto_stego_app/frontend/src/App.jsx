import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

function SymmetricTab() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAction = async (action) => {
    if (!file) return alert("Select a file first");
    setLoading(true);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const resp = await fetch(`${API_BASE}/crypto/symmetric/${action}`, {
        method: 'POST',
        body: formData,
      });
      
      if (!resp.ok) throw new Error("Operation failed");
      
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = action === 'encrypt' ? `encrypted_${file.name}` : `decrypted_${file.name}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-accent-500">Symmetric Cryptography (AES)</h2>
      <p className="text-sm text-slate-400">Encrypt and decrypt files using AES-256. The key will be automatically generated and prepended to the encrypted file.</p>
      
      <div className="space-y-4">
        <label className="block">
          <span className="text-slate-300">Target File</span>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} className="input-field mt-1" />
        </label>
        
        <div className="flex gap-4">
          <button className="btn-primary w-full" onClick={() => handleAction('encrypt')} disabled={loading}>
            {loading ? 'Processing...' : 'Encrypt'}
          </button>
          <button className="btn-secondary w-full" onClick={() => handleAction('decrypt')} disabled={loading}>
            {loading ? 'Processing...' : 'Decrypt'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AsymmetricTab() {
  const [file, setFile] = useState(null);
  const [keyStr, setKeyStr] = useState("");
  const [loading, setLoading] = useState(false);
  
  const generateKeys = async () => {
    const res = await fetch(`${API_BASE}/crypto/asymmetric/keys`, { method: 'POST' });
    const data = await res.json();
    alert("Keys generated! Check console for private key, or save it somewhere safe.");
    console.log("PRIVATE KEY:", data.private_key);
    console.log("PUBLIC KEY:", data.public_key);
    setKeyStr(data.public_key); // Auto-fill public key for demo
  };

  const handleAction = async (action) => {
    if (!file) return alert("Select a file first");
    if (!keyStr) return alert("Provide the key first");
    
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append(action === 'encrypt' ? "public_key" : "private_key", keyStr);

    try {
      const resp = await fetch(`${API_BASE}/crypto/asymmetric/${action}`, {
        method: 'POST',
        body: formData,
      });
      
      if (!resp.ok) throw new Error("Operation failed");
      
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = action === 'encrypt' ? `rsa_encrypted_${file.name}` : `decrypted_${file.name}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-accent-500">Asymmetric Cryptography (RSA)</h2>
      <p className="text-sm text-slate-400">Uses RSA-2048 to safely wrap an AES key while encrypting your file.</p>
      
      <div className="space-y-4">
        <label className="block">
          <span className="text-slate-300">Target File</span>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} className="input-field mt-1" />
        </label>
        
        <label className="block">
          <span className="text-slate-300">Public/Private Key (PEM Format)</span>
          <textarea 
            rows="4" 
            value={keyStr} 
            onChange={(e) => setKeyStr(e.target.value)}
            className="input-field mt-1 font-mono text-sm" 
            placeholder="Paste your key here..."
          />
        </label>
        
        <div className="flex gap-4">
          <button className="btn-secondary w-full" onClick={generateKeys}>Generate Keys</button>
          <button className="btn-primary w-full" onClick={() => handleAction('encrypt')} disabled={loading}>Encrypt</button>
          <button className="btn-secondary w-full" onClick={() => handleAction('decrypt')} disabled={loading}>Decrypt</button>
        </div>
      </div>
    </div>
  );
}

function StegoTab() {
  const [file, setFile] = useState(null);
  const [secretMsg, setSecretMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [decodedMsg, setDecodedMsg] = useState("");

  const handleEncode = async () => {
    if (!file || !secretMsg) return alert("Select an image and enter a message");
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("secret_message", secretMsg);

    try {
      const resp = await fetch(`${API_BASE}/stego/encode`, {
        method: 'POST',
        body: formData,
      });
      if (!resp.ok) throw new Error("Operation failed");
      
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stego_${file.name}.png`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecode = async () => {
    if (!file) return alert("Select an image first");
    setLoading(true);
    setDecodedMsg("");
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const resp = await fetch(`${API_BASE}/stego/decode`, {
        method: 'POST',
        body: formData,
      });
      if (!resp.ok) throw new Error("Operation failed");
      const data = await resp.json();
      setDecodedMsg(data.secret_message);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-accent-500">Image Steganography (LSB)</h2>
      <p className="text-sm text-slate-400">Hide text deeply within the pixels of an image. Lossless formats like PNG are required to prevent data loss.</p>
      
      <div className="space-y-4">
        <label className="block">
          <span className="text-slate-300">Carrier Image</span>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} className="input-field mt-1" />
        </label>
        
        <label className="block">
          <span className="text-slate-300">Secret Message</span>
          <input 
            type="text" 
            value={secretMsg} 
            onChange={(e) => setSecretMsg(e.target.value)}
            className="input-field mt-1" 
            placeholder="Type your secret message here..."
          />
        </label>
        
        <div className="flex gap-4">
          <button className="btn-primary w-full" onClick={handleEncode} disabled={loading}>Hide Message</button>
          <button className="btn-secondary w-full" onClick={handleDecode} disabled={loading}>Extract Message</button>
        </div>
        
        {decodedMsg && (
          <div className="mt-4 p-4 bg-dark-900 border border-primary-500/30 rounded-lg animate-slide-up">
            <span className="text-xs text-primary-400 uppercase font-bold tracking-wider">Decoded Payload:</span>
            <p className="mt-1 text-slate-200">{decodedMsg}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryTab() {
  const [history, setHistory] = useState([]);
  
  useEffect(() => {
    fetch(`${API_BASE}/history/`)
      .then(res => res.json())
      .then(data => setHistory(data))
      .catch(err => console.error(err));
  }, []);

  const downloadCSV = () => {
    window.location.href = `${API_BASE}/history/csv`;
  };

  return (
    <div className="card space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-accent-500">Operation Logs</h2>
        <button onClick={downloadCSV} className="btn-primary !py-1 !px-3 text-sm">Download CSV</button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-dark-900 text-slate-400 border-b border-dark-700">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Operation</th>
              <th className="px-4 py-3">File Name</th>
              <th className="px-4 py-3">Size (B)</th>
              <th className="px-4 py-3">Time (ms)</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.id} className="border-b border-dark-700 hover:bg-dark-800/50">
                <td className="px-4 py-3">{row.id}</td>
                <td className="px-4 py-3"><span className="px-2 py-1 bg-dark-900 text-primary-400 rounded-md text-xs">{row.operation}</span></td>
                <td className="px-4 py-3 max-w-[150px] truncate">{row.file_name}</td>
                <td className="px-4 py-3">{row.file_size_bytes}</td>
                <td className="px-4 py-3 font-mono">{row.execution_time_ms.toFixed(2)}</td>
                <td className="px-4 py-3">{new Date(row.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {history.length === 0 && <p className="text-center text-slate-500 mt-4">No operations logged yet.</p>}
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('symmetric');

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <header className="text-center space-y-4">
        <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary-500 via-accent-500 to-primary-600 drop-shadow-sm">
          AirGuard Crypto Core
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
          Advanced cryptosystem and steganography platform. Ensure data confidentiality and hidden transmission channels seamlessly.
        </p>
      </header>

      <nav className="flex justify-center flex-wrap gap-2 p-1 bg-dark-800 rounded-xl max-w-fit mx-auto shadow-lg border border-slate-800">
        {['symmetric', 'asymmetric', 'steganography', 'history'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-200
              ${activeTab === tab 
                ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-dark-700'
              }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      <main className="mt-8 transition-all duration-500">
        {activeTab === 'symmetric' && <SymmetricTab />}
        {activeTab === 'asymmetric' && <AsymmetricTab />}
        {activeTab === 'steganography' && <StegoTab />}
        {activeTab === 'history' && <HistoryTab />}
      </main>
    </div>
  );
}
