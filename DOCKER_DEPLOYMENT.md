# 🐳 MedSync - Guia de Deployment Docker

Este guia fornece instruções completas para fazer o build e executar a aplicação MedSync em containers Docker.

## 📋 Pré-requisitos

- Docker Engine 20.10 ou superior
- Docker Compose 2.0 ou superior
- 4GB de RAM disponível
- 10GB de espaço em disco

## 🚀 Início Rápido

### 1. Setup Completo (Recomendado)

```bash
# Dar permissão de execução ao script
chmod +x docker-build-commands.sh

# Build e execução completa com PostgreSQL e Redis
./docker-build-commands.sh run
```

### 2. Build Apenas da Aplicação

```bash
# Construir apenas a imagem Docker
./docker-build-commands.sh build
```

### 3. Execução Standalone

```bash
# Executar apenas a aplicação (requer banco externo)
./docker-build-commands.sh run-standalone
```

## 📝 Configuração

### Arquivo .env

O script criará automaticamente um arquivo `.env` modelo. Configure as seguintes variáveis:

```env
# Banco de Dados
DATABASE_URL=postgresql://medsync:sua_senha@postgres:5432/medsync
POSTGRES_USER=medsync
POSTGRES_PASSWORD=sua_senha_muito_segura

# Sessão e Autenticação
SESSION_SECRET=chave_secreta_muito_longa_e_segura_aqui

# Redis (Cache)
REDIS_PASSWORD=senha_redis_segura

# SendGrid (Email)
SENDGRID_API_KEY=SG.seu_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@seudominio.com

# Google Cloud Vision (OCR)
GOOGLE_CLOUD_VISION_KEY=sua_chave_google_vision

# OpenAI
OPENAI_API_KEY=sk-sua_chave_openai

# Webhook
WEBHOOK_URL=https://seu-webhook.com/endpoint
```

## 🛠 Comandos Disponíveis

### Gerenciamento de Containers

```bash
# Construir imagem
./docker-build-commands.sh build

# Executar aplicação completa
./docker-build-commands.sh run

# Iniciar containers parados
./docker-build-commands.sh start

# Parar containers
./docker-build-commands.sh stop

# Reiniciar containers
./docker-build-commands.sh restart

# Limpar todos os containers e volumes
./docker-build-commands.sh cleanup
```

### Monitoramento e Debug

```bash
# Ver logs em tempo real
./docker-build-commands.sh logs

# Abrir shell no container
./docker-build-commands.sh shell

# Fazer backup do banco
./docker-build-commands.sh backup
```

## 🏗 Arquitetura dos Containers

### Serviços Incluídos

1. **medsync-app**: Aplicação principal (Node.js + React)
2. **postgres**: Banco de dados PostgreSQL 16
3. **redis**: Cache e sessões
4. **nginx**: Proxy reverso e load balancer (opcional)

### Portas Expostas

- `5000`: Aplicação MedSync
- `5432`: PostgreSQL
- `6379`: Redis
- `80/443`: Nginx (se habilitado)

### Volumes Persistentes

- `postgres_data`: Dados do PostgreSQL
- `redis_data`: Dados do Redis
- `uploads`: Arquivos enviados pelos usuários

## 🔒 Segurança

### Configurações de Segurança

1. **Usuário não-root**: Container executa com usuário dedicado
2. **Health checks**: Monitoramento automático de saúde
3. **Secrets**: Variáveis sensíveis em arquivo .env
4. **Network isolation**: Rede privada entre containers
5. **Rate limiting**: Proteção contra ataques no Nginx

### Backup e Restauração

```bash
# Backup automático
./docker-build-commands.sh backup

# Backup manual
docker-compose exec postgres pg_dump -U medsync medsync > backup.sql

# Restauração
docker-compose exec -T postgres psql -U medsync medsync < backup.sql
```

## 🚀 Deployment em Produção

### 1. Servidor Linux

```bash
# Clonar repositório
git clone seu-repositorio-medsync.git
cd medsync

# Configurar ambiente
cp .env.example .env
# Editar .env com configurações de produção

# Deploy
./docker-build-commands.sh run
```

### 2. Docker Swarm

```bash
# Inicializar swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml medsync
```

### 3. Kubernetes

```bash
# Converter docker-compose para kubernetes
kompose convert

# Aplicar manifests
kubectl apply -f .
```

## 📊 Monitoramento

### Health Checks

A aplicação inclui health checks automáticos:

- **App**: `http://localhost:5000/api/health`
- **Database**: Verificação de conexão PostgreSQL
- **Redis**: Comando PING

### Logs

```bash
# Logs da aplicação
docker-compose logs -f medsync-app

# Logs do banco
docker-compose logs -f postgres

# Logs do Redis
docker-compose logs -f redis
```

## 🔧 Troubleshooting

### Problemas Comuns

1. **Container não inicia**
   ```bash
   # Verificar logs
   docker-compose logs medsync-app
   
   # Verificar configuração
   docker-compose config
   ```

2. **Erro de conexão com banco**
   ```bash
   # Verificar se PostgreSQL está rodando
   docker-compose ps postgres
   
   # Testar conexão
   docker-compose exec postgres psql -U medsync -d medsync
   ```

3. **Problemas de permissão**
   ```bash
   # Verificar ownership dos volumes
   docker-compose exec medsync-app ls -la /app/uploads
   ```

### Reset Completo

```bash
# Parar e limpar tudo
./docker-build-commands.sh cleanup

# Remover volumes (CUIDADO: apaga dados)
docker volume prune

# Rebuild completo
./docker-build-commands.sh run
```

## 🆙 Atualizações

### Atualizar Aplicação

```bash
# Pull novo código
git pull origin main

# Rebuild e restart
./docker-build-commands.sh stop
./docker-build-commands.sh build
./docker-build-commands.sh start
```

### Migration de Banco

```bash
# Executar migrations
docker-compose exec medsync-app npm run db:push
```

## 📞 Suporte

Para problemas técnicos ou dúvidas sobre o deployment:

1. Verificar logs: `./docker-build-commands.sh logs`
2. Consultar documentação da aplicação
3. Verificar issues no repositório Git

---

🏥 **MedSync** - Sistema de Gerenciamento de Pedidos Médicos  
Desenvolvido para otimizar fluxos de trabalho médicos no Brasil.