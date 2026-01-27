import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  sendTrackedEmail,
  sendAnnouncementEmails,
  getAnnouncementStats,
} from '../services/emailService.js';

const router = express.Router();
const prisma = new PrismaClient();

// ==============================================================================
// 1. ROTA DE TESTE (Botão "Enviar teste")
// ==============================================================================
router.post('/send-test', authenticate, async (req, res) => {
  try {
    const { announcementId } = req.body;
    const user = req.user; // Usuário logado (você)

    // Busca o comunicado no banco
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId }
    });

    if (!announcement) {
      return res.status(404).json({ error: 'Comunicado não encontrado.' });
    }

    // Envia apenas para quem está logado (teste seguro)
    await sendTrackedEmail({
      to: user.email, 
      subject: `[TESTE] ${announcement.subject}`,
      html: announcement.htmlContent,
      announcementId: announcement.id,
      recipientId: null // Testes não geram estatísticas de clique
    });

    res.json({ message: `E-mail de teste enviado para ${user.email}!` });
  } catch (error) {
    console.error('Erro no teste de e-mail:', error);
    res.status(500).json({ error: 'Falha ao enviar e-mail de teste.' });
  }
});

// ==============================================================================
// 2. ROTA DE ENVIO REAL (Botão "Enviar para X pessoas")
// ==============================================================================
router.post('/send/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params; // Pega o ID da URL (ex: .../send/bece5d71-...)

    // Busca o comunicado e garante que ele tem destinatários
    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include: { recipients: true }
    });

    if (!announcement) {
      return res.status(404).json({ error: 'Comunicado não encontrado.' });
    }

    if (announcement.recipients.length === 0) {
      return res.status(400).json({ error: 'Este comunicado não tem público vinculado. Vá em "Gestão de Público" e suba uma planilha primeiro.' });
    }

    // Dispara o envio em massa (Resend)
    const result = await sendAnnouncementEmails(announcement);

    // Atualiza o status no banco para "Enviado"
    await prisma.announcement.update({
      where: { id },
      data: { 
        status: 'sent', 
        sentAt: new Date() 
      }
    });

    res.json({ 
      message: `Disparo iniciado com sucesso para ${announcement.recipients.length} pessoas!`,
      details: result 
    });

  } catch (error) {
    console.error('Erro no disparo em massa:', error);
    res.status(500).json({ error: 'Erro crítico ao processar envio.' });
  }
});

// ==============================================================================
// 3. ESTATÍSTICAS (Para os gráficos de abertura)
// ==============================================================================
router.get('/stats/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const stats = await getAnnouncementStats(id);
    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar stats:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas.' });
  }
});

export default router;