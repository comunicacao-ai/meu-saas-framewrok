import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

// --- IMPORTAÇÃO DAS ROTAS ---
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import channelRoutes from './routes/channels.js';
import messageRoutes from './routes/messages.js';
import dmRoutes from './routes/directMessages.js';
import announcementRoutes from './routes/announcements.js';
import emailRoutes from './routes/emails.js'; // <--- O IMPORTANTE: Rotas de E-mail
import trackingRoutes from './routes/tracking.js';
import recipientRoutes from './routes/recipients.js'; // Rotas de Upload de Público

// Importação do Socket
import { setupSocketHandlers } from './socket/handlers.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// --- CONFIGURAÇÃO DO SOCKET.IO ---
const io = new Server(httpServer, {
  cors: {
    // Aceita tanto localhost quanto 127.0.0.1 para evitar erros de conexão
    origin: [
      'http://localhost:5173', 
      'http://127.0.0.1:5173',
      process.env.FRONTEND_URL
    ].filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// --- MIDDLEWARES ---
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://127.0.0.1:5173',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
}));

// Aumentamos o limite para 50mb para aceitar planilhas grandes e imagens nos e-mails
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Disponibilizar o 'io' para usar dentro das rotas (para notificações em tempo real)
app.set('io', io);

// --- REGISTRO DAS ROTAS (API) ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/emails', emailRoutes); // <--- AQUI: Ativando a rota de envio de e-mails
app.use('/api/track', trackingRoutes);
app.use('/api/recipients', recipientRoutes);

// Rota de Health Check (para verificar se o servidor está vivo)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Inicializa os handlers do Socket.io
setupSocketHandlers(io);

// --- INICIALIZAÇÃO DO SERVIDOR ---
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log('');
  console.log('🚀 ================================');
  console.log('   COMUNICAÇÃO INTERNA - BACKEND');
  console.log('🚀 ================================');
  console.log('');
  console.log(`📡 Servidor rodando na porta ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
  console.log(`📧 Sistema de E-mails: ATIVO (/api/emails)`);
  console.log('');
});