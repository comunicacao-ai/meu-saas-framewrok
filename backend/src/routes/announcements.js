import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/announcements
 * Lista todos os comunicados da organização
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const where = {
      organizationId: req.user.organizationId,
      ...(status && { status }),
    };

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, name: true, avatar: true },
          },
          _count: {
            select: { recipients: true, emailLogs: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.announcement.count({ where }),
    ]);

    res.json({
      data: announcements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Erro ao listar comunicados:', error);
    res.status(500).json({ error: 'Erro ao listar comunicados' });
  }
});

// Rota para pegar um único comunicado pelo ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include: { 
        recipients: true, // <--- O SEGREDO: Isso traz a lista de pessoas!
      }
    });

    if (!announcement) {
      return res.status(404).json({ error: 'Comunicado não encontrado.' });
    }

    res.json(announcement);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar comunicado.' });
  }
});

/**
 * POST /api/announcements
 * Cria um novo comunicado
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, subject, htmlContent, jsonContent } = req.body;

    if (!title || !subject) {
      return res.status(400).json({ error: 'Título e assunto são obrigatórios' });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        subject,
        htmlContent: htmlContent || '',
        jsonContent: jsonContent ? JSON.stringify(jsonContent) : null,
        organizationId: req.user.organizationId,
        createdById: req.user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    res.status(201).json(announcement);
  } catch (error) {
    console.error('Erro ao criar comunicado:', error);
    res.status(500).json({ error: 'Erro ao criar comunicado' });
  }
});

/**
 * PUT /api/announcements/:id
 * Atualiza um comunicado
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { title, subject, htmlContent, jsonContent, status } = req.body;

    const existing = await prisma.announcement.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user.organizationId,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Comunicado não encontrado' });
    }

    if (existing.status === 'sent') {
      return res.status(400).json({ error: 'Não é possível editar um comunicado já enviado' });
    }

    const announcement = await prisma.announcement.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(subject && { subject }),
        ...(htmlContent !== undefined && { htmlContent }),
        ...(jsonContent !== undefined && { jsonContent: JSON.stringify(jsonContent) }),
        ...(status && { status }),
      },
      include: {
        createdBy: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    res.json(announcement);
  } catch (error) {
    console.error('Erro ao atualizar comunicado:', error);
    res.status(500).json({ error: 'Erro ao atualizar comunicado' });
  }
});

/**
 * DELETE /api/announcements/:id
 * Deleta um comunicado
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const existing = await prisma.announcement.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user.organizationId,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Comunicado não encontrado' });
    }

    await prisma.announcement.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Comunicado deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar comunicado:', error);
    res.status(500).json({ error: 'Erro ao deletar comunicado' });
  }
});

/**
 * POST /api/announcements/:id/recipients
 * Adiciona destinatários a um comunicado
 */
router.post('/:id/recipients', authenticate, async (req, res) => {
  try {
    const { recipients, addAllUsers } = req.body;

    const announcement = await prisma.announcement.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user.organizationId,
      },
    });

    if (!announcement) {
      return res.status(404).json({ error: 'Comunicado não encontrado' });
    }

    if (announcement.status === 'sent') {
      return res.status(400).json({ error: 'Não é possível editar um comunicado já enviado' });
    }

    let recipientsToAdd = [];

    // Adicionar todos os usuários da organização
    if (addAllUsers) {
      const users = await prisma.user.findMany({
        where: { organizationId: req.user.organizationId },
        select: { id: true, email: true, name: true },
      });

      recipientsToAdd = users.map(u => ({
        announcementId: req.params.id,
        email: u.email,
        name: u.name,
        userId: u.id,
      }));
    } else if (recipients && Array.isArray(recipients)) {
      // Adicionar lista específica de destinatários
      recipientsToAdd = recipients.map(r => ({
        announcementId: req.params.id,
        email: r.email,
        name: r.name || null,
        userId: r.userId || null,
      }));
    }

    if (recipientsToAdd.length === 0) {
      return res.status(400).json({ error: 'Nenhum destinatário válido' });
    }

    // Usar createMany com skipDuplicates para evitar duplicados
    await prisma.announcementRecipient.createMany({
      data: recipientsToAdd,
      skipDuplicates: true,
    });

    const count = await prisma.announcementRecipient.count({
      where: { announcementId: req.params.id },
    });

    res.json({
      message: 'Destinatários adicionados',
      totalRecipients: count,
    });
  } catch (error) {
    console.error('Erro ao adicionar destinatários:', error);
    res.status(500).json({ error: 'Erro ao adicionar destinatários' });
  }
});

/**
 * DELETE /api/announcements/:id/recipients
 * Remove destinatários de um comunicado
 */
router.delete('/:id/recipients', authenticate, async (req, res) => {
  try {
    const { emails, clearAll } = req.body;

    const announcement = await prisma.announcement.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user.organizationId,
      },
    });

    if (!announcement) {
      return res.status(404).json({ error: 'Comunicado não encontrado' });
    }

    if (announcement.status === 'sent') {
      return res.status(400).json({ error: 'Não é possível editar um comunicado já enviado' });
    }

    if (clearAll) {
      await prisma.announcementRecipient.deleteMany({
        where: { announcementId: req.params.id },
      });
    } else if (emails && Array.isArray(emails)) {
      await prisma.announcementRecipient.deleteMany({
        where: {
          announcementId: req.params.id,
          email: { in: emails },
        },
      });
    }

    const count = await prisma.announcementRecipient.count({
      where: { announcementId: req.params.id },
    });

    res.json({
      message: 'Destinatários removidos',
      totalRecipients: count,
    });
  } catch (error) {
    console.error('Erro ao remover destinatários:', error);
    res.status(500).json({ error: 'Erro ao remover destinatários' });
  }
});

/**
 * POST /api/announcements/:id/duplicate
 * Duplica um comunicado
 */
router.post('/:id/duplicate', authenticate, async (req, res) => {
  try {
    const original = await prisma.announcement.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user.organizationId,
      },
    });

    if (!original) {
      return res.status(404).json({ error: 'Comunicado não encontrado' });
    }

    const duplicate = await prisma.announcement.create({
      data: {
        title: `${original.title} (cópia)`,
        subject: original.subject,
        htmlContent: original.htmlContent,
        jsonContent: original.jsonContent,
        organizationId: req.user.organizationId,
        createdById: req.user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    res.status(201).json(duplicate);
  } catch (error) {
    console.error('Erro ao duplicar comunicado:', error);
    res.status(500).json({ error: 'Erro ao duplicar comunicado' });
  }
});

export default router;

// ============================================================
// --- ROTAS DE PÚBLICO (CONTATOS) ---
// Como estamos dentro de announcements.js, a URL será:
// /api/announcements/contacts
// ============================================================

/**
 * GET /api/announcements/contacts
 * Lista todos os contatos
 */
router.get('/contacts', authenticate, async (req, res) => {
  try {
    const contacts = await prisma.contact.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(contacts);
  } catch (error) {
    console.error('Erro ao listar contatos:', error);
    res.status(500).json({ error: 'Erro ao buscar contatos' });
  }
});

/**
 * POST /api/announcements/contacts
 * Cria um novo contato
 */
router.post('/contacts', authenticate, async (req, res) => {
  const { name, email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'E-mail é obrigatório' });
  }

  try {
    // Verifica se já existe
    const existing = await prisma.contact.findUnique({
      where: { email }
    });

    if (existing) {
      return res.status(400).json({ error: 'E-mail já cadastrado' });
    }

    const contact = await prisma.contact.create({
      data: { name, email }
    });

    res.status(201).json(contact);
  } catch (error) {
    console.error('Erro ao criar contato:', error);
    res.status(500).json({ error: 'Erro ao criar contato' });
  }
});

/**
 * DELETE /api/announcements/contacts/:id
 * Remove um contato
 */
router.delete('/contacts/:id', authenticate, async (req, res) => {
  try {
    await prisma.contact.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Contato removido com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar contato:', error);
    res.status(500).json({ error: 'Erro ao deletar contato' });
  }
});

// --- A LINHA ABAIXO JÁ EXISTE NO SEU ARQUIVO, COLE O CÓDIGO ACIMA DELA ---
// export default router;