# 🗄️ Configuração do Supabase

Este guia explica como conectar o sistema ao seu banco PostgreSQL no Supabase.

## 📋 Pré-requisitos

1. Uma conta no [Supabase](https://supabase.com)
2. Um projeto criado no Supabase

## 🔧 Passo a Passo

### 1. Obter as Connection Strings

1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** → **Database**
4. Role até **Connection string**

Você precisará de **duas** connection strings:

#### DATABASE_URL (Pooler/Transaction - porta 6543)
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

#### DIRECT_URL (Direct - porta 5432)
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

### 2. Configurar o arquivo .env

Crie o arquivo `backend/.env`:

```env
DATABASE_URL="postgresql://postgres.xxxxx:SuaSenha@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxxxx:SuaSenha@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

JWT_SECRET="sua-chave-secreta-aqui"
PORT=3001
NODE_ENV=development

RESEND_API_KEY="re_xxxxx"
BASE_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:5173"
```

### 3. Executar as Migrations

```bash
cd backend

# Instalar dependências
npm install

# Gerar cliente Prisma
npm run db:generate

# Aplicar schema no banco (primeira vez)
npm run db:push

# OU criar migration formal
npm run db:migrate:dev --name init

# Popular com dados iniciais
npm run db:seed
```

### 4. Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run db:generate` | Gera o Prisma Client |
| `npm run db:push` | Sincroniza schema sem criar migration |
| `npm run db:migrate:dev` | Cria migration em desenvolvimento |
| `npm run db:migrate:deploy` | Aplica migrations em produção |
| `npm run db:reset` | Reseta banco e reaplica migrations |
| `npm run db:seed` | Popula banco com dados iniciais |
| `npm run db:studio` | Abre Prisma Studio (GUI do banco) |
| `npm run db:setup` | Setup completo (generate + push + seed) |

## 🚀 Deploy em Produção

Para deploy em produção (Vercel, Railway, etc):

1. Configure as variáveis de ambiente no serviço de hospedagem
2. Execute:
```bash
npm run db:migrate:deploy
```

## ⚠️ Importante

- **DATABASE_URL** (porta 6543): Usa connection pooling. Use para a aplicação.
- **DIRECT_URL** (porta 5432): Conexão direta. Use para migrations.
- Sempre adicione `?pgbouncer=true` no final da DATABASE_URL

## 🔍 Verificar Conexão

Para verificar se a conexão está funcionando:

```bash
npx prisma db pull
```

Se funcionar, você verá o schema do banco.

## 📊 Prisma Studio

Para visualizar e editar dados diretamente:

```bash
npm run db:studio
```

Acesse: http://localhost:5555

