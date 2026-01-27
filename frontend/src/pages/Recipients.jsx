import React, { useState, useEffect } from 'react';
import { Users, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

// IMPORTANTE: Se o seu sistema usa um componente de Layout (ex: AppLayout, DashboardLayout)
// que já inclui a Sidebar, você deve envolver este conteúdo nele.
// Se não usar, a Sidebar deve aparecer automaticamente se este componente estiver
// dentro das rotas protegidas no App.jsx.

export default function Recipients() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const token = localStorage.getItem('token');

  // Busca os comunicados com autenticação
  useEffect(() => {
    if (!token) return;

    fetch(`${import.meta.env.VITE_API_URL}/api/announcements`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAnnouncements(data);
          if (data.length > 0) setSelectedAnnouncement(data[0].id);
        } else {
          setAnnouncements([]);
        }
      })
      .catch(err => console.error("Erro ao buscar comunicados:", err));
  }, [token]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !selectedAnnouncement) {
      return setMessage({ type: 'error', text: 'Selecione um arquivo e um comunicado!' });
    }

    setLoading(true);
    setMessage({ type: '', text: '' }); // Limpa mensagens anteriores

    const formData = new FormData();
    formData.append('file', file);
    formData.append('announcementId', selectedAnnouncement);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/recipients/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        setFile(null);
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro no servidor' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Falha na conexão com o servidor.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    // O container principal agora tem fundo escuro e texto claro
    <div className="p-8 max-w-5xl mx-auto text-gray-100">
      <div className="flex items-center gap-3 mb-8 border-b border-gray-700 pb-4">
        <Users className="text-indigo-500" size={32} />
        <h1 className="text-3xl font-bold">Gestão de Público</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Card de Upload (Dark Mode) */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
          <div className="flex items-center gap-2 mb-6 text-indigo-400">
            <Upload size={20} />
            <h2 className="font-semibold text-xl">Importar Planilha</h2>
          </div>

          <form onSubmit={handleUpload} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Vincular ao Comunicado:
              </label>
              {/* Select com estilo escuro */}
              <select 
                value={selectedAnnouncement}
                onChange={(e) => setSelectedAnnouncement(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 p-2.5"
              >
                <option value="" className="text-gray-400">Selecione um comunicado...</option>
                {Array.isArray(announcements) && announcements.map(a => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>

            {/* Área de Upload com estilo escuro e hover */}
            <div className="border-2 border-dashed border-gray-600 hover:border-indigo-500 rounded-lg p-8 text-center transition-colors bg-gray-700/30">
              <input 
                type="file" 
                accept=".csv"
                onChange={(e) => setFile(e.target.files[0])}
                className="hidden" 
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer block flex flex-col items-center">
                <FileText className={`mb-3 ${file ? 'text-indigo-400' : 'text-gray-400'}`} size={48} />
                <span className="text-sm font-medium text-gray-300">
                  {file ? file.name : 'Clique para selecionar seu arquivo .CSV'}
                </span>
                {!file && <span className="text-xs text-gray-500 mt-1">Arraste ou clique aqui</span>}
              </label>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed shadow-md hover:shadow-indigo-500/30"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processando...
                </span>
              ) : 'Confirmar Importação'}
            </button>
          </form>

          {/* Mensagens de Feedback (Sucesso/Erro) */}
          {message.text && (
            <div className={`mt-6 p-4 rounded-lg flex items-start gap-3 border ${
              message.type === 'success' 
                ? 'bg-green-900/30 border-green-800 text-green-300' 
                : 'bg-red-900/30 border-red-800 text-red-300'
            }`}>
              {message.type === 'success' ? <CheckCircle size={20} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          )}
        </div>

        {/* Card de Instruções (Dark Mode) */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-fit lg:sticky lg:top-8 shadow-lg">
          <h3 className="font-bold text-indigo-400 mb-4 text-lg flex items-center gap-2">
            <AlertCircle size={20} /> Como preparar seu arquivo?
          </h3>
          <ul className="text-gray-300 text-sm space-y-4 leading-relaxed">
            <li className="flex gap-3 items-start">
              <span className="bg-indigo-900/50 text-indigo-300 font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 border border-indigo-800">1</span>
              <span>Salve sua planilha no formato <strong>.CSV</strong> (separado por vírgulas).</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="bg-indigo-900/50 text-indigo-300 font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 border border-indigo-800">2</span>
              <span>A <strong>primeira linha</strong> do arquivo deve conter exatamente estes cabeçalhos: <code>name,email</code></span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="bg-indigo-900/50 text-indigo-300 font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 border border-indigo-800">3</span>
              <span>Evite acentos ou caracteres especiais na linha de cabeçalho.</span>
            </li>
          </ul>
          
          <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700 font-mono text-sm">
            <p className="text-gray-500 mb-2 text-xs uppercase font-semibold tracking-wider">Exemplo do conteúdo do arquivo:</p>
            <code className="block text-indigo-300">
              name,email<br/>
              Arthur Luiz,arthur@teste.com<br/>
              Joao Silva,joao@empresa.com
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}