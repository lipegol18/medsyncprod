import { Router } from 'express';
import { storage } from '../storage';
import { insertUserSubscriptionSchema } from '@shared/schema';
import { getPaymentProvider } from '../payments';
import { getBaseUrl } from '../utils/environment';
import { findPromotionCodeByCode } from '../services/discounts/discountService';

const router = Router();

/**
 * Buscar todos os planos de assinatura (rota pública)
 * GET /api/subscriptions/plans
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = await storage.getAllSubscriptionPlans();
    res.json(plans);
  } catch (error) {
    console.error('Erro ao buscar planos de assinatura:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Buscar assinatura do usuário atual
 * GET /api/subscriptions/me
 */
router.get('/me', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const subscription = await storage.getUserSubscriptionWithPlan(req.user.id);
    if (!subscription) {
      return res.status(404).json({ error: 'Nenhuma assinatura encontrada' });
    }

    res.json(subscription);
  } catch (error) {
    console.error('Erro ao buscar assinatura:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Verificar se assinatura do usuário é válida
 * GET /api/subscriptions/me/validate
 */
router.get('/me/validate', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const validation = await storage.isUserSubscriptionValid(req.user.id);
    res.json(validation);
  } catch (error) {
    console.error('Erro ao validar assinatura:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Criar assinatura trial para usuário atual
 * POST /api/subscriptions/trial
 */
router.post('/trial', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Verificar se usuário já tem assinatura
    const existingSubscription = await storage.getUserSubscription(req.user.id);
    if (existingSubscription) {
      return res.status(409).json({ error: 'Usuário já possui assinatura' });
    }

    const subscription = await storage.createTrialSubscription(req.user.id);
    res.status(201).json(subscription);
  } catch (error) {
    console.error('Erro ao criar assinatura trial:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Criar assinatura vitalícia para usuário atual (para testes)
 * POST /api/subscriptions/lifetime
 */
router.post('/lifetime', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { discountCode } = req.body;

    // Verificar se usuário já tem assinatura
    const existingSubscription = await storage.getUserSubscription(req.user.id);
    if (existingSubscription) {
      return res.status(409).json({ error: 'Usuário já possui assinatura' });
    }

    const subscription = await storage.createLifetimeSubscription(req.user.id, discountCode);
    res.status(201).json(subscription);
  } catch (error) {
    console.error('Erro ao criar assinatura vitalícia:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Criar assinatura com desconto promocional temporal
 * POST /api/subscriptions/promotional
 */
router.post('/promotional', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { planId, discountPercent, durationMonths, description } = req.body;

    if (!planId || !discountPercent || !durationMonths) {
      return res.status(400).json({ 
        error: 'planId, discountPercent e durationMonths são obrigatórios' 
      });
    }

    // Verificar se usuário já tem assinatura
    const existingSubscription = await storage.getUserSubscription(req.user.id);
    if (existingSubscription) {
      return res.status(409).json({ error: 'Usuário já possui assinatura' });
    }

    const subscription = await storage.createPromotionalSubscription(
      req.user.id, 
      parseInt(planId), 
      parseInt(discountPercent), 
      parseInt(durationMonths),
      description
    );
    
    res.status(201).json(subscription);
  } catch (error) {
    console.error('Erro ao criar assinatura promocional:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Obter preço atual da assinatura (considerando promoções)
 * GET /api/subscriptions/me/current-price
 */
router.get('/me/current-price', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const priceInfo = await storage.getCurrentSubscriptionPrice(req.user.id);
    res.json(priceInfo);
  } catch (error) {
    console.error('Erro ao obter preço atual:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Verificar se promoção expirou
 * POST /api/subscriptions/me/check-expiry
 */
router.post('/me/check-expiry', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const expiry = await storage.checkPromotionalExpiry(req.user.id);
    res.json(expiry);
  } catch (error) {
    console.error('Erro ao verificar expiração:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Buscar histórico de pagamentos da assinatura atual
 * GET /api/subscriptions/me/payments
 */
router.get('/me/payments', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const subscription = await storage.getUserSubscription(req.user.id);
    if (!subscription) {
      return res.status(404).json({ error: 'Nenhuma assinatura encontrada' });
    }

    const payments = await storage.getSubscriptionPayments(subscription.id);
    res.json(payments);
  } catch (error) {
    console.error('Erro ao buscar pagamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Criar sessão de checkout para pagamento pendente
 * POST /api/subscriptions/pending-payment/checkout
 * Body: { planId: number, billingInterval: 'monthly' | 'yearly' }
 */
router.post('/pending-payment/checkout', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { planId, billingInterval = 'monthly' } = req.body;

    // Verificar se usuário tem assinatura pendente
    const subscription = await storage.getUserSubscription(req.user.id);
    if (!subscription || subscription.status !== 'pending_payment') {
      return res.status(400).json({ error: 'Usuário não possui pagamento pendente' });
    }

    // Buscar plano
    const targetPlanId = planId || subscription.planId;
    const plan = await storage.getSubscriptionPlan(targetPlanId);
    if (!plan) {
      return res.status(404).json({ error: 'Plano não encontrado' });
    }

    // Determinar priceId baseado no intervalo
    const priceId = billingInterval === 'yearly' ? plan.priceIdYearly : plan.priceIdMonthly;
    if (!priceId) {
      return res.status(400).json({ error: 'Preço não disponível para este intervalo' });
    }

    // Configurar desconto baseado no billing interval
    let promotionCodeId: string | undefined;
    let allowPromotionCodes = true;

    if (billingInterval === 'yearly') {
      // Plano anual: aplicar WELCOME50 automaticamente e desabilitar entrada manual
      console.log("📅 [PENDING_PAYMENT] Plano ANUAL detectado - buscando código WELCOME50...");
      
      const welcomePromo = await findPromotionCodeByCode("WELCOME50");
      if (welcomePromo && welcomePromo.isActive && welcomePromo.stripePromotionCodeId) {
        promotionCodeId = welcomePromo.stripePromotionCodeId;
        allowPromotionCodes = false;
        console.log(`✅ [PENDING_PAYMENT] Código WELCOME50 encontrado e será aplicado automaticamente: ${promotionCodeId}`);
      } else {
        console.log("⚠️ [PENDING_PAYMENT] Código WELCOME50 não encontrado ou inativo - permitindo códigos manuais");
      }
    } else {
      // Plano mensal: permitir códigos promocionais manuais
      console.log("📅 [PENDING_PAYMENT] Plano MENSAL detectado - códigos promocionais habilitados para entrada manual");
    }

    // Criar sessão de checkout
    const paymentProvider = getPaymentProvider();
    const baseUrl = getBaseUrl();

    const checkoutSession = await paymentProvider.createCheckoutSession({
      priceId,
      mode: 'subscription',
      successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/checkout/cancel`,
      customerData: {
        email: req.user.email,
        name: req.user.username,
      },
      metadata: {
        userId: String(req.user.id),
        planId: String(targetPlanId),
        billingInterval,
        flow: 'registration',
      },
      promotionCodeId,
      allowPromotionCodes,
    });

    console.log(`✅ [PENDING_PAYMENT] Checkout criado para usuário ${req.user.id}: ${checkoutSession.url}`);

    res.json({ 
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id 
    });
  } catch (error: any) {
    console.error('Erro ao criar checkout para pagamento pendente:', error);
    res.status(500).json({ error: 'Erro ao criar sessão de pagamento', details: error.message });
  }
});

/**
 * Criar sessão de checkout para usuário com trial expirado
 * POST /api/subscriptions/trial-upgrade/checkout
 * Body: { planId: number, billingInterval: 'monthly' | 'yearly' }
 */
router.post('/trial-upgrade/checkout', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { planId, billingInterval = 'monthly' } = req.body;

    if (!planId) {
      return res.status(400).json({ error: 'planId é obrigatório' });
    }

    // Verificar se usuário tem assinatura com trial expirado
    const subscription = await storage.getUserSubscription(req.user.id);
    if (!subscription || subscription.status !== 'trial_expired') {
      return res.status(400).json({ error: 'Usuário não possui trial expirado' });
    }

    // Buscar plano
    const plan = await storage.getSubscriptionPlan(planId);
    if (!plan) {
      return res.status(404).json({ error: 'Plano não encontrado' });
    }

    // Determinar priceId baseado no intervalo
    const priceId = billingInterval === 'yearly' ? plan.priceIdYearly : plan.priceIdMonthly;
    if (!priceId) {
      return res.status(400).json({ error: 'Preço não disponível para este intervalo' });
    }

    // Atualizar assinatura com novo plano e status pending_payment
    await storage.updateUserSubscription(subscription.id, {
      planId: plan.id,
      status: 'pending_payment',
      paymentProvider: 'stripe',
    });

    // Configurar desconto baseado no billing interval
    let promotionCodeId: string | undefined;
    let allowPromotionCodes = true;

    if (billingInterval === 'yearly') {
      // Plano anual: aplicar WELCOME50 automaticamente e desabilitar entrada manual
      console.log("📅 [TRIAL_UPGRADE] Plano ANUAL detectado - buscando código WELCOME50...");
      
      const welcomePromo = await findPromotionCodeByCode("WELCOME50");
      if (welcomePromo && welcomePromo.isActive && welcomePromo.stripePromotionCodeId) {
        promotionCodeId = welcomePromo.stripePromotionCodeId;
        allowPromotionCodes = false;
        console.log(`✅ [TRIAL_UPGRADE] Código WELCOME50 encontrado e será aplicado automaticamente: ${promotionCodeId}`);
      } else {
        console.log("⚠️ [TRIAL_UPGRADE] Código WELCOME50 não encontrado ou inativo - permitindo códigos manuais");
      }
    } else {
      // Plano mensal: permitir códigos promocionais manuais
      console.log("📅 [TRIAL_UPGRADE] Plano MENSAL detectado - códigos promocionais habilitados para entrada manual");
    }

    // Criar sessão de checkout
    const paymentProvider = getPaymentProvider();
    const baseUrl = getBaseUrl();

    const checkoutSession = await paymentProvider.createCheckoutSession({
      priceId,
      mode: 'subscription',
      successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/checkout/cancel`,
      customerData: {
        email: req.user.email,
        name: req.user.username,
      },
      metadata: {
        userId: String(req.user.id),
        planId: String(plan.id),
        billingInterval,
        flow: 'trial_upgrade',
      },
      promotionCodeId,
      allowPromotionCodes,
    });

    console.log(`✅ [TRIAL_UPGRADE] Checkout criado para usuário ${req.user.id}: ${checkoutSession.url}`);

    res.json({ 
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id 
    });
  } catch (error: any) {
    console.error('Erro ao criar checkout para trial upgrade:', error);
    res.status(500).json({ error: 'Erro ao criar sessão de pagamento', details: error.message });
  }
});

/**
 * Criar sessão do Stripe Customer Portal para gerenciamento de assinatura
 * POST /api/subscriptions/billing-portal
 * Permite ao usuário:
 * - Atualizar forma de pagamento
 * - Ver histórico de faturas
 * - Cancelar assinatura
 */
router.post('/billing-portal', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Buscar assinatura do usuário
    const subscription = await storage.getUserSubscription(req.user.id);
    if (!subscription) {
      return res.status(404).json({ error: 'Nenhuma assinatura encontrada' });
    }

    // Verificar se tem customer ID do Stripe
    const customerId = subscription.paymentProviderCustomerId;
    if (!customerId) {
      return res.status(400).json({ error: 'Usuário não possui cadastro no provedor de pagamento' });
    }

    // Criar sessão do Billing Portal
    const paymentProvider = getPaymentProvider();
    const baseUrl = getBaseUrl();

    const portalSession = await paymentProvider.createBillingPortalSession({
      customerId,
      returnUrl: `${baseUrl}/welcome`,
    });

    console.log(`🔧 [BILLING_PORTAL] Sessão criada para usuário ${req.user.id}`);

    res.json({ 
      portalUrl: portalSession.url 
    });
  } catch (error: any) {
    console.error('Erro ao criar sessão do Billing Portal:', error);
    res.status(500).json({ error: 'Erro ao criar sessão de gerenciamento', details: error.message });
  }
});

export default router;