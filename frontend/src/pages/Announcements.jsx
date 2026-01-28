import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient'; 
import { 
  Plus, Search, BarChart2, X, Image as ImageIcon, Type, 
  Layout, Trash2, ArrowLeft, Save, Send, MousePointerClick, Users, Tag,
  Eye, Mail, Loader2, CheckCircle, AlertTriangle, ChevronDown, 
  CheckSquare, Square, Bold, Italic, Smartphone, Monitor,
  AlignLeft, AlignCenter, AlignRight, Copy, Share2, Columns, Minus,
  TrendingUp, List, Activity, Link as LinkIcon
} from 'lucide-react';
import './Audience.css';

// ============================================================================
// 1. HELPER: GERADOR DE HTML
// ============================================================================
const generateHTML = (blocks, subject, previewText, isFinalTemplate = true) => {
  let bodyContent = '';
  blocks.forEach(block => {
    const s = block.style || {};
    const c = block.content || {};
    let blockHTML = '';
    switch (block.type) {
      case 'header':
        // CORREÇÃO 2: Se tiver link no header, envolve a imagem/texto numa tag <a>
        const contentHeader = c.imageUrl 
          ? `<img src="${c.imageUrl}" alt="Logo" style="max-width: 200px; height: auto; border: 0;">` 
          : `<h2 style="margin: 0; color: ${s.color}; font-family: sans-serif;">LOGO</h2>`;
        
        const finalHeader = c.url 
          ? `<a href="${c.url}" target="_blank" style="text-decoration:none;">${contentHeader}</a>` 
          : contentHeader;

        blockHTML = `<tr><td align="${s.align}" style="padding: ${s.padding}px; background-color: ${s.backgroundColor};">${finalHeader}</td></tr>`;
        break;

      case 'text':
        let txt = c.text || ''; 
        if(!txt.includes('<')) txt = txt.replace(/\n/g, '<br/>');
        blockHTML = `<tr><td align="${s.align}" style="padding: ${s.padding}px; background-color: ${s.backgroundColor};"><div style="font-family: sans-serif; font-size: ${s.fontSize}px; color: ${s.color}; line-height: 1.6;">${txt}</div></td></tr>`;
        break;

      case 'image':
        const imgTag = `<img src="${c.url}" alt="Imagem" style="max-width: 100%; width: ${s.width || '100%'}; border-radius: ${s.borderRadius}px; display: block; margin: 0 auto;">`;
        // Opção de link na imagem full também
        const finalImg = c.link ? `<a href="${c.link}" target="_blank">${imgTag}</a>` : imgTag;
        blockHTML = `<tr><td align="${s.align}" style="padding: ${s.padding}px; background-color: ${s.backgroundColor};">${finalImg}</td></tr>`;
        break;

      case 'button':
        blockHTML = `<tr><td align="${s.align}" style="padding: ${s.padding}px; background-color: ${s.backgroundColor};"><a href="${c.url}" style="display: inline-block; padding: 12px 24px; background-color: ${s.buttonColor}; color: ${s.textColor}; text-decoration: none; border-radius: ${s.borderRadius}px; font-weight: bold; font-family: sans-serif; font-size: 16px;">${c.text}</a></td></tr>`;
        break;

      case 'spacer':
        blockHTML = `<tr><td style="padding: 0; background-color: ${s.backgroundColor};"><div style="height: ${s.height}px; line-height: ${s.height}px; font-size: 0;">&nbsp;</div>${s.showLine ? `<div style="height: 1px; background-color: ${s.lineColor}; line-height: 1px; font-size: 0;">&nbsp;</div>` : ''}${s.showLine ? `<div style="height: ${s.height}px; line-height: ${s.height}px; font-size: 0;">&nbsp;</div>` : ''}</td></tr>`;
        break;

      case 'social':
        // CORREÇÃO 2: Só mostra o link se o campo não estiver vazio
        let socialLinks = '';
        if (c.instagram) socialLinks += `<a href="${c.instagram}" style="margin: 0 5px; text-decoration: none; color: ${s.color}; font-weight: bold; font-family: sans-serif;">Instagram</a>`;
        if (c.linkedin) socialLinks += `<a href="${c.linkedin}" style="margin: 0 5px; text-decoration: none; color: ${s.color}; font-weight: bold; font-family: sans-serif;">LinkedIn</a>`;
        if (c.website) socialLinks += `<a href="${c.website}" style="margin: 0 5px; text-decoration: none; color: ${s.color}; font-weight: bold; font-family: sans-serif;">Site</a>`;

        blockHTML = `<tr><td align="center" style="padding: ${s.padding}px; background-color: ${s.backgroundColor};"><p style="margin: 0; font-family: sans-serif; font-size: 12px; color: #999;">Siga-nos nas redes</p><div style="margin-top: 10px;">${socialLinks}</div></td></tr>`;
        break;

      case 'imagetext':
        blockHTML = `<tr><td style="padding: ${s.padding}px; background-color: ${s.backgroundColor};"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="40%" valign="middle" style="padding-right: 15px;"><img src="${c.url}" style="width: 100%; border-radius: 4px; display: block;" /></td><td width="60%" valign="middle" style="font-family: sans-serif; font-size: 14px; color: ${s.color}; line-height: 1.5;"><strong style="font-size: 16px;">${c.title}</strong><br/>${c.text}</td></tr></table></td></tr>`;
        break;
    }
    bodyContent += blockHTML;
  });
  if (!isFinalTemplate) return `<table width="100%" cellpadding="0" cellspacing="0" border="0">${bodyContent}</table>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${subject}</title></head><body style="margin: 0; padding: 0; background-color: #f4f4f7;"><div style="display: none; max-height: 0px; overflow: hidden;">${previewText || ''}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f7;"><tr><td align="center" style="padding: 20px 0;"><table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; max-width: 600px; width: 100%;">${bodyContent}<tr><td align="center" style="padding: 30px; background-color: #f4f4f7; color: #888; font-family: sans-serif; font-size: 12px; border-top: 1px solid #e1e1e6;"><p style="margin: 0;">Produzido e disparado pela equipe de comunicação interna da <strong>Framework Digital</strong></p><p style="margin: 5px 0 0 0;"><a href="https://forms.gle/3xFpT2Z8pW5TrhXU9" style="color: #888; text-decoration: underline;">Não quero mais receber este tipo de e-mail!</a></p></td></tr></table></td></tr></table></body></html>`;
};

// ============================================================================
// 2. COMPONENTES AUXILIARES
// ============================================================================

const KPICard = ({ title, value, subtitle, color, icon }) => (
  <div style={{ background: '#202024', padding: 20, borderRadius: 8, border: `1px solid ${color}30` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
      <span style={{ color: '#a8a8b3', fontSize: 14 }}>{title}</span>
      <div style={{ background: `${color}20`, padding: 6, borderRadius: '50%', color: color }}>{icon}</div>
    </div>
    <div style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>{value}</div>
    <div style={{ fontSize: 12, color: color, marginTop: 5 }}>{subtitle}</div>
  </div>
);

const BlockCard = ({ icon, label, onClick }) => (
  <button onClick={onClick} style={{ background: '#202024', border: '1px solid #323238', borderRadius: 6, padding: '15px 10px', color: '#e1e1e6', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
    <div style={{ color: '#8257e6' }}>{icon}</div><span style={{ fontSize: 12 }}>{label}</span>
  </button>
);

const TabButton = ({ active, onClick, label, icon }) => (
  <button onClick={onClick} style={{ flex: 1, padding: '8px', background: active ? '#8257e6' : '#202024', border: active ? '1px solid #8257e6' : '1px solid #323238', color: 'white', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13 }}>
    {icon} {label}
  </button>
);

const ActionBtn = ({ icon, onClick, color }) => (
  <button onClick={onClick} style={{ width: 26, height: 26, borderRadius: 4, background: color ? color : '#202024', border: '1px solid #323238', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{icon}</button>
);

// CORREÇÃO 3: Melhorado o Editor de Texto para não perder foco e não juntar linhas
function RichTextEditor({ value, onChange }) {
  const ref = useRef(null);
  
  const insert = (e, before, after = '') => {
    e.preventDefault(); // Impede que o botão roube o foco do textarea
    const input = ref.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const txt = input.value;
    const newTxt = txt.substring(0, start) + before + txt.substring(start, end) + after + txt.substring(end);
    
    onChange(newTxt);
    
    // Devolve o foco e ajusta o cursor
    setTimeout(() => { 
      input.focus(); 
      input.setSelectionRange(start + before.length, end + before.length + (end - start)); 
    }, 0);
  };

  return (
    <div style={{ border: '1px solid #323238', borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ background: '#202024', padding: 5, borderBottom: '1px solid #323238', display: 'flex', gap: 4 }}>
        <ToolBtn icon={<Bold size={14}/>} onClick={(e) => insert(e, '<b>', '</b>')}/>
        <ToolBtn icon={<Italic size={14}/>} onClick={(e) => insert(e, '<i>', '</i>')}/>
        <div style={{width:1, background:'#323238', margin:'0 4px'}}></div>
        <ToolBtn text="{Nome}" onClick={(e) => insert(e, '{{name}}')}/>
      </div>
      <textarea 
        ref={ref} 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        rows={6} 
        style={{ width: '100%', background: '#121214', color: 'white', border: 'none', padding: 10, outline: 'none', fontSize: 14, fontFamily: 'sans-serif' }} 
      />
    </div>
  );
}

const ToolBtn = ({ icon, text, onClick }) => (
  <button onClick={onClick} style={{ background: 'transparent', border: 'none', color: '#a8a8b3', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11, display:'flex', alignItems:'center' }} onMouseOver={e=>e.currentTarget.style.bg='#29292e'}>
    {icon || text}
  </button>
);

const ColorPicker = ({ value, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#202024', padding: 5, borderRadius: 6, border: '1px solid #323238' }}>
    <input type="color" value={value || '#ffffff'} onChange={e => onChange(e.target.value)} style={{ width: 30, height: 30, border: 'none', background: 'none', cursor: 'pointer' }} />
    <span style={{ fontSize: 12, color: '#a8a8b3', fontFamily: 'monospace' }}>{value || '#ffffff'}</span>
  </div>
);

const AlignSelector = ({ value, onChange }) => (
  <div style={{ display: 'flex', background: '#202024', borderRadius: 6, border: '1px solid #323238', padding: 2 }}>
    {['left', 'center', 'right'].map(align => (
       <button key={align} onClick={() => onChange(align)} style={{ flex: 1, background: value === align ? '#323238' : 'transparent', border: 'none', color: value === align ? 'white' : '#7c7c8a', padding: 6, borderRadius: 4, cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
         {align === 'left' ? <AlignLeft size={16}/> : align === 'center' ? <AlignCenter size={16}/> : <AlignRight size={16}/>}
       </button>
    ))}
  </div>
);

const sectionTitleStyle = { fontSize: 11, fontWeight: 'bold', color: '#7c7c8a', marginBottom: 15, letterSpacing: 1 };
const labelStyle = { fontSize: 12, color: '#a8a8b3', marginBottom: 6, display: 'block', fontWeight: '500' };
const inputStyle = { width: '100%', padding: 10, background: '#202024', border: '1px solid #323238', color: 'white', borderRadius: 6, fontSize: 14, outline: 'none' };
const uploadBtnStyle = { ...inputStyle, textAlign: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#29292e' };
const actionLinkStyle = { background: 'none', border: 'none', color: '#8257e6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 };
const thStyle = { textAlign:'left', padding:'10px 15px', fontSize:11, color:'#7c7c8a', textTransform:'uppercase' };
const tdStyle = { padding:'10px 15px', fontSize:13, color:'white' };
const tagPillStyle = { background:'#29292e', padding:'2px 6px', borderRadius:4, fontSize:10, marginRight:5, border:'1px solid #323238', color:'#ccc' };

function getDefaultContent(type) {
  if (type === 'text') return { text: 'Olá, {{name}}! Escreva sua mensagem aqui.' };
  if (type === 'button') return { text: 'Clique Aqui', url: 'https://' };
  if (type === 'social') return { instagram: 'https://instagram.com', linkedin: 'https://linkedin.com', website: 'https://seusite.com' };
  if (type === 'imagetext') return { title: 'Título em Destaque', text: 'Descrição curta sobre a imagem ao lado.', url: 'https://via.placeholder.com/150' };
  if (type === 'header') return { url: '', imageUrl: '' }; // Adicionado url padrão
  return { url: 'https://via.placeholder.com/600x200', link: '' };
}

function getDefaultStyle(type) {
  const base = { backgroundColor: 'transparent', padding: 20, align: 'center' };
  if (type === 'text') return { ...base, color: '#333333', fontSize: 16, textAlign: 'left', align: 'left' };
  if (type === 'button') return { ...base, buttonColor: '#8257e6', textColor: '#ffffff', borderRadius: 6 };
  if (type === 'spacer') return { ...base, height: 30, showLine: true, lineColor: '#F5F5F5', padding: 0 };
  if (type === 'image') return { ...base, borderRadius: 4, width: '100%' };
  if (type === 'header') return { ...base, backgroundColor: '#ffffff', padding: 30 };
  if (type === 'imagetext') return { ...base, backgroundColor: '#ffffff', color: '#333333' };
  if (type === 'social') return { ...base, color: '#8257e6', padding: 15 };
  return base;
}

// ============================================================================
// 3. VIEWS (TELAS)
// ============================================================================

const ListView = ({ campaigns, onNew, onEdit, onViewDash }) => {
  const totalSent = campaigns.reduce((acc, curr) => acc + (curr.sent_count || 0), 0);
  const totalOpens = campaigns.reduce((acc, curr) => acc + (curr.open_count || 0), 0);
  const avgOpenRate = totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(1) : 0;

  return (
    <div className="audience-container" style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '30px', display: 'flex', flexDirection: 'column' }}>
      <div className="audience-header" style={{ flexShrink: 0 }}>
        <div className="audience-title"><h1>Disparos</h1><p style={{ color: '#a8a8b3' }}>Visão geral de comunicados.</p></div>
        <button className="btn-primary" onClick={onNew}><Plus size={20} /> Nova Campanha</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 15, marginBottom: 30, flexShrink: 0 }}>
        <KPICard title="Total Enviados" value={totalSent} subtitle="E-mails Disparados" color="#8257e6" icon={<Activity size={20}/>} />
        <KPICard title="Taxa Média" value={`${avgOpenRate}%`} subtitle="Abertura Geral" color="#00B37E" icon={<Eye size={20}/>} />
        <KPICard title="Campanhas" value={campaigns.length} subtitle="Criadas" color="#e1e1e6" icon={<Layout size={20}/>} />
      </div>
      <div className="table-container" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <table>
            <thead><tr><th>Status</th><th>Assunto</th><th>Data</th><th>Ações</th></tr></thead>
            <tbody>
              {campaigns.map(camp => (
                <tr key={camp.id}>
                  <td><span className={`status-badge ${camp.status === 'sent' ? 'status-active' : 'status-inactive'}`}>{camp.status === 'sent' ? 'Enviado' : 'Rascunho'}</span></td>
                  <td style={{ color: 'white', fontWeight:'500' }}>{camp.title || camp.subject}</td>
                  <td style={{color:'#a8a8b3'}}>{new Date(camp.created_at).toLocaleDateString()}</td>
                  <td>{camp.status === 'draft' ? <button onClick={() => onEdit(camp)} style={actionLinkStyle}>Editar</button> : <button onClick={() => onViewDash(camp)} style={actionLinkStyle}><BarChart2 size={16}/> Relatório</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>
    </div>
  );
};

const DashboardView = ({ campaign, onBack }) => {
  const [events, setEvents] = useState([]);
  const [tagRanking, setTagRanking] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (campaign) fetchEvents();
  }, [campaign]);

  async function fetchEvents() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('campaign_events')
      .select('*')
      .eq('campaign_id', campaign.id)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      setEvents(data);
      calculateTagRanking(data);
    } else {
      const mock = [
        { id: 1, email: 'exemplo@empresa.com', event_type: 'delivered', created_at: new Date().toISOString(), contact_tags: ['Exemplo'] }
      ];
      setEvents(mock);
      calculateTagRanking(mock);
    }
    setIsLoading(false);
  }

  function calculateTagRanking(data) {
    const counts = {};
    data.forEach(ev => {
      if (ev.contact_tags) {
        ev.contact_tags.forEach(tag => {
          counts[tag] = (counts[tag] || 0) + 1;
        });
      }
    });
    const ranked = Object.entries(counts).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count);
    setTagRanking(ranked);
  }

  const opens = events.filter(e => e.event_type === 'open' || e.event_type === 'delivered').slice(0, 10);
  const bounces = events.filter(e => e.event_type === 'bounce');

  return (
    <div className="audience-container" style={{ height: '100%', overflowY: 'auto', padding: '30px' }}>
      <div style={{ marginBottom: 30, borderBottom: '1px solid #323238', paddingBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#a8a8b3', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}><ArrowLeft size={16} /> Voltar</button>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'end' }}>
           <div><h1 style={{ fontSize: 24, color: 'white' }}>{campaign.title}</h1><p style={{color:'#7c7c8a'}}>Análise de Performance</p></div>
           <span className="status-badge status-active">Relatório</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 30 }}>
        <KPICard title="Envios" value={campaign.sent_count || 0} subtitle="Total" color="#8257e6" icon={<Send size={20}/>} />
        <KPICard title="Aberturas" value={campaign.open_count || 0} subtitle={`${campaign.sent_count ? ((campaign.open_count/campaign.sent_count)*100).toFixed(0) : 0}% Taxa`} color="#00B37E" icon={<Eye size={20}/>} />
        <KPICard title="Cliques" value={campaign.click_count || 0} subtitle="CTR" color="#00B37E" icon={<MousePointerClick size={20}/>} />
        <KPICard title="Bounces" value={bounces.length} subtitle="Erros" color="#f75a68" icon={<AlertTriangle size={20}/>} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: '#202024', borderRadius: 8, border: '1px solid #323238', overflow:'hidden' }}>
             <div style={{ padding: 15, borderBottom: '1px solid #323238', display:'flex', gap:10, alignItems:'center' }}><List size={18} color="#00B37E"/><span style={{fontWeight:'bold', color:'white'}}>Últimos Envios / Aberturas</span></div>
             <table style={{width:'100%', borderCollapse:'collapse'}}>
               <thead style={{background:'#121214'}}><tr><th style={thStyle}>E-mail</th><th style={thStyle}>Data</th><th style={thStyle}>Tags</th></tr></thead>
               <tbody>
                 {opens.map(ev => (
                   <tr key={ev.id} style={{borderBottom:'1px solid #29292e'}}><td style={tdStyle}>{ev.email}</td><td style={tdStyle}>{new Date(ev.created_at).toLocaleTimeString()}</td><td style={tdStyle}>{ev.contact_tags?.map(t=><span key={t} style={tagPillStyle}>{t}</span>)}</td></tr>
                 ))}
                 {opens.length === 0 && <tr><td colSpan={3} style={{padding:20, textAlign:'center', color:'#555'}}>Nenhum envio registrado.</td></tr>}
               </tbody>
             </table>
          </div>
          <div style={{ background: '#202024', borderRadius: 8, border: '1px solid #f75a6850', overflow:'hidden' }}>
             <div style={{ padding: 15, borderBottom: '1px solid #323238', display:'flex', gap:10, alignItems:'center' }}><AlertTriangle size={18} color="#f75a68"/><span style={{fontWeight:'bold', color:'white'}}>Erros de Entrega (Bounce)</span></div>
             <table style={{width:'100%', borderCollapse:'collapse'}}>
               <thead style={{background:'#290000'}}><tr><th style={thStyle}>E-mail</th><th style={thStyle}>Status</th></tr></thead>
               <tbody>
                 {bounces.map(ev => (
                   <tr key={ev.id} style={{borderBottom:'1px solid #29292e'}}><td style={{...tdStyle, color:'#f75a68'}}>{ev.email}</td><td style={tdStyle}>Falha na entrega</td></tr>
                 ))}
                 {bounces.length === 0 && <tr><td colSpan={2} style={{padding:20, textAlign:'center', color:'#7c7c8a'}}>Nenhum erro encontrado! 🎉</td></tr>}
               </tbody>
             </table>
          </div>
        </div>
        <div style={{ background: '#202024', borderRadius: 8, border: '1px solid #323238', height:'fit-content' }}>
          <div style={{ padding: 15, borderBottom: '1px solid #323238', display:'flex', gap:10, alignItems:'center' }}><TrendingUp size={18} color="#8257e6"/><span style={{fontWeight:'bold', color:'white'}}>Ranking de Tags</span></div>
          <div style={{ padding: 15 }}>
            {tagRanking.map((item, i) => (
              <div key={item.tag} style={{ marginBottom: 15 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:12 }}>
                  <span style={{color:'white'}}>{i+1}. {item.tag}</span>
                  <span style={{color:'#8257e6', fontWeight:'bold'}}>{item.count} envios</span>
                </div>
                <div style={{ width: '100%', height: 6, background: '#121214', borderRadius: 3, overflow:'hidden' }}>
                  <div style={{ width: `${(item.count / (tagRanking[0]?.count || 1)) * 100}%`, height: '100%', background: '#8257e6', borderRadius: 3 }}></div>
                </div>
              </div>
            ))}
            {tagRanking.length === 0 && <p style={{textAlign:'center', color:'#555', fontSize:12}}>Sem dados suficientes.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. COMPONENTE PRINCIPAL (EXPORTADO NO FINAL)
// ============================================================================

export default function Announcements() {
  const [viewMode, setViewMode] = useState('list'); 
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [availableTags, setAvailableTags] = useState([]); 
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

  const [editorState, setEditorState] = useState({
    id: null, subject: '', previewText: '', audienceType: 'all', tags: [], blocks: [] 
  });
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [previewDevice, setPreviewDevice] = useState('desktop'); 
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  useEffect(() => { fetchCampaigns(); fetchTags(); }, []);

  async function fetchCampaigns() {
    setLoading(true);
    const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    if (!error && data) setCampaigns(data);
    setLoading(false);
  }

  async function fetchTags() {
    const { data } = await supabase.from('tags').select('*').order('name');
    if (data) setAvailableTags(data);
  }

  const handleSendTest = async () => {
    const email = prompt("Digite o e-mail para receber o teste:", "seu@email.com");
    if (!email) return;
    setLoading(true);
    try {
      const htmlBody = generateHTML(editorState.blocks, `[TESTE] ${editorState.subject}`, editorState.previewText, true);
      const { error } = await supabase.functions.invoke('send-email', {
        body: { type: 'test', to: email, subject: `[TESTE] ${editorState.subject}`, html: htmlBody, variables: { name: 'Visitante Teste' } }
      });
      if (error) throw error;
      alert(`✅ Teste enviado com sucesso para: ${email}`);
    } catch (error) {
      console.warn(error);
      alert(`Erro no envio: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (status = 'draft') => {
    if (!editorState.subject) return alert("Ei! Dê um assunto para sua campanha.");
    setLoading(true);
    const isSending = status === 'sent';
    const payload = {
      title: editorState.subject,
      content: editorState.blocks,
      status: isSending ? 'draft' : status,
      updated_at: new Date(),
      ...(editorState.previewText && { preview_text: editorState.previewText }),
      ...(editorState.audienceType && { audience_type: editorState.audienceType }),
      ...(editorState.tags?.length > 0 && { tags: editorState.tags })
    };
    try {
      let savedId = editorState.id;
      if (editorState.id) {
        await supabase.from('announcements').update(payload).eq('id', editorState.id);
      } else {
        const { data, error } = await supabase.from('announcements').insert([payload]).select();
        if (error) throw error;
        savedId = data[0].id;
      }
      if (status === 'draft') {
        alert("Rascunho salvo!");
        fetchCampaigns();
        setLoading(false);
        return;
      }

      const htmlBody = generateHTML(editorState.blocks, editorState.subject, editorState.previewText, true);
      const invokePayload = {
        type: 'campaign',
        campaignId: savedId,
        subject: editorState.subject,
        html: htmlBody,
        audienceType: editorState.audienceType ?? 'all',
        tags: editorState.tags ?? []
      };
      console.log('[handleSave] Enviando para send-email. Payload:', { ...invokePayload, html: '(html omitido)' });
      const { data: fnData, error } = await supabase.functions.invoke('send-email', { body: invokePayload });
      console.log('[handleSave] Resposta send-email:', { data: fnData, error: error?.message ?? null });

      if (error) throw error;
      const ok = fnData && !fnData.error;
      if (!ok && fnData?.error) throw new Error(typeof fnData.error === 'string' ? fnData.error : JSON.stringify(fnData.error));

      await supabase.from('announcements').update({ status: 'sent', updated_at: new Date() }).eq('id', savedId);
      alert("Campanha Enviada! 🚀");
      setIsPreviewModalOpen(false);
      setViewMode('list');
      fetchCampaigns();
      resetEditor();
    } catch (err) {
      console.error('[handleSave] Erro no envio:', err);
      alert("Erro: " + (err?.message ?? String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (camp) => {
    setEditorState({ id: camp.id, subject: camp.title || camp.subject, previewText: camp.preview_text || '', audienceType: camp.audience_type || 'all', tags: camp.tags ? (Array.isArray(camp.tags) ? camp.tags : camp.tags.split(',')) : [], blocks: Array.isArray(camp.content) ? camp.content : [] });
    setViewMode('editor');
  };

  const resetEditor = () => { setEditorState({ id: null, subject: '', previewText: '', audienceType: 'all', tags: [], blocks: [] }); setSelectedBlockId(null); };
  const toggleTag = (t) => { setEditorState(prev => ({ ...prev, tags: prev.tags.includes(t) ? prev.tags.filter(x => x !== t) : [...prev.tags, t] })); };
  
  const addBlock = (type) => { const newBlock = { id: Date.now(), type, content: getDefaultContent(type), style: getDefaultStyle(type) }; setEditorState(prev => ({ ...prev, blocks: [...prev.blocks, newBlock] })); setSelectedBlockId(newBlock.id); };
  const updateBlock = (id, key, val, isStyle = false) => { setEditorState(prev => ({ ...prev, blocks: prev.blocks.map(b => b.id !== id ? b : (isStyle ? { ...b, style: { ...b.style, [key]: val } } : { ...b, content: { ...b.content, [key]: val } })) })); };
  const moveBlock = (id, dir) => { const idx = editorState.blocks.findIndex(b => b.id === id); if(idx===-1)return; const newBlocks=[...editorState.blocks]; const swap=dir==='up'?idx-1:idx+1; if(swap>=0&&swap<newBlocks.length){[newBlocks[idx],newBlocks[swap]]=[newBlocks[swap],newBlocks[idx]]; setEditorState(prev=>({...prev,blocks:newBlocks}));}};
  const duplicateBlock = (id) => { const b=editorState.blocks.find(x=>x.id===id); setEditorState(prev=>({...prev,blocks:[...prev.blocks,{...b,id:Date.now()}]})); };
  const removeBlock = (id) => { setEditorState(prev=>({...prev,blocks:prev.blocks.filter(b=>b.id!==id)})); setSelectedBlockId(null); };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedBlockId) return;
    e.target.parentElement.innerHTML = "Subindo... ⏳";
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('campaign-images').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('campaign-images').getPublicUrl(fileName);
      const block = editorState.blocks.find(b => b.id === selectedBlockId);
      const key = block.type === 'header' ? 'imageUrl' : 'url';
      updateBlock(selectedBlockId, key, data.publicUrl);
    } catch (error) { alert('Erro no upload.'); console.error(error); } 
    finally { setTimeout(() => { /* Reset visual */ }, 500); }
  };

  if (viewMode === 'list') return <ListView campaigns={campaigns} onNew={() => { resetEditor(); setViewMode('editor'); }} onEdit={handleEdit} onViewDash={(c) => {setSelectedCampaign(c); setViewMode('dashboard')}} />;
  if (viewMode === 'dashboard') return <DashboardView campaign={selectedCampaign} onBack={() => setViewMode('list')} />;

  const currentBlock = editorState.blocks.find(b => b.id === selectedBlockId);
  const htmlFinalPreview = generateHTML(editorState.blocks, editorState.subject, editorState.previewText, true);

  return (
    <div className="audience-container" style={{ padding: 0, height: '100vh', display: 'flex', flexDirection: 'column', background: '#09090a' }}>
      <div style={{ height: 60, borderBottom: '1px solid #29292e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: '#121214' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}><button onClick={() => setViewMode('list')} style={{ background: 'none', border: 'none', color: '#a8a8b3', cursor: 'pointer' }}><ArrowLeft size={20} /></button><div><span style={{ fontWeight: 'bold', color: 'white', fontSize: 14 }}>{editorState.id ? 'Editar Campanha' : 'Nova Campanha'}</span></div></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#202024', borderRadius: 6, padding: 4, display: 'flex', border: '1px solid #29292e' }}>
            <button onClick={() => setPreviewDevice('desktop')} style={{ background: previewDevice === 'desktop' ? '#323238' : 'transparent', border: 'none', color: previewDevice === 'desktop' ? 'white' : '#7c7c8a', padding: 6, borderRadius: 4 }}><Monitor size={16} /></button>
            <button onClick={() => setPreviewDevice('mobile')} style={{ background: previewDevice === 'mobile' ? '#323238' : 'transparent', border: 'none', color: previewDevice === 'mobile' ? 'white' : '#7c7c8a', padding: 6, borderRadius: 4 }}><Smartphone size={16} /></button>
          </div>
          
          {/* CORREÇÃO 1: Botão Salvar Rascunho adicionado aqui */}
          <button onClick={() => handleSave('draft')} disabled={loading} style={{ background: 'transparent', border: '1px solid #323238', color: '#e1e1e6', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: '600', marginRight: 5, display:'flex', alignItems:'center', gap:5 }}>
             {loading ? <Loader2 size={16} className="spin" /> : <><Save size={16}/> Salvar Rascunho</>}
          </button>

          <button onClick={handleSendTest} style={{ background: 'transparent', border: '1px solid #8257e6', color: '#8257e6', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', display:'flex', gap:6 }}><Mail size={16}/> Teste</button>
          <button onClick={() => setIsPreviewModalOpen(true)} className="btn-primary" style={{ padding: '8px 16px' }}><Eye size={16} style={{marginRight:6}}/> Revisar & Enviar</button>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: 320, background: '#121214', borderRight: '1px solid #29292e', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ padding: 20, borderBottom: '1px solid #29292e' }}><p style={sectionTitleStyle}>CONFIGURAÇÕES</p><label style={labelStyle}>Assunto</label><input value={editorState.subject} onChange={e => setEditorState({...editorState, subject: e.target.value})} style={inputStyle} /><label style={{...labelStyle, marginTop: 15}}>Preheader</label><input value={editorState.previewText} onChange={e => setEditorState({...editorState, previewText: e.target.value})} style={inputStyle} /><div style={{ marginTop: 20 }}><label style={labelStyle}>Enviar Para:</label><div style={{ display: 'flex', gap: 10 }}><TabButton active={editorState.audienceType === 'all'} onClick={() => setEditorState({...editorState, audienceType: 'all'})} label="Todos" icon={<Users size={14}/>} /><TabButton active={editorState.audienceType === 'tags'} onClick={() => setEditorState({...editorState, audienceType: 'tags'})} label="Por Tags" icon={<Tag size={14}/>} /></div>{editorState.audienceType === 'tags' && (<div style={{ background: '#202024', padding: 10, borderRadius: 6, border: '1px solid #29292e', marginTop:10 }}><div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{availableTags.map(t => (<div key={t.id} onClick={() => toggleTag(t.name)} style={{ fontSize: 11, cursor: 'pointer', padding: '4px 8px', borderRadius: 4, background: editorState.tags.includes(t.name) ? '#8257e6' : '#29292e', color: 'white', border: '1px solid #323238' }}>{t.name}</div>))}</div></div>)}</div></div>
            <div style={{ padding: 20 }}><p style={sectionTitleStyle}>ADICIONAR BLOCOS</p><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><BlockCard icon={<Layout size={18} />} label="Topo" onClick={() => addBlock('header')} /><BlockCard icon={<Type size={18} />} label="Texto" onClick={() => addBlock('text')} /><BlockCard icon={<Columns size={18} />} label="Img + Texto" onClick={() => addBlock('imagetext')} /><BlockCard icon={<ImageIcon size={18} />} label="Imagem" onClick={() => addBlock('image')} /><BlockCard icon={<MousePointerClick size={18} />} label="Botão" onClick={() => addBlock('button')} /><BlockCard icon={<Share2 size={18} />} label="Social" onClick={() => addBlock('social')} /><BlockCard icon={<Minus size={18} />} label="Espaço" onClick={() => addBlock('spacer')} /></div></div>
          </div>
        </div>
        <div style={{ flex: 1, background: '#09090a', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', overflowY: 'auto' }}>
          <div style={{ width: previewDevice === 'mobile' ? '375px' : '600px', transition: 'width 0.3s', background: 'white', minHeight: 'fit-content', height: 'fit-content', borderRadius: previewDevice === 'mobile' ? 30 : 4 }}>
             <div style={{ padding: 0 }}>{editorState.blocks.map((block) => (<div key={block.id} onClick={() => setSelectedBlockId(block.id)} style={{ position: 'relative', outline: selectedBlockId === block.id ? '2px solid #8257e6' : '1px dashed transparent', cursor: 'pointer' }}><div dangerouslySetInnerHTML={{ __html: generateHTML([block], '', '', false) }} />{selectedBlockId === block.id && (<div className="block-actions" style={{ position: 'absolute', right: -40, top: 0, display: 'flex', flexDirection: 'column', gap: 5 }}><ActionBtn icon={<ChevronDown size={14} style={{transform:'rotate(180deg)'}}/>} onClick={(e) => {e.stopPropagation(); moveBlock(block.id, 'up')}} /><ActionBtn icon={<ChevronDown size={14}/>} onClick={(e) => {e.stopPropagation(); moveBlock(block.id, 'down')}} /><ActionBtn icon={<Copy size={14}/>} onClick={(e) => {e.stopPropagation(); duplicateBlock(block.id)}} /><ActionBtn icon={<Trash2 size={14}/>} color="#f75a68" onClick={(e) => {e.stopPropagation(); removeBlock(block.id)}} /></div>)}</div>))}</div>
          </div>
        </div>
        <div style={{ width: 300, background: '#121214', borderLeft: '1px solid #29292e', display: 'flex', flexDirection: 'column' }}>
           <div style={{ padding: 15, borderBottom: '1px solid #29292e', background: '#202024' }}><span style={{ fontSize: 12, fontWeight: 'bold', color: 'white' }}>{currentBlock ? `EDITAR: ${currentBlock.type.toUpperCase()}` : 'PROPRIEDADES'}</span></div>
           <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
             {selectedBlockId && currentBlock ? (
               <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                 {currentBlock.type === 'text' && <><RichTextEditor value={currentBlock.content.text} onChange={val => updateBlock(currentBlock.id, 'text', val)} /><AlignSelector value={currentBlock.style.align} onChange={val => updateBlock(currentBlock.id, 'align', val, true)} /><ColorPicker value={currentBlock.style.backgroundColor} onChange={val => updateBlock(currentBlock.id, 'backgroundColor', val, true)} /></>}
                 
                 {currentBlock.type === 'image' && <><label style={uploadBtnStyle}><input type="file" hidden onChange={handleImageUpload} /> <ImageIcon size={16}/> Carregar</label><input value={currentBlock.style.width || '100%'} onChange={e => updateBlock(currentBlock.id, 'width', e.target.value, true)} style={inputStyle} /><label style={labelStyle}>Link da Imagem (Opcional)</label><input value={currentBlock.content.link || ''} onChange={e => updateBlock(currentBlock.id, 'link', e.target.value)} placeholder="https://..." style={inputStyle} /><ColorPicker value={currentBlock.style.backgroundColor} onChange={val => updateBlock(currentBlock.id, 'backgroundColor', val, true)} /></>}
                 
                 {/* (Outros editores mantidos resumidos para caber visualmente) */}
                 {currentBlock.type === 'imagetext' && <><label style={uploadBtnStyle}><input type="file" hidden onChange={handleImageUpload} /> Imagem</label><input value={currentBlock.content.title} onChange={e => updateBlock(currentBlock.id, 'title', e.target.value)} style={inputStyle} /><textarea rows={4} value={currentBlock.content.text} onChange={e => updateBlock(currentBlock.id, 'text', e.target.value)} style={inputStyle} /></>}
                 {currentBlock.type === 'button' && <><input value={currentBlock.content.text} onChange={e => updateBlock(currentBlock.id, 'text', e.target.value)} style={inputStyle} /><input value={currentBlock.content.url} onChange={e => updateBlock(currentBlock.id, 'url', e.target.value)} style={inputStyle} /><ColorPicker value={currentBlock.style.buttonColor} onChange={val => updateBlock(currentBlock.id, 'buttonColor', val, true)} /></>}
                 {currentBlock.type === 'spacer' && <><input type="range" min="10" max="100" value={currentBlock.style.height} onChange={e => updateBlock(currentBlock.id, 'height', e.target.value, true)} /><label style={{display:'flex',gap:10,fontSize:12,color:'#aaa',marginTop:5}}>Linha<input type="checkbox" checked={currentBlock.style.showLine} onChange={e => updateBlock(currentBlock.id, 'showLine', e.target.checked, true)} /></label></>}
                 
                 {/* CORREÇÃO 2: Links Sociais */}
                 {currentBlock.type === 'social' && <><label style={labelStyle}>Deixe vazio para ocultar</label><input placeholder="Instagram URL" value={currentBlock.content.instagram} onChange={e => updateBlock(currentBlock.id, 'instagram', e.target.value)} style={inputStyle}/><input placeholder="LinkedIn URL" value={currentBlock.content.linkedin} onChange={e => updateBlock(currentBlock.id, 'linkedin', e.target.value)} style={inputStyle}/><input placeholder="Site URL" value={currentBlock.content.website} onChange={e => updateBlock(currentBlock.id, 'website', e.target.value)} style={inputStyle}/><ColorPicker value={currentBlock.style.color} onChange={val => updateBlock(currentBlock.id, 'color', val, true)}/></>}

                 {/* CORREÇÃO 2: Header com Link */}
                 {currentBlock.type === 'header' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                       <label style={uploadBtnStyle}><input type="file" hidden onChange={handleImageUpload} /> <ImageIcon size={16}/> Carregar Logo</label>
                       <div><label style={labelStyle}>Link do Logo (Opcional)</label><input value={currentBlock.content.url || ''} onChange={e => updateBlock(currentBlock.id, 'url', e.target.value)} placeholder="https://..." style={inputStyle} /></div>
                       <div><label style={labelStyle}>Cor de Fundo</label><ColorPicker value={currentBlock.style.backgroundColor} onChange={val => updateBlock(currentBlock.id, 'backgroundColor', val, true)} /></div>
                       <div><label style={labelStyle}>Alinhamento</label><AlignSelector value={currentBlock.style.align} onChange={val => updateBlock(currentBlock.id, 'align', val, true)} /></div>
                    </div>
                 )}
               </div>
             ) : <p style={{textAlign:'center', color:'#555', marginTop:50}}>Selecione um bloco</p>}
           </div>
        </div>
      </div>
      {isPreviewModalOpen && (<div className="modal-overlay"><div className="modal-content" style={{maxWidth: 900, height: '90vh', padding: 0, display: 'flex', flexDirection: 'column'}}><div className="modal-header"><h2>Revisão Final</h2><button onClick={() => setIsPreviewModalOpen(false)} className="close-btn"><X size={20}/></button></div><div style={{flex: 1, background: '#e1e1e6', padding: 40, overflowY: 'auto', display:'flex', justifyContent:'center'}}><div style={{width: 600, background: 'white', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}} dangerouslySetInnerHTML={{__html: htmlFinalPreview}} /></div><div className="modal-footer"><button onClick={() => setIsPreviewModalOpen(false)} style={{marginRight: 10, background:'transparent', border:'none', cursor:'pointer'}}>Voltar</button><button onClick={() => handleSave('sent')} className="btn-save"><Send size={18}/> Confirmar Envio</button></div></div></div>)}
    </div>
  );
}