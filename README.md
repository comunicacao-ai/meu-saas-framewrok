# 💬 Sistema de Comunicação Interna

Um sistema moderno de comunicação interna para empresas, construído como SaaS.

## ✨ Funcionalidades

- 🔐 **Autenticação segura** com JWT
- 💬 **Chat em tempo real** com Socket.io
- 📢 **Canais públicos e privados**
- 👥 **Mensagens diretas** entre usuários
- 🔔 **Notificações em tempo real**
- 📎 **Compartilhamento de arquivos**
- 🔍 **Busca de mensagens**
- 👤 **Perfis de usuário**
- 🏢 **Multi-tenant** (múltiplas organizações)

## 🛠️ Tecnologias

### Backend
- Node.js + Express
- Socket.io (comunicação em tempo real)
- Prisma ORM
- SQLite (desenvolvimento) / PostgreSQL (produção)
- JWT para autenticação
- Bcrypt para hash de senhas

### Frontend
- React 18 + Vite
- React Router
- Socket.io-client
- Lucide React (ícones)
- CSS Modules

## 🚀 Instalação

```bash
# Instalar todas as dependências
npm run install:all

# Configurar o banco de dados
cd backend
npx prisma migrate dev

# Iniciar em modo desenvolvimento
cd ..
npm run dev
```

## 📁 Estrutura do Projeto

```
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── socket/
│   │   └── index.js
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   └── styles/
│   └── package.json
└── package.json
```

## 🔧 Variáveis de Ambiente

### Backend (.env)
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="sua-chave-secreta-aqui"
PORT=3001
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001
```

## 📝 Licença

MIT License

