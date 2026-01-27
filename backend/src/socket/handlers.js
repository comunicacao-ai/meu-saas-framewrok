import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function setupSocketHandlers(io) {
  // Middleware de autenticação
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Token não fornecido'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          name: true,
          email: true,
          organizationId: true,
          status: true,
        },
      });

      if (!user) {
        return next(new Error('Usuário não encontrado'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    console.log(`✅ ${user.name} conectou (${socket.id})`);

    // Entrar nas salas do usuário
    socket.join(`user:${user.id}`);
    socket.join(`org:${user.organizationId}`);

    // Atualizar status para online
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'online' },
    });

    // Notificar outros usuários sobre o status online
    socket.to(`org:${user.organizationId}`).emit('user:status', {
      userId: user.id,
      status: 'online',
    });

    // Entrar nos canais do usuário
    const memberships = await prisma.channelMember.findMany({
      where: { userId: user.id },
      select: { channelId: true },
    });

    memberships.forEach(({ channelId }) => {
      socket.join(`channel:${channelId}`);
    });

    // Handlers de eventos

    // Entrar em um canal
    socket.on('channel:join', async (channelId) => {
      socket.join(`channel:${channelId}`);
      console.log(`${user.name} entrou no canal ${channelId}`);
    });

    // Sair de um canal
    socket.on('channel:leave', async (channelId) => {
      socket.leave(`channel:${channelId}`);
      console.log(`${user.name} saiu do canal ${channelId}`);
    });

    // Digitando em canal
    socket.on('typing:start', ({ channelId }) => {
      socket.to(`channel:${channelId}`).emit('typing:start', {
        userId: user.id,
        userName: user.name,
        channelId,
      });
    });

    socket.on('typing:stop', ({ channelId }) => {
      socket.to(`channel:${channelId}`).emit('typing:stop', {
        userId: user.id,
        channelId,
      });
    });

    // Digitando em DM
    socket.on('dm:typing:start', ({ receiverId }) => {
      socket.to(`user:${receiverId}`).emit('dm:typing:start', {
        userId: user.id,
        userName: user.name,
      });
    });

    socket.on('dm:typing:stop', ({ receiverId }) => {
      socket.to(`user:${receiverId}`).emit('dm:typing:stop', {
        userId: user.id,
      });
    });

    // Presença - quando abre uma conversa de DM
    socket.on('dm:presence', ({ otherUserId }) => {
      socket.to(`user:${otherUserId}`).emit('dm:presence', {
        userId: user.id,
        online: true,
      });
    });

    // Atualizar status manualmente
    socket.on('status:update', async ({ status, statusMessage }) => {
      await prisma.user.update({
        where: { id: user.id },
        data: { status, statusMessage },
      });

      io.to(`org:${user.organizationId}`).emit('user:status', {
        userId: user.id,
        status,
        statusMessage,
      });
    });

    // Desconexão
    socket.on('disconnect', async () => {
      console.log(`❌ ${user.name} desconectou`);

      // Verificar se o usuário tem outras conexões ativas
      const sockets = await io.in(`user:${user.id}`).fetchSockets();

      if (sockets.length === 0) {
        // Atualizar status para offline
        await prisma.user.update({
          where: { id: user.id },
          data: { status: 'offline' },
        });

        // Notificar outros usuários
        socket.to(`org:${user.organizationId}`).emit('user:status', {
          userId: user.id,
          status: 'offline',
        });
      }
    });
  });

  console.log('🔌 Socket.io handlers configurados');
}

