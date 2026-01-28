import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Chat from './pages/Chat';
import Feedback from './pages/Feedback';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/feedback/:campaignId/:contactId/:score" element={<Feedback />} />
        <Route path="/*" element={<Chat />} />
      </Routes>
    </BrowserRouter>
  );
}