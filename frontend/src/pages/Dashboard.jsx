import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient'; 
import Sidebar from '../components/Sidebar'; 
import { Users, Eye, MousePointerClick, TrendingUp, AlertTriangle, Send, BarChart2 } from 'lucide-react';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    totalSent: 0,
    totalOpens: 0,
    totalClicks: 0,
    openRate: 0,
    clickRate: 0,
    campaignCount: 0,
    bounces: 0,
    interactions: 0
  });
  const [campaignsData, setCampaignsData] = useState([]); // Dados para o gráfico
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGlobalData();
  }, []);

  async function fetchGlobalData() {
    setLoading(true);
    try {
        const { data: allCampaigns, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
        if (error) throw error;

        // Filtra apenas enviados para estatísticas reais
        const sentCampaigns = allCampaigns.filter(c => c.status === 'sent');

        // Somas Reais
        const totalSent = sentCampaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
        const totalOpens = sentCampaigns.reduce((acc, c) => acc + (c.open_count || 0), 0);
        const totalClicks = sentCampaigns.reduce((acc, c) => acc + (c.click_count || 0), 0);
        const campaignCount = sentCampaigns.length;

        // Cálculos
        const openRate = totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(2) : 0;
        const interactions = totalOpens + totalClicks; 

        // Prepara dados para o gráfico de barras (Top 15 campanhas recentes)
        const chartData = sentCampaigns.slice(0, 15).map(c => ({
            title: c.title.length > 15 ? c.title.substring(0, 15) + '...' : c.title,
            opens: c.open_count || 0,
            max: Math.max(...sentCampaigns.map(sc => sc.open_count || 0)) || 10 // Pega o maior valor para escala
        }));

        setMetrics({ totalSent, totalOpens, totalClicks, openRate, campaignCount, bounces: 0, interactions });
        setCampaignsData(chartData);

    } catch (err) {
        console.error("Erro dashboard:", err);
    } finally {
        setLoading(false);
    }
  }

  if (loading) return (
    <div style={{height: '100vh', display:'flex', alignItems:'center', justifyContent:'center', background: '#121214', color:'white'}}>
       Carregando Dados...
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#121214' }}>
      
      <Sidebar />

      <div style={{ flex: 1, overflowY: 'auto', padding: '30px', color: 'white' }}>
        
        {/* Filtro Topo */}
        <div style={{marginBottom: 30}}>
            <select style={{padding: '10px 15px', borderRadius: 6, border: '1px solid #323238', background: '#202024', color: 'white', fontWeight: 'bold', outline: 'none'}}>
                <option>Todos os Disparos</option>
                <option>Últimos 30 dias</option>
            </select>
        </div>

        {/* GRID PRINCIPAL */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20 }}>
            
            {/* COLUNA ESQUERDA (Mocks de Editoria/Objetivo - Dados Fictícios para Layout) */}
            <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Editoria */}
                <Card title="EDITORIA" height={220}>
                    <div style={{display:'flex', flexDirection:'column', gap:10, marginTop:10}}>
                        <BarRow label="Comunicados" val={metrics.campaignCount} max={metrics.campaignCount + 10} color="#8257e6" />
                        <BarRow label="Employer Branding" val="0" max="10" color="#323238" />
                        <BarRow label="Estratégico" val="0" max="10" color="#323238" />
                    </div>
                </Card>
                {/* Objetivo */}
                <Card title="OBJETIVO" height={220}>
                    <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-around', height:'100%', paddingBottom:10}}>
                        <VBar label="Envolver" height="80%" />
                        <VBar label="Informar" height="60%" />
                        <VBar label="Conectar" height="20%" />
                    </div>
                </Card>
            </div>

            {/* COLUNA DIREITA (Dados Reais) */}
            <div style={{ gridColumn: 'span 9', display: 'flex', flexDirection: 'column', gap: 20 }}>
                
                {/* 3 CARDS DO TOPO */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                    <BigNumberCard title="BASE ENVIADA" value={metrics.totalSent} />
                    <BigNumberCard title="VISUALIZAÇÕES" value={metrics.totalOpens} />
                    <BigNumberCard title="TAXA DE ABERTURA" value={`${metrics.openRate}%`} />
                </div>

                {/* GRÁFICO DE BARRAS REAIS (Assunto x Visualizações) */}
                <Card title="PERFORMANCE POR CAMPANHA (Visualizações)" height={280}>
                     {campaignsData.length === 0 ? (
                        <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#555'}}>Nenhuma campanha enviada ainda.</div>
                     ) : (
                         <div style={{display:'flex', alignItems:'flex-end', gap:15, height:'100%', overflowX:'auto', paddingBottom:5}}>
                            {campaignsData.map((c, i) => {
                                const heightPct = (c.opens / c.max) * 100;
                                return (
                                    <div key={i} style={{flex:1, minWidth:40, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', height:'100%'}}>
                                        <div style={{fontSize:10, fontWeight:'bold', marginBottom:5, color:'#fff'}}>{c.opens}</div>
                                        <div title={c.title} style={{width: '100%', background: '#8257e6', borderRadius:'4px 4px 0 0', height: `${heightPct || 5}%`, opacity: 0.9, transition:'height 0.5s'}}></div>
                                        <div style={{fontSize:9, color:'#888', marginTop:5, textAlign:'center', overflow:'hidden', whiteSpace:'nowrap', width:'100%', textOverflow:'ellipsis'}}>{c.title}</div>
                                    </div>
                                )
                            })}
                         </div>
                     )}
                </Card>

                {/* 4 CARDS INFERIORES */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 20 }}>
                     
                     {/* Donut Chart (Mock Visual) */}
                     <Card title="ERROS NO ENVIO?" height={150}>
                        <div style={{display:'flex', alignItems:'center', gap:15, height:'100%'}}>
                            <div style={{
                                width: 80, height: 80, borderRadius: '50%', 
                                background: 'conic-gradient(#8257e6 0% 2%, #323238 2% 100%)', 
                                display:'flex', alignItems:'center', justifyContent:'center'
                            }}>
                                <div style={{width:50, height:50, background:'#202024', borderRadius:'50%'}}></div>
                            </div>
                            <div style={{fontSize:11, color:'#888'}}>
                                <div style={{display:'flex', alignItems:'center', gap:5}}><div style={{width:8,height:8,background:'#8257e6',borderRadius:'50%'}}/> Erros</div>
                                <div style={{display:'flex', alignItems:'center', gap:5}}><div style={{width:8,height:8,background:'#323238',borderRadius:'50%'}}/> Sucesso</div>
                            </div>
                        </div>
                     </Card>

                     <BigNumberCard title="CLIQUES NO LINK" value={metrics.totalClicks} small />
                     <BigNumberCard title="INTERAÇÕES" value={metrics.interactions} small />
                     <BigNumberCard title="TOTAL DE ENVIOS" value={metrics.campaignCount} small />
                </div>

            </div>

        </div>

      </div>
    </div>
  );
}

// --- COMPONENTES VISUAIS DARK THEME ---

function Card({ title, children, height }) {
    return (
        <div style={{background: '#202024', borderRadius: 16, padding: 20, height: height || 'auto', display: 'flex', flexDirection: 'column', border: '1px solid #323238'}}>
            <h3 style={{fontSize: 12, color: '#a8a8b3', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 15, textAlign:'center', letterSpacing:1}}>{title}</h3>
            <div style={{flex: 1}}>{children}</div>
        </div>
    )
}

function BigNumberCard({ title, value, small }) {
    return (
        <div style={{background: '#202024', borderRadius: 16, padding: small ? 15 : 25, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid #323238'}}>
             <h3 style={{fontSize: 11, color: '#a8a8b3', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 5, letterSpacing:1}}>{title}</h3>
             <div style={{fontSize: small ? 28 : 42, fontWeight: 'bold', color: 'white'}}>{value}</div>
        </div>
    )
}

function BarRow({ label, val, max, color }) {
    const pct = max > 0 ? (parseInt(val) / parseInt(max)) * 100 : 0;
    return (
        <div>
            <div style={{display:'flex', justifyContent:'space-between', fontSize: 12, color: '#e1e1e6', fontWeight:'bold', marginBottom: 2}}>
                <span>{label}</span>
                <span>{val}</span>
            </div>
            <div style={{width: '100%', height: 4, background: '#323238', borderRadius: 2, marginTop: 4}}>
                <div style={{width: `${pct}%`, height: '100%', background: color, borderRadius: 2}}></div>
            </div>
        </div>
    )
}

function VBar({ label, height }) {
    return (
        <div style={{display:'flex', flexDirection:'column', alignItems:'center', height:'100%', justifyContent:'flex-end', width: 40}}>
             <div style={{width: '100%', height: height, background: '#8257e6', borderRadius: '4px 4px 0 0'}}></div>
             <span style={{fontSize: 10, color: '#888', marginTop: 5, transform: 'rotate(-45deg)', transformOrigin: 'left top', whiteSpace:'nowrap'}}>{label}</span>
        </div>
    )
}