#!/bin/bash

# MedSync Server Deploy Script
echo "🚀 Iniciando deploy do MedSync Server..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado. Por favor, instale o Docker primeiro."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose não está instalado. Por favor, instale o Docker Compose primeiro."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Criando arquivo .env..."
    cp .env.example .env
    echo "✅ Arquivo .env criado. Por favor, configure as variáveis de ambiente antes de continuar."
    echo "📋 Principais variáveis para configurar:"
    echo "   - SESSION_SECRET (obrigatório)"
    echo "   - GOOGLE_APPLICATION_CREDENTIALS (para OCR)"
    echo "   - SENDGRID_API_KEY (opcional, para emails)"
    echo "   - OPENAI_API_KEY (opcional, para IA)"
    echo ""
    echo "🔧 Edite o arquivo .env e execute este script novamente."
    exit 0
fi

# Load environment variables
source .env

# Check required environment variables
if [ -z "$SESSION_SECRET" ]; then
    echo "❌ SESSION_SECRET não configurado no arquivo .env"
    exit 1
fi

# Create necessary directories
echo "📁 Criando diretórios necessários..."
mkdir -p uploads logs

# Pull latest images
echo "📦 Baixando imagens Docker..."
docker-compose pull

# Build the application
echo "🔨 Construindo aplicação..."
docker-compose build

# Start the services
echo "🚀 Iniciando serviços..."
docker-compose up -d

# Wait for database to be ready
echo "⏳ Aguardando banco de dados..."
sleep 10

# Run database migrations
echo "🔄 Executando migrações do banco..."
docker-compose exec server npm run db:push

# Check services status
echo "🔍 Verificando status dos serviços..."
docker-compose ps

# Show logs
echo ""
echo "📊 Status dos serviços:"
echo "🐘 PostgreSQL: $(docker-compose ps postgres | grep 'Up' > /dev/null && echo '✅ Rodando' || echo '❌ Parado')"
echo "🚀 MedSync Server: $(docker-compose ps server | grep 'Up' > /dev/null && echo '✅ Rodando' || echo '❌ Parado')"
echo "🔴 Redis: $(docker-compose ps redis | grep 'Up' > /dev/null && echo '✅ Rodando' || echo '❌ Parado')"

# Health check
echo ""
echo "🏥 Testando health check..."
sleep 5
if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ Servidor está saudável e respondendo"
else
    echo "⚠️ Servidor pode não estar totalmente inicializado. Verifique os logs:"
    echo "   docker-compose logs server"
fi

echo ""
echo "🎉 Deploy concluído!"
echo "📍 Servidor disponível em: http://localhost:5000"
echo "📊 Health check: http://localhost:5000/api/health"
echo ""
echo "📋 Comandos úteis:"
echo "   Ver logs: docker-compose logs -f"
echo "   Parar serviços: docker-compose down"
echo "   Reiniciar: docker-compose restart"
echo "   Ver status: docker-compose ps"