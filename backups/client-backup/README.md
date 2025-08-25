# MedSync Client - Frontend Application

Sistema frontend para gerenciamento de pedidos médicos com foco na autorização de procedimentos CBHPM.

## 🚀 Tecnologias

- **React 18** - Framework frontend
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e servidor de desenvolvimento
- **TailwindCSS** - Framework de estilização
- **Shadcn/ui** - Componentes UI
- **React Query** - Gerenciamento de estado do servidor
- **Wouter** - Roteamento
- **React Hook Form** - Gerenciamento de formulários
- **Zod** - Validação de schemas

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Modo desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build de produção
npm run preview
```

## 🏗️ Estrutura do Projeto

```
src/
├── components/         # Componentes reutilizáveis
├── pages/             # Páginas da aplicação
├── steps/             # Componentes de steps (formulários multi-etapa)
├── hooks/             # React hooks customizados
├── lib/               # Utilitários e configurações
└── index.css          # Estilos globais
```

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_API_URL=http://localhost:5000
```

### Servidor Backend

Este cliente requer um servidor backend Node.js/Express executando na porta 5000.
O servidor deve fornecer as seguintes APIs principais:

- `/api/auth/*` - Autenticação
- `/api/medical-orders/*` - Pedidos médicos
- `/api/patients/*` - Pacientes
- `/api/procedures/*` - Procedimentos CBHPM
- `/api/hospitals/*` - Hospitais
- `/api/reports/*` - Relatórios

## 🎨 Funcionalidades Principais

### Gestão de Pedidos Médicos
- Criação multi-etapa de pedidos médicos
- Upload e processamento de documentos
- Seleção inteligente de procedimentos CBHPM
- Auto-preenchimento baseado em condutas cirúrgicas

### Sistema de Agenda Cirúrgica
- Calendário com visualização mensal, semanal e diária
- Agendamento de cirurgias com drag-and-drop
- Integração com pedidos médicos
- Cores por tipo de cirurgia (eletiva/urgência)

### Relatórios e Dashboard
- Dashboard com métricas principais
- Relatórios financeiros detalhados
- Distribuição por convênios e hospitais
- Análise de procedimentos realizados

### Interface Intuitiva
- Design responsivo para mobile, tablet e desktop
- Tema escuro/claro
- Componentes acessíveis (Radix UI)
- Notificações em tempo real

## 🔐 Autenticação

O sistema utiliza autenticação baseada em sessão com cookies.
As seguintes rotas estão protegidas:

- `/orders/*` - Gestão de pedidos
- `/surgery-appointments/*` - Agenda cirúrgica  
- `/reports/*` - Relatórios
- `/profile/*` - Perfil do usuário

## 📱 Responsividade

A aplicação é totalmente responsiva e otimizada para:

- **Desktop** (1024px+) - Interface completa
- **Tablet** (768px-1023px) - Layout adaptado
- **Mobile** (320px-767px) - Interface simplificada

## 🔄 Estado da Aplicação

### React Query
Gerenciamento de cache e sincronização com servidor:

```typescript
// Exemplo de uso
const { data: orders, isLoading } = useQuery({
  queryKey: ['/api/medical-orders'],
  queryFn: () => fetch('/api/medical-orders').then(res => res.json())
});
```

### Formulários
Validação com Zod e React Hook Form:

```typescript
const form = useForm<FormData>({
  resolver: zodResolver(formSchema),
  defaultValues: { /* valores iniciais */ }
});
```

## 🎯 Build e Deploy

### Build de Produção
```bash
npm run build
```

Os arquivos serão gerados na pasta `dist/` e podem ser servidos por qualquer servidor web estático.

### Deploy Recomendado

1. **Vercel/Netlify** - Para hospedagem estática
2. **Nginx/Apache** - Para servidores próprios
3. **Docker** - Para containerização

### Configuração Nginx

```nginx
server {
    listen 80;
    server_name medsync.exemplo.com;
    root /var/www/medsync/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🐛 Debugging

### Desenvolvimento
```bash
# Debug com sourcemaps
npm run dev

# Analise do bundle
npm run build -- --analyze
```

### Logs do Console
A aplicação registra logs detalhados no console do navegador:
- 🔐 Autenticação
- 🏥 Operações médicas
- ⚡ Requisições API
- 🎯 Auto-preenchimentos

## 📄 Licença

Projeto proprietário - MedSync 2025

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do console do navegador
2. Confirme se o servidor backend está rodando
3. Verifique as variáveis de ambiente
4. Consulte a documentação da API backend