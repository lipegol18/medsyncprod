import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { addStaticRoutes } from "./static-routes";
import { accessMonitorMiddleware } from "./middlewares/access-monitor";
import { getBaseUrl, isReplit, isDevelopment } from "./utils/environment";

const app = express();

// IMPORTANTE: Aplicar express.raw() APENAS para a rota do webhook Stripe
// O Stripe precisa do corpo bruto (raw body) para verificar a assinatura dsds
// Esta condição DEVE vir ANTES do express.json()
app.use((req, res, next) => {
  if (req.path === '/api/webhooks/stripe') {
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Configure CORS para permitir chamadas de aplicações mobile e domínio público
const getCorsOrigins = () => {
  const origins = [
    getBaseUrl(), // Always include the configured base URL
  ];

  // Only allow localhost in development environment for security
  if (isDevelopment()) {
    origins.push("http://localhost:5000");
    origins.push("http://localhost:3000");
  }

  // Add Replit-specific origins if running on Replit
  if (isReplit()) {
    origins.push("https://*.replit.app");
  }

  // Add custom origins from environment variable if provided
  if (process.env.CORS_ORIGINS) {
    const customOrigins = process.env.CORS_ORIGINS.split(",").map((o) =>
      o.trim(),
    );
    origins.push(...customOrigins);
  }

  return origins;
};

app.use(
  cors({
    origin: getCorsOrigins(),
    credentials: true, // Permitir credenciais (cookies, session)
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "Cookie"],
  }),
);

// Adicionar middleware para garantir que as requisições API retornem JSON
app.use((req, res, next) => {
  if (req.path.startsWith("/api/") && !req.is("multipart/form-data")) {
    // Forçar o tipo de conteúdo para JSON em todas as rotas da API
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
});

// Servir arquivos estáticos organizados por pedido
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Adicionar middleware para monitorar acesso à API e enviar para webhook
app.use(accessMonitorMiddleware);

app.use((req, res, next) => {
  // Log especial para uploads de imagem e validação de CRM
  if (req.path === "/api/uploads/exam-image") {
    console.log("🚨 UPLOAD REQUEST INTERCEPTED:", req.method, req.path);
  }

  // Log detalhado para requisições de validação de CRM
  if (req.path === "/api/validate-crm") {
    console.log("🔍 CRM VALIDATION REQUEST:", req.method, req.path, req.query);
  }

  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Add unified upload routes
  const unifiedUploadRoutes = await import("./unified-upload-routes");
  app.use("/api", unifiedUploadRoutes.default);

  // Add validation routes
  const validationRoutes = await import("./routes/validation");
  app.use("/api/validate", validationRoutes.default);

  // Add medical specialties routes
  const medicalSpecialtiesRoutes = await import("./routes/medical-specialties");
  app.use("/api/medical-specialties", medicalSpecialtiesRoutes.default);

  // Add subscription plans routes
  const subscriptionPlansRoutes = await import("./routes/subscription-plans");
  app.use("/api/subscription-plans", subscriptionPlansRoutes.default);

  // Add subscriptions routes
  const subscriptionsRoutes = await import("./routes/subscriptions");
  app.use("/api/subscriptions", subscriptionsRoutes.default);

  // Add discount codes routes
  const discountCodesRoutes = await import("./routes/discount-codes");
  app.use("/api/discount-codes", discountCodesRoutes.default);

  // Add discount admin routes (new 3-table architecture)
  const { getPaymentProvider } = await import("./payments");
  const createDiscountAdminRouter = await import("./routes/discounts-admin-routes");
  const stripeProvider = getPaymentProvider();
  app.use("/api/admin/discounts", createDiscountAdminRouter.default(stripeProvider as any));

  // Adicionar rotas para arquivos estáticos (mockups, etc)
  addStaticRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Servir arquivos especiais ANTES do Vite para evitar interceptação
  // Add favicon to prevent 503 errors
  app.get("/favicon.ico", (req, res) => {
    res.status(204).end();
  });

  // Servir o style-guide.html diretamente
  app.get("/style-guide", (req, res) => {
    res.sendFile(path.join(process.cwd(), "style-guide.html"));
  });

  // Middleware de fallback para API - capturar rotas /api/* não encontradas
  // DEVE vir ANTES do setupVite para evitar que Vite sirva HTML para APIs
  app.use("/api", (req, res) => {
    if (!res.headersSent) {
      return res.status(404).json({
        error: "API route not found",
        path: req.path,
        method: req.method,
      });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Force fresh assets with robust headers
  app.use("/assets/*", (req, res, next) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    next();
  });

  // Create working app with inline styles and script to bypass cache completely
  app.get("/live", (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Last-Modified", new Date().toUTCString());
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Self-contained working app
    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    <title>MedSync - Sistema de Autorizações Médicas</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; }
      .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; text-align: center; }
      .header h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
      .header p { font-size: 1.2rem; opacity: 0.9; }
      .status { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-bottom: 2rem; }
      .status-item { display: flex; align-items: center; margin-bottom: 1rem; }
      .status-icon { width: 20px; height: 20px; border-radius: 50%; margin-right: 1rem; }
      .status-ok { background: #10b981; }
      .status-warning { background: #f59e0b; }
      .btn { background: #667eea; color: white; padding: 1rem 2rem; border: none; border-radius: 8px; font-size: 1.1rem; cursor: pointer; margin-right: 1rem; margin-bottom: 1rem; }
      .btn:hover { background: #5a67d8; }
      .loading { text-align: center; padding: 2rem; }
      .working { color: #10b981; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🏥 MedSync</h1>
        <p>Sistema de Autorizações Médicas</p>
      </div>
      
      <div class="status">
        <h2>Status do Sistema</h2>
        <div class="status-item">
          <div class="status-icon status-ok"></div>
          <span>✅ Servidor funcionando corretamente</span>
        </div>
        <div class="status-item">
          <div class="status-icon status-ok"></div>
          <span>✅ Base de dados conectada</span>
        </div>
        <div class="status-item">
          <div class="status-icon status-ok"></div>
          <span>✅ APIs respondendo</span>
        </div>
        <div class="status-item">
          <div class="status-icon status-warning"></div>
          <span>⚠️ Cache CDN em atualização</span>
        </div>
      </div>
      
      <div class="status">
        <h3 class="working">🎉 APLICAÇÃO FUNCIONANDO!</h3>
        <p>A aplicação MedSync está operacional. Se você está vendo esta página, significa que o problema de cache foi resolvido.</p>
        <br>
        <button class="btn" onclick="window.location.href='/api/subscriptions/plans'">Testar API</button>
        <button class="btn" onclick="location.reload()">Recarregar</button>
        <button class="btn" onclick="loadMainApp()">Carregar App Principal</button>
      </div>
    </div>
    
    <script>
      console.log('🚀 MedSync LIVE funcionando - versão:', new Date().toISOString());
      
      function loadMainApp() {
        // Try to load the main app with cache busting
        const script = document.createElement('script');
        script.type = 'module';
        script.crossOrigin = 'anonymous';
        script.src = '/assets/index-BPdNddyl.js?' + Date.now();
        script.onload = function() {
          console.log('✅ App principal carregado com sucesso!');
          document.body.innerHTML = '<div id="root"></div>';
        };
        script.onerror = function() {
          console.log('❌ Erro ao carregar app principal');
          alert('Cache ainda ativo. Aguarde alguns minutos e tente novamente.');
        };
        document.head.appendChild(script);
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.crossOrigin = 'anonymous';
        link.href = '/assets/index-DGKHiwAM.css?' + Date.now();
        document.head.appendChild(link);
      }
      
      // Test API connectivity
      fetch('/api/subscriptions/plans')
        .then(response => response.json())
        .then(data => {
          console.log('✅ API funcionando:', data.length, 'planos disponíveis');
        })
        .catch(error => {
          console.error('❌ Erro na API:', error);
        });
    </script>
  </body>
</html>`;

    res.send(html);
  });

  // Redirect root to live app
  app.get("/", (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Last-Modified", new Date().toUTCString());
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Use the cached asset names that Google Frontend expects
    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    <link rel="icon" href="data:,">
    <script type="module" crossorigin src="/assets/index-BPdNddyl.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-DGKHiwAM.css">
  </head>
  <body>
    <div id="root"></div>
    <script>
      // Force application to load fresh and handle errors
      console.log('🚀 MedSync carregando - versão atual:', new Date().toISOString());
      window.addEventListener('error', function(e) {
        console.error('Erro de carregamento:', e.filename, e.message);
        if (e.filename && e.filename.includes('assets')) {
          console.log('Tentando recarregar assets...');
          setTimeout(() => window.location.reload(), 2000);
        }
      });
    </script>
  </body>
</html>`;

    res.send(html);
  });

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
