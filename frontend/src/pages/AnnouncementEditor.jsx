import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Type, Image as ImageIcon, Minus, Trash2, 
  Bold, Italic, GripVertical, Loader2, Eye 
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export default function AnnouncementEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Dados da Campanha
  const [title, setTitle] = useState('Nova Campanha');
  const [blocks, setBlocks] = useState([
    { id: '1', type: 'text', content: 'Olá {{name}},' }
  ]);

  // Carregar dados se for edição
  useEffect(() => {
    if (id && id !== 'novo') {
      loadData();
    }
  }, [id]);

  async function loadData() {
    const { data } = await supabase.from('announcements').select('*').eq('id', id).single();
    if (data) {
      setTitle(data.title);
      // Se tiver conteúdo salvo no formato novo (JSON), usa. Se não, mantém o padrão.
      if (data.content && Array.isArray(data.content)) {
        setBlocks(data.content);
      }
    }
  }

  // --- AÇÕES DOS BLOCOS ---
  const addBlock = (type) => {
    const newBlock = {
      id: Date.now().toString(),
      type,
      content: ''
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id, newVal) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, content: newVal } : b));
  };

  const removeBlock = (id) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const moveBlock = (index, direction) => {
    const newBlocks = [...blocks];
    if (direction === 'up' && index > 0) {
      [newBlocks[index], newBlocks[index - 1]] = [newBlocks[index - 1], newBlocks[index]];
    } else if (direction === 'down' && index < newBlocks.length - 1) {
      [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
    }
    setBlocks(newBlocks);
  };

  // --- SALVAR ---
  const handleSave = async () => {
    if (!title.trim()) return alert("Digite um assunto para a campanha.");
    setLoading(true);
    try {
      const payload = {
        title,
        content: blocks, // Salva a estrutura dos blocos
        updated_at: new Date()
      };

      if (id === 'novo') {
        await supabase.from('announcements').insert([{ ...payload, status: 'draft' }]);
      } else {
        await supabase.from('announcements').update(payload).eq('id', id);
      }
      alert('Salvo com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: '#121214', color: 'white' }}>
      
      {/* 1. SIDEBAR DE CONFIGURAÇÃO (ESQUERDA) */}
      <div style={{ width: '300px', borderRight: '1px solid #323238', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: '#a8a8b3' }} onClick={() => navigate('/comunicados')}>
          <ArrowLeft size={20} /> <span style={{fontSize: 14}}>Voltar</span>
        </div>

        <div>
          <label style={labelStyle}>Assunto da Campanha</label>
          <input 
            value={title} 
            onChange={e => setTitle(e.target.value)}
            style={inputStyle} 
            placeholder="Ex: Novidades da Semana"
          />
        </div>

        <div style={{ borderTop: '1px solid #323238', paddingTop: '20px' }}>
          <label style={labelStyle}>Adicionar Blocos</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <AddButton icon={<Type size={20}/>} label="Texto" onClick={() => addBlock('text')} />
            <AddButton icon={<ImageIcon size={20}/>} label="Imagem" onClick={() => addBlock('image')} />
            <AddButton icon={<Minus size={20}/>} label="Espaço" onClick={() => addBlock('spacer')} />
          </div>
        </div>

        <button 
          onClick={handleSave} 
          disabled={loading}
          style={{ marginTop: 'auto', background: '#00B37E', border: 'none', color: 'white', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {loading ? <Loader2 className="spin" /> : <Save size={18} />} Salvar Alterações
        </button>
      </div>

      {/* 2. ÁREA DE EDIÇÃO (CENTRO) */}
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto', background: '#09090a' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>Editando Conteúdo</h2>

          {blocks.map((block, index) => (
            <div key={block.id} style={{ background: '#202024', border: '1px solid #323238', borderRadius: '8px', padding: '15px', position: 'relative' }}>
              
              {/* Header do Bloco */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#7c7c8a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '12px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  <GripVertical size={14} /> {block.type === 'spacer' ? 'Espaçador' : block.type}
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button onClick={() => moveBlock(index, 'up')} title="Subir" style={iconBtnStyle}>↑</button>
                  <button onClick={() => moveBlock(index, 'down')} title="Descer" style={iconBtnStyle}>↓</button>
                  <button onClick={() => removeBlock(block.id)} title="Excluir" style={{...iconBtnStyle, color: '#f75a68'}}><Trash2 size={14}/></button>
                </div>
              </div>

              {/* RENDERIZAÇÃO DO EDITOR DE CADA TIPO */}
              
              {/* === TIPO: TEXTO COM TOOLBAR === */}
              {block.type === 'text' && (
                <RichTextEditor 
                  value={block.content} 
                  onChange={(val) => updateBlock(block.id, val)} 
                />
              )}

              {/* === TIPO: IMAGEM === */}
              {block.type === 'image' && (
                <div>
                  <input 
                    value={block.content} 
                    onChange={e => updateBlock(block.id, e.target.value)} 
                    placeholder="Cole a URL da imagem aqui..."
                    style={inputStyle}
                  />
                  {block.content && <img src={block.content} alt="Preview" style={{ marginTop: 10, maxWidth: '100%', borderRadius: 4, maxHeight: 200, objectFit: 'cover' }} />}
                </div>
              )}

              {/* === TIPO: ESPAÇADOR (A LINHA FINA) === */}
              {block.type === 'spacer' && (
                <div style={{ padding: '15px', background: '#121214', borderRadius: '4px', textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', color: '#a8a8b3', marginBottom: 8 }}>Linha Divisória (#F5F5F5)</p>
                  {/* Visualização da linha dentro do editor */}
                  <div style={{ width: '100%', height: '1px', background: '#F5F5F5' }}></div>
                </div>
              )}

            </div>
          ))}

          {blocks.length === 0 && (
            <div style={{ textAlign: 'center', color: '#7c7c8a', padding: '40px', border: '2px dashed #323238', borderRadius: '8px' }}>
              Adicione um bloco na barra lateral para começar.
            </div>
          )}

        </div>
      </div>

      {/* 3. PREVIEW REAL (DIREITA) */}
      <div style={{ width: '400px', background: 'white', borderLeft: '1px solid #323238', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '15px', background: '#f0f2f5', borderBottom: '1px solid #ddd', color: '#333', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Eye size={16} /> Visualização do E-mail
        </div>
        
        <div style={{ padding: '30px', color: '#333', fontFamily: 'Arial, sans-serif', lineHeight: '1.6' }}>
          {blocks.map(block => {
            if (block.type === 'text') {
              // Converte quebras de linha (\n) em <br> para HTML
              return (
                <div key={block.id} style={{ marginBottom: '15px', whiteSpace: 'pre-wrap' }} 
                     dangerouslySetInnerHTML={{ __html: block.content }} 
                />
              );
            }
            if (block.type === 'image') {
              return block.content ? <img key={block.id} src={block.content} style={{ maxWidth: '100%', borderRadius: '4px', display: 'block', marginBottom: '15px' }} /> : null;
            }
            if (block.type === 'spacer') {
              // A LINHA EXATA QUE VOCÊ PEDIU
              return <div key={block.id} style={{ width: '100%', height: '1px', backgroundColor: '#F5F5F5', margin: '20px 0' }}></div>;
            }
            return null;
          })}
        </div>
      </div>

    </div>
  );
}

// --- COMPONENTES AUXILIARES ---

function AddButton({ icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{ background: '#202024', border: '1px solid #323238', color: '#e1e1e6', padding: '15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, fontSize: '12px' }} onMouseOver={e => e.currentTarget.style.borderColor = '#8257e6'} onMouseOut={e => e.currentTarget.style.borderColor = '#323238'}>
      {icon} {label}
    </button>
  );
}

// EDITOR RICO (COM NEGRIRO, ITÁLICO E VARIÁVEIS)
function RichTextEditor({ value, onChange }) {
  const textareaRef = useRef(null);

  const insertAtCursor = (before, after = '') => {
    const input = textareaRef.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    const newText = text.substring(0, start) + before + text.substring(start, end) + after + text.substring(end);
    onChange(newText);
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + before.length, end + before.length + (end - start));
    }, 0);
  };

  return (
    <div style={{ border: '1px solid #323238', borderRadius: '6px', overflow: 'hidden' }}>
      {/* BARRA DE FERRAMENTAS */}
      <div style={{ background: '#121214', padding: '8px', borderBottom: '1px solid #323238', display: 'flex', gap: 5, alignItems: 'center' }}>
        <ToolButton onClick={() => insertAtCursor('<b>', '</b>')} icon={<Bold size={14} />} title="Negrito" />
        <ToolButton onClick={() => insertAtCursor('<i>', '</i>')} icon={<Italic size={14} />} title="Itálico" />
        <div style={{ width: 1, height: 15, background: '#323238', margin: '0 5px' }}></div>
        <VarButton onClick={() => insertAtCursor('{{name}}')} label="Nome" />
        <VarButton onClick={() => insertAtCursor('{{email}}')} label="Email" />
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Escreva seu texto aqui..."
        style={{ width: '100%', minHeight: '100px', background: '#202024', color: 'white', border: 'none', padding: '15px', outline: 'none', resize: 'vertical', fontFamily: 'sans-serif' }}
      />
    </div>
  );
}

function ToolButton({ onClick, icon, title }) {
  return (
    <button onClick={onClick} title={title} style={{ background: 'transparent', border: 'none', color: '#a8a8b3', padding: '6px', borderRadius: 4, cursor: 'pointer', display: 'flex' }} onMouseOver={e => e.currentTarget.style.background = '#29292e'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
      {icon}
    </button>
  );
}

function VarButton({ onClick, label }) {
  return (
    <button onClick={onClick} style={{ background: '#29292e', border: 'none', color: '#e1e1e6', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>
      {label}
    </button>
  );
}

const labelStyle = { display: 'block', fontSize: '12px', color: '#a8a8b3', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' };
const inputStyle = { width: '100%', padding: '12px', background: '#202024', border: '1px solid #323238', borderRadius: '6px', color: 'white', outline: 'none', fontSize: '14px' };
const iconBtnStyle = { background: 'transparent', border: 'none', color: '#a8a8b3', cursor: 'pointer', padding: '4px' };