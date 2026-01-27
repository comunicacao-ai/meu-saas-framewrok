import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Layout, MessageSquare, Users, Tag, LogOut, 
  ChevronLeft, ChevronRight, Hash, Plus, Settings
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Sidebar({ channels = [], onCreateChannel }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  // Função para verificar se o item está ativo
  const isActive = (path) => location.pathname.startsWith(path);

  // Função de Logout
  async function handleLogout() {
    await signOut();
    navigate('/login');
  }

  return (
    <div 
      style={{ 
        width: isCollapsed ? '80px' : '280px', 
        height: '100vh', 
        background: '#121214', 
        borderRight: '1px solid #323238', 
        display: 'flex', 
        flexDirection: 'column', 
        transition: 'width 0.3s ease', // Animação suave
        position: 'relative',
        flexShrink: 0 
      }}
    >
      
      {/* --- BOTÃO DE RECOLHER (SETA) --- */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          position: 'absolute',
          right: '-12px',
          top: '30px',
          width: '24px',
          height: '24px',
          background: '#8257e6',
          borderRadius: '50%',
          border: '2px solid #121214',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10
        }}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* --- CABEÇALHO (LOGO) --- */}
      <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', height: '70px', borderBottom: '1px solid #202024' }}>
        <div style={{ width: 32, height: 32, background: '#8257e6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
           <span style={{ fontWeight: 'bold', color: 'white' }}>F</span>
        </div>
        {!isCollapsed && (
          <div style={{ marginLeft: 10, overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <span style={{ display: 'block', fontWeight: 'bold', color: 'white' }}>Framework</span>
            <span style={{ fontSize: 11, color: '#a8a8b3' }}>Workspace</span>
          </div>
        )}
      </div>

      {/* --- MENU DE NAVEGAÇÃO --- */}
      <div style={{ flex: 1, padding: '20px 10px', overflowY: 'auto', overflowX: 'hidden' }}>
        
        {/* Seção Principal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <NavItem 
            icon={<Layout size={20} />} 
            label="Comunicados" 
            collapsed={isCollapsed} 
            active={isActive('/comunicados')}
            onClick={() => navigate('/comunicados')}
          />
          <NavItem 
            icon={<Users size={20} />} 
            label="Público" 
            collapsed={isCollapsed} 
            active={isActive('/publico')}
            onClick={() => navigate('/publico')}
          />
          <NavItem 
            icon={<Tag size={20} />} 
            label="Tags" 
            collapsed={isCollapsed} 
            active={isActive('/tags')}
            onClick={() => navigate('/tags')}
          />
        </div>

        {/* Divisor */}
        <div style={{ height: 1, background: '#323238', margin: '20px 0' }}></div>

        {/* Seção Canais (Só mostra texto se não estiver recolhido) */}
        {!isCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: '#a8a8b3', fontWeight: 'bold' }}>CANAIS</span>
            <button onClick={() => onCreateChannel({ name: 'novo', isPrivate: false })} style={{ background: 'transparent', border: 'none', color: '#a8a8b3', cursor: 'pointer' }}>
              <Plus size={14} />
            </button>
          </div>
        )}

        {/* Lista de Canais */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {channels.map(channel => (
            <button
              key={channel.id}
              onClick={() => navigate(`/channel/${channel.id}`)}
              title={channel.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                padding: '10px',
                background: isActive(`/channel/${channel.id}`) ? '#202024' : 'transparent',
                border: 'none',
                borderRadius: 6,
                color: isActive(`/channel/${channel.id}`) ? 'white' : '#a8a8b3',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              <Hash size={18} />
              {!isCollapsed && <span style={{ marginLeft: 10, fontSize: 14 }}>{channel.name}</span>}
            </button>
          ))}
        </div>

      </div>

      {/* --- RODAPÉ (PERFIL) --- */}
      <div style={{ padding: '20px', borderTop: '1px solid #202024', display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#323238', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12 }}>
             {user?.email?.[0].toUpperCase()}
          </div>
          {!isCollapsed && (
            <div style={{ overflow: 'hidden' }}>
              <span style={{ display: 'block', fontSize: 13, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                {user?.user_metadata?.name || 'Usuário'}
              </span>
              <span style={{ fontSize: 11, color: '#a8a8b3' }}>Online</span>
            </div>
          )}
        </div>
        
        {!isCollapsed && (
          <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: '#a8a8b3', cursor: 'pointer' }} title="Sair">
            <LogOut size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

// Sub-componente para os itens de menu
function NavItem({ icon, label, collapsed, active, onClick }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: '12px',
        background: active ? '#8257e6' : 'transparent',
        border: 'none',
        borderRadius: 6,
        color: active ? 'white' : '#a8a8b3',
        cursor: 'pointer',
        width: '100%',
        transition: 'all 0.2s'
      }}
      onMouseOver={(e) => { if(!active) e.currentTarget.style.color = 'white'; }}
      onMouseOut={(e) => { if(!active) e.currentTarget.style.color = '#a8a8b3'; }}
    >
      {icon}
      {!collapsed && <span style={{ marginLeft: 12, fontSize: 14, fontWeight: '500' }}>{label}</span>}
    </button>
  );
}