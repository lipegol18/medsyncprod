# 🐳 Comandos Docker para MedSync

## 📋 Sequência Completa de Build e Execução

### 🚀 Método 1: Setup Automático (Recomendado)

```bash
# 1. Dar permissão de execução
chmod +x docker-build-commands.sh

# 2. Build e execução completa (aplicação + PostgreSQL + Redis)
./docker-build-commands.sh run
```

### 🔧 Método 2: Comandos Docker Manuais

#### Build da Imagem
```bash
# Build da aplicação
docker build -t medsync:latest .

# Build com cache limpo
docker build --no-cache -t medsync:latest .
```

#### Execução com Docker Compose
```bash
# Configurar arquivo .env (necessário)
cp .env.example .env
# Editar .env com suas configurações

# Subir todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar serviços
docker-compose down
```

#### Execução Standalone
```bash
# Executar apenas a aplicação (requer banco externo)
docker run -d \
  --name medsync-app \
  --env-file .env \
  -p 5000:5000 \
  -v $(pwd)/uploads:/app/uploads \
  medsync:latest
```

## 🔑 Configuração de Variáveis (.env)

```env
# === BANCO DE DADOS ===
DATABASE_URL=postgresql://medsync:sua_senha@postgres:5432/medsync
POSTGRES_USER=medsync
POSTGRES_PASSWORD=senha_postgres_segura

# === AUTENTICAÇÃO ===
SESSION_SECRET=chave_sessao_muito_longa_e_segura

# === CACHE ===
REDIS_PASSWORD=senha_redis_segura

# === EMAIL (SendGrid) ===
SENDGRID_API_KEY=SG.sua_chave_sendgrid
SENDGRID_FROM_EMAIL=noreply@seudominio.com

# === OCR (Google Cloud Vision) ===
GOOGLE_CLOUD_VISION_KEY=sua_chave_google_vision

# === IA (OpenAI) ===
OPENAI_API_KEY=sk-sua_chave_openai

# === WEBHOOK ===
WEBHOOK_URL=https://seu-webhook.com

# === APLICAÇÃO ===
NODE_ENV=production
PORT=5000
```

## 📊 Verificação de Funcionamento

### Health Check
```bash
# Verificar se aplicação está funcionando
curl http://localhost:5000/api/health

# Resposta esperada:
{
  "status": "ok",
  "timestamp": "2025-08-11T10:00:00.000Z",
  "database": "connected",
  "uptime": 123.45,
  "version": "1.0.0"
}
```

### Status dos Containers
```bash
# Ver containers rodando
docker-compose ps

# Ver logs específicos
docker-compose logs medsync-app
docker-compose logs postgres
docker-compose logs redis
```

## 🗄️ Gerenciamento de Dados

### Backup do Banco
```bash
# Backup automático
./docker-build-commands.sh backup

# Backup manual
docker-compose exec postgres pg_dump -U medsync medsync > backup.sql
```

### Restauração
```bash
# Restaurar backup
docker-compose exec -T postgres psql -U medsync medsync < backup.sql
```

### Migrações
```bash
# Executar migrações do schema
docker-compose exec medsync-app npm run db:push
```

## 🛠️ Comandos de Manutenção

### Logs e Debug
```bash
# Ver logs em tempo real
./docker-build-commands.sh logs

# Abrir shell no container
./docker-build-commands.sh shell

# Inspecionar volumes
docker volume ls
docker volume inspect medsync_postgres_data
```

### Limpeza
```bash
# Parar e remover containers
./docker-build-commands.sh cleanup

# Limpeza completa (CUIDADO: remove dados)
docker-compose down -v
docker system prune -a
docker volume prune
```

### Restart e Controle
```bash
# Reiniciar serviços
./docker-build-commands.sh restart

# Parar serviços
./docker-build-commands.sh stop

# Iniciar serviços parados
./docker-build-commands.sh start
```

## 🌐 Portas e Acesso

- **Aplicação**: http://localhost:5000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **Nginx** (se habilitado): http://localhost:80

## 🔒 Segurança

### Configurações de Produção
- Alterar todas as senhas padrão
- Usar HTTPS em produção
- Configurar firewall adequadamente
- Fazer backup regular dos dados
- Monitorar logs de segurança

### Volumes Persistentes
- `postgres_data`: Dados do banco PostgreSQL
- `redis_data`: Cache do Redis
- `uploads`: Arquivos enviados pelos usuários

## 🚨 Troubleshooting

### Problemas Comuns

1. **Container não inicia**
   ```bash
   docker-compose logs medsync-app
   docker-compose config
   ```

2. **Erro de conexão com banco**
   ```bash
   docker-compose ps postgres
   docker-compose exec postgres psql -U medsync -d medsync
   ```

3. **Problemas de permissão**
   ```bash
   sudo chown -R 1001:1001 uploads/
   docker-compose exec medsync-app ls -la /app/uploads
   ```

4. **Falta de espaço em disco**
   ```bash
   docker system df
   docker system prune
   ```

### Reset Completo
```bash
# Parar tudo
docker-compose down -v

# Remover imagens
docker rmi medsync:latest

# Rebuild completo
./docker-build-commands.sh run
```

## 📈 Deployment em Produção

### Servidor Linux
```bash
# 1. Instalar Docker e Docker Compose
sudo apt update
sudo apt install docker.io docker-compose

# 2. Clonar repositório
git clone [repo-url]
cd medsync

# 3. Configurar ambiente
cp .env.example .env
# Editar .env com configurações reais

# 4. Deploy
./docker-build-commands.sh run
```

### Monitoramento
- Configurar alertas para health check
- Monitorar uso de recursos (CPU, RAM, Disk)
- Backup automático diário
- Logs centralizados

---

🏥 **MedSync** - Sistema de Gerenciamento de Pedidos Médicos  
Para suporte técnico, consulte os logs ou a documentação completa.