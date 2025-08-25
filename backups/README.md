# MedSync - Backups de Código Separados

Este diretório contém backups completos e independentes do projeto MedSync, separados em cliente e servidor para facilitar o deploy em ambientes diferentes.

## 📁 Estrutura dos Backups

### `/client-backup/` - Frontend React
- **Tecnologia**: React 18 + TypeScript + Vite
- **UI**: TailwindCSS + Shadcn/ui
- **Estado**: TanStack React Query
- **Deploy**: Docker + Nginx
- **Porta**: 3000 (development) / 80 (production)

### `/server-backup/` - Backend Node.js
- **Tecnologia**: Node.js 18 + Express + TypeScript
- **ORM**: Drizzle ORM
- **Banco**: PostgreSQL 16
- **OCR**: Google Cloud Vision API
- **Deploy**: Docker + PostgreSQL
- **Porta**: 5000

## 🚀 Deploy Rápido

### Servidor (Backend)
```bash
cd backups/server-backup
cp .env.example .env
# Configure as variáveis no .env
./deploy.sh
```

### Cliente (Frontend)
```bash
cd backups/client-backup
cp .env.example .env
# Configure VITE_API_URL no .env
docker build -t medsync-client .
docker run -p 80:80 medsync-client
```

## 📦 Deploy com Docker Compose (Recomendado)

### Servidor Completo
```bash
cd backups/server-backup
docker-compose up -d
```
Isso iniciará:
- PostgreSQL na porta 5432
- MedSync Server na porta 5000
- Redis na porta 6379 (opcional)

### Cliente Separado
```bash
cd backups/client-backup
docker run -p 80:80 medsync-client
```

## 🔧 Configuração Necessária

### Backend (.env)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/medsync
SESSION_SECRET=sua_chave_secreta_muito_longa
GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000
```

## 📋 Funcionalidades Principais

### ✅ Sistema Completo
- 🏥 **Gestão de Pedidos Médicos** - Criação e acompanhamento completo
- 📋 **Procedimentos CBHPM** - Auto-preenchimento e reorganização por porte
- 🔍 **OCR de Documentos** - Extração automática de carteirinhas de convênio
- 📊 **Relatórios Financeiros** - Dashboard com valores recebidos e estatísticas
- 📅 **Agenda Cirúrgica** - Calendário com drag-and-drop para agendamentos
- 👥 **Gestão de Pacientes** - Cadastro e busca de pacientes
- 🏢 **Hospitais e Convênios** - Integração com operadoras de saúde
- 📱 **Interface Responsiva** - Funciona em desktop, tablet e mobile

### 🤖 Inteligência Artificial
- **Auto-preenchimento Inteligente** - Procedimentos CBHPM baseados em CID + conduta
- **Reorganização por Porte** - Procedimento principal automaticamente determinado
- **OCR Avançado** - Extração de dados de documentos médicos
- **Validações Médicas** - Verificações automáticas de consistência

### 🔐 Segurança
- **Autenticação Completa** - Login/logout com sessões seguras
- **Controle de Acesso** - Diferentes tipos de usuário (médico, admin)
- **Upload Seguro** - Validação de arquivos e tipos permitidos
- **Logs de Auditoria** - Rastreamento de ações dos usuários

## 📈 Performance

### Frontend
- ⚡ **Vite Build** - Build otimizado e rápido
- 🗃️ **React Query** - Cache inteligente de dados
- 📱 **Responsive Design** - Interface adaptável
- 🎨 **Lazy Loading** - Componentes carregados sob demanda

### Backend
- 🐘 **PostgreSQL** - Banco de dados robusto e escalável
- 🔄 **Connection Pooling** - Conexões otimizadas
- 📋 **Drizzle ORM** - Queries tipadas e performáticas
- 🚀 **Express.js** - API REST rápida e confiável

## 🐳 Deploy em Produção

### 1. Servidor (Backend)
```bash
cd backups/server-backup
cp .env.example .env
# Configure variáveis obrigatórias
docker-compose up -d
```

### 2. Cliente (Frontend)
```bash
cd backups/client-backup
cp .env.example .env
# Configure VITE_API_URL=https://seu-servidor.com
docker build -t medsync-client .
docker run -p 80:80 medsync-client
```

### 3. Verificação
- **Backend Health**: http://seu-servidor.com:5000/api/health
- **Frontend**: http://seu-cliente.com
- **Banco**: Verifique logs com `docker-compose logs postgres`

## 📞 Suporte Técnico

### Logs e Debug
```bash
# Logs do servidor
docker-compose logs -f server

# Logs do banco
docker-compose logs -f postgres

# Status dos serviços
docker-compose ps
```

### Problemas Comuns

1. **Erro de Conexão de Banco**
   - Verificar `DATABASE_URL` no .env
   - Confirmar que PostgreSQL está rodando

2. **Erro de CORS**
   - Verificar `VITE_API_URL` no frontend
   - Confirmar que servidor aceita conexões do cliente

3. **Erro de OCR**
   - Verificar credenciais do Google Cloud
   - Confirmar que Vision API está habilitada

## 🔄 Atualizações

Para atualizar o sistema:

1. **Backup dos dados**
   ```bash
   docker-compose exec postgres pg_dump -U medsync_user medsync > backup.sql
   ```

2. **Atualizar código**
   ```bash
   git pull origin main
   docker-compose build
   ```

3. **Aplicar migrações**
   ```bash
   docker-compose exec server npm run db:push
   ```

4. **Reiniciar serviços**
   ```bash
   docker-compose restart
   ```

## 📄 Licença

Projeto proprietário - MedSync 2025

---

**Status**: ✅ **Sistemas de backup completos e prontos para deploy independente**