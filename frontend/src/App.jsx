import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Chat from './pages/Chat';
import Feedback from './pages/Feedback';
import AnnouncementAnalytics from './pages/AnnouncementAnalytics'; 
import Dashboard from './pages/Dashboard'; // <--- 1. IMPORTAMOS O DASHBOARD

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/feedback/:campaignId/:contactId/:score" element={<Feedback />} />
        
        {/* Rota do Relatório Individual */}
        <Route path="/announcements/:id" element={<AnnouncementAnalytics />} />

        {/* 2. ROTA DO DASHBOARD GERAL 👇 */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* O Chat continua sendo o padrão para o resto */}
        <Route path="/*" element={<Chat />} />
      </Routes>
    </BrowserRouter>
  );
}