import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Listar usuários da organização
router.get('/', authenticate, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        organizationId: req.user.organizationId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        status: true,
        statusMessage: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json(users);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// Buscar usuário por ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user.organizationId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        status: true,
        statusMessage: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(user);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// Atualizar perfil
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, avatar, statusMessage } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(avatar !== undefined && { avatar }),
        ...(statusMessage !== undefined && { statusMessage }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        status: true,
        statusMessage: true,
        role: true,
      },
    });

    // Notificar outros usuários sobre a atualização
    const io = req.app.get('io');
    io.to(`org:${req.user.organizationId}`).emit('user:updated', user);

    res.json(user);
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

// Atualizar status
router.put('/status', authenticate, async (req, res) => {
  try {
    const { status, statusMessage } = req.body;

    const validStatuses = ['online', 'offline', 'away', 'busy'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(status && { status }),
        ...(statusMessage !== undefined && { statusMessage }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        status: true,
        statusMessage: true,
        role: true,
      },
    });

    // Notificar outros usuários sobre a mudança de status
    const io = req.app.get('io');
    io.to(`org:${req.user.organizationId}`).emit('user:status', {
      userId: user.id,
      status: user.status,
      statusMessage: user.statusMessage,
    });

    res.json(user);
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// Alterar senha
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

export default router;

