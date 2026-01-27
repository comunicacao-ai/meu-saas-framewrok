import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Listar canais do usuário
router.get('/', authenticate, async (req, res) => {
  try {
    const channels = await prisma.channel.findMany({
      where: {
        organizationId: req.user.organizationId,
        OR: [
          { isPrivate: false },
          {
            members: {
              some: {
                userId: req.user.id,
              },
            },
          },
        ],
      },
      include: {
        members: {
          select: {
            userId: true,
            role: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json(channels);
  } catch (error) {
    console.error('Erro ao listar canais:', error);
    res.status(500).json({ error: 'Erro ao listar canais' });
  }
});

// Buscar canal por ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const channel = await prisma.channel.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user.organizationId,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!channel) {
      return res.status(404).json({ error: 'Canal não encontrado' });
    }

    res.json(channel);
  } catch (error) {
    console.error('Erro ao buscar canal:', error);
    res.status(500).json({ error: 'Erro ao buscar canal' });
  }
});

// Criar canal
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, isPrivate, memberIds } = req.body;

    // Verificar se já existe canal com esse nome
    const existingChannel = await prisma.channel.findFirst({
      where: {
        name: name.toLowerCase().replace(/\s+/g, '-'),
        organizationId: req.user.organizationId,
      },
    });

    if (existingChannel) {
      return res.status(400).json({ error: 'Já existe um canal com esse nome' });
    }

    const channel = await prisma.channel.create({
      data: {
        name: name.toLowerCase().replace(/\s+/g, '-'),
        description,
        isPrivate: isPrivate || false,
        organizationId: req.user.organizationId,
        members: {
          create: [
            { userId: req.user.id, role: 'admin' },
            ...(memberIds || [])
              .filter(id => id !== req.user.id)
              .map(id => ({ userId: id, role: 'member' })),
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                status: true,
              },
            },
          },
        },
      },
    });

    // Notificar sobre novo canal
    const io = req.app.get('io');
    
    if (!isPrivate) {
      io.to(`org:${req.user.organizationId}`).emit('channel:created', channel);
    } else {
      // Notificar apenas membros do canal privado
      channel.members.forEach(member => {
        io.to(`user:${member.userId}`).emit('channel:created', channel);
      });
    }

    res.status(201).json(channel);
  } catch (error) {
    console.error('Erro ao criar canal:', error);
    res.status(500).json({ error: 'Erro ao criar canal' });
  }
});

// Atualizar canal
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, description } = req.body;

    // Verificar se usuário é admin do canal
    const membership = await prisma.channelMember.findFirst({
      where: {
        channelId: req.params.id,
        userId: req.user.id,
        role: 'admin',
      },
    });

    if (!membership && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Sem permissão para editar este canal' });
    }

    const channel = await prisma.channel.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name: name.toLowerCase().replace(/\s+/g, '-') }),
        ...(description !== undefined && { description }),
      },
    });

    const io = req.app.get('io');
    io.to(`channel:${channel.id}`).emit('channel:updated', channel);

    res.json(channel);
  } catch (error) {
    console.error('Erro ao atualizar canal:', error);
    res.status(500).json({ error: 'Erro ao atualizar canal' });
  }
});

// Entrar em um canal
router.post('/:id/join', authenticate, async (req, res) => {
  try {
    const channel = await prisma.channel.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user.organizationId,
        isPrivate: false,
      },
    });

    if (!channel) {
      return res.status(404).json({ error: 'Canal não encontrado ou é privado' });
    }

    // Verificar se já é membro
    const existingMember = await prisma.channelMember.findFirst({
      where: {
        channelId: req.params.id,
        userId: req.user.id,
      },
    });

    if (existingMember) {
      return res.status(400).json({ error: 'Você já é membro deste canal' });
    }

    await prisma.channelMember.create({
      data: {
        channelId: req.params.id,
        userId: req.user.id,
      },
    });

    const io = req.app.get('io');
    io.to(`channel:${req.params.id}`).emit('channel:member_joined', {
      channelId: req.params.id,
      userId: req.user.id,
      userName: req.user.name,
    });

    res.json({ message: 'Entrou no canal com sucesso' });
  } catch (error) {
    console.error('Erro ao entrar no canal:', error);
    res.status(500).json({ error: 'Erro ao entrar no canal' });
  }
});

// Sair de um canal
router.post('/:id/leave', authenticate, async (req, res) => {
  try {
    await prisma.channelMember.deleteMany({
      where: {
        channelId: req.params.id,
        userId: req.user.id,
      },
    });

    const io = req.app.get('io');
    io.to(`channel:${req.params.id}`).emit('channel:member_left', {
      channelId: req.params.id,
      userId: req.user.id,
    });

    res.json({ message: 'Saiu do canal com sucesso' });
  } catch (error) {
    console.error('Erro ao sair do canal:', error);
    res.status(500).json({ error: 'Erro ao sair do canal' });
  }
});

// Adicionar membro ao canal
router.post('/:id/members', authenticate, async (req, res) => {
  try {
    const { userId } = req.body;

    // Verificar permissão
    const membership = await prisma.channelMember.findFirst({
      where: {
        channelId: req.params.id,
        userId: req.user.id,
        role: 'admin',
      },
    });

    if (!membership && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Sem permissão para adicionar membros' });
    }

    await prisma.channelMember.create({
      data: {
        channelId: req.params.id,
        userId,
      },
    });

    const newMember = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, avatar: true, status: true },
    });

    const io = req.app.get('io');
    io.to(`channel:${req.params.id}`).emit('channel:member_joined', {
      channelId: req.params.id,
      user: newMember,
    });

    // Notificar o usuário adicionado
    io.to(`user:${userId}`).emit('channel:invited', { channelId: req.params.id });

    res.json({ message: 'Membro adicionado com sucesso' });
  } catch (error) {
    console.error('Erro ao adicionar membro:', error);
    res.status(500).json({ error: 'Erro ao adicionar membro' });
  }
});

export default router;

