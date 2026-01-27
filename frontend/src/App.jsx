import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';  // <--- Importamos a página nova
import Chat from './pages/Chat';    // <--- Importamos seu Chat principal

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota Pública: Login */}
        <Route path="/login" element={<Login />} />

        {/* Rotas Privadas: Qualquer coisa que não seja login vai pro Chat */}
        {/* O Chat.jsx já cuida das rotas internas (/comunicados, /tags, etc) */}
        <Route path="/*" element={<Chat />} />
        
      </Routes>
    </BrowserRouter>
  );
}