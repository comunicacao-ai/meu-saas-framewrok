import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient'; 
import {
  ArrowLeft, Mail, Users, Eye, MousePointerClick, 
  Clock, CheckCircle, XCircle, RefreshCw,
  TrendingUp, Calendar, Hash
} from 'lucide-react';

export default function AnnouncementAnalytics() {
  const { id } = useParams();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      console.log("--- INICIANDO CARGA SEGURA ---");

     // 1. Busca dados da Campanha
  const { data: campaign, error: campError } = await supabase
    .from('announcements') // <--- CORREÇÃO: Tabela certa (que usa UUID)
    .select('*')
    .eq('id', id)
    .single();

      if (campError) throw campError;

      // 2. Busca os Eventos (SEM TENTAR FAZER JOIN PARA EVITAR ERRO 400)
      const { data: events, error: eventsError } = await supabase
        .from('campaign_events')
        .select('*') // Pegamos tudo bruto da tabela de eventos
        .eq('campaign_id', id)
        .order('created_at', { ascending: true });

      if (eventsError) throw eventsError;

      // 3. Busca Manual dos Contatos (Estratégia Anti-Erro 400)
      // Pegamos todos os IDs de contato que apareceram nos eventos
      const contactIds = events
        .map(e => e.contact_id)
        .filter(id => id); // Remove nulos

      // Remove duplicados para não buscar o mesmo contato 2 vezes
      const uniqueIds = [...new Set(contactIds)];

      let contactsMap = {};

      if (uniqueIds.length > 0) {
          // Busca apenas os contatos necessários
          const { data: contactsData, error: contactsError } = await supabase
            .from('contacts')
            .select('id, email, name')
            .in('id', uniqueIds);
            
          if (!contactsError && contactsData) {
              // Transforma em um "Dicionário" para acesso rápido
              contactsData.forEach(c => {
                  contactsMap[c.id] = c;
              });
          }
      }

      // --- LÓGICA DE PROCESSAMENTO (IGUAL ANTES) ---
      const contactsStatus = {};

      events.forEach(e => {
        // Tenta achar o contato no nosso dicionário manual
        const contact = contactsMap[e.contact_id];
        let email = contact ? contact.email : null;
        
        // Se não achou (ou for nulo), cria placeholder
        if (!email) email = `anonimo_${e.contact_id}`; 

        const type = (e.event_type || '').toLowerCase();
        const current = contactsStatus[email] || 'unknown';
        let newStatus = current;

        // Prioridade: Click > Open > Delivered > Bounced
        if (type.includes('bounc') || type.includes('fail')) {
            if (current === 'unknown') newStatus = 'bounced'; 
        }
        else if (type.includes('sent') || type.includes('deliver')) {
            if (current === 'unknown' || current === 'bounced') newStatus = 'sent';
        }
        else if (type.includes('open')) newStatus = 'opened';
        else if (type.includes('click')) newStatus = 'clicked';

        contactsStatus[email] = newStatus;
      });

      // Contagem Final
      let totalSent = 0; 
      let deliveredCount = 0; 
      let bouncedCount = 0;
      let openCount = 0;
      let clickCount = 0;

      Object.values(contactsStatus).forEach(status => {
        totalSent++;
        if (status === 'bounced') {
            bouncedCount++;
        } else {
            deliveredCount++; 
            if (status === 'sent') {} 
            if (status === 'opened') { openCount++; }
            if (status === 'clicked') { openCount++; clickCount++; }
        }
      });

      // Cálculo de Taxas
      const openRate = deliveredCount > 0 ? ((openCount / deliveredCount) * 100).toFixed(1) : 0;
      const clickRate = deliveredCount > 0 ? ((clickCount / deliveredCount) * 100).toFixed(1) : 0;
      const ctor = openCount > 0 ? ((clickCount / openCount) * 100).toFixed(1) : 0; 

      // Lista de atividade 
      const activityList = [...events].reverse().map((e, index) => {
            const contact = contactsMap[e.contact_id];
            return {
                id: index,
                type: e.event_type, 
                recipientEmail: contact ? contact.email : 'Contato Oculto/Removido',
                recipientName: contact ? contact.name : 'Desconhecido',
                createdAt: e.created_at
            };
      });

      setStats({
        announcement: {
            title: campaign.title,
            subject: campaign.subject || 'Sem assunto',
            sentAt: campaign.sent_at || campaign.created_at
        },
        kpis: {
            totalSent,
            delivered: deliveredCount,
            bounced: bouncedCount,
            opens: openCount,
            clicks: clickCount,
            openRate,
            clickRate,
            ctor
        }
      });

      setActivity(activityList);

    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  // Helpers Visuais
  function formatDate(d) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function getEventIcon(type) {
    const t = (type || '').toLowerCase();
    if (t.includes('open')) return <Eye size={16} color="#00B37E"/>;
    if (t.includes('click')) return <MousePointerClick size={16} color="#8257e6"/>;
    if (t.includes('bounc') || t.includes('fail')) return <XCircle size={16} color="#F75A68" />;
    return <CheckCircle size={16} color="#a8a8b3" />;
  }

  if (loading) return (
    <div style={{minHeight:'100vh', background:'#121214', display:'flex', alignItems:'center', justifyContent:'center', color:'#8257e6'}}>
        <RefreshCw className="spin" size={32} />
    </div>
  );

  if (!stats) return (
    <div style={{minHeight:'100vh', background:'#121214', color:'white', padding:40, textAlign:'center'}}>
        <h2>Erro ao carregar dados.</h2>
        <p style={{color:'#a8a8b3'}}>Verifique o console (F12) para detalhes do erro.</p>
        <button onClick={loadData} style={{marginTop:20, padding:'10px 20px', background:'#8257e6', border:'none', borderRadius:6, color:'white', cursor:'pointer'}}>Tentar Novamente</button>
    </div>
  );

  return (
    <div style={{minHeight:'100vh', background:'#121214', color:'white', fontFamily:'sans-serif'}}>
      
      {/* HEADER */}
      <header style={{background:'#202024', borderBottom:'1px solid #323238', padding:'20px 40px'}}>
        <div style={{maxWidth:1200, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div style={{display:'flex', gap:20, alignItems:'center'}}>
                <Link to="/announcements" style={{background:'#29292e', padding:10, borderRadius:8, color:'#a8a8b3', display:'flex'}}><ArrowLeft size={20}/></Link>
                <div>
                    <h1 style={{fontSize:20, fontWeight:'bold', margin:0, color:'white'}}>{stats.announcement.title}</h1>
                    <div style={{display:'flex', gap:15, marginTop:5, fontSize:13, color:'#a8a8b3'}}>
                        <span style={{display:'flex', alignItems:'center', gap:5}}><Mail size={14}/> {stats.announcement.subject}</span>
                        <span style={{display:'flex', alignItems:'center', gap:5}}><Calendar size={14}/> {formatDate(stats.announcement.sentAt)}</span>
                    </div>
                </div>
            </div>
            <button onClick={loadData} style={{background:'transparent', border:'1px solid #8257e6', color:'#8257e6', padding:'8px 16px', borderRadius:6, cursor:'pointer', display:'flex', gap:8, alignItems:'center', fontWeight:'600'}}>
                <RefreshCw size={16}/> Atualizar
            </button>
        </div>
      </header>

      <div style={{maxWidth:1200, margin:'40px auto', padding:'0 40px'}}>
        
        {/* BIG NUMBERS ROW (Igual referência) */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:20, marginBottom:30}}>
            
            {/* CARD 1: BASE ENVIADA */}
            <KPICard 
                title="Base Enviada" 
                value={stats.kpis.totalSent} 
                icon={<Users size={20} color="#8257e6"/>} 
                sub="Total processado"
            />

            {/* CARD 2: VISUALIZAÇÕES (Opens) */}
            <KPICard 
                title="Visualizações" 
                value={stats.kpis.opens} 
                icon={<Eye size={20} color="#8257e6"/>} 
                sub={`${stats.kpis.openRate}% da base`}
                highlight
            />

            {/* CARD 3: CLIQUES */}
            <KPICard 
                title="Cliques no Link" 
                value={stats.kpis.clicks} 
                icon={<MousePointerClick size={20} color="#8257e6"/>} 
                sub={`${stats.kpis.clickRate}% da base`}
            />

             {/* CARD 4: ENTREGABILIDADE */}
             <KPICard 
                title="Entregabilidade" 
                value={`${((stats.kpis.delivered / stats.kpis.totalSent || 0) * 100).toFixed(0)}%`} 
                icon={<CheckCircle size={20} color="#00B37E"/>} 
                sub={`${stats.kpis.bounced} erros`}
                color="#00B37E"
            />
        </div>

        {/* SECTION 2: GRÁFICOS E DETALHES */}
        <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:20}}>
            
            {/* FUNIL VISUAL */}
            <div style={{background:'#202024', borderRadius:8, padding:25, border:'1px solid #323238'}}>
                <h3 style={{fontSize:16, fontWeight:'bold', marginBottom:20, display:'flex', gap:10}}><TrendingUp size={18} color="#8257e6"/> Funil de Engajamento</h3>
                
                <FunnelBar label="Enviados" value={stats.kpis.totalSent} total={stats.kpis.totalSent} color="#323238" />
                <FunnelBar label="Entregues" value={stats.kpis.delivered} total={stats.kpis.totalSent} color="#00B37E" />
                <FunnelBar label="Visualizaram" value={stats.kpis.opens} total={stats.kpis.totalSent} color="#8257e6" />
                <FunnelBar label="Clicaram" value={stats.kpis.clicks} total={stats.kpis.totalSent} color="#FF0080" />
            </div>

            {/* INFO ADICIONAL */}
            <div style={{background:'#202024', borderRadius:8, padding:25, border:'1px solid #323238'}}>
                 <h3 style={{fontSize:16, fontWeight:'bold', marginBottom:20, display:'flex', gap:10}}><Hash size={18} color="#8257e6"/> Detalhes</h3>
                 <div style={{display:'flex', flexDirection:'column', gap:15}}>
                    <DetailRow label="Taxa de Clique/Abertura (CTOR)" value={`${stats.kpis.ctor}%`} />
                    <DetailRow label="Erros (Bounces)" value={stats.kpis.bounced} color="#F75A68"/>
                 </div>
            </div>

        </div>

        {/* SECTION 3: ATIVIDADE RECENTE */}
        <h3 style={{fontSize:18, fontWeight:'bold', marginTop:40, marginBottom:20, display:'flex', gap:10, alignItems:'center'}}>
            <Clock size={20} color="#a8a8b3"/> Feed de Atividade (Tempo Real)
        </h3>
        
        <div style={{background:'#202024', borderRadius:8, border:'1px solid #323238', overflow:'hidden'}}>
            {activity.length === 0 ? (
                <div style={{padding:30, textAlign:'center', color:'#7c7c8a'}}>Nenhuma atividade registrada ainda.</div>
            ) : (
                <div style={{maxHeight:400, overflowY:'auto'}}>
                    {activity.map((item, i) => (
                        <div key={i} style={{padding:'15px 20px', borderBottom:'1px solid #29292e', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <div style={{display:'flex', gap:15, alignItems:'center'}}>
                                <div style={{background:'#29292e', padding:8, borderRadius:'50%'}}>
                                    {getEventIcon(item.type)}
                                </div>
                                <div>
                                    <div style={{fontWeight:'600', fontSize:14}}>{item.recipientName}</div>
                                    <div style={{fontSize:12, color:'#a8a8b3'}}>{item.recipientEmail}</div>
                                    <div style={{fontSize:12, color:'#505059'}}>
                                        {item.type === 'opened' ? 'Visualizou o e-mail' : 
                                         item.type === 'clicked' ? 'Clicou em um link' : 
                                         item.type === 'bounced' ? 'Erro na entrega' : 
                                         item.type === 'sent' ? 'Enviado' : item.type}
                                    </div>
                                </div>
                            </div>
                            <div style={{fontSize:12, color:'#505059'}}>{formatDate(item.createdAt)}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>

      </div>
    </div>
  );
}

// --- SUB-COMPONENTES PARA ORGANIZAÇÃO ---

function KPICard({ title, value, icon, sub, highlight, color }) {
    return (
        <div style={{background:'#202024', padding:25, borderRadius:8, border:'1px solid #323238', position:'relative', overflow:'hidden'}}>
            {highlight && <div style={{position:'absolute', top:0, left:0, width:4, height:'100%', background:'#8257e6'}}></div>}
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:15}}>
                <span style={{fontSize:13, fontWeight:'600', color:'#a8a8b3', textTransform:'uppercase', letterSpacing:1}}>{title}</span>
                {icon}
            </div>
            <div style={{fontSize:36, fontWeight:'bold', color: color || 'white', lineHeight:1}}>{value}</div>
            <div style={{marginTop:10, fontSize:13, color:'#7c7c8a'}}>{sub}</div>
        </div>
    )
}

function FunnelBar({ label, value, total, color }) {
    const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
    return (
        <div style={{marginBottom:15}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:13}}>
                <span style={{color:'#e1e1e6'}}>{label}</span>
                <span style={{color:'#a8a8b3'}}>{value} ({pct}%)</span>
            </div>
            <div style={{width:'100%', height:8, background:'#29292e', borderRadius:4, overflow:'hidden'}}>
                <div style={{width:`${pct}%`, height:'100%', background:color, borderRadius:4, transition:'width 1s'}}></div>
            </div>
        </div>
    )
}

function DetailRow({ label, value, color }) {
    return (
        <div style={{display:'flex', justifyContent:'space-between', paddingBottom:10, borderBottom:'1px solid #29292e'}}>
            <span style={{color:'#a8a8b3', fontSize:14}}>{label}</span>
            <span style={{color: color || 'white', fontWeight:'bold', fontSize:14}}>{value}</span>
        </div>
    )
}