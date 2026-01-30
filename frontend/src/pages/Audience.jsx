import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import * as XLSX from 'xlsx'; // Importação da biblioteca Excel
import { 
  Users, Loader2, Plus, Upload, Search, Edit2, Trash2, Filter, 
  FileSpreadsheet, Download, FileText 
} from 'lucide-react';
import ContactModal from '../components/ContactModal';

// --- MAPEAMENTO DAS COLUNAS (Excel -> Banco de Dados) ---
const COLUMN_MAP = {
  'STATUS': 'status',
  'NOME': 'name',
  'E-MAIL': 'email',
  'TELEFONE': 'phone',
  'NASCIMENTO': 'birth_date',
  'GENERO': 'gender',
  'CONTRATAÇÃO': 'contract_type', // Ajustado para bater com seu payload
  'CARGO': 'role',
  'EQUIPE': 'team',
  'TECNOLOGIA': 'technology',     // Ajustado para bater com seu payload
  'TAGS': 'tags'
};

const TEMPLATE_HEADERS = Object.keys(COLUMN_MAP);

export default function Audience() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Controle do Modal e Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [saving, setSaving] = useState(false);

  // Controle de Importação/Exportação
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const [availableTags, setAvailableTags] = useState([]);

  useEffect(() => {
    fetchContacts();
    fetchTags();
  }, []);

  async function fetchTags() {
    const { data } = await supabase.from('tags').select('*').order('name');
    if (data) setAvailableTags(data);
  }

  async function fetchContacts() {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error("Erro ao buscar contatos:", error);
    } finally {
      setLoading(false);
    }
  }

  // --- 1. BAIXAR MODELO (TEMPLATE) ---
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo Importacao");
    XLSX.writeFile(wb, "modelo_contatos_framework.xlsx");
  };

  // --- 2. EXPORTAR DADOS ---
  const handleExport = (type) => {
    if (contacts.length === 0) return alert("Sem contatos para exportar.");

    const dataToExport = contacts.map(c => ({
      'STATUS': c.status,
      'NOME': c.name,
      'E-MAIL': c.email,
      'TELEFONE': c.phone,
      'NASCIMENTO': c.birth_date,
      'GENERO': c.gender,
      'CONTRATAÇÃO': c.contract_type,
      'CARGO': c.role,
      'EQUIPE': c.team,
      'TECNOLOGIA': c.technology,
      'TAGS': Array.isArray(c.tags) ? c.tags.join(', ') : c.tags
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contatos");

    const fileName = type === 'csv' ? "contatos_export.csv" : "contatos_export.xlsx";
    XLSX.writeFile(wb, fileName);
  };

  // --- 3. IMPORTAÇÃO AVANÇADA (EXCEL/CSV) ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        
        // Converte planilha para JSON bruto
        const rawData = XLSX.utils.sheet_to_json(ws);

        if (rawData.length === 0) {
            alert("A planilha está vazia.");
            return;
        }

        // Processa e Mapeia os dados (PT -> EN)
        const formattedData = rawData.map(row => {
            const newContact = {};
            
            Object.keys(COLUMN_MAP).forEach(headerPT => {
                const dbField = COLUMN_MAP[headerPT];
                let value = row[headerPT];

                // Tratamento TAGS (String "A, B" -> Array ["A", "B"])
                if (dbField === 'tags' && value && typeof value === 'string') {
                    value = value.split(',').map(t => t.trim());
                }
                
                // Tratamento DATAS do Excel (Número serial -> Data ISO)
                if ((dbField === 'birth_date' || dbField === 'hiring_date') && typeof value === 'number') {
                    const date = new Date(Math.round((value - 25569)*86400*1000));
                    value = date.toISOString().split('T')[0];
                }

                if (value !== undefined) {
                    newContact[dbField] = value;
                }
            });
            // Garante status ativo se não vier
            if (!newContact.status) newContact.status = 'active';
            
            return newContact;
        });

        const { error } = await supabase.from('contacts').insert(formattedData);
        if (error) throw error;

        alert(`${formattedData.length} contatos importados com sucesso!`);
        fetchContacts();

      } catch (err) {
        console.error("Erro na importação:", err);
        alert("Erro ao importar: " + err.message + "\nVerifique se usou o Modelo correto.");
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.readAsBinaryString(file);
  };

  // --- SALVAR (Modal) ---
  async function handleSaveContact(formData) {
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        status: formData.status,
        phone: formData.phone,
        birth_date: formData.birthDate || null,
        gender: formData.gender,
        hiring_date: formData.hiringDate || null,
        contract_type: formData.contractType,
        role: formData.role,
        team: formData.team,
        technology: formData.technology,
        tags: formData.tags
      };

      let error, data;

      if (editingContact) {
        const response = await supabase.from('contacts').update(payload).eq('id', editingContact.id).select();
        data = response.data; error = response.error;
      } else {
        const response = await supabase.from('contacts').insert([payload]).select();
        data = response.data; error = response.error;
      }

      if (error) throw error;

      if (data) {
        if (editingContact) {
          setContacts(contacts.map(c => c.id === editingContact.id ? data[0] : c));
          alert("Contato atualizado!");
        } else {
          setContacts([data[0], ...contacts]);
          alert("Contato criado!");
        }
        closeModal();
      }
    } catch (error) {
      alert("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  // --- EXCLUIR ---
  async function handleDelete(id) {
    if (!confirm("Tem certeza que deseja excluir?")) return;
    try {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
      setContacts(contacts.filter(c => c.id !== id));
    } catch (error) {
      alert("Erro ao excluir: " + error.message);
    }
  }

  // --- CONTROLES MODAL ---
  function openNewModal() { setEditingContact(null); setIsModalOpen(true); }
  function openEditModal(contact) { setEditingContact(contact); setIsModalOpen(true); }
  function closeModal() { setIsModalOpen(false); setEditingContact(null); }

  // --- FILTRO ---
  const filteredContacts = contacts.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.role || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.team || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '30px', color: 'white', overflowY: 'auto', height: '100%' }}>
      
      {/* Cabeçalho Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: 10 }}>
        <div>
           <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Público</h1>
           <p style={{ color: '#a8a8b3', fontSize: '14px' }}>Gerencie sua base de contatos.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            ref={fileInputRef}
            style={{ display: 'none' }} 
            onChange={handleFileUpload}
          />
          
          <button 
            onClick={() => fileInputRef.current.click()}
            disabled={importing}
            style={{ background: '#202024', color: '#e1e1e6', border: '1px solid #323238', padding: '10px 15px', borderRadius: '6px', fontWeight: 'bold', display: 'flex', gap: 8, cursor: 'pointer', alignItems: 'center', fontSize: '14px' }}
          >
            {importing ? <Loader2 className="spin" size={16}/> : <Upload size={16} />} 
            Importar Planilha
          </button>

          <button onClick={openNewModal} style={{ background: '#8257e6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', display: 'flex', gap: 8, cursor: 'pointer', alignItems: 'center', fontSize: '14px' }}>
            <Plus size={18} /> Novo Contato
          </button>
        </div>
      </div>

      {/* BARRA DE FERRAMENTAS DE DADOS (NOVO) */}
      <div style={{ background: '#202024', padding: 15, borderRadius: 8, border: '1px solid #323238', marginBottom: 20, display:'flex', gap:15, alignItems:'center', flexWrap:'wrap' }}>
          <span style={{fontSize:12, fontWeight:'bold', color:'#7c7c8a', textTransform:'uppercase', marginRight:'auto'}}>Ferramentas:</span>
          
          <button onClick={handleDownloadTemplate} style={{background:'transparent', border:'none', color:'#a8a8b3', cursor:'pointer', display:'flex', gap:5, alignItems:'center', fontSize:13}} title="Baixar modelo para preencher">
              <FileSpreadsheet size={16}/> Baixar Modelo
          </button>
          <div style={{width:1, height:20, background:'#323238'}}></div>
          <button onClick={() => handleExport('xlsx')} style={{background:'transparent', border:'none', color:'#a8a8b3', cursor:'pointer', display:'flex', gap:5, alignItems:'center', fontSize:13}}>
              <Download size={16}/> Exportar Excel
          </button>
          <button onClick={() => handleExport('csv')} style={{background:'transparent', border:'none', color:'#a8a8b3', cursor:'pointer', display:'flex', gap:5, alignItems:'center', fontSize:13}}>
              <FileText size={16}/> Exportar CSV
          </button>
      </div>

      {/* Barra de Busca */}
      <div style={{ marginBottom: '20px', background: '#202024', padding: '12px', borderRadius: '8px', display: 'flex', gap: 10, alignItems: 'center', border: '1px solid #323238' }}>
        <Search size={20} color="#7c7c8a"/>
        <input 
          placeholder="Buscar por nome, email, cargo ou equipe..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
          style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%', fontSize: '14px' }} 
        />
        <Filter size={20} color="#7c7c8a" style={{ cursor: 'pointer' }} />
      </div>

      {/* Tabela */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#a8a8b3' }}><Loader2 className="spin" /> Carregando...</div>
      ) : (
        <div style={{ background: '#202024', borderRadius: '8px', border: '1px solid #323238', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
            <thead style={{ background: '#29292e', color: '#a8a8b3', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <tr>
                <th style={{ padding: '15px' }}>Colaborador</th>
                <th style={{ padding: '15px' }}>Cargo / Equipe</th>
                <th style={{ padding: '15px' }}>Tags</th>
                <th style={{ padding: '15px' }}>Status</th>
                <th style={{ padding: '15px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact) => (
                <tr key={contact.id} style={{ borderBottom: '1px solid #323238', fontSize: '14px' }}>
                  <td style={{ padding: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#323238', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#8257e6' }}>
                        {(contact.name?.[0] || 'U').toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: '#e1e1e6' }}>{contact.name}</div>
                        <div style={{ fontSize: '12px', color: '#a8a8b3' }}>{contact.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '15px' }}>
                    <div style={{ color: '#e1e1e6' }}>{contact.role || '-'}</div>
                    <div style={{ fontSize: '12px', color: '#a8a8b3' }}>{contact.team || '-'}</div>
                  </td>
                  <td style={{ padding: '15px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: '250px' }}>
                      {contact.tags && contact.tags.length > 0 ? (
                        contact.tags.map((tagName, i) => {
                          const tagMeta = availableTags.find(t => t.name === tagName);
                          return (
                            <span key={i} style={{ background: tagMeta?.color || '#8257e6', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', color: '#fff' }}>{tagName}</span>
                          );
                        })
                      ) : <span style={{ color: '#555', fontSize: '12px' }}>-</span>}
                    </div>
                  </td>
                  <td style={{ padding: '15px' }}>
                    <span style={{ backgroundColor: contact.status === 'active' || contact.status === 'Ativo' ? 'rgba(0, 179, 126, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: contact.status === 'active' || contact.status === 'Ativo' ? '#00B37E' : '#EF4444', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                      {contact.status || 'Ativo'}
                    </span>
                  </td>
                  <td style={{ padding: '15px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                      <button onClick={() => openEditModal(contact)} title="Editar" style={{ background: 'transparent', border: 'none', color: '#7c7c8a', cursor: 'pointer' }}><Edit2 size={18} /></button>
                      <button onClick={() => handleDelete(contact.id)} title="Excluir" style={{ background: 'transparent', border: 'none', color: '#7c7c8a', cursor: 'pointer' }}><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredContacts.length === 0 && <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#7c7c8a' }}>Nenhum contato encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <ContactModal 
          onClose={closeModal} 
          onSave={handleSaveContact} 
          saving={saving}
          initialData={editingContact} 
        />
      )}
    </div>
  );
}