import { Router } from 'express';
import { storage } from '../storage';

const router = Router();

/**
 * Validar código de desconto
 * POST /api/discount-codes/validate
 */
router.post('/validate', async (req, res) => {
  try {
    const { code, planId } = req.body;
    
    if (!code || !planId) {
      return res.status(400).json({ error: 'Código e planId são obrigatórios' });
    }

    const validation = await storage.validateDiscountCode(code, parseInt(planId));
    
    if (!validation.valid) {
      const errorMessages = {
        not_found: 'Código de desconto não encontrado',
        inactive: 'Código de desconto inativo',
        not_started: 'Código de desconto ainda não válido',
        expired: 'Código de desconto expirado',
        max_uses_reached: 'Código de desconto esgotado',
        plan_not_applicable: 'Código não aplicável a este plano',
        error: 'Erro ao validar código'
      };

      return res.status(400).json({
        valid: false,
        error: errorMessages[validation.reason as keyof typeof errorMessages] || 'Código inválido',
        reason: validation.reason
      });
    }

    // Calcular preço com desconto
    const plan = await storage.getSubscriptionPlan(parseInt(planId));
    if (!plan) {
      return res.status(404).json({ error: 'Plano não encontrado' });
    }

    const originalPrice = plan.priceMonthly;
    const discountCalculation = storage.calculateDiscountedPrice(originalPrice, validation.discount!);

    res.json({
      valid: true,
      discount: validation.discount,
      originalPrice,
      finalPrice: discountCalculation.finalPrice,
      discountAmount: discountCalculation.discountAmount,
      savings: discountCalculation.discountAmount
    });
  } catch (error) {
    console.error('Erro ao validar código de desconto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Aplicar código de desconto (incrementar uso)
 * POST /api/discount-codes/apply
 */
router.post('/apply', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Código é obrigatório' });
    }

    const discountCode = await storage.applyDiscountCode(code);
    res.json({ success: true, discountCode });
  } catch (error) {
    console.error('Erro ao aplicar código de desconto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;