import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { Users, Loader2, Plus, Upload, Search, Edit2, Trash2, Filter } from 'lucide-react';
import ContactModal from '../components/ContactModal';

export default function Audience() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Controle do Modal e Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null); // Guarda quem está sendo editado
  const [saving, setSaving] = useState(false);

  // Controle de Importação CSV
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchContacts();
  }, []);

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

  // --- LÓGICA DE SALVAR (CRIAR ou ATUALIZAR) ---
  async function handleSaveContact(formData) {
    setSaving(true);
    try {
      // Prepara o objeto para enviar ao banco (converte camelCase do form para snake_case do banco)
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
        tags: formData.tags // Array de strings
      };

      let error;
      let data;

      if (editingContact) {
        // --- MODO EDIÇÃO: UPDATE ---
        const response = await supabase
          .from('contacts')
          .update(payload)
          .eq('id', editingContact.id)
          .select();
        data = response.data;
        error = response.error;
      } else {
        // --- MODO CRIAÇÃO: INSERT ---
        const response = await supabase
          .from('contacts')
          .insert([payload])
          .select();
        data = response.data;
        error = response.error;
      }

      if (error) throw error;

      if (data) {
        if (editingContact) {
          // Atualiza na lista local
          setContacts(contacts.map(c => c.id === editingContact.id ? data[0] : c));
          alert("Contato atualizado com sucesso!");
        } else {
          // Adiciona na lista local
          setContacts([data[0], ...contacts]);
          alert("Contato criado com sucesso!");
        }
        closeModal();
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  // --- LÓGICA DE EXCLUSÃO ---
  async function handleDelete(id) {
    if (!confirm("Tem certeza que deseja excluir este contato?")) return;

    try {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
      setContacts(contacts.filter(c => c.id !== id));
    } catch (error) {
      alert("Erro ao excluir: " + error.message);
    }
  }

  // --- ABRIR MODAL ---
  function openNewModal() {
    setEditingContact(null); // Limpa edição anterior
    setIsModalOpen(true);
  }

  function openEditModal(contact) {
    setEditingContact(contact); // Define quem será editado
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingContact(null);
  }

  // --- IMPORTAÇÃO CSV (Simples: Nome, Email) ---
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      const newContacts = [];

      lines.forEach(line => {
        const cleanLine = line.trim();
        if (!cleanLine) return;
        // Tenta separar por vírgula ou ponto e vírgula
        const parts = cleanLine.split(/[;,]/); 
        
        if (parts.length >= 2) {
          const name = parts[0].trim();
          const email = parts[1].trim();
          // Ignora cabeçalho e valida email básico
          if (name.toLowerCase() !== 'nome' && email.includes('@')) {
             newContacts.push({ name, email, status: 'active' });
          }
        }
      });

      if (newContacts.length === 0) {
        alert("Nenhum contato válido encontrado no CSV (Formato: Nome, Email).");
        setImporting(false);
        return;
      }

      try {
        const { error } = await supabase.from('contacts').insert(newContacts);
        if (error) throw error;
        
        alert(`${newContacts.length} contatos importados!`);
        fetchContacts(); // Recarrega tudo
      } catch (err) {
        alert("Erro na importação: " + err.message);
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  // --- FILTRO VISUAL ---
  const filteredContacts = contacts.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.role || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.team || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '30px', color: 'white', overflowY: 'auto', height: '100%' }}>
      
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: 10 }}>
        <div>
           <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Público</h1>
           <p style={{ color: '#a8a8b3', fontSize: '14px' }}>Gerencie todos os colaboradores e leads.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          {/* Input invisível para arquivo */}
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef}
            style={{ display: 'none' }} 
            onChange={handleFileUpload}
          />
          
          <button 
            onClick={() => fileInputRef.current.click()}
            disabled={importing}
            style={{ 
              background: '#202024', color: '#e1e1e6', border: '1px solid #323238', padding: '10px 15px', 
              borderRadius: '6px', fontWeight: 'bold', display: 'flex', gap: 8, cursor: 'pointer', alignItems: 'center', fontSize: '14px' 
            }}
          >
            {importing ? <Loader2 className="spin" size={16}/> : <Upload size={16} />} 
            Importar CSV
          </button>

          <button 
            onClick={openNewModal}
            style={{ 
              background: '#8257e6', color: 'white', border: 'none', padding: '10px 20px', 
              borderRadius: '6px', fontWeight: 'bold', display: 'flex', gap: 8, cursor: 'pointer', alignItems: 'center', fontSize: '14px' 
            }}
          >
            <Plus size={18} /> Novo Contato
          </button>
        </div>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#a8a8b3' }}>
          <Loader2 className="spin" /> Carregando base de dados...
        </div>
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
                  
                  {/* Nome e Email */}
                  <td style={{ padding: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ 
                        width: 36, height: 36, borderRadius: '50%', background: '#323238', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        fontWeight: 'bold', color: '#8257e6' 
                      }}>
                        {(contact.name?.[0] || 'U').toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: '#e1e1e6' }}>{contact.name}</div>
                        <div style={{ fontSize: '12px', color: '#a8a8b3' }}>{contact.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Cargo e Equipe */}
                  <td style={{ padding: '15px' }}>
                    <div style={{ color: '#e1e1e6' }}>{contact.role || '-'}</div>
                    <div style={{ fontSize: '12px', color: '#a8a8b3' }}>{contact.team || '-'}</div>
                  </td>

                  {/* Tags */}
                  <td style={{ padding: '15px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: '250px' }}>
                      {contact.tags && contact.tags.length > 0 ? (
                        contact.tags.map((tag, i) => (
                          <span key={i} style={{ 
                            background: '#29292e', border: '1px solid #323238', 
                            padding: '2px 8px', borderRadius: '12px', fontSize: '11px', color: '#c4c4cc' 
                          }}>
                            {tag}
                          </span>
                        ))
                      ) : <span style={{ color: '#555', fontSize: '12px' }}>-</span>}
                    </div>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '15px' }}>
                    <span style={{ 
                      backgroundColor: contact.status === 'active' ? 'rgba(0, 179, 126, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: contact.status === 'active' ? '#00B37E' : '#EF4444',
                      padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold'
                    }}>
                      {contact.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>

                  {/* Ações */}
                  <td style={{ padding: '15px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                      <button 
                        onClick={() => openEditModal(contact)}
                        title="Editar"
                        style={{ background: 'transparent', border: 'none', color: '#7c7c8a', cursor: 'pointer', padding: 4 }}
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(contact.id)}
                        title="Excluir"
                        style={{ background: 'transparent', border: 'none', color: '#7c7c8a', cursor: 'pointer', padding: 4 }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}

              {filteredContacts.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#7c7c8a' }}>
                    Nenhum contato encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL (Criar ou Editar) */}
      {isModalOpen && (
        <ContactModal 
          onClose={closeModal} 
          onSave={handleSaveContact} 
          saving={saving}
          initialData={editingContact} // Passa os dados se for edição
        />
      )}

    </div>
  );
}