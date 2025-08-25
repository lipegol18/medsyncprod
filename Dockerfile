# Dockerfile para MedSync - Sistema de Gerenciamento de Pedidos Médicos
FROM node:20-alpine

# Instalar dependências do sistema necessárias
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    librsvg-dev \
    pixman-dev

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production && npm cache clean --force

# Copiar código fonte
COPY . .

# Construir a aplicação
RUN npm run build

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S medsync -u 1001 -G nodejs

# Alterar ownership dos arquivos para o usuário não-root
RUN chown -R medsync:nodejs /app
USER medsync

# Expor porta
EXPOSE 5000

# Definir variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=5000

# Comando de inicialização
CMD ["npm", "start"]