import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { X, Loader2 } from 'lucide-react';
import './ContactModal.css'; // Importa os estilos

export default function ContactModal({ onClose, onSave, initialData }) {
  const [formData, setFormData] = useState({
    status: 'active',
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    gender: '',
    hiringDate: '',
    contractType: 'CLT',
    role: '',
    team: '',
    technology: '',
    tags: []
  });

  const [availableTags, setAvailableTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  // --- 1. CARREGAR DADOS ---
  useEffect(() => {
    fetchAvailableTags();

    if (initialData) {
      setFormData({
        status: initialData.status || 'active',
        name: initialData.name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        birthDate: initialData.birth_date || '',
        gender: initialData.gender || '',
        hiringDate: initialData.hiring_date || '',
        contractType: initialData.contract_type || 'CLT',
        role: initialData.role || '',
        team: initialData.team || '',
        technology: initialData.technology || '',
        tags: Array.isArray(initialData.tags) ? initialData.tags : []
      });
    }
  }, [initialData]);

  async function fetchAvailableTags() {
    setLoadingTags(true);
    // Busca tags e ordena por nome
    const { data } = await supabase.from('tags').select('*').order('name');
    if (data) setAvailableTags(data);
    setLoadingTags(false);
  }

  // --- 2. MANIPULAÇÃO DO FORM ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- 3. SELECIONAR/DESSELECIONAR TAG ---
  const toggleTag = (tagName) => {
    setFormData(prev => {
      const alreadyHas = prev.tags.includes(tagName);
      if (alreadyHas) {
        return { ...prev, tags: prev.tags.filter(t => t !== tagName) };
      } else {
        return { ...prev, tags: [...prev.tags, tagName] };
      }
    });
  };

  // --- 4. CRIAR TAG RÁPIDA ---
  const handleNewTagKeyDown = async (e) => {
    if (e.key === 'Enter' && newTagInput.trim()) {
      e.preventDefault();
      const newTagName = newTagInput.trim();
      
      const exists = availableTags.find(t => t.name.toLowerCase() === newTagName.toLowerCase());
      
      if (!exists) {
        // Cria no banco
        const { data, error } = await supabase.from('tags').insert([{ name: newTagName, color: '#8257e6' }]).select();
        if (!error && data) {
           setAvailableTags(prev => [...prev, data[0]]);
           toggleTag(newTagName);
        }
      } else {
        // Se já existe, só seleciona
        if (!formData.tags.includes(exists.name)) {
          toggleTag(exists.name);
        }
      }
      setNewTagInput('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{initialData ? 'Editar Colaborador' : 'Novo Colaborador'}</h2>
          <button onClick={onClose} className="close-btn"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            
            <div className="form-group">
              <label>Status</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Nome Completo</label>
              <input name="name" required value={formData.name} onChange={handleChange} placeholder="Nome..." />
            </div>

            <div className="form-group">
              <label>E-mail Corporativo</label>
              <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="email@empresa.com" />
            </div>

            <div className="form-group">
              <label>Telefone</label>
              <input name="phone" value={formData.phone} onChange={handleChange} placeholder="(00) 00000-0000" />
            </div>

            <div className="form-group">
              <label>Nascimento</label>
              <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Gênero</label>
              <select name="gender" value={formData.gender} onChange={handleChange}>
                <option value="">Selecione...</option>
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
                <option value="other">Outro</option>
              </select>
            </div>

            <div className="form-group">
              <label>Contratação</label>
              <input type="date" name="hiringDate" value={formData.hiringDate} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Contrato</label>
              <select name="contractType" value={formData.contractType} onChange={handleChange}>
                <option value="CLT">CLT</option>
                <option value="PJ">PJ</option>
                <option value="ESTAGIO">Estágio</option>
              </select>
            </div>

            <div className="form-group">
              <label>Cargo</label>
              <input name="role" value={formData.role} onChange={handleChange} placeholder="Ex: Dev Senior" />
            </div>

            <div className="form-group">
              <label>Equipe</label>
              <input name="team" value={formData.team} onChange={handleChange} placeholder="Ex: Engenharia" />
            </div>
            
            <div className="form-group full-width">
               <label>Tecnologia Principal</label>
               <input name="technology" value={formData.technology} onChange={handleChange} placeholder="Ex: React, Node..." />
            </div>

            {/* SEÇÃO DE TAGS */}
            <div className="form-group full-width">
              <label>Tags</label>
              <div className="tags-container">
                {loadingTags ? <span className="loading-text"><Loader2 className="spin" size={12}/> Carregando tags...</span> : availableTags.length === 0 ? <span className="empty-text">Nenhuma tag criada.</span> : (
                  availableTags.map(tag => {
                    const isSelected = formData.tags.includes(tag.name);
                    // Usa a cor da tag ou roxo padrão se não tiver
                    const tagColor = tag.color || '#8257e6';
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.name)}
                        className={`tag-btn ${isSelected ? 'selected' : ''}`}
                        style={{
                          borderColor: tagColor,
                          backgroundColor: isSelected ? tagColor : 'transparent',
                          color: isSelected ? '#fff' : tagColor,
                        }}
                      >
                        {tag.name} {isSelected && '✓'}
                      </button>
                    );
                  })
                )}
              </div>
              <input 
                className="new-tag-input"
                placeholder="+ Criar tag nova (Digite e Enter)" 
                value={newTagInput}
                onChange={e => setNewTagInput(e.target.value)}
                onKeyDown={handleNewTagKeyDown}
              />
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-cancel">Cancelar</button>
            <button type="submit" className="btn-save">{initialData ? 'Atualizar' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}