import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

/**
 * Middleware para verificar se o usuário tem uma assinatura válida
 * Deve ser usado em rotas que requerem assinatura ativa
 */
export async function requireValidSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const validation = await storage.isUserSubscriptionValid(req.user.id);
    
    if (!validation.valid) {
      const errorMessages = {
        no_subscription: 'Nenhuma assinatura encontrada. Contate o suporte.',
        trial_expired: 'Seu período de teste expirou. Escolha um plano pago para continuar.',
        subscription_expired: 'Sua assinatura expirou. Renove para continuar usando o sistema.',
        cancelled: 'Sua assinatura foi cancelada.',
        past_due: 'Seu pagamento está em atraso. Regularize para continuar.',
        error: 'Erro ao validar assinatura. Tente novamente.'
      };

      return res.status(402).json({ 
        error: errorMessages[validation.reason as keyof typeof errorMessages] || 'Assinatura inválida',
        reason: validation.reason,
        subscription: validation.subscription 
      });
    }

    // Adicionar informações da assinatura no request para uso posterior
    req.subscription = validation.subscription;
    next();
  } catch (error) {
    console.error('Erro no middleware de assinatura:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

/**
 * Middleware para verificar se o usuário tem funcionalidades específicas no plano
 */
export function requireFeature(feature: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.subscription) {
        return res.status(403).json({ error: 'Informações de assinatura não disponíveis' });
      }

      const userFeatures = req.subscription.plan.features || [];
      
      // Verificar se tem acesso a todas as funcionalidades ou à funcionalidade específica
      if (!userFeatures.includes('all_features') && !userFeatures.includes(feature)) {
        return res.status(403).json({ 
          error: `Funcionalidade '${feature}' não disponível no seu plano atual`,
          currentPlan: req.subscription.plan.name,
          availableFeatures: userFeatures
        });
      }

      next();
    } catch (error) {
      console.error('Erro no middleware de funcionalidade:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };
}

/**
 * Middleware para verificar limite de usuários no plano
 */
export async function checkUserLimit(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.subscription) {
      return res.status(403).json({ error: 'Informações de assinatura não disponíveis' });
    }

    const maxUsers = req.subscription.plan.maxUsers;
    
    // Contar usuários ativos (implementar conforme necessário)
    // const activeUsers = await storage.countActiveUsers();
    
    // Por enquanto, apenas verificar se o plano permite múltiplos usuários
    if (maxUsers === 1) {
      // Para planos individuais, pode ter validações específicas
    }

    next();
  } catch (error) {
    console.error('Erro no middleware de limite de usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Tipos para TypeScript
declare global {
  namespace Express {
    interface Request {
      subscription?: {
        id: number;
        userId: number;
        planId: number;
        status: string;
        startedAt: Date;
        expiresAt: Date | null;
        trialEndsAt: Date | null;
        plan: {
          id: number;
          name: string;
          description: string;
          priceMonthly: number;
          priceYearly: number;
          maxUsers: number;
          features: string[];
          trialDays: number;
          isActive: boolean;
        };
      };
    }
  }
}