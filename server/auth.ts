import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { randomBytes } from "crypto";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { pool, db } from "./db";
import { hashPassword, comparePasswords } from "./utils";
import { sendPasswordResetEmail } from "./sendgrid";
import { WebhookService } from "./services/webhook-service";
import { discountCodes } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { getPaymentProvider } from "./payments";

const PostgresSessionStore = connectPg(session);

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  const isProduction = process.env.NODE_ENV === 'development';
  console.log("🔐 Configurando autenticação - Ambiente:", isProduction ? 'production' : 'development');
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'medsync-session-secret',
    resave: false,
    saveUninitialized: false,
    store: new PostgresSessionStore({ 
      pool, 
      tableName: 'session',
      createTableIfMissing: true 
    }),
    cookie: {
      secure: isProduction, // Secure apenas em produção
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
      sameSite: 'lax'
    }
  };

  // Configurar trust proxy adequadamente
  if (isProduction) {
    app.set("trust proxy", 1);
    console.log("🔐 Trust proxy configurado para produção");
  } else {
    console.log("🔐 Trust proxy desabilitado para desenvolvimento");
  }
  
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Usuário não encontrado" });
        }
        
        if (!user.active) {
          return done(null, false, { message: "Conta desativada. Aguarde a ativação por um administrador para acessar o sistema." });
        }
        
        if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
          return done(null, false, { message: "Conta temporariamente bloqueada por tentativas inválidas" });
        }
        
        if (!(await comparePasswords(password, user.password))) {
          // Incrementar tentativas inválidas
          const failedAttempts = (user.failedLoginAttempts || 0) + 1;
          const updates: any = { failedLoginAttempts: failedAttempts };
          
          // Se atingiu o limite de tentativas, bloquear temporariamente
          if (failedAttempts >= 5) {
            const lockoutUntil = new Date();
            lockoutUntil.setMinutes(lockoutUntil.getMinutes() + 30); // Bloquear por 30 minutos
            updates.lockoutUntil = lockoutUntil;
          }
          
          await storage.updateUser(user.id, updates);
          return done(null, false, { message: "Senha incorreta" });
        }
        
        // Login bem-sucedido: resetar tentativas inválidas e atualizar último login
        await storage.updateUser(user.id, {
          failedLoginAttempts: 0,
          lockoutUntil: null,
          lastLogin: new Date()
        });
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log("🔐 Serializando usuário:", user.id);
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("🔐 Deserializando usuário ID:", id, "Timestamp:", new Date().toISOString());
      
      if (!id) {
        console.log("❌ ID do usuário é nulo durante deserialização");
        return done(null, false);
      }
      
      const user = await storage.getUser(id);
      if (!user) {
        console.log("❌ Usuário não encontrado durante deserialização:", id);
        return done(null, false);
      }
      
      if (!user.active) {
        console.log("❌ Usuário inativo durante deserialização:", id);
        return done(null, false);
      }
      
      console.log("✅ Usuário deserializado com sucesso:", user.id, user.username);
      done(null, user);
    } catch (error) {
      console.error("❌ Erro durante deserialização:", error);
      done(error, null);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Registro - dados recebidos:", req.body);
      
      // Verificar se já existe usuário com esse username ou email
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        console.log("Erro de registro: Nome de usuário já existe");
        return res.status(400).json({ message: "Nome de usuário já existe" });
      }
      
      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        console.log("Erro de registro: Email já está em uso");
        return res.status(400).json({ message: "Email já está em uso" });
      }
      
      // Verificar se o CRM já existe para função de médico (roleId = 2)
      if (req.body.roleId === 2 && req.body.crm) {
        const existingCrm = await storage.getUserByCrm(req.body.crm);
        if (existingCrm) {
          console.log("Erro de registro: CRM já cadastrado");
          return res.status(400).json({ message: "CRM já cadastrado" });
        }
      }

      // Atribuir papel padrão se não foi especificado
      if (!req.body.roleId) {
        const defaultRole = await storage.getDefaultRole();
        if (defaultRole) {
          req.body.roleId = defaultRole.id;
          console.log("Usando papel padrão:", defaultRole.id);
        } else {
          // Caso não exista papel padrão, usar o primeiro disponível
          const roles = await storage.getRoles();
          if (roles.length > 0) {
            req.body.roleId = roles[0].id;
            console.log("Usando primeiro papel disponível:", roles[0].id);
          } else {
            console.log("Erro de registro: Nenhum papel disponível no sistema");
            return res.status(500).json({ message: "Nenhum papel disponível no sistema" });
          }
        }
      }

      // Verificar se os campos obrigatórios estão presentes
      if (!req.body.name) {
        console.log("Erro de registro: nome não fornecido");
        return res.status(400).json({ message: "Nome é obrigatório" });
      }

      if (!req.body.username) {
        console.log("Erro de registro: username não fornecido");
        return res.status(400).json({ message: "Nome de usuário é obrigatório" });
      }

      if (!req.body.email) {
        console.log("Erro de registro: email não fornecido");
        return res.status(400).json({ message: "Email é obrigatório" });
      }

      if (!req.body.password) {
        console.log("Erro de registro: senha não fornecida");
        return res.status(400).json({ message: "Senha é obrigatória" });
      }

      console.log("Tentando criar usuário com dados:", {
        username: req.body.username,
        email: req.body.email,
        name: req.body.name,
        roleId: req.body.roleId
      });

      // Separar e mapear dados de endereço do frontend para backend
      const { 
        cep, 
        address: logradouro, 
        number: numero, 
        complement: complemento, 
        neighborhood: bairro, 
        city: cidade, 
        state: uf, 
        ...userData 
      } = req.body;

      const user = await storage.createUser({
        ...userData,
        active: false, // Forçar usuários novos como inativos
        password: await hashPassword(req.body.password),
      });

      console.log("Usuário criado com sucesso, ID:", user.id);

      // Se foram fornecidos dados de endereço, criar o endereço
      if (cep && logradouro && cidade && uf) {
        try {
          const addressData = {
            userId: user.id,
            isPrimary: true, // Primeiro endereço é sempre principal
            cep: cep,
            logradouro: logradouro,
            numero: numero || '',
            complemento: complemento || '',
            bairro: bairro || '',
            cidade: cidade,
            uf: uf,
            country: 'BR'
          };
          
          const address = await storage.createUserAddress(addressData);
          console.log("Endereço criado com sucesso para usuário:", user.id, "- Endereço ID:", address.id);
        } catch (addressError) {
          console.error("Erro ao criar endereço durante registro:", addressError);
          // Não falhar o registro se houver erro no endereço
        }
      }
      
      // Notificar o webhook sobre o novo usuário criado (de forma assíncrona)
      WebhookService.notifyNewUser(user);
      
      // Não fazemos login automático para contas inativas
      // Não enviar a senha no retorno
      const { password, ...userWithoutPassword } = user;
      res.status(201).json({
        ...userWithoutPassword,
        message: "Usuário criado com sucesso. Aguarde a ativação por um administrador para acessar o sistema."
      });
    } catch (error) {
      console.error("Erro ao registrar usuário:", error);
      next(error);
    }
  });

  // Endpoint de registro com sistema de planos e trial
  app.post("/api/register-with-plan", async (req, res, next) => {
    try {
      console.log("Registro com plano - dados recebidos:", req.body);
      
      const { planId, discountCodeId, billingInterval = 'monthly', ...registrationData } = req.body;
      
      // Verificar se plano existe
      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        return res.status(400).json({ message: "Plano de assinatura inválido" });
      }
      
      // Verificar se já existe usuário com esse username ou email
      const existingUser = await storage.getUserByUsername(registrationData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Nome de usuário já existe" });
      }
      
      const existingEmail = await storage.getUserByEmail(registrationData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email já está em uso" });
      }
      
      // Atribuir papel padrão se não foi especificado
      if (!registrationData.roleId) {
        const defaultRole = await storage.getDefaultRole();
        if (defaultRole) {
          registrationData.roleId = defaultRole.id;
        }
      }
      
      // Separar e mapear dados de endereço do frontend para backend
      const { 
        cep, 
        address: logradouro, 
        number: numero, 
        complement: complemento, 
        neighborhood: bairro, 
        city: cidade, 
        state: uf, 
        ...userData 
      } = registrationData;
      
      // Garantir que o campo name seja criado corretamente
      const fullName = registrationData.name || `${registrationData.firstName} ${registrationData.lastName}`;
      
      // Lógica específica por tipo de plano
      const now = new Date();
      let userToCreate = {
        ...userData,
        name: fullName, // Garantir que name seja sempre definido
        password: await hashPassword(registrationData.password),
        active: false, // Por padrão inativo
      };
      
      // Criar usuário primeiro
      const user = await storage.createUser({
        ...userToCreate,
        active: planId === 1 // Ativar imediatamente para trial (plano START)
      });
      
      // Se for plano START (ID 1), criar assinatura de trial
      if (planId === 1) {
        const trialDays = plan.trialDays || 15; // Default 15 dias
        const trialEndDate = new Date(now.getTime() + (trialDays * 24 * 60 * 60 * 1000));
        
        // Criar assinatura de trial na nova estrutura
        await storage.createUserSubscription({
          userId: user.id,
          planId: planId,
          status: 'trial',
          startedAt: now,
          trialEndsAt: trialEndDate,
          paymentProvider: 'none',
          createdAt: now,
          updatedAt: now
        });
        
        console.log(`Configurando trial de ${trialDays} dias para plano START`);
      }
      console.log("Usuário criado com sucesso, ID:", user.id);
      
      // Criar endereço se fornecido
      if (cep && logradouro && cidade && uf) {
        try {
          const addressData = {
            userId: user.id,
            isPrimary: true,
            cep, logradouro, numero: numero || '', complemento: complemento || '',
            bairro: bairro || '', cidade, uf, country: 'BR'
          };
          await storage.createUserAddress(addressData);
        } catch (addressError) {
          console.error("Erro ao criar endereço:", addressError);
        }
      }
      
      // Notificar webhook
      WebhookService.notifyNewUser(user);
      
      const { password, ...userWithoutPassword } = user;
      
      if (planId === 1) {
        // Para plano START, fazer login automático e retornar sucesso
        req.login(user, async (err) => {
          if (err) {
            console.error("Erro no login automático:", err);
            return res.status(500).json({ message: "Erro no login automático" });
          }
          
          try {
            // Buscar informações da assinatura de trial criada
            const userSubscription = await storage.getUserSubscription(user.id);
            
            res.status(201).json({
              ...userWithoutPassword,
              message: "Conta criada com sucesso! Você tem 15 dias gratuitos para testar o sistema.",
              trialActive: true,
              trialEndDate: userSubscription?.trialEndsAt
            });
          } catch (error) {
            console.error("Erro ao buscar assinatura:", error);
            res.status(201).json({
              ...userWithoutPassword,
              message: "Conta criada com sucesso! Você tem 15 dias gratuitos para testar o sistema.",
              trialActive: true,
              trialEndDate: null
            });
          }
        });
      } else {
        // Para outros planos, criar sessão de checkout do Stripe
        let discountCode = null;
        if (discountCodeId) {
          try {
            // Buscar código de desconto automático
            const [code] = await db.select().from(discountCodes).where(
              and(
                eq(discountCodes.id, discountCodeId),
                eq(discountCodes.isActive, true),
                eq(discountCodes.isAutomatic, true)
              )
            );
            
            if (code) {
              discountCode = code;
              console.log('✅ Código de desconto automático encontrado:', {
                id: code.id,
                code: code.code,
                externalCouponId: code.externalCouponId,
                discountValue: code.discountValue
              });
            } else {
              console.warn('⚠️ Código de desconto não encontrado ou inativo:', discountCodeId);
            }
          } catch (error) {
            console.error('❌ Erro ao buscar código de desconto:', error);
          }
        }

        try {
          // Criar sessão de checkout do Stripe
          const paymentProvider = getPaymentProvider();
          if (!paymentProvider) {
            throw new Error('Provedor de pagamento não disponível');
          }

          // Preparar metadata para o Stripe
          const metadata = {
            userId: user.id.toString(),
            planId: planId.toString(),
            ...(discountCode && { discountCodeId: discountCode.id.toString() })
          };

          // Preparar dados completos do cliente para Stripe
          const customerData = {
            email: registrationData.email,
            name: fullName,
            phone: registrationData.phone,
            cpf: registrationData.cpf, // Para compliance fiscal brasileiro
            address: {
              line1: `${logradouro}, ${numero}${complemento ? `, ${complemento}` : ''}`,
              city: cidade,
              state: uf,
              postal_code: cep.replace(/\D/g, ''), // CEP apenas números
              country: 'BR'
            },
            metadata: {
              userId: user.id.toString(),
              crm: `${registrationData.crm || registrationData.crmNumber}-${registrationData.crmUf || registrationData.crmState}`,
              medicalSpecialtyId: registrationData.medicalSpecialtyId?.toString(),
              source: 'medsync-registration'
            }
          };

          // Criar sessão de checkout com dados completos do cliente
          const checkoutParams = {
            priceId: billingInterval === 'yearly' ? plan.priceIdYearly : plan.priceIdMonthly, // Usar preço baseado no billingInterval
            mode: 'subscription' as const,
            customerData: customerData, // Dados para criação automática do Customer
            successUrl: `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/checkout/cancel`,
            couponId: discountCode?.externalCouponId || undefined, // Cupom gerenciado pelo StripeProvider
            metadata
          };
          
          console.log('🎯 Parâmetros para checkout session:', {
            billingInterval: billingInterval,
            priceId: checkoutParams.priceId,
            priceIdMonthly: plan.priceIdMonthly,
            priceIdYearly: plan.priceIdYearly,
            couponId: checkoutParams.couponId,
            hasDiscount: !!discountCode,
            discountDetails: discountCode ? {
              code: discountCode.code,
              value: discountCode.discountValue,
              externalId: discountCode.externalCouponId
            } : null
          });
          
          const checkoutSession = await paymentProvider.createCheckoutSession(checkoutParams);

          console.log('✅ Sessão de checkout criada:', checkoutSession.url);

          res.status(201).json({
            ...userWithoutPassword,
            message: "Dados salvos com sucesso. Redirecionando para pagamento...",
            requiresPayment: true,
            planId: planId,
            checkoutUrl: checkoutSession.url,
            sessionId: checkoutSession.id,
            discountApplied: !!discountCode
          });
        } catch (paymentError) {
          console.error('❌ Erro ao criar sessão de pagamento:', paymentError);
          // Fallback para o comportamento anterior
          res.status(201).json({
            ...userWithoutPassword,
            message: "Dados salvos com sucesso. Complete o pagamento para ativar sua conta.",
            requiresPayment: true,
            planId: planId
          });
        }
      }
    } catch (error) {
      console.error("Erro ao registrar usuário com plano:", error);
      next(error);
    }
  });

  // Função comum de login para ser reutilizada
  const handleLogin = (req: any, res: any, next: any) => {
    console.log("🔐 Iniciando processo de login para:", req.body.username);
    
    // Extrair o parâmetro remember do corpo da requisição
    const remember = req.body.remember === true;
    
    // Se o usuário escolheu "lembrar de mim", extender a sessão
    if (remember) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 dias
      console.log("Lembrar sessão ativado: sessão durará 30 dias");
    } else {
      req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 1 dia (padrão para sessões curtas)
      console.log("Sessão padrão: durará 1 dia");
    }
    
    passport.authenticate("local", (err: any, user: any, info: any) => {
      console.log("🔐 Resultado da autenticação:", { err: !!err, user: !!user, info: info?.message });
      
      if (err) { 
        console.error("❌ Erro na autenticação:", err);
        return next(err); 
      }
      
      if (!user) { 
        console.log("❌ Usuário não autenticado:", info?.message);
        return res.status(401).json({ message: info.message }); 
      }
      
      console.log("🔐 Tentando fazer login do usuário:", user.id);
      req.login(user, (loginErr: any) => {
        if (loginErr) { 
          console.error("❌ Erro no req.login:", loginErr);
          return next(loginErr); 
        }
        
        console.log("✅ Login realizado com sucesso para usuário:", user.id);
        console.log("🔐 Session ID:", req.sessionID);
        
        // Notificar o webhook sobre o acesso do usuário com logs detalhados
        WebhookService.notifyUserAccess(user, true); // Ativar modo verboso
        
        // Não enviar a senha no retorno
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      });
    })(req, res, next);
  };

  // Endpoint principal de login
  app.post("/api/login", handleLogin);
  
  // Endpoint alternativo para compatibilidade (pode ser usado pelo frontend)
  app.post("/api/auth/login", handleLogin);

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logout realizado com sucesso" });
    });
  });

  app.get("/api/user", (req, res) => {
    console.log("🔐 GET /api/user - Verificando autenticação:", {
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      sessionID: req.sessionID
    });
    
    if (!req.isAuthenticated()) {
      console.log("❌ Usuário não autenticado em /api/user");
      return res.status(401).send();
    }
    
    // Não enviar a senha no retorno
    const { password, ...userWithoutPassword } = req.user;
    console.log("✅ Dados do usuário retornados pela API:", {
      id: userWithoutPassword.id,
      username: userWithoutPassword.username,
      roleId: userWithoutPassword.roleId,
      name: userWithoutPassword.name
    });
    res.json(userWithoutPassword);
  });
  
  // Endpoint para registrar aceitação do termo de consentimento
  app.post("/api/user/accept-consent", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autorizado" });
    }
    
    try {
      const userId = req.user.id;
      const now = new Date();
      
      // Atualizar o campo consentAccepted do usuário
      storage.updateUser(userId, {
        consentAccepted: now
      }).then(updatedUser => {
        if (!updatedUser) {
          return res.status(404).json({ message: "Usuário não encontrado" });
        }
        
        // Registrar evento de consentimento via webhook
        WebhookService.sendNotification({
          event: "user_consent_accepted",
          timestamp: now.toISOString(),
          user: {
            id: updatedUser.id,
            username: updatedUser.username,
            email: updatedUser.email,
            name: updatedUser.name
          }
        });
        
        res.status(200).json({ 
          message: "Termo de consentimento aceito com sucesso",
          consentAccepted: now
        });
      }).catch(error => {
        console.error("Erro ao registrar aceitação do termo:", error);
        res.status(500).json({ message: "Erro ao registrar aceitação do termo" });
      });
    } catch (error) {
      console.error("Erro ao processar aceitação do termo:", error);
      res.status(500).json({ message: "Erro ao processar aceitação do termo" });
    }
  });
  
  // Rota pública para obter funções disponíveis para registro
  app.get("/api/public/roles", async (req, res) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (error) {
      console.error("Erro ao buscar funções públicas:", error);
      res.status(500).json({ message: "Falha ao buscar funções públicas" });
    }
  });
  
  // Rota para validação de CRM movida para routes.ts
  
  // Endpoint para recuperação de senha - gera token
  app.post("/api/forgot-password", async (req, res, next) => {
    try {
      console.log("🔄 [RECUPERAÇÃO DE SENHA] Iniciando processo de recuperação de senha");
      const { email } = req.body;
      console.log(`🔄 [RECUPERAÇÃO DE SENHA] Email recebido: ${email}`);
      
      if (!email) {
        console.log("❌ [RECUPERAÇÃO DE SENHA] Email não fornecido");
        return res.status(400).json({ message: "Email é obrigatório" });
      }
      
      console.log(`🔄 [RECUPERAÇÃO DE SENHA] Verificando se o email ${email} existe no banco de dados`);
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        console.log(`❌ [RECUPERAÇÃO DE SENHA] Email ${email} não encontrado no banco de dados`);
        // Por segurança, não informamos se o email existe ou não
        return res.status(200).json({ message: "Se este email estiver cadastrado, você receberá instruções de recuperação." });
      }
      
      console.log(`✅ [RECUPERAÇÃO DE SENHA] Email ${email} encontrado, pertence ao usuário: ${user.name || user.username}`);
      
      // Gerar token de recuperação
      console.log("🔄 [RECUPERAÇÃO DE SENHA] Gerando token de recuperação");
      const resetToken = randomBytes(20).toString('hex');
      const resetExpires = new Date();
      resetExpires.setHours(resetExpires.getHours() + 1);  // Válido por 1 hora
      console.log(`🔄 [RECUPERAÇÃO DE SENHA] Token gerado: ${resetToken} (válido até ${resetExpires.toISOString()})`);
      
      console.log(`🔄 [RECUPERAÇÃO DE SENHA] Atualizando usuário com token`);
      await storage.updateUser(user.id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires
      });
      console.log(`✅ [RECUPERAÇÃO DE SENHA] Usuário atualizado com token`);
      
      // Enviar email com link de recuperação
      console.log(`🔄 [RECUPERAÇÃO DE SENHA] Enviando email para ${email}`);
      const emailSent = await sendPasswordResetEmail(email, resetToken, user.name || user.username);
      console.log(`${emailSent ? '✅' : '❌'} [RECUPERAÇÃO DE SENHA] Email ${emailSent ? 'enviado' : 'não enviado'}`);
      
      // Em desenvolvimento, fornecer token diretamente se email falhar
      const response: any = { 
        message: emailSent 
          ? "Se este email estiver cadastrado, você receberá instruções de recuperação."
          : "Email de recuperação falhou. Token de desenvolvimento fornecido abaixo.",
        success: emailSent
      };
      
      // Adicionar token em desenvolvimento quando email falha
      if (!emailSent && (process.env.NODE_ENV === 'development' || !process.env.SENDGRID_API_KEY)) {
        response.token = resetToken;
        response.resetUrl = `${req.protocol}://${req.get('host')}/auth?reset=${resetToken}`;
        console.log(`🔗 [RECUPERAÇÃO DE SENHA] URL de reset para desenvolvimento: ${response.resetUrl}`);
      }
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });
  
  // Endpoint para redefinir senha usando token
  app.post("/api/reset-password", async (req, res, next) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ message: "Token e senha são obrigatórios" });
      }
      
      const user = await storage.getUserByResetToken(token);
      if (!user || !user.passwordResetExpires || new Date(user.passwordResetExpires) < new Date()) {
        return res.status(400).json({ message: "Token de recuperação inválido ou expirado" });
      }
      
      // Atualizar senha e limpar tokens
      await storage.updateUser(user.id, {
        password: await hashPassword(password),
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        lockoutUntil: null
      });
      
      res.status(200).json({ message: "Senha atualizada com sucesso" });
    } catch (error) {
      next(error);
    }
  });

  // === ROTAS DE LEAD TRACKING (migradas de routes.ts) ===
  
  // API para tracking de leads incompletos
  app.post("/api/track-lead", async (req: any, res: any) => {
    try {
      const trackingData = req.body;
      console.log("📧 Lead tracking recebido:", trackingData);
      
      // Salvar no banco via storage usando o método que faz merge
      if (trackingData.email) {
        // Usar o método que já faz merge automático (não tentará criar duplicata)
        await storage.createIncompleteRegistration(trackingData);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao processar tracking:", error);
      res.json({ success: false }); // Não falhar o registro
    }
  });

  // API para recuperar dados de registro incompleto pelo email
  app.get('/api/incomplete-registration/:email', async (req: any, res: any) => {
    try {
      const { email } = req.params;
      
      if (!email) {
        return res.status(400).json({ error: 'Email é obrigatório' });
      }

      console.log('🔍 Buscando registro incompleto para email:', email);
      
      const registration = await storage.getIncompleteRegistrationByEmail(email);
      
      if (!registration) {
        return res.status(404).json({ error: 'Registro não encontrado' });
      }

      // Retornar apenas os dados necessários para preencher o formulário
      let additionalData = {};
      
      // Tentar fazer parse do userDataJson de forma segura
      if (registration.userDataJson) {
        try {
          // Verificar se é string válida antes de fazer parse
          if (typeof registration.userDataJson === 'string' && registration.userDataJson !== '[object Object]') {
            additionalData = JSON.parse(registration.userDataJson);
          } else {
            console.log('⚠️ userDataJson não é string JSON válida:', registration.userDataJson);
          }
        } catch (error) {
          console.error('❌ Erro ao fazer parse do userDataJson:', error);
        }
      }
      
      const formData = {
        firstName: registration.firstName,
        lastName: registration.lastName, 
        cpf: registration.cpf,
        email: registration.email,
        phone: registration.phone,
        username: registration.username,
        // Dados específicos do registro que podem ter sido salvos
        ...additionalData
      };

      console.log('✅ Dados encontrados:', { email, hasData: Object.keys(formData).length });
      
      res.json({
        success: true,
        data: formData,
        selectedPlanId: registration.selectedPlanId || null
      });

    } catch (error) {
      console.error('❌ Erro ao buscar registro incompleto:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

}

// Middleware para verificar autenticação
export function isAuthenticated(req: any, res: any, next: any) {
  console.log("🔍 Verificação de autenticação:", {
    isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
    hasUser: !!req.user,
    sessionID: req.sessionID,
    userId: req.user?.id
  });
  
  if (req.isAuthenticated && req.isAuthenticated()) {
    console.log("✅ Usuário autenticado:", req.user?.id);
    return next();
  }
  
  console.log("❌ Usuário não autenticado");
  res.status(401).json({ message: "Não autorizado" });
}

// Middleware para verificar status do trial
export async function checkTrialStatus(req: any, res: any, next: any) {
  // Se não está autenticado, passar adiante para outros middlewares lidarem
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return next();
  }

  const user = req.user;
  
  try {
    // Buscar assinatura do usuário na nova estrutura
    const userSubscription = await storage.getUserSubscription(user.id);
    
    // Se não tem assinatura, assumir que não está em trial
    if (!userSubscription || userSubscription.status !== 'trial') {
      return next();
    }

    const now = new Date();
    const trialEndDate = userSubscription.trialEndsAt ? new Date(userSubscription.trialEndsAt) : null;

    console.log("🔍 Verificação de trial:", {
      userId: user.id,
      subscriptionStatus: userSubscription.status,
      trialEndDate: userSubscription.trialEndsAt,
      now: now.toISOString(),
      isExpired: trialEndDate ? now > trialEndDate : false
    });

    // Se trial expirou
    if (trialEndDate && now > trialEndDate) {
      console.log(`❌ Trial expirado para usuário ${user.id}`);
      
      // Atualizar status da assinatura no banco
      await storage.updateUserSubscription(userSubscription.id, { 
        status: 'expired',
        updatedAt: new Date()
      });
      
      return res.status(403).json({ 
        message: "Seu período de teste expirou. Faça upgrade do seu plano para continuar usando o sistema.",
        trialExpired: true,
        trialEndDate: userSubscription.trialEndsAt
      });
    }

    // Se trial está cancelado
    if (userSubscription.status === 'cancelled') {
      console.log(`❌ Trial cancelado para usuário ${user.id}`);
      return res.status(403).json({
        message: "Sua conta trial foi cancelada. Entre em contato com o suporte.",
        trialCancelled: true
      });
    }

    // Trial ativo, continuar
    if (trialEndDate) {
      console.log(`✅ Trial ativo para usuário ${user.id} até ${trialEndDate.toISOString()}`);
    }
    next();
  } catch (error) {
    console.error("Erro ao verificar status do trial:", error);
    // Em caso de erro, permitir que continue para evitar bloqueios
    next();
  }
}

// Middleware para verificar permissões específicas
export function hasPermission(permission: string) {
  return async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autorizado" });
    }
    
    try {
      // Se o usuário é administrador (roleId = 1), conceder acesso automático
      if (req.user.roleId === 1) {
        return next();
      }
      
      const userId = req.user.id;
      
      // Verificar permissões individuais do usuário primeiro (podem sobrescrever as do papel)
      const userPermission = await storage.getUserPermission(userId, permission);
      if (userPermission) {
        // Se há uma negação explícita, negar acesso
        if (userPermission.granted === false) {
          return res.status(403).json({ message: "Acesso negado" });
        }
        // Se há uma concessão explícita, permitir acesso
        if (userPermission.granted === true) {
          return next();
        }
      }
      
      // Verificar permissões do papel do usuário
      const hasRolePermission = await storage.checkRolePermission(req.user.roleId, permission);
      if (hasRolePermission) {
        return next();
      }
      
      // Nenhuma permissão encontrada
      return res.status(403).json({ message: "Acesso negado" });
    } catch (error) {
      return next(error);
    }
  };
}

// Função auxiliar para verificação síncrona de permissões
// Útil para verificações dentro de outros handlers de rotas
export function hasPermissionCheck(req: any, permission: string): boolean {
  if (!req.isAuthenticated() || !req.user) {
    return false;
  }
  
  // Para simplificar, assumimos que os usuários têm acesso aos seus próprios recursos
  // Em um sistema real, isso deve ser baseado na estrutura de permissões do banco de dados
  if (permission === 'orders_edit' || permission === 'orders_view') {
    return true;
  }
  
  // Os administradores têm acesso a todas as permissões
  if (req.user.roleId === 1) { // Assumindo que ID 1 é o de administrador
    return true;
  }
  
  return false;
}
