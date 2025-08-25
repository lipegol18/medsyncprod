# MedSync Server - Backend API

Sistema backend Node.js para gerenciamento de pedidos médicos com processamento de documentos e integração com APIs de saúde.

## 🚀 Tecnologias

- **Node.js 18+** - Runtime JavaScript
- **Express.js** - Framework web
- **TypeScript** - Tipagem estática
- **PostgreSQL** - Banco de dados principal
- **Drizzle ORM** - ORM TypeScript-first
- **Google Cloud Vision API** - OCR de documentos
- **Passport.js** - Autenticação
- **Multer** - Upload de arquivos
- **Sharp** - Processamento de imagens

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Configurar banco de dados
npm run db:push

# Modo desenvolvimento
npm run dev

# Produção
npm start
```

## 🏗️ Estrutura do Projeto

```
├── index.ts                    # Ponto de entrada
├── routes.ts                   # Definição de rotas API
├── storage.ts                  # Camada de acesso a dados
├── services/
│   └── document-extraction/    # Serviços de OCR
├── public/
│   └── uploads/               # Arquivos upados
├── shared/
│   └── schema.ts              # Schemas Drizzle compartilhados
└── migrations/                # Migrações do banco
```

## 🔧 Configuração

### Variáveis de Ambiente Obrigatórias

```env
# Banco de dados PostgreSQL
DATABASE_URL=postgresql://usuario:senha@localhost:5432/medsync
PGHOST=localhost
PGPORT=5432
PGUSER=usuario
PGPASSWORD=senha
PGDATABASE=medsync

# Configuração da sessão
SESSION_SECRET=seu_secret_muito_seguro_aqui

# Google Cloud Vision API (OCR)
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
# OU
GOOGLE_CLOUD_VISION_API_KEY=sua_api_key_aqui

# SendGrid (opcional, para envio de emails)
SENDGRID_API_KEY=sua_sendgrid_api_key

# OpenAI (opcional, para IA)
OPENAI_API_KEY=sua_openai_api_key

# Ambiente
NODE_ENV=development
```

### Configuração do Google Cloud Vision

1. Crie um projeto no Google Cloud Console
2. Ative a Vision API
3. Crie uma conta de serviço
4. Baixe o arquivo JSON das credenciais
5. Configure a variável `GOOGLE_APPLICATION_CREDENTIALS`

## 🗃️ Banco de Dados

### Setup Inicial

```bash
# Gerar migrações
npm run db:generate

# Aplicar migrações
npm run db:push

# Abrir Drizzle Studio (opcional)
npm run db:studio
```

### Estrutura Principal

- **users** - Usuários (médicos/administradores)
- **patients** - Pacientes
- **hospitals** - Hospitais credenciados
- **medical_orders** - Pedidos médicos principais
- **procedures** - Procedimentos CBHPM
- **cid_codes** - Códigos CID-10
- **health_insurance_providers** - Operadoras de saúde
- **surgical_approaches** - Condutas cirúrgicas
- **opme_items** - Materiais OPME

### Tabelas de Associação (N:N)

- **medical_order_procedures** - Procedimentos por pedido
- **medical_order_cids** - CIDs por pedido
- **surgical_approach_procedures** - Procedimentos por conduta
- **surgical_approach_opme_items** - OPME por conduta
- **surgical_approach_suppliers** - Fornecedores por conduta

## 🛠️ APIs Principais

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/user` - Dados do usuário autenticado

### Pedidos Médicos
- `GET /api/medical-orders` - Listar pedidos
- `POST /api/medical-orders` - Criar pedido
- `GET /api/medical-orders/:id` - Detalhes do pedido
- `PUT /api/medical-orders/:id` - Atualizar pedido
- `DELETE /api/medical-orders/:id` - Deletar pedido

### Pacientes
- `GET /api/patients` - Listar pacientes
- `POST /api/patients` - Criar paciente
- `GET /api/patients/recent` - Pacientes recentes
- `GET /api/patients/search` - Buscar pacientes

### Procedimentos CBHPM
- `GET /api/procedures` - Listar procedimentos
- `GET /api/procedures/search` - Buscar procedimentos
- `GET /api/cbhpm-procedures-by-combination` - Procedimentos por conduta

### Upload e OCR
- `POST /api/upload` - Upload de arquivos
- `POST /api/extract-document` - Extrair dados via OCR
- `POST /api/extract-insurance-card` - OCR de carteirinhas

### Relatórios
- `GET /api/reports/dashboard-stats` - Estatísticas do dashboard
- `GET /api/reports/insurance-distribution` - Distribuição por convênio
- `GET /api/reports/received-values` - Valores recebidos

## 🔐 Autenticação e Autorização

### Sistema de Sessões
```typescript
// Middleware de autenticação
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Não autorizado' });
};
```

### Tipos de Usuário
- **Doctor** - Médicos (podem criar/editar pedidos)
- **Admin** - Administradores (acesso total)
- **Viewer** - Visualizadores (apenas leitura)

## 📁 Upload de Arquivos

### Configuração
- **Localização**: `public/uploads/`
- **Estrutura**: `/uploads/orders/{orderId}/{categoria}/`
- **Tipos aceitos**: PDF, JPG, PNG, JPEG
- **Tamanho máximo**: 10MB por arquivo

### Categorias
- `exames/` - Exames médicos
- `laudos/` - Laudos e relatórios
- `documentos/` - Documentos diversos

## 🤖 Processamento de Documentos

### OCR com Google Vision
```typescript
// Exemplo de uso
const extractedText = await ocrEngine.extractText(imageBuffer);
const cardData = await documentExtractor.extractInsuranceCard(extractedText);
```

### Extratores Suportados
- **Bradesco Saúde** - Carteirinhas de convênio
- **Amil** - Documentos de autorização
- **SulAmérica** - Guias e carteirinhas
- **CBHPM** - Códigos de procedimentos
- **CID-10** - Códigos de diagnóstico

## 📊 Sistema de Logs

### Níveis de Log
- **Info**: Operações normais
- **Warning**: Situações de atenção
- **Error**: Erros críticos
- **Debug**: Informações de desenvolvimento

### Exemplos
```typescript
console.log('🔐 Usuário autenticado:', user.id);
console.log('🏥 Procedimento encontrado:', procedure.code);
console.error('❌ Erro na autenticação:', error);
```

## 🚀 Deploy

### Preparação
```bash
# Build do TypeScript
npm run build

# Verificar variáveis de ambiente
NODE_ENV=production

# Executar migrações
npm run db:push
```

### Docker (Recomendado)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### PM2 (Produção)
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 📈 Monitoramento

### Health Check
- `GET /api/health` - Status do servidor
- `GET /api/health/db` - Status do banco de dados

### Métricas
- Tempo de resposta das APIs
- Uso de memória e CPU
- Conexões ativas do banco
- Taxa de erros

## 🔧 Desenvolvimento

### Debug
```bash
# Com logs detalhados
DEBUG=* npm run dev

# Apenas logs específicos
DEBUG=auth,db npm run dev
```

### Testes
```bash
# Executar testes
npm test

# Com coverage
npm run test:coverage
```

## 🐛 Troubleshooting

### Problemas Comuns

1. **Erro de conexão com banco**
   - Verificar `DATABASE_URL`
   - Confirmar que PostgreSQL está rodando
   - Testar conexão manualmente

2. **Falha no OCR**
   - Verificar credenciais do Google Cloud
   - Confirmar quota da Vision API
   - Validar formato do arquivo

3. **Erro de upload**
   - Verificar permissões da pasta `uploads/`
   - Confirmar tamanho do arquivo
   - Validar tipo MIME

### Logs de Debug
```bash
# Ativar logs de SQL
DEBUG=drizzle:* npm run dev

# Logs de autenticação
DEBUG=passport:* npm run dev
```

## 📄 Licença

Projeto proprietário - MedSync 2025

## 📞 Suporte

Para problemas técnicos:
1. Verificar logs do console
2. Testar health checks (`/api/health`)
3. Confirmar variáveis de ambiente
4. Verificar conectividade com banco de dados