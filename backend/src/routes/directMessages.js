import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Listar conversas de DM
router.get('/conversations', authenticate, async (req, res) => {
  try {
    // Buscar usuários com quem teve conversa
    const sentTo = await prisma.directMessage.findMany({
      where: { senderId: req.user.id },
      select: { receiverId: true },
      distinct: ['receiverId'],
    });

    const receivedFrom = await prisma.directMessage.findMany({
      where: { receiverId: req.user.id },
      select: { senderId: true },
      distinct: ['senderId'],
    });

    const userIds = [
      ...new Set([
        ...sentTo.map(m => m.receiverId),
        ...receivedFrom.map(m => m.senderId),
      ]),
    ];

    const conversations = await Promise.all(
      userIds.map(async userId => {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            avatar: true,
            status: true,
          },
        });

        const lastMessage = await prisma.directMessage.findFirst({
          where: {
            OR: [
              { senderId: req.user.id, receiverId: userId },
              { senderId: userId, receiverId: req.user.id },
            ],
          },
          orderBy: { createdAt: 'desc' },
        });

        const unreadCount = await prisma.directMessage.count({
          where: {
            senderId: userId,
            receiverId: req.user.id,
            read: false,
          },
        });

        return {
          user,
          lastMessage,
          unreadCount,
        };
      })
    );

    // Ordenar por última mensagem
    conversations.sort((a, b) => {
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
    });

    res.json(conversations);
  } catch (error) {
    console.error('Erro ao listar conversas:', error);
    res.status(500).json({ error: 'Erro ao listar conversas' });
  }
});

// Listar mensagens de uma conversa
router.get('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { cursor, limit = 50 } = req.query;

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: req.user.id, receiverId: userId },
          { senderId: userId, receiverId: req.user.id },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    // Marcar mensagens como lidas
    await prisma.directMessage.updateMany({
      where: {
        senderId: userId,
        receiverId: req.user.id,
        read: false,
      },
      data: { read: true },
    });

    res.json(messages.reverse());
  } catch (error) {
    console.error('Erro ao listar mensagens:', error);
    res.status(500).json({ error: 'Erro ao listar mensagens' });
  }
});

// Enviar mensagem direta
router.post('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { content } = req.body;

    // Verificar se o destinatário existe e é da mesma organização
    const receiver = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: req.user.organizationId,
      },
    });

    if (!receiver) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const message = await prisma.directMessage.create({
      data: {
        content,
        senderId: req.user.id,
        receiverId: userId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            status: true,
          },
        },
      },
    });

    // Emitir via Socket.io
    const io = req.app.get('io');
    
    // Enviar para o destinatário
    io.to(`user:${userId}`).emit('dm:new', message);
    
    // Enviar para o remetente também (para sincronizar outras abas)
    io.to(`user:${req.user.id}`).emit('dm:new', message);

    // Criar notificação para o destinatário
    await prisma.notification.create({
      data: {
        type: 'direct_message',
        title: 'Nova mensagem',
        content: `${req.user.name} enviou uma mensagem`,
        userId,
        data: JSON.stringify({
          senderId: req.user.id,
          messageId: message.id,
        }),
      },
    });

    io.to(`user:${userId}`).emit('notification:new', {
      type: 'direct_message',
      title: 'Nova mensagem',
      content: `${req.user.name} enviou uma mensagem`,
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
});

// Marcar conversa como lida
router.put('/:userId/read', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    await prisma.directMessage.updateMany({
      where: {
        senderId: userId,
        receiverId: req.user.id,
        read: false,
      },
      data: { read: true },
    });

    const io = req.app.get('io');
    io.to(`user:${userId}`).emit('dm:read', {
      readBy: req.user.id,
    });

    res.json({ message: 'Mensagens marcadas como lidas' });
  } catch (error) {
    console.error('Erro ao marcar como lida:', error);
    res.status(500).json({ error: 'Erro ao marcar mensagens como lidas' });
  }
});

export default router;

