import { useAuth } from '../contexts/AuthContext';
import { MessageSquare, Hash, Users } from 'lucide-react';

export default function WelcomeView() {
  const { user } = useAuth();

  // Pega o primeiro nome do usuário ou usa "Colega" se não tiver
  const firstName = user?.name ? user.name.split(' ')[0] : 'Colega';

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      color: 'white',
      textAlign: 'center'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>
          Olá, {firstName}! 👋
        </h1>
        <p style={{ color: '#a8a8b3', marginTop: '10px', maxWidth: '400px' }}>
          Selecione um canal ou uma conversa na barra lateral para começar a se comunicar com sua equipe.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '40px', maxWidth: '600px', width: '100%' }}>
        <div style={cardStyle}>
          <div style={iconBoxStyle}><Hash size={24} color="#8257e6" /></div>
          <h3 style={{ margin: '15px 0 5px' }}>Canais</h3>
          <p style={{ fontSize: '14px', color: '#a8a8b3' }}>Acompanhe discussões por tópicos e projetos.</p>
        </div>

        <div style={cardStyle}>
          <div style={iconBoxStyle}><Users size={24} color="#00B37E" /></div>
          <h3 style={{ margin: '15px 0 5px' }}>Mensagens Diretas</h3>
          <p style={{ fontSize: '14px', color: '#a8a8b3' }}>Converse em particular com seus colegas.</p>
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  background: '#202024',
  padding: '24px',
  borderRadius: '8px',
  textAlign: 'left',
  border: '1px solid #323238'
};

const iconBoxStyle = {
  width: '40px',
  height: '40px',
  borderRadius: '8px',
  background: 'rgba(255, 255, 255, 0.05)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};