const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 1. Configurar onde salvar as imagens
const uploadDir = path.join(__dirname, '../public/uploads'); // Cria pasta public/uploads
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    // Gera um nome único para não substituir imagens com mesmo nome
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); 
  }
});

const upload = multer({ storage: storage });

// 2. IMPORTANTE: Tornar a pasta pública acessível (Senão o link não funciona)
// Adicione esta linha onde você configura o app (perto de app.use(express.json()))
// app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// 3. A Rota de Upload (Copie isso para suas rotas)
// O GrapesJS espera um JSON com { data: [url] }
router.post('/upload', upload.single('files'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Gera o link automático
    // ATENÇÃO: Troque 'http://localhost:3000' pela URL do seu backend se for diferente
    const protocol = req.protocol;
    const host = req.get('host');
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    // Retorna para o GrapesJS
    res.json({ data: [fileUrl] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro no upload' });
  }
});