import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer({ dest: 'uploads/' }); // Pasta temporária para o arquivo

router.post('/upload', upload.single('file'), async (req, res) => {
  const { announcementId, organizationId } = req.body;
  const results = [];

  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }

  // Lendo o arquivo CSV
  fs.createReadStream(req.file.path)
    .pipe(csv(['name', 'email'])) // Espera colunas "name" e "email"
    .on('data', (data) => results.push({
      ...data,
      announcementId,
      status: 'pending'
    }))
    .on('end', async () => {
      try {
        // Salva todos no banco de dados de uma vez
        await prisma.announcementRecipient.createMany({
          data: results,
          skipDuplicates: true, // Não duplica se o e-mail já existir no mesmo anúncio
        });

        // Apaga o arquivo temporário
        fs.unlinkSync(req.file.path);

        res.json({ message: `${results.length} contatos importados com sucesso!` });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao salvar contatos no banco.' });
      }
    });
});

export default router;