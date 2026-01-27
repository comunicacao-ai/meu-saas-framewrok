import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Listar mensagens de um canal
router.get('/channel/:channelId', authenticate, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { cursor, limit = 50 } = req.query;

    // Verificar se usuário é membro do canal
    const membership = await prisma.channelMember.findFirst({
      where: {
        channelId,
        userId: req.user.id,
      },
    });

    const channel = await prisma.channel.findFirst({
      where: {
        id: channelId,
        organizationId: req.user.organizationId,
      },
    });

    if (!channel) {
      return res.status(404).json({ error: 'Canal não encontrado' });
    }

    if (channel.isPrivate && !membership) {
      return res.status(403).json({ error: 'Sem acesso a este canal' });
    }

    const messages = await prisma.message.findMany({
      where: {
        channelId,
        parentId: null, // Apenas mensagens principais, não threads
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            status: true,
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: parseInt(limit),
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    res.json(messages.reverse());
  } catch (error) {
    console.error('Erro ao listar mensagens:', error);
    res.status(500).json({ error: 'Erro ao listar mensagens' });
  }
});

// Criar mensagem
router.post('/', authenticate, async (req, res) => {
  try {
    const { content, channelId, parentId } = req.body;

    // Verificar se usuário é membro do canal
    const membership = await prisma.channelMember.findFirst({
      where: {
        channelId,
        userId: req.user.id,
      },
    });

    const channel = await prisma.channel.findFirst({
      where: {
        id: channelId,
        organizationId: req.user.organizationId,
      },
    });

    if (!channel) {
      return res.status(404).json({ error: 'Canal não encontrado' });
    }

    if (channel.isPrivate && !membership) {
      return res.status(403).json({ error: 'Sem acesso a este canal' });
    }

    const message = await prisma.message.create({
      data: {
        content,
        channelId,
        userId: req.user.id,
        parentId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            status: true,
          },
        },
        reactions: true,
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    // Emitir via Socket.io
    const io = req.app.get('io');
    io.to(`channel:${channelId}`).emit('message:new', message);

    // Detectar menções e criar notificações
    const mentionRegex = /@(\w+)/g;
    const mentions = content.match(mentionRegex);

    if (mentions) {
      const mentionedNames = mentions.map(m => m.slice(1).toLowerCase());
      const mentionedUsers = await prisma.user.findMany({
        where: {
          organizationId: req.user.organizationId,
          name: {
            in: mentionedNames,
          },
        },
      });

      for (const mentionedUser of mentionedUsers) {
        if (mentionedUser.id !== req.user.id) {
          await prisma.notification.create({
            data: {
              type: 'mention',
              title: 'Você foi mencionado',
              content: `${req.user.name} mencionou você em #${channel.name}`,
              userId: mentionedUser.id,
              data: JSON.stringify({
                channelId,
                messageId: message.id,
              }),
            },
          });

          io.to(`user:${mentionedUser.id}`).emit('notification:new', {
            type: 'mention',
            title: 'Você foi mencionado',
            content: `${req.user.name} mencionou você em #${channel.name}`,
          });
        }
      }
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Erro ao criar mensagem:', error);
    res.status(500).json({ error: 'Erro ao criar mensagem' });
  }
});

// Atualizar mensagem
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { content } = req.body;

    const message = await prisma.message.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!message) {
      return res.status(404).json({ error: 'Mensagem não encontrada ou sem permissão' });
    }

    const updatedMessage = await prisma.message.update({
      where: { id: req.params.id },
      data: {
        content,
        edited: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            status: true,
          },
        },
        reactions: true,
      },
    });

    const io = req.app.get('io');
    io.to(`channel:${message.channelId}`).emit('message:updated', updatedMessage);

    res.json(updatedMessage);
  } catch (error) {
    console.error('Erro ao atualizar mensagem:', error);
    res.status(500).json({ error: 'Erro ao atualizar mensagem' });
  }
});

// Deletar mensagem
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const message = await prisma.message.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!message && req.user.role !== 'admin') {
      return res.status(404).json({ error: 'Mensagem não encontrada ou sem permissão' });
    }

    const deletedMessage = await prisma.message.delete({
      where: { id: req.params.id },
    });

    const io = req.app.get('io');
    io.to(`channel:${deletedMessage.channelId}`).emit('message:deleted', {
      id: deletedMessage.id,
      channelId: deletedMessage.channelId,
    });

    res.json({ message: 'Mensagem deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar mensagem:', error);
    res.status(500).json({ error: 'Erro ao deletar mensagem' });
  }
});

// Adicionar reação
router.post('/:id/reactions', authenticate, async (req, res) => {
  try {
    const { emoji } = req.body;

    const message = await prisma.message.findUnique({
      where: { id: req.params.id },
    });

    if (!message) {
      return res.status(404).json({ error: 'Mensagem não encontrada' });
    }

    // Verificar se já existe a reação
    const existingReaction = await prisma.reaction.findFirst({
      where: {
        messageId: req.params.id,
        userId: req.user.id,
        emoji,
      },
    });

    if (existingReaction) {
      // Remover reação
      await prisma.reaction.delete({
        where: { id: existingReaction.id },
      });
    } else {
      // Adicionar reação
      await prisma.reaction.create({
        data: {
          emoji,
          messageId: req.params.id,
          userId: req.user.id,
        },
      });
    }

    // Buscar reações atualizadas
    const reactions = await prisma.reaction.findMany({
      where: { messageId: req.params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const io = req.app.get('io');
    io.to(`channel:${message.channelId}`).emit('message:reactions', {
      messageId: req.params.id,
      reactions,
    });

    res.json(reactions);
  } catch (error) {
    console.error('Erro ao adicionar reação:', error);
    res.status(500).json({ error: 'Erro ao adicionar reação' });
  }
});

// Buscar mensagens
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q, channelId } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Termo de busca muito curto' });
    }

    const messages = await prisma.message.findMany({
      where: {
        content: {
          contains: q,
        },
        channel: {
          organizationId: req.user.organizationId,
          ...(channelId && { id: channelId }),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        channel: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    res.json(messages);
  } catch (error) {
    console.error('Erro na busca:', error);
    res.status(500).json({ error: 'Erro ao buscar mensagens' });
  }
});

export default router;

