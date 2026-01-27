import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChannelView from '../components/ChannelView';
import DirectMessageView from '../components/DirectMessageView';
import WelcomeView from '../components/WelcomeView';
// Importações das páginas
import Announcements from './Announcements';     // <--- LISTA (DASHBOARD)
import AnnouncementEditor from './AnnouncementEditor'; // <--- EDITOR NOVO
import Tags from './Tags';
import Audience from './Audience'; 
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import './Chat.css';

export default function Chat() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [channels, setChannels] = useState([]);
  const [users, setUsers] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => { if (user) loadData(); }, [user]);

  async function loadData() {
    setDataLoading(true);
    try {
      const { data: ch } = await supabase.from('channels').select('*');
      if (ch) setChannels(ch);
      
      const { data: us } = await supabase.from('users').select('*');
      if (us) setUsers(us);
      else setUsers([{id: user.id, name: user.user_metadata?.name || 'Eu'}]);
    } catch (err) { console.error(err); } finally { setDataLoading(false); }
  }

  async function handleCreateChannel({ name, isPrivate }) {
    try {
      const { data, error } = await supabase.from('channels').insert([{ name, is_private: isPrivate, created_by: user.id }]).select();
      if (!error && data) {
        setChannels([...channels, data[0]]);
        navigate(`/channel/${data[0].id}`);
      }
    } catch (e) { alert(e.message); }
  }

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="chat-container">
      <Sidebar 
        channels={channels} users={users} conversations={[]}
        onCreateChannel={handleCreateChannel} onStartDM={(id) => navigate(`/dm/${id}`)}
      />
      <main className="chat-main">
        <Routes>
          <Route path="/" element={<WelcomeView />} />
          <Route path="/channel/:channelId" element={<ChannelView channels={channels} />} />
          <Route path="/dm/:userId" element={<DirectMessageView users={users} />} />
          
          {/* --- AQUI ESTAVA A CONFUSÃO, AGORA ESTÁ CERTO: --- */}
          <Route path="/comunicados" element={<Announcements />} /> 
          <Route path="/comunicados/:id" element={<AnnouncementEditor />} />
          
          <Route path="/tags" element={<Tags />} />
          <Route path="/publico" element={<Audience />} />
        </Routes>
      </main>
    </div>
  );
}