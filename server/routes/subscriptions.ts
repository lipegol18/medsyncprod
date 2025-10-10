import { Router } from 'express';
import { storage } from '../storage';
import { insertUserSubscriptionSchema } from '@shared/schema';

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

export default router;