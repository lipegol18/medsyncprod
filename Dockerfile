# -------------------------
# Etapa 1: Build
# -------------------------
FROM node:22 AS build

# Dependências para compilar módulos nativos (ex.: sharp) e libvips
RUN apt-get update && apt-get install -y \
    build-essential libvips-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Melhor cache de deps
COPY package*.json ./
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Copia o restante do código (Coolify já clonou o repo)
COPY . .

# Se ainda existir essa pasta no repo e for necessária
RUN if [ -d "medsynchomol" ]; then \
      cp -r medsynchomol/. . && rm -rf medsynchomol; \
    fi

# Build (gera dist/)
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build


# -------------------------
# Etapa 2: Runtime
# -------------------------
FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production

# Se você usa sharp em runtime e der erro de lib, descomente:
# RUN apt-get update && apt-get install -y libvips && rm -rf /var/lib/apt/lists/*

# Copia o necessário
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Porta interna do serviço (alinha com APP_PORT do Coolify)
ENV APP_PORT=5001
ENV PORT=5001
ENV NODE_ENV = Development


# LABELS DE ROTEAMENTO E HARDENING
LABEL traefik.enable=true
LABEL traefik.http.routers.medsync-final.rule=Host(`desenv.medsync.med.br`)
LABEL traefik.http.routers.medsync-final.entrypoints=https
LABEL traefik.http.routers.medsync-final.tls=true
LABEL traefik.http.routers.medsync-router-final.tls.certresolver=letsencrypt

# ATIVAÇÃO DO HARDENING: Chama o middleware do proxy global (@docker)
LABEL traefik.http.routers.medsync-final.middlewares=security-headers@docker

LABEL traefik.http.routers.medsync-final.service=medsync-final-svc
LABEL traefik.http.services.medsync-final-svc.loadbalancer.server.port=5001
EXPOSE 5001

CMD ["npm", "start"]
