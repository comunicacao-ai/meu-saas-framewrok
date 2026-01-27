import { Resend } from 'resend';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

/**
 * Transforma o HTML para adicionar tracking
 * - Converte links em links de redirecionamento
 * - Adiciona pixel de tracking para aberturas
 */
export async function prepareEmailForTracking(html, announcementId, recipientEmail) {
  const $ = cheerio.load(html);
  const trackedLinks = [];

  // Transformar todos os links em links de tracking
  $('a[href]').each((index, element) => {
    const originalUrl = $(element).attr('href');
    
    // Ignorar links mailto: e tel:
    if (originalUrl && !originalUrl.startsWith('mailto:') && !originalUrl.startsWith('tel:') && !originalUrl.startsWith('#')) {
      const trackingCode = uuidv4();
      const trackedUrl = `${BASE_URL}/api/track/click/${trackingCode}?email=${encodeURIComponent(recipientEmail)}`;
      
      $(element).attr('href', trackedUrl);
      $(element).attr('data-original-url', originalUrl);
      
      trackedLinks.push({
        announcementId,
        originalUrl,
        trackingCode,
      });
    }
  });

  // Adicionar pixel de tracking para aberturas (imagem invisível 1x1)
  const openTrackingPixel = `<img src="${BASE_URL}/api/track/open/${announcementId}?email=${encodeURIComponent(recipientEmail)}" width="1" height="1" style="display:none;visibility:hidden;" alt="" />`;
  
  $('body').append(openTrackingPixel);

  // Salvar links tracked no banco
  if (trackedLinks.length > 0) {
    await prisma.trackedLink.createMany({
      data: trackedLinks,
      skipDuplicates: true,
    });
  }

  return $.html();
}

/**
 * Envia um e-mail individual com tracking
 */
export async function sendTrackedEmail({
  to,
  subject,
  html,
  announcementId,
  fromName = 'Comunicação Interna',
  fromEmail = 'comunicados@resend.dev', // Usar domínio verificado em produção
}) {
  try {
    // Preparar HTML com tracking
    const trackedHtml = await prepareEmailForTracking(html, announcementId, to);

    // Enviar via Resend
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html: trackedHtml,
      tags: [
        { name: 'announcement_id', value: announcementId },
      ],
    });

    if (error) {
      throw new Error(error.message);
    }

    // Registrar no EmailLog
    const emailLog = await prisma.emailLog.create({
      data: {
        announcementId,
        recipientEmail: to,
        resendId: data.id,
        status: 'sent',
        sentAt: new Date(),
      },
    });

    return { success: true, resendId: data.id, emailLogId: emailLog.id };
  } catch (error) {
    // Registrar falha no EmailLog
    await prisma.emailLog.create({
      data: {
        announcementId,
        recipientEmail: to,
        status: 'failed',
        errorMessage: error.message,
      },
    });

    return { success: false, error: error.message };
  }
}

/**
 * Envia e-mails em lote para um comunicado
 */
export async function sendAnnouncementEmails(announcementId) {
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: {
      recipients: {
        where: { status: 'pending' },
      },
      organization: true,
    },
  });

  if (!announcement) {
    throw new Error('Comunicado não encontrado');
  }

  // Atualizar status do comunicado
  await prisma.announcement.update({
    where: { id: announcementId },
    data: { status: 'sending' },
  });

  const results = {
    total: announcement.recipients.length,
    sent: 0,
    failed: 0,
    errors: [],
  };

  // Enviar e-mails em paralelo (com limite de concorrência)
  const batchSize = 10;
  for (let i = 0; i < announcement.recipients.length; i += batchSize) {
    const batch = announcement.recipients.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (recipient) => {
      const result = await sendTrackedEmail({
        to: recipient.email,
        subject: announcement.subject,
        html: announcement.htmlContent,
        announcementId,
        fromName: announcement.organization.name,
      });

      // Atualizar status do destinatário
      await prisma.announcementRecipient.update({
        where: { id: recipient.id },
        data: { status: result.success ? 'sent' : 'failed' },
      });

      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push({ email: recipient.email, error: result.error });
      }
    });

    await Promise.all(batchPromises);
    
    // Pequeno delay entre batches para não sobrecarregar
    if (i + batchSize < announcement.recipients.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Atualizar status final do comunicado
  await prisma.announcement.update({
    where: { id: announcementId },
    data: {
      status: 'sent',
      sentAt: new Date(),
    },
  });

  return results;
}

/**
 * Registra evento de abertura de e-mail
 */
export async function trackEmailOpen(announcementId, recipientEmail, metadata = {}) {
  try {
    // Criar evento de analytics
    await prisma.analyticsEvent.create({
      data: {
        type: 'open',
        announcementId,
        recipientEmail,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        metadata: JSON.stringify(metadata),
      },
    });

    // Atualizar EmailLog se existir
    await prisma.emailLog.updateMany({
      where: {
        announcementId,
        recipientEmail,
        openedAt: null,
      },
      data: {
        openedAt: new Date(),
      },
    });

    return true;
  } catch (error) {
    console.error('Erro ao registrar abertura:', error);
    return false;
  }
}

/**
 * Registra evento de clique em link
 */
export async function trackLinkClick(trackingCode, recipientEmail, metadata = {}) {
  try {
    // Buscar link original
    const trackedLink = await prisma.trackedLink.findUnique({
      where: { trackingCode },
    });

    if (!trackedLink) {
      return { success: false, originalUrl: null };
    }

    // Incrementar contador de cliques
    await prisma.trackedLink.update({
      where: { trackingCode },
      data: { clickCount: { increment: 1 } },
    });

    // Criar evento de analytics
    await prisma.analyticsEvent.create({
      data: {
        type: 'click',
        announcementId: trackedLink.announcementId,
        recipientEmail,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        metadata: JSON.stringify({
          ...metadata,
          originalUrl: trackedLink.originalUrl,
          trackingCode,
        }),
      },
    });

    // Atualizar EmailLog se existir
    await prisma.emailLog.updateMany({
      where: {
        announcementId: trackedLink.announcementId,
        recipientEmail,
        clickedAt: null,
      },
      data: {
        clickedAt: new Date(),
      },
    });

    return { success: true, originalUrl: trackedLink.originalUrl };
  } catch (error) {
    console.error('Erro ao registrar clique:', error);
    return { success: false, originalUrl: null };
  }
}

/**
 * Obtém estatísticas de um comunicado
 */
export async function getAnnouncementStats(announcementId) {
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: {
      _count: {
        select: {
          recipients: true,
          emailLogs: true,
          analytics: true,
        },
      },
    },
  });

  if (!announcement) {
    return null;
  }

  // Contar por status
  const recipientStats = await prisma.announcementRecipient.groupBy({
    by: ['status'],
    where: { announcementId },
    _count: { status: true },
  });

  // Contar eventos por tipo
  const eventStats = await prisma.analyticsEvent.groupBy({
    by: ['type'],
    where: { announcementId },
    _count: { type: true },
  });

  // E-mails abertos (únicos)
  const uniqueOpens = await prisma.analyticsEvent.findMany({
    where: {
      announcementId,
      type: 'open',
    },
    distinct: ['recipientEmail'],
    select: { recipientEmail: true },
  });

  // E-mails clicados (únicos)
  const uniqueClicks = await prisma.analyticsEvent.findMany({
    where: {
      announcementId,
      type: 'click',
    },
    distinct: ['recipientEmail'],
    select: { recipientEmail: true },
  });

  // Links mais clicados
  const topLinks = await prisma.trackedLink.findMany({
    where: { announcementId },
    orderBy: { clickCount: 'desc' },
    take: 10,
  });

  const totalRecipients = announcement._count.recipients;
  const totalOpens = uniqueOpens.length;
  const totalClicks = uniqueClicks.length;

  return {
    announcement: {
      id: announcement.id,
      title: announcement.title,
      subject: announcement.subject,
      status: announcement.status,
      sentAt: announcement.sentAt,
    },
    recipients: {
      total: totalRecipients,
      byStatus: recipientStats.reduce((acc, s) => {
        acc[s.status] = s._count.status;
        return acc;
      }, {}),
    },
    engagement: {
      opens: {
        total: totalOpens,
        rate: totalRecipients > 0 ? ((totalOpens / totalRecipients) * 100).toFixed(2) : 0,
      },
      clicks: {
        total: totalClicks,
        rate: totalRecipients > 0 ? ((totalClicks / totalRecipients) * 100).toFixed(2) : 0,
        clickToOpenRate: totalOpens > 0 ? ((totalClicks / totalOpens) * 100).toFixed(2) : 0,
      },
    },
    events: eventStats.reduce((acc, e) => {
      acc[e.type] = e._count.type;
      return acc;
    }, {}),
    topLinks,
  };
}

