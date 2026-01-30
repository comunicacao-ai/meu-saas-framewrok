import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient'; 
import { Link } from 'react-router-dom';
import { 
  Plus, ArrowLeft, Save, Send, Image as ImageIcon, Type, 
  MousePointerClick, Share2, Minus, Smile, Layout, Columns,
  Trash2, Smartphone, Monitor, Upload, Calendar, Clock,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  MoreHorizontal, Heading1, Heading2, Copy, Edit3, BarChart2
} from 'lucide-react';
import './Audience.css';

// ============================================================================
// 1. CONSTANTES E UTILITÁRIOS
// ============================================================================

const VARIABLES = [
  { label: 'Nome', value: '{{name}}' },
  { label: 'Primeiro Nome', value: '{{primeiro_nome}}' },
  { label: 'Empresa', value: '{{company}}' },
  { label: 'E-mail', value: '{{email}}' },
  { label: 'Cargo', value: '{{cargo}}' },
];

const BLOCK_TYPES = [
  { type: 'header', icon: <Layout size={18} />, label: 'Topo / Logo' },
  { type: 'text', icon: <Type size={18} />, label: 'Texto Rico' },
  { type: 'imagetext', icon: <Columns size={18} />, label: 'Img + Texto' },
  { type: 'image', icon: <ImageIcon size={18} />, label: 'Imagem' },
  { type: 'button', icon: <MousePointerClick size={18} />, label: 'Botão' },
  { type: 'spacer', icon: <Minus size={18} />, label: 'Espaço' },
  { type: 'social', icon: <Share2 size={18} />, label: 'Redes Sociais' },
  { type: 'nps', icon: <Smile size={18} />, label: 'Pesquisa NPS' },
];

const styles = {
  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#7c7c8a', marginBottom: 15, letterSpacing: 1, textTransform: 'uppercase', marginTop: 20 },
  label: { fontSize: 12, color: '#a8a8b3', marginBottom: 6, display: 'block', fontWeight: '500' },
  input: { width: '100%', padding: 10, background: '#202024', border: '1px solid #323238', color: 'white', borderRadius: 6, fontSize: 14, outline: 'none', marginBottom: 15 },
  tabBtn: { flex:1, padding:10, background:'transparent', borderBottom:'2px solid transparent', color:'#a8a8b3', cursor:'pointer', fontSize:13, fontWeight:'bold' },
  tabBtnActive: { flex:1, padding:10, background:'transparent', borderBottom:'2px solid #8257e6', color:'white', cursor:'pointer', fontSize:13, fontWeight:'bold' }
};

// ============================================================================
// 2. COMPONENTE DE EDITOR RICO INLINE (A SOLUÇÃO DO PROBLEMA)
// ============================================================================

const InlineToolbar = ({ onFormat, onInsertVar }) => (
    <div style={{
        position: 'absolute', top: -45, left: 0, 
        background: '#202024', border: '1px solid #323238', borderRadius: 6, 
        padding: 5, display: 'flex', gap: 5, zIndex: 100, boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
    }} onMouseDown={(e) => e.preventDefault()}> {/* Prevent focus loss */}
        
        <button onClick={() => onFormat('bold')} title="Negrito" className="toolbar-btn"><Bold size={16}/></button>
        <button onClick={() => onFormat('italic')} title="Itálico" className="toolbar-btn"><Italic size={16}/></button>
        <button onClick={() => onFormat('underline')} title="Sublinhado" className="toolbar-btn"><Underline size={16}/></button>
        <div style={{width:1, background:'#323238', margin:'0 5px'}}></div>
        <button onClick={() => onFormat('formatBlock', 'H1')} title="Título 1" className="toolbar-btn"><Heading1 size={16}/></button>
        <button onClick={() => onFormat('formatBlock', 'H2')} title="Título 2" className="toolbar-btn"><Heading2 size={16}/></button>
        <div style={{width:1, background:'#323238', margin:'0 5px'}}></div>
        <select 
            onChange={(e) => { if(e.target.value) onInsertVar(e.target.value); e.target.value=''; }} 
            style={{background:'#121214', color:'white', border:'1px solid #323238', borderRadius:4, fontSize:12, padding:'2px 5px', cursor:'pointer'}}
        >
            <option value="">+ Variável</option>
            {VARIABLES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
        </select>
        
        <style>{`.toolbar-btn { background: transparent; border: none; color: white; padding: 4px; border-radius: 4px; cursor: pointer; } .toolbar-btn:hover { background: #323238; }`}</style>
    </div>
);

const EditableArea = ({ html, onChange, style, tagName = 'div' }) => {
    const contentEditableRef = useRef(null);

    // Atualiza o conteúdo apenas se mudou externamente (evita loop)
    useEffect(() => {
        if (contentEditableRef.current && contentEditableRef.current.innerHTML !== html) {
            contentEditableRef.current.innerHTML = html;
        }
    }, [html]);

    const handleInput = (e) => {
        onChange(e.currentTarget.innerHTML);
    };

    const execCmd = (command, value = null) => {
        document.execCommand(command, false, value);
        // Força atualização do estado após comando
        if (contentEditableRef.current) onChange(contentEditableRef.current.innerHTML);
    };

    const insertTextAtCursor = (text) => {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        selection.deleteFromDocument();
        selection.getRangeAt(0).insertNode(document.createTextNode(text));
        if (contentEditableRef.current) onChange(contentEditableRef.current.innerHTML);
    };

    return (
        <div style={{position:'relative'}}>
            {/* Toolbar aparece apenas quando focado/selecionado no pai */}
            <div className="editable-wrapper">
                <InlineToolbar onFormat={execCmd} onInsertVar={insertTextAtCursor} />
                <div
                    ref={contentEditableRef}
                    contentEditable
                    onInput={handleInput}
                    style={{outline: 'none', minHeight: '1em', ...style}}
                    className="editor-content"
                />
            </div>
        </div>
    );
};

// ============================================================================
// 3. ENGINE HTML (Gerador Final)
// ============================================================================

const generateHTML = (blocks, subject, previewText, includeFooter = false, npsContext = null) => {
  const base = npsContext?.baseUrl ?? '{{base_url}}';
  const cid = npsContext?.campaignId ?? '{{campaign_id}}';
  const contactId = npsContext?.contactId ?? '{{contact_id}}';

  let bodyContent = '';
  const safeBlocks = Array.isArray(blocks) ? blocks : [];

  safeBlocks.forEach(block => {
    const s = block.style || {};
    const c = block.content || {};
    let blockHTML = '';

    switch (block.type) {
      case 'header':
        const headerImg = c.imageUrl 
          ? `<img src="${c.imageUrl}" alt="Logo" style="max-width: 200px; height: auto; border: 0; display: block;">` 
          : `<h2 style="margin: 0; color: ${s.color || '#333'}; font-family: sans-serif;">SEU LOGO</h2>`;
        const finalHeader = c.url ? `<a href="${c.url}" target="_blank">${headerImg}</a>` : headerImg;
        blockHTML = `<tr><td align="${s.align}" style="padding: ${s.padding}px; background-color: ${s.backgroundColor};">${finalHeader}</td></tr>`;
        break;

      case 'text':
        // Renderiza o HTML rico direto
        blockHTML = `<tr><td align="${s.align}" style="padding: ${s.padding}px; background-color: ${s.backgroundColor};"><div style="font-family: ${s.fontFamily || 'sans-serif'}; font-size: ${s.fontSize}px; color: ${s.color}; line-height: 1.6;">${c.text}</div></td></tr>`;
        break;

      case 'imagetext':
        blockHTML = `
          <tr>
            <td style="padding: ${s.padding}px; background-color: ${s.backgroundColor};">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="40%" valign="middle" style="padding-right: 20px;">
                    <img src="${c.url}" style="width: 100%; border-radius: 4px; display: block; object-fit: cover;" />
                  </td>
                  <td width="60%" valign="middle" style="font-family: sans-serif; font-size: 14px; color: ${s.color}; line-height: 1.5;">
                    <div style="font-size: 18px; margin-bottom:8px; color: ${s.titleColor || '#000'}; font-weight:bold;">${c.title}</div>
                    <div>${c.text}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
        break;

      case 'image':
        const imgTag = `<img src="${c.url}" style="max-width: 100%; width: ${s.width || '100%'}; border-radius: 4px; display:block;" />`;
        const linkedImg = c.link ? `<a href="${c.link}" target="_blank">${imgTag}</a>` : imgTag;
        blockHTML = `<tr><td align="${s.align}" style="padding: ${s.padding}px; background-color: ${s.backgroundColor};">${linkedImg}</td></tr>`;
        break;

      case 'button':
        blockHTML = `<tr><td align="${s.align}" style="padding: ${s.padding}px; background-color: ${s.backgroundColor};"><a href="${c.url}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: ${s.buttonColor}; color: ${s.textColor}; text-decoration: none; border-radius: 6px; font-weight: bold; font-family: sans-serif;">${c.text}</a></td></tr>`;
        break;

      case 'spacer':
        blockHTML = `<tr><td style="padding: 0; background-color: ${s.backgroundColor};"><div style="height: ${s.height}px; line-height: ${s.height}px; font-size: 0;">&nbsp;</div>${s.showLine ? `<div style="height: 2px; background-color: ${s.lineColor || '#eee'}; line-height: 2px; font-size: 0;">&nbsp;</div>` : ''}</td></tr>`;
        break;
        
      case 'social':
        let links = '';
        const styleLink = "text-decoration:none; margin:0 10px; color: #8257e6; font-weight:bold; font-family:sans-serif;";
        if(c.instagram) links += `<a href="${c.instagram}" style="${styleLink}">Instagram</a>`;
        if(c.linkedin) links += `<a href="${c.linkedin}" style="${styleLink}">LinkedIn</a>`;
        if(c.website) links += `<a href="${c.website}" style="${styleLink}">Site</a>`;
        blockHTML = `<tr><td align="center" style="padding: 20px; background-color: ${s.backgroundColor};">${links}</td></tr>`;
        break;

      case 'nps':
        const prompt = c.prompt || 'De 0 a 10, qual nota você dá?';
        let btns = '';
        for(let i=0; i<=10; i++) {
            btns += `<a href="${base}/feedback/${cid}/${contactId}/${i}" style="display:inline-block; width:30px; height:30px; line-height:30px; background:#8257e6; color:white; text-align:center; margin:2px; text-decoration:none; border-radius:4px; font-family:sans-serif;">${i}</a>`;
        }
        blockHTML = `<tr><td align="center" style="padding: 20px; background-color: ${s.backgroundColor};"><p style="font-family:sans-serif; font-weight:bold; margin-bottom:15px;">${prompt}</p><div>${btns}</div></td></tr>`;
        break;
    }
    bodyContent += blockHTML;
  });

  const footerHTML = includeFooter 
    ? `<tr><td align="center" style="padding:20px; color:#999; font-family:sans-serif; font-size:11px; border-top:1px solid #eee;"><p>Enviado via Framework Workspace</p></td></tr>` 
    : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${subject}</title></head><body style="margin:0;padding:0;background-color:#f4f4f7;"><div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${previewText || ''}</div><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f7;"><tr><td align="center" style="padding:20px 0;"><table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;max-width:600px;width:100%;box-shadow: 0 2px 10px rgba(0,0,0,0.1);">${bodyContent}${footerHTML}</table></td></tr></table></body></html>`;
};

// ============================================================================
// 4. COMPONENTE PRINCIPAL
// ============================================================================

export default function Announcements() {
  const [viewMode, setViewMode] = useState('list'); 
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  
  const [editorState, setEditorState] = useState({ 
      id: null, subject: '', previewText: '', audienceType: 'all', tags: [], blocks: [] 
  });
  const [activeTab, setActiveTab] = useState('settings');
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [previewDevice, setPreviewDevice] = useState('desktop'); 
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');

  useEffect(() => { fetchCampaigns(); fetchTags(); }, []);

  async function fetchCampaigns() {
    setLoading(true);
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    if (data) setCampaigns(data);
    setLoading(false);
  }

  async function fetchTags() {
    const { data } = await supabase.from('tags').select('*').order('name');
    if (data) setAvailableTags(data);
  }

  // --- ACTIONS ---

  const handleNew = () => {
      setEditorState({ id: null, subject: '', previewText:'', audienceType:'all', tags:[], blocks: [] });
      setSelectedBlockId(null);
      setActiveTab('settings');
      setViewMode('editor');
  };

  const handleEdit = (camp) => {
      setEditorState({
          id: camp.id,
          subject: camp.title,
          previewText: camp.preview_text || '',
          audienceType: camp.audience_type || 'all',
          tags: camp.tags || [],
          blocks: camp.content || [], 
      });
      setActiveTab('blocks');
      setViewMode('editor');
  };

  const handleDuplicate = (camp) => {
      if(!window.confirm('Duplicar esta campanha?')) return;
      setEditorState({
          id: null,
          subject: `${camp.title} (Cópia)`,
          previewText: camp.preview_text || '',
          audienceType: camp.audience_type || 'all',
          tags: camp.tags || [],
          blocks: camp.content || [], 
      });
      setActiveTab('blocks');
      setViewMode('editor');
  };

  const handleSendTest = async () => {
      const email = prompt("Digite o e-mail de teste:");
      if(!email) return;
      setLoading(true);
      try {
          const html = generateHTML(editorState.blocks, "[TESTE] "+editorState.subject, editorState.previewText, true);
          const { error } = await supabase.functions.invoke('send-email', {
              body: { type: 'test', to: email, subject: `[TESTE] ${editorState.subject}`, html: html }
          });
          if(error) throw error;
          alert(`Teste enviado para ${email}`);
      } catch(e) {
          alert('Erro ao enviar teste: ' + e.message);
      } finally {
          setLoading(false);
      }
  };

  // --- EDITOR LOGIC ---

  const addBlock = (type) => {
    const baseStyle = { padding: 20, backgroundColor: 'transparent', align: 'center', color: '#333' };
    let content = {};
    
    if (type === 'text') { content = { text: 'Olá, clique para editar seu texto rico aqui.' }; baseStyle.fontSize = 16; baseStyle.align = 'left'; }
    if (type === 'imagetext') { content = { title: 'Título em Destaque', text: 'Descrição curta...', url: 'https://placehold.co/600x400/png?text=Imagem' }; baseStyle.titleColor = '#000'; baseStyle.color = '#555'; }
    if (type === 'button') { content = { text: 'Clique Aqui', url: 'https://' }; baseStyle.buttonColor = '#8257e6'; baseStyle.textColor = '#fff'; }
    if (type === 'image') { content = { url: 'https://placehold.co/600x300/png?text=Imagem', link:'' }; }
    if (type === 'header') { content = { imageUrl: '', url:'' }; }
    if (type === 'spacer') { baseStyle.height = 30; baseStyle.showLine = false; baseStyle.lineColor = '#cccccc'; }
    if (type === 'social') { content = { instagram:'', linkedin:'', website:'' }; }
    if (type === 'nps') { content = { prompt: 'Qual nota você dá para nossa empresa?' }; }

    const newBlock = { id: Date.now(), type, content, style: baseStyle };
    setEditorState(prev => ({ ...prev, blocks: [...prev.blocks, newBlock] }));
    setSelectedBlockId(newBlock.id);
  };

  const updateBlock = (id, key, val, isStyle = false) => {
    setEditorState(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => b.id !== id ? b : (
        isStyle ? { ...b, style: { ...b.style, [key]: val } } : { ...b, content: { ...b.content, [key]: val } }
      ))
    }));
  };

  const removeBlock = (id) => {
    setEditorState(prev => ({ ...prev, blocks: prev.blocks.filter(b => b.id !== id) }));
    setSelectedBlockId(null);
  };

  const handleImageUpload = async (e, blockId, field = 'url') => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('campaign-images').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('campaign-images').getPublicUrl(fileName);
        updateBlock(blockId, field, data.publicUrl);
    } catch (err) {
        alert("Erro no upload: " + err.message);
    }
  };

  const handleSave = async (status = 'draft') => {
    if (!editorState.subject) return alert("Adicione um assunto!");
    setLoading(true);

    const payload = {
        title: editorState.subject,
        content: editorState.blocks,
        preview_text: editorState.previewText,
        audience_type: editorState.audienceType,
        tags: editorState.tags,
        status: status,
        updated_at: new Date()
    };

    if (status === 'scheduled') {
        if(!scheduleDate) return alert("Selecione data/hora.");
        payload.scheduled_at = new Date(scheduleDate).toISOString();
    }

    try {
        let savedId = editorState.id;
        if (editorState.id) {
            await supabase.from('announcements').update(payload).eq('id', editorState.id);
        } else {
            const {data} = await supabase.from('announcements').insert([payload]).select();
            savedId = data[0].id;
        }
        
        if(status === 'sent') {
            const html = generateHTML(editorState.blocks, editorState.subject, editorState.previewText, true);
            await supabase.functions.invoke('send-email', {
                body: { 
                    type: 'campaign', 
                    campaignId: savedId,
                    subject: editorState.subject, 
                    html: html,
                    audienceType: editorState.audienceType,
                    tags: editorState.tags,
                    baseUrl: window.location.origin
                }
            });
            alert("Enviado com sucesso! 🚀");
        } else if(status === 'scheduled') { 
            alert("Agendado! 📅"); 
            setIsScheduleModalOpen(false); 
        } else {
            alert("Rascunho salvo!");
        }

        setViewMode('list');
        fetchCampaigns();
    } catch (err) {
        console.error(err);
        alert("Erro ao salvar.");
    } finally {
        setLoading(false);
    }
  };

  // --- RENDERIZADORES ---

  if (viewMode === 'list') return (
    <div style={{ padding: '40px', color: 'white', overflowY:'auto', height:'100vh' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 40 }}>
        <h1>Disparos</h1>
        <button onClick={handleNew} style={{background:'#8257e6', color:'white', border:'none', padding:'10px 20px', borderRadius:6, cursor:'pointer', fontWeight:'bold', display:'flex', alignItems:'center', gap:5}}><Plus size={18}/> Nova Campanha</button>
      </div>
      <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:'1px solid #323238', color:'#7c7c8a', fontSize:12, textAlign:'left'}}><th style={{padding:15}}>Status</th><th>Assunto</th><th>Data</th><th style={{textAlign:'right'}}>Ações</th></tr></thead>
            <tbody>
              {campaigns.map(camp => (
                <tr key={camp.id} style={{borderBottom:'1px solid #29292e'}}>
                  <td style={{padding:15}}>
                      {camp.status === 'sent' && <span style={{background:'#00B37E', color:'white', padding:'2px 8px', borderRadius:4, fontSize:10}}>Enviado</span>}
                      {camp.status === 'draft' && <span style={{background:'#323238', color:'#ccc', padding:'2px 8px', borderRadius:4, fontSize:10}}>Rascunho</span>}
                      {camp.status === 'scheduled' && <span style={{background:'#FBA94C', color:'black', padding:'2px 8px', borderRadius:4, fontSize:10}}>Agendado</span>}
                  </td>
                  <td>{camp.title}</td>
                  <td style={{color:'#a8a8b3'}}>{new Date(camp.created_at).toLocaleDateString()}</td>
                  <td style={{textAlign:'right'}}>
                      <div style={{display:'flex', gap:15, justifyContent:'flex-end', alignItems:'center'}}>
                        {camp.status === 'draft' && <button onClick={() => handleEdit(camp)} title="Editar" style={{background:'none', border:'none', color:'#ccc', cursor:'pointer'}}><Edit3 size={18}/></button>}
                        <button onClick={() => handleDuplicate(camp)} title="Duplicar" style={{background:'none', border:'none', color:'#ccc', cursor:'pointer'}}><Copy size={18}/></button>
                        {(camp.status === 'sent' || camp.status === 'scheduled') && <Link to={`/announcements/${camp.id}`} title="Relatório" style={{color:'#8257e6'}}><BarChart2 size={18}/></Link>}
                      </div>
                  </td>
                </tr>
              ))}
            </tbody>
      </table>
    </div>
  );

  // VIEW DO EDITOR
  const currentBlock = editorState.blocks.find(b => b.id === selectedBlockId);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#09090a' }}>
      {/* HEADER */}
      <div style={{ height: 60, borderBottom: '1px solid #29292e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: '#121214' }}>
        <button onClick={() => setViewMode('list')} style={{ background: 'none', border: 'none', color: '#a8a8b3', cursor: 'pointer', display:'flex', alignItems:'center', gap:5 }}><ArrowLeft size={18} /> Voltar</button>
        <div style={{display:'flex', gap:10}}>
             <button onClick={() => setPreviewDevice(prev => prev==='desktop'?'mobile':'desktop')} style={{background:'none', border:'none', color:'white'}}><Smartphone size={20}/></button>
             <button onClick={handleSendTest} style={{background:'transparent', border:'1px solid #8257e6', color:'#8257e6', padding:'8px 16px', borderRadius:6, cursor:'pointer', display:'flex', gap:5}}>Testar</button>
             <button onClick={() => handleSave('draft')} style={{background:'transparent', border:'1px solid #323238', color:'#ccc', padding:'8px 16px', borderRadius:6, cursor:'pointer'}}>Salvar Rascunho</button>
             <button onClick={() => setIsScheduleModalOpen(true)} style={{background:'transparent', border:'1px solid #8257e6', color:'#8257e6', padding:'8px 16px', borderRadius:6, cursor:'pointer', display:'flex', alignItems:'center', gap:5}}><Calendar size={16}/> Agendar</button>
             <button onClick={() => handleSave('sent')} className="btn-primary" style={{background:'#8257e6', color:'white', border:'none', padding:'8px 20px', borderRadius:6, cursor:'pointer', fontWeight:'bold', display:'flex', alignItems:'center', gap:5}}><Send size={16}/> Enviar</button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* ESQUERDA: BLOCOS E CONFIGS */}
        <div style={{ width: 300, background: '#121214', borderRight: '1px solid #29292e', display:'flex', flexDirection:'column' }}>
           <div style={{display:'flex', borderBottom:'1px solid #323238'}}>
               <button onClick={() => setActiveTab('settings')} style={activeTab === 'settings' ? styles.tabBtnActive : styles.tabBtn}>Configurações</button>
               <button onClick={() => setActiveTab('blocks')} style={activeTab === 'blocks' ? styles.tabBtnActive : styles.tabBtn}>Blocos</button>
           </div>
           <div style={{flex:1, overflowY:'auto', padding:20}}>
               {activeTab === 'settings' && (
                   <div>
                       <p style={styles.sectionTitle}>Geral</p>
                       <label style={styles.label}>Assunto</label><input value={editorState.subject} onChange={e => setEditorState({...editorState, subject: e.target.value})} style={styles.input} />
                       <label style={styles.label}>Preheader</label><input value={editorState.previewText} onChange={e => setEditorState({...editorState, previewText: e.target.value})} style={styles.input} />
                       <p style={styles.sectionTitle}>Público</p>
                       <div style={{display:'flex', gap:10, marginBottom:15}}>
                           <button onClick={() => setEditorState({...editorState, audienceType: 'all'})} style={{flex:1, padding:8, background: editorState.audienceType==='all'?'#8257e6':'#29292e', border:'none', color:'white', borderRadius:4, cursor:'pointer'}}>Todos</button>
                           <button onClick={() => setEditorState({...editorState, audienceType: 'tags'})} style={{flex:1, padding:8, background: editorState.audienceType==='tags'?'#8257e6':'#29292e', border:'none', color:'white', borderRadius:4, cursor:'pointer'}}>Tags</button>
                       </div>
                       {editorState.audienceType === 'tags' && (
                           <div style={{background:'#202024', padding:10, borderRadius:6}}>
                               {availableTags.map(tag => (
                                   <div key={tag.id} onClick={() => {
                                       const newTags = editorState.tags.includes(tag.name) ? editorState.tags.filter(t => t !== tag.name) : [...editorState.tags, tag.name];
                                       setEditorState({...editorState, tags: newTags});
                                   }} style={{display:'inline-block', margin:3, padding:'4px 8px', fontSize:11, borderRadius:4, cursor:'pointer', background: editorState.tags.includes(tag.name) ? '#8257e6' : '#323238', color:'white'}}>{tag.name}</div>
                               ))}
                           </div>
                       )}
                   </div>
               )}
               {activeTab === 'blocks' && (
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {BLOCK_TYPES.map(b => (
                          <button key={b.type} onClick={() => addBlock(b.type)} style={{background:'#202024', border:'1px solid #323238', borderRadius:6, padding:15, color:'#e1e1e6', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:8, transition:'0.2s'}}>
                              <div style={{color:'#8257e6'}}>{b.icon}</div><span style={{fontSize:11}}>{b.label}</span>
                          </button>
                      ))}
                   </div>
               )}
           </div>
        </div>

        {/* CENTRO: CANVAS (EDIÇÃO INLINE) */}
        <div style={{ flex: 1, background: '#09090a', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', overflowY: 'auto' }}>
          <div style={{ width: previewDevice === 'mobile' ? 375 : 600, background: 'white', minHeight: 800, transition: 'width 0.3s', boxShadow: '0 0 30px rgba(0,0,0,0.5)', position: 'relative' }}>
             {editorState.blocks.map((block) => (
                 <div key={block.id} onClick={() => { setSelectedBlockId(block.id); setActiveTab('blocks'); }} style={{ position: 'relative', outline: selectedBlockId === block.id ? '2px solid #8257e6' : '1px dashed transparent', cursor: 'pointer' }}>
                   
                   {/* TEXTO PURO: INLINE RICO */}
                   {selectedBlockId === block.id && block.type === 'text' ? (
                       <div style={{padding: block.style.padding || 20, background: block.style.backgroundColor}}>
                           <EditableArea 
                               html={block.content.text} 
                               onChange={(val) => updateBlock(block.id, 'text', val)} 
                               style={{fontFamily: block.style.fontFamily || 'sans-serif', fontSize: block.style.fontSize, color: block.style.color, textAlign: block.style.align}}
                           />
                       </div>
                   ) 
                   /* IMAGEM + TEXTO: INLINE MISTO */
                   : selectedBlockId === block.id && block.type === 'imagetext' ? (
                       <div style={{padding: block.style.padding, background: block.style.backgroundColor}}>
                           <table width="100%"><tr><td width="40%" style={{verticalAlign:'middle', paddingRight:20, position:'relative'}}><img src={block.content.url} style={{width:'100%', borderRadius:4, display:'block', opacity:0.7}} /><label style={{position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)', background:'rgba(0,0,0,0.7)', color:'white', padding:'5px 10px', borderRadius:4, cursor:'pointer', fontSize:12, whiteSpace:'nowrap'}}><Upload size={12} style={{marginRight:5}}/> Trocar Imagem<input type="file" hidden onChange={(e) => handleImageUpload(e, block.id, 'url')}/></label></td><td width="60%" style={{verticalAlign:'middle'}}>
                               <EditableArea html={block.content.title} onChange={(val) => updateBlock(block.id, 'title', val)} style={{fontSize:18, fontWeight:'bold', marginBottom:8, color: block.style.titleColor || '#000'}} tagName='div'/>
                               <EditableArea html={block.content.text} onChange={(val) => updateBlock(block.id, 'text', val)} style={{fontSize:14, lineHeight:1.5, color: block.style.color}} tagName='div'/>
                           </td></tr></table>
                       </div>
                   ) 
                   /* VISUALIZAÇÃO PADRÃO */
                   : (
                       <div dangerouslySetInnerHTML={{ __html: generateHTML([block]) }} />
                   )}

                   {selectedBlockId === block.id && (block.type === 'image' || block.type === 'header') && (
                       <label style={{position:'absolute', top:10, right:10, background:'rgba(0,0,0,0.7)', color:'white', padding:'5px 10px', borderRadius:4, cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', gap:5, zIndex:10}}><Upload size={12}/> Trocar Imagem<input type="file" hidden onChange={(e) => handleImageUpload(e, block.id, block.type === 'header' ? 'imageUrl' : 'url')}/></label>
                   )}

                   {selectedBlockId === block.id && (<button onClick={(e) => {e.stopPropagation(); removeBlock(block.id)}} style={{position:'absolute', right:-35, top:0, background:'#F75A68', border:'none', color:'white', padding:6, borderRadius:4, cursor:'pointer'}}><Trash2 size={16}/></button>)}
                 </div>
               ))}
               {editorState.blocks.length === 0 && <div style={{height:400, display:'flex', alignItems:'center', justifyContent:'center', color:'#ccc', flexDirection:'column', gap:10}}><Layout size={40} opacity={0.2}/><p>Adicione blocos</p></div>}
               
               {/* RODAPÉ VISUAL */}
               {editorState.blocks.length > 0 && (
                   <div style={{padding:20, color:'#999', fontSize:11, textAlign:'center', borderTop:'1px solid #eee', marginTop:20}}>
                       Enviado via Framework Workspace
                   </div>
               )}
          </div>
        </div>

        {/* DIREITA: ESTILOS APENAS */}
        <div style={{ width: 300, background: '#121214', borderLeft: '1px solid #29292e', padding: 20, overflowY: 'auto' }}>
           <p style={styles.sectionTitle}>ESTILOS</p>
           {currentBlock ? (
             <div style={{ display: 'flex', flexDirection: 'column' }}>
                
                {(currentBlock.type === 'text' || currentBlock.type === 'imagetext') && (
                    <div style={{marginBottom:20}}>
                        <p style={{fontSize:12, color:'#a8a8b3', marginBottom:10}}>✨ Clique no texto para editar, usar negrito, etc.</p>
                        
                        {currentBlock.type === 'imagetext' && (<div style={{marginTop:15}}><label style={styles.label}>Cor do Título</label><ColorPicker value={currentBlock.style.titleColor} onChange={val => updateBlock(currentBlock.id, 'titleColor', val, true)} /></div>)}
                        
                        <label style={styles.label}>Cor do Texto</label>
                        <ColorPicker value={currentBlock.style.color} onChange={val => updateBlock(currentBlock.id, 'color', val, true)} />

                        <label style={styles.label}>Alinhamento</label>
                        <div style={{display:'flex', gap:5, marginBottom:15}}>
                            {['left','center','right'].map(a => <button key={a} onClick={()=>updateBlock(currentBlock.id, 'align', a, true)} style={{flex:1, background:'#29292e', border:'none', color:'white', padding:5}}>{a}</button>)}
                        </div>
                    </div>
                )}

                {currentBlock.type === 'button' && (
                    <>
                      <label style={styles.label}>Texto</label><input value={currentBlock.content.text} onChange={e => updateBlock(currentBlock.id, 'text', e.target.value)} style={styles.input} />
                      <label style={styles.label}>Link</label><input value={currentBlock.content.url} onChange={e => updateBlock(currentBlock.id, 'url', e.target.value)} style={styles.input} />
                      <label style={styles.label}>Cor</label><ColorPicker value={currentBlock.style.buttonColor} onChange={val => updateBlock(currentBlock.id, 'buttonColor', val, true)} />
                    </>
                )}

                {currentBlock.type === 'social' && (
                    <>
                        <label style={styles.label}>Instagram</label><input value={currentBlock.content.instagram} onChange={e => updateBlock(currentBlock.id, 'instagram', e.target.value)} style={styles.input} />
                        <label style={styles.label}>LinkedIn</label><input value={currentBlock.content.linkedin} onChange={e => updateBlock(currentBlock.id, 'linkedin', e.target.value)} style={styles.input} />
                        <label style={styles.label}>Site</label><input value={currentBlock.content.website} onChange={e => updateBlock(currentBlock.id, 'website', e.target.value)} style={styles.input} />
                    </>
                )}

                <div style={{borderTop:'1px solid #323238', paddingTop:20, marginTop:10}}>
                    <label style={styles.label}>Cor de Fundo</label>
                    <ColorPicker value={currentBlock.style.backgroundColor} onChange={val => updateBlock(currentBlock.id, 'backgroundColor', val, true)} />
                    <label style={{...styles.label, marginTop:15}}>Padding</label>
                    <input type="range" min="0" max="60" value={currentBlock.style.padding || 20} onChange={e => updateBlock(currentBlock.id, 'padding', e.target.value, true)} style={{width:'100%'}} />
                </div>

             </div>
           ) : <p style={{color:'#555', textAlign:'center', marginTop:50}}>Selecione um bloco</p>}
        </div>
      </div>

      {isScheduleModalOpen && (
        <div className="modal-overlay" style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999}}>
            <div style={{background:'#202024', padding:30, borderRadius:8, width:400, border:'1px solid #323238'}}>
                <h2 style={{color:'white', marginTop:0, display:'flex', alignItems:'center', gap:10}}><Clock size={20}/> Agendar</h2>
                <label style={styles.label}>Data e Hora</label><input type="datetime-local" style={{...styles.input, colorScheme:'dark'}} onChange={(e) => setScheduleDate(e.target.value)}/>
                <div style={{display:'flex', justifyContent:'flex-end', gap:10, marginTop:20}}><button onClick={() => setIsScheduleModalOpen(false)} style={{background:'transparent', border:'none', color:'#ccc', cursor:'pointer'}}>Cancelar</button><button onClick={() => handleSave('scheduled')} style={{background:'#8257e6', color:'white', border:'none', padding:'10px 20px', borderRadius:6, cursor:'pointer'}}>Confirmar</button></div>
            </div>
        </div>
      )}
    </div>
  );
}

const ColorPicker = ({ value, onChange }) => (<div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#202024', padding: 5, borderRadius: 6, border: '1px solid #323238', marginBottom:15 }}><input type="color" value={value || '#ffffff'} onChange={e => onChange(e.target.value)} style={{ width: 30, height: 30, border: 'none', background: 'none', cursor: 'pointer' }} /><span style={{ fontSize: 12, color: '#a8a8b3', fontFamily: 'monospace' }}>{value || '#ffffff'}</span></div>);