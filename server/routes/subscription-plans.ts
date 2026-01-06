import { Router } from 'express';
import { storage } from '../storage';
import { insertSubscriptionPlanSchema } from '@shared/schema';
import { isAuthenticated, hasPermission } from '../auth';
import { getPaymentProvider, PaymentProvider } from '../payments';

const router = Router();

/**
 * Buscar todos os planos de assinatura (administradores podem ver todos, usuários só ativos)
 * GET /api/subscription-plans
 */
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const isAdminUser = req.user?.roleId === 1; // Assumindo que roleId 1 é admin
    
    if (isAdminUser) {
      // Administradores veem todos os planos (ativos e inativos)
      const plans = await storage.getAllSubscriptionPlans();
      res.json(plans);
    } else {
      // Usuários comuns veem apenas planos ativos
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    }
  } catch (error) {
    console.error('Erro ao buscar planos de assinatura:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Buscar plano de assinatura por ID
 * GET /api/subscription-plans/:id
 */
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const plan = await storage.getSubscriptionPlan(id);
    if (!plan) {
      return res.status(404).json({ error: 'Plano não encontrado' });
    }

    res.json(plan);
  } catch (error) {
    console.error('Erro ao buscar plano:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Criar novo plano de assinatura com integração automática do Stripe
 * POST /api/subscription-plans
 */
router.post('/', isAuthenticated, async (req, res) => {
  // Verificar se é administrador
  if (req.user?.roleId !== 1) {
    return res.status(403).json({ error: 'Acesso negado: permissão de administrador necessária' });
  }
  try {
    const validatedData = insertSubscriptionPlanSchema.parse(req.body);
    
    // Verificar se já existe plano com o mesmo nome
    const existingPlan = await storage.getSubscriptionPlanByName(validatedData.name);
    if (existingPlan) {
      return res.status(409).json({ error: 'Plano com este nome já existe' });
    }

    // Se não foram fornecidos IDs do Stripe, criar automaticamente
    let productId = validatedData.productId;
    let priceIdMonthly = validatedData.priceIdMonthly;
    let priceIdYearly = validatedData.priceIdYearly;

    if (!productId || productId.trim() === '') {
      console.log(`🔧 Criando produto automaticamente para: ${validatedData.name}`);
      console.log(`💰 Preço mensal: ${validatedData.priceMonthly} centavos`);
      console.log(`💰 Preço anual: ${validatedData.priceYearly} centavos`);
      
      try {
        const paymentProvider = getPaymentProvider();
        console.log(`🏭 Usando provedor: ${paymentProvider.getProviderName()}`);
        
        // 1. Criar produto
        const productResult = await paymentProvider.ensureProduct({
          name: validatedData.name,
          description: validatedData.description,
          metadata: {
            plan_name: validatedData.name
          }
        });
        
        productId = productResult.id;
        console.log(`✅ Produto criado: ${productId}`);

        // 2. Criar preço mensal se fornecido
        if (validatedData.priceMonthly && validatedData.priceMonthly > 0) {
          const monthlyPriceResult = await paymentProvider.ensurePrice({
            productId: productId,
            amount: validatedData.priceMonthly,
            currency: 'brl',
            interval: 'month',
            metadata: {
              plan_name: validatedData.name,
              billing_period: 'monthly'
            }
          });
          
          priceIdMonthly = monthlyPriceResult.id;
          console.log(`✅ Preço mensal criado: ${priceIdMonthly}`);
        } else {
          console.log(`⚠️  Preço mensal não será criado (valor: ${validatedData.priceMonthly})`);
        }

        // 3. Criar preço anual se fornecido
        if (validatedData.priceYearly && validatedData.priceYearly > 0) {
          const yearlyPriceResult = await paymentProvider.ensurePrice({
            productId: productId,
            amount: validatedData.priceYearly,
            currency: 'brl',
            interval: 'year',
            metadata: {
              plan_name: validatedData.name,
              billing_period: 'yearly'
            }
          });
          
          priceIdYearly = yearlyPriceResult.id;
          console.log(`✅ Preço anual criado: ${priceIdYearly}`);
        } else {
          console.log(`⚠️  Preço anual não será criado (valor: ${validatedData.priceYearly})`);
        }
        
      } catch (paymentError: any) {
        console.error('❌ Erro ao criar no provedor de pagamento:', paymentError);
        
        const errorMessage = paymentError.message || 'Erro desconhecido';
        return res.status(500).json({ 
          error: 'Erro ao criar plano no provedor de pagamento: ' + errorMessage 
        });
      }
    } else {
      console.log(`⚠️  Criação automática no provedor pulada - já possui ID do produto: '${productId}'`);
    }

    // Criar o plano no banco com os IDs do Stripe (gerados automaticamente ou fornecidos)
    const planToCreate: any = {
      ...validatedData,
    };

    // Apenas incluir campos do Stripe se eles tiverem valores válidos (evita violação de unique constraint)
    if (productId && productId.trim() !== '') {
      planToCreate.productId = productId;
    }
    if (priceIdMonthly && priceIdMonthly.trim() !== '') {
      planToCreate.priceIdMonthly = priceIdMonthly;
    }
    if (priceIdYearly && priceIdYearly.trim() !== '') {
      planToCreate.priceIdYearly = priceIdYearly;
    }

    const newPlan = await storage.createSubscriptionPlan(planToCreate);
    
    console.log(`✅ Plano criado com sucesso: ${newPlan.name} (ID: ${newPlan.id})`);
    if (productId) {
      console.log(`📦 Produto pagamento: ${productId}`);
      console.log(`💰 Preço mensal: ${priceIdMonthly || 'não configurado'}`);
      console.log(`💰 Preço anual: ${priceIdYearly || 'não configurado'}`);
    }
    
    res.status(201).json(newPlan);
  } catch (error: any) {
    console.error('Erro ao criar plano:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Atualizar plano de assinatura
 * PUT /api/subscription-plans/:id
 */
router.put('/:id', isAuthenticated, async (req, res) => {
  console.log(`🚀 INICIANDO ATUALIZAÇÃO DE PLANO - ID: ${req.params.id}`);
  console.log(`📥 Body recebido:`, JSON.stringify(req.body, null, 2));
  
  // Verificar se é administrador
  if (req.user?.roleId !== 1) {
    console.log(`❌ Acesso negado para usuário com roleId: ${req.user?.roleId}`);
    return res.status(403).json({ error: 'Acesso negado: permissão de administrador necessária' });
  }
  
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      console.log(`❌ ID inválido: ${req.params.id}`);
      return res.status(400).json({ error: 'ID inválido' });
    }
    console.log(`✅ ID válido: ${id}`);

    console.log(`🔍 Validando dados com Zod...`);
    const validatedData = insertSubscriptionPlanSchema.parse(req.body);
    console.log(`✅ Dados validados:`, JSON.stringify(validatedData, null, 2));
    
    // Verificar se o plano existe
    const existingPlan = await storage.getSubscriptionPlan(id);
    if (!existingPlan) {
      return res.status(404).json({ error: 'Plano não encontrado' });
    }

    // Verificar se já existe outro plano com o mesmo nome
    const planWithSameName = await storage.getSubscriptionPlanByName(validatedData.name);
    if (planWithSameName && planWithSameName.id !== id) {
      return res.status(409).json({ error: 'Plano com este nome já existe' });
    }

    // 🔄 SINCRONIZAÇÃO AUTOMÁTICA COM STRIPE - Atualizar preços se necessário
    let finalData = { ...validatedData };
    
    console.log(`🔧 DEBUG - Verificando mudanças de preços:`);
    console.log(`   Preço mensal existente: ${existingPlan.priceMonthly} (tipo: ${typeof existingPlan.priceMonthly})`);
    console.log(`   Preço mensal novo: ${validatedData.priceMonthly} (tipo: ${typeof validatedData.priceMonthly})`);
    console.log(`   Preço anual existente: ${existingPlan.priceYearly} (tipo: ${typeof existingPlan.priceYearly})`);
    console.log(`   Preço anual novo: ${validatedData.priceYearly} (tipo: ${typeof validatedData.priceYearly})`);
    
    const monthlyChanged = existingPlan.priceMonthly !== validatedData.priceMonthly;
    const yearlyChanged = existingPlan.priceYearly !== validatedData.priceYearly;
    const pricesChanged = monthlyChanged || yearlyChanged;
    
    console.log(`   Preço mensal mudou? ${monthlyChanged}`);
    console.log(`   Preço anual mudou? ${yearlyChanged}`);
    console.log(`   Algum preço mudou? ${pricesChanged}`);

    if (pricesChanged && existingPlan.productId) {
      console.log(`🔄 Atualizando preços para: ${validatedData.name}`);
      console.log(`💰 Preço mensal: ${existingPlan.priceMonthly} → ${validatedData.priceMonthly} centavos`);
      console.log(`💰 Preço anual: ${existingPlan.priceYearly} → ${validatedData.priceYearly} centavos`);
      
      try {
        const paymentProvider = getPaymentProvider();
        console.log(`🏭 Usando provedor: ${paymentProvider.getProviderName()}`);
        
        let newPriceIdMonthly = existingPlan.priceIdMonthly;
        let newPriceIdYearly = existingPlan.priceIdYearly;

        // Criar novo preço mensal se mudou
        if (existingPlan.priceMonthly !== validatedData.priceMonthly && validatedData.priceMonthly && validatedData.priceMonthly > 0) {
          const monthlyPriceResult = await paymentProvider.ensurePrice({
            productId: existingPlan.productId,
            amount: validatedData.priceMonthly,
            currency: 'brl',
            interval: 'month'
          });
          newPriceIdMonthly = monthlyPriceResult.id;
          console.log(`✅ Novo preço mensal criado: ${monthlyPriceResult.id}`);
        }

        // Criar novo preço anual se mudou  
        if (existingPlan.priceYearly !== validatedData.priceYearly && validatedData.priceYearly && validatedData.priceYearly > 0) {
          const yearlyPriceResult = await paymentProvider.ensurePrice({
            productId: existingPlan.productId,
            amount: validatedData.priceYearly,
            currency: 'brl',
            interval: 'year'
          });
          newPriceIdYearly = yearlyPriceResult.id;
          console.log(`✅ Novo preço anual criado: ${yearlyPriceResult.id}`);
        }

        // Atualizar referências dos preços
        if (newPriceIdMonthly && newPriceIdMonthly.trim() !== '') {
          finalData.priceIdMonthly = newPriceIdMonthly;
        }
        if (newPriceIdYearly && newPriceIdYearly.trim() !== '') {
          finalData.priceIdYearly = newPriceIdYearly;
        }
        
        console.log(`✅ Preços atualizados no provedor de pagamento com sucesso!`);
        
      } catch (paymentError: any) {
        console.error('❌ Erro ao atualizar preços no provedor de pagamento:', paymentError);
        // Continuar com a atualização mesmo se o provedor falhar
        console.log('⚠️ Atualizando apenas no banco de dados...');
      }
    } else if (pricesChanged) {
      console.log(`⚠️ Atualização de preços no provedor pulada:`);
      console.log(`   - productId: '${existingPlan.productId || 'não configurado'}'`);
    }

    const updatedPlan = await storage.updateSubscriptionPlan(id, finalData);
    
    console.log(`✅ Plano atualizado: ${updatedPlan.name} (ID: ${updatedPlan.id})`);
    if (pricesChanged) {
      console.log(`💰 Novos preços: Mensal ${updatedPlan.priceMonthly}, Anual ${updatedPlan.priceYearly}`);
    }
    
    res.json(updatedPlan);
  } catch (error: any) {
    console.error('Erro ao atualizar plano:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Deletar plano de assinatura
 * DELETE /api/subscription-plans/:id
 */
router.delete('/:id', isAuthenticated, async (req, res) => {
  // Verificar se é administrador
  if (req.user?.roleId !== 1) {
    return res.status(403).json({ error: 'Acesso negado: permissão de administrador necessária' });
  }
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Verificar se o plano existe
    const existingPlan = await storage.getSubscriptionPlan(id);
    if (!existingPlan) {
      return res.status(404).json({ error: 'Plano não encontrado' });
    }

    // Verificar se há assinaturas ativas usando este plano
    const hasActiveSubscriptions = await storage.hasActiveSubscriptionsForPlan(id);
    if (hasActiveSubscriptions) {
      return res.status(409).json({ 
        error: 'Não é possível deletar plano com assinaturas ativas. Desative o plano em vez de deletá-lo.' 
      });
    }

    await storage.deleteSubscriptionPlan(id);
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar plano:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Ativar/Desativar plano de assinatura
 * PATCH /api/subscription-plans/:id/toggle-status
 */
router.patch('/:id/toggle-status', isAuthenticated, async (req, res) => {
  // Verificar se é administrador
  if (req.user?.roleId !== 1) {
    return res.status(403).json({ error: 'Acesso negado: permissão de administrador necessária' });
  }
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Verificar se o plano existe
    const existingPlan = await storage.getSubscriptionPlan(id);
    if (!existingPlan) {
      return res.status(404).json({ error: 'Plano não encontrado' });
    }

    const updatedPlan = await storage.toggleSubscriptionPlanStatus(id);
    res.json(updatedPlan);
  } catch (error) {
    console.error('Erro ao alternar status do plano:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;