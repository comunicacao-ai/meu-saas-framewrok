import express from 'express';
import { trackEmailOpen, trackLinkClick } from '../services/emailService.js';

const router = express.Router();

// Pixel transparente 1x1 em base64
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

/**
 * GET /api/track/open/:announcementId
 * Registra abertura de e-mail e retorna pixel transparente
 */
router.get('/open/:announcementId', async (req, res) => {
  try {
    const { announcementId } = req.params;
    const { email } = req.query;

    if (email) {
      await trackEmailOpen(announcementId, decodeURIComponent(email), {
        ipAddress: req.ip || req.headers['x-forwarded-for'],
        userAgent: req.headers['user-agent'],
        referrer: req.headers['referer'],
      });
    }
  } catch (error) {
    console.error('Erro ao rastrear abertura:', error);
  }

  // Sempre retorna o pixel, mesmo em caso de erro
  res.set({
    'Content-Type': 'image/gif',
    'Content-Length': TRACKING_PIXEL.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
  res.send(TRACKING_PIXEL);
});

/**
 * GET /api/track/click/:trackingCode
 * Registra clique e redireciona para URL original
 */
router.get('/click/:trackingCode', async (req, res) => {
  try {
    const { trackingCode } = req.params;
    const { email } = req.query;

    const result = await trackLinkClick(
      trackingCode,
      email ? decodeURIComponent(email) : 'unknown',
      {
        ipAddress: req.ip || req.headers['x-forwarded-for'],
        userAgent: req.headers['user-agent'],
        referrer: req.headers['referer'],
      }
    );

    if (result.success && result.originalUrl) {
      return res.redirect(302, result.originalUrl);
    }

    // Fallback - redireciona para página padrão
    res.redirect(302, process.env.FRONTEND_URL || 'http://localhost:5173');
  } catch (error) {
    console.error('Erro ao rastrear clique:', error);
    res.redirect(302, process.env.FRONTEND_URL || 'http://localhost:5173');
  }
});

/**
 * POST /api/track/webhook
 * Webhook do Resend para eventos de e-mail
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = JSON.parse(req.body.toString());
    
    console.log('Webhook Resend:', event.type, event.data);

    // Processar diferentes tipos de eventos
    // Implementar conforme necessidade: delivered, bounced, complained, etc.

    res.json({ received: true });
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(400).json({ error: 'Webhook inválido' });
  }
});

export default router;

