import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedAdminPassword = await bcrypt.hash('123456', 10)

  // 1. Garantir que a Organização e o Admin existem
  const org = await prisma.organization.upsert({
    where: { slug: 'minha-empresa' },
    update: {},
    create: { name: 'Minha Empresa SaaS', slug: 'minha-empresa' },
  })

  await prisma.user.upsert({
    where: { email: 'admin@teste.com' },
    update: { password: hashedAdminPassword },
    create: {
      email: 'admin@teste.com',
      password: hashedAdminPassword,
      name: 'Admin Mestre',
      role: 'admin',
      organizationId: org.id,
    },
  })

  console.log('✅ Admin e Organização confirmados.');

  // 2. Criar Público de Teste vinculado ao comunicado
  console.log('👥 Preparando público de teste...');

  // Busca o primeiro comunicado que você salvou no navegador
  const anuncio = await prisma.announcement.findFirst();

  if (anuncio) {
    const pessoasDeTeste = [
      { email: 'seu-email-aqui@exemplo.com', name: 'Seu Nome Teste' }, // <--- COLOQUE SEU E-MAIL REAL AQUI
      { email: 'contato1@teste.com', name: 'João Silva' },
      { email: 'contato2@teste.com', name: 'Maria Souza' }
    ];

    // Limpa registros antigos para evitar duplicidade
    await prisma.announcementRecipient.deleteMany({
      where: { announcementId: anuncio.id }
    });

    // Insere o novo público
    await prisma.announcementRecipient.createMany({
      data: pessoasDeTeste.map(p => ({
        email: p.email,
        name: p.name,
        announcementId: anuncio.id,
        status: 'pending'
      }))
    });

    console.log(`🚀 Sucesso! ${pessoasDeTeste.length} pessoas vinculadas ao comunicado: "${anuncio.title}"`);
  } else {
    console.log('⚠️ IMPORTANTE: Você precisa criar e SALVAR um comunicado no sistema (navegador) antes de rodar este comando!');
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });