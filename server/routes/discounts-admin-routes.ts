/**
 * Rotas de Admin para Gerenciamento de Descontos
 * Endpoints para criar e gerenciar cupons e códigos promocionais do Stripe ddd
 */

import { Router, Request, Response, NextFunction } from "express";
import { isAuthenticated } from "../auth";
import { StripeProvider } from "../payments/stripeProvider";
import * as discountService from "../services/discounts/discountService";
import { z } from "zod";

// Middleware para verificar se usuário é admin
const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: "Não autenticado" });
  }

  // Verificar se é admin (roleId = 1)
  const user = req.user as any;
  if (user.roleId !== 1) {
    return res.status(403).json({ error: "Acesso negado. Apenas administradores." });
  }

  next();
};

// Schema de validação para criar cupom
const createCouponSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  discountType: z.enum(['percent', 'amount'], {
    errorMap: () => ({ message: "Tipo deve ser 'percent' ou 'amount'" })
  }),
  percentOff: z.number().min(1).max(100).optional(),
  amountOffCents: z.number().int().positive().optional(),
  duration: z.enum(['once', 'repeating', 'forever']),
  durationInMonths: z.number().int().positive().optional(),
  maxRedemptions: z.number().int().positive().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  applicablePlans: z.array(z.number().int()).optional(),
  metadata: z.record(z.string()).optional(),
}).refine(
  (data) => {
    if (data.discountType === 'percent' && !data.percentOff) {
      return false;
    }
    if (data.discountType === 'amount' && !data.amountOffCents) {
      return false;
    }
    if (data.duration === 'repeating' && !data.durationInMonths) {
      return false;
    }
    return true;
  },
  {
    message: "Campos obrigatórios faltando para o tipo de desconto selecionado"
  }
);

// Schema de validação para criar código promocional
const createPromotionCodeSchema = z.object({
  stripeCouponId: z.string().min(1, "ID do cupom é obrigatório"),
  code: z.string().min(3, "Código deve ter no mínimo 3 caracteres").max(50),
  maxRedemptions: z.number().int().positive().optional(),
  oneTimePerCustomer: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.string()).optional(),
  notes: z.string().optional(),
});

// Schema de validação para importação
const importItemSchema = z.object({
  id: z.string(),
  type: z.enum(['coupon', 'promotion_code']).optional(),
  code: z.string().optional(), // Presente em promotion codes
  name: z.string().optional(), // Presente em coupons
}).passthrough(); // Permitir campos adicionais do Stripe

const importPayloadSchema = z.object({
  items: z.array(importItemSchema).min(1, "Nenhum item selecionado"),
});

/**
 * Factory para criar router de admin de descontos
 * Recebe StripeProvider como dependência injetada
 */
export default function createDiscountAdminRouter(stripeProvider: StripeProvider): Router {
  const router = Router();
  
  // Verificação runtime: garantir que o provider é StripeProvider
  if (stripeProvider.getProviderName() !== 'stripe') {
    throw new Error(
      `Discount admin routes require StripeProvider, got ${stripeProvider.getProviderName()}. ` +
      `Make sure STRIPE_SECRET_KEY is configured and the default payment provider is Stripe.`
    );
  }
  
  // Verificar se métodos necessários estão disponíveis
  const requiredMethods = ['createCoupon', 'getCoupon', 'createPromotionCode', 'getPromotionCode', 'findPromotionCodeByCode'];
  for (const method of requiredMethods) {
    if (typeof (stripeProvider as any)[method] !== 'function') {
      throw new Error(
        `StripeProvider is missing required method: ${method}. ` +
        `This may indicate an outdated StripeProvider implementation.`
      );
    }
  }
  
  // ===========================
  // CUPONS
  // ===========================

  /**
   * POST /coupons
   * Criar novo cupom no Stripe e persistir no banco
   */
  router.post(
    "/coupons",
    isAuthenticated,
    isAdmin,
    async (req: Request, res: Response) => {
      try {
        console.log("📝 [Admin] Criando novo cupom:", req.body);

        // Validar input
        const validatedData = createCouponSchema.parse(req.body);

        // Criar cupom via service
        const coupon = await discountService.createCoupon(stripeProvider, {
          name: validatedData.name,
          description: validatedData.description,
          discountType: validatedData.discountType,
          percentOff: validatedData.percentOff,
          amountOffCents: validatedData.amountOffCents,
          duration: validatedData.duration,
          durationInMonths: validatedData.durationInMonths,
          maxRedemptions: validatedData.maxRedemptions,
          validFrom: validatedData.validFrom ? new Date(validatedData.validFrom) : undefined,
          validUntil: validatedData.validUntil ? new Date(validatedData.validUntil) : undefined,
          applicablePlans: validatedData.applicablePlans,
          metadata: validatedData.metadata,
          createdByUserId: (req.user as any).id,
        });

        console.log("✅ [Admin] Cupom criado com sucesso:", coupon.stripeCouponId);
        res.status(201).json(coupon);
      } catch (error: any) {
        console.error("❌ [Admin] Erro ao criar cupom:", error);
        
        if (error.name === 'ZodError') {
          return res.status(400).json({
            error: "Dados inválidos",
            details: error.errors,
          });
        }

        res.status(500).json({
          error: "Falha ao criar cupom",
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /coupons
   * Listar todos os cupons
   */
  router.get(
    "/coupons",
    isAuthenticated,
    isAdmin,
    async (req: Request, res: Response) => {
      try {
        const { includeInactive, includeExpired } = req.query;

        console.log("📋 [Admin] Listando cupons");

        const coupons = await discountService.listCoupons({
          isActive: includeInactive === 'true' ? undefined : true,
          includeExpired: includeExpired === 'true',
        });

        console.log(`✅ [Admin] ${coupons.length} cupons encontrados`);
        res.json(coupons);
      } catch (error: any) {
        console.error("❌ [Admin] Erro ao listar cupons:", error);
        res.status(500).json({
          error: "Falha ao listar cupons",
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /coupons/:stripeCouponId
   * Buscar cupom individual
   */
  router.get(
    "/coupons/:stripeCouponId",
    isAuthenticated,
    isAdmin,
    async (req: Request, res: Response) => {
      try {
        const { stripeCouponId } = req.params;

        console.log("🔍 [Admin] Buscando cupom:", stripeCouponId);

        const coupon = await discountService.getCoupon(stripeCouponId);

        if (!coupon) {
          return res.status(404).json({ error: "Cupom não encontrado" });
        }

        res.json(coupon);
      } catch (error: any) {
        console.error("❌ [Admin] Erro ao buscar cupom:", error);
        res.status(500).json({
          error: "Falha ao buscar cupom",
          message: error.message,
        });
      }
    }
  );

  // ===========================
  // CÓDIGOS PROMOCIONAIS
  // ===========================

  /**
   * POST /promotion-codes
   * Criar novo código promocional vinculado a um cupom
   */
  router.post(
    "/promotion-codes",
    isAuthenticated,
    isAdmin,
    async (req: Request, res: Response) => {
      try {
        console.log("📝 [Admin] Criando novo código promocional:", req.body);

        // Validar input
        const validatedData = createPromotionCodeSchema.parse(req.body);

        // Criar código promocional via service
        const promoCode = await discountService.createPromotionCode(stripeProvider, {
          stripeCouponId: validatedData.stripeCouponId,
          code: validatedData.code,
          maxRedemptions: validatedData.maxRedemptions,
          oneTimePerCustomer: validatedData.oneTimePerCustomer,
          expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
          metadata: validatedData.metadata,
          notes: validatedData.notes,
          createdByUserId: (req.user as any).id,
        });

        console.log("✅ [Admin] Código promocional criado:", promoCode.code);
        res.status(201).json(promoCode);
      } catch (error: any) {
        console.error("❌ [Admin] Erro ao criar código promocional:", error);
        
        if (error.name === 'ZodError') {
          return res.status(400).json({
            error: "Dados inválidos",
            details: error.errors,
          });
        }

        res.status(500).json({
          error: "Falha ao criar código promocional",
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /promotion-codes
   * Listar códigos promocionais (opcionalmente filtrados por cupom)
   */
  router.get(
    "/promotion-codes",
    isAuthenticated,
    isAdmin,
    async (req: Request, res: Response) => {
      try {
        const { stripeCouponId, includeInactive, includeExpired } = req.query;

        console.log("📋 [Admin] Listando códigos promocionais");

        const codes = await discountService.listPromotionCodes({
          stripeCouponId: stripeCouponId as string | undefined,
          isActive: includeInactive === 'true' ? undefined : true,
          includeExpired: includeExpired === 'true',
        });

        console.log(`✅ [Admin] ${codes.length} códigos encontrados`);
        res.json(codes);
      } catch (error: any) {
        console.error("❌ [Admin] Erro ao listar códigos promocionais:", error);
        res.status(500).json({
          error: "Falha ao listar códigos promocionais",
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /promotion-codes/:stripePromotionCodeId
   * Buscar código promocional individual
   */
  router.get(
    "/promotion-codes/:stripePromotionCodeId",
    isAuthenticated,
    isAdmin,
    async (req: Request, res: Response) => {
      try {
        const { stripePromotionCodeId } = req.params;

        console.log("🔍 [Admin] Buscando código promocional:", stripePromotionCodeId);

        const promoCode = await discountService.getPromotionCode(stripePromotionCodeId);

        if (!promoCode) {
          return res.status(404).json({ error: "Código promocional não encontrado" });
        }

        res.json(promoCode);
      } catch (error: any) {
        console.error("❌ [Admin] Erro ao buscar código promocional:", error);
        res.status(500).json({
          error: "Falha ao buscar código promocional",
          message: error.message,
        });
      }
    }
  );

  /**
   * PATCH /coupons/:id/toggle
   * Ativar/desativar cupom
   */
  router.patch(
    "/coupons/:id/toggle",
    isAuthenticated,
    isAdmin,
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        
        console.log(`🔄 [Admin] Alternando status do cupom ID ${id}`);
        
        const coupon = await discountService.toggleCouponStatus(id);
        
        console.log(`✅ [Admin] Cupom ${coupon.isActive ? 'ativado' : 'desativado'}`);
        res.json(coupon);
      } catch (error: any) {
        console.error("❌ [Admin] Erro ao alternar status do cupom:", error);
        res.status(500).json({
          error: "Falha ao alternar status do cupom",
          message: error.message,
        });
      }
    }
  );

  /**
   * DELETE /coupons/:id
   * Excluir cupom (soft delete no DB, hard delete no Stripe)
   */
  router.delete(
    "/coupons/:id",
    isAuthenticated,
    isAdmin,
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        
        console.log(`🗑️ [Admin] Excluindo cupom ID ${id}`);
        
        await discountService.deleteCoupon(stripeProvider, id);
        
        console.log(`✅ [Admin] Cupom excluído com sucesso`);
        res.json({ success: true, message: "Cupom excluído" });
      } catch (error: any) {
        console.error("❌ [Admin] Erro ao excluir cupom:", error);
        res.status(500).json({
          error: "Falha ao excluir cupom",
          message: error.message,
        });
      }
    }
  );

  /**
   * PATCH /promotion-codes/:id/toggle
   * Ativar/desativar código promocional
   */
  router.patch(
    "/promotion-codes/:id/toggle",
    isAuthenticated,
    isAdmin,
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        
        console.log(`🔄 [Admin] Alternando status do código promocional ID ${id}`);
        
        const code = await discountService.togglePromotionCodeStatus(id);
        
        console.log(`✅ [Admin] Código ${code.isActive ? 'ativado' : 'desativado'}`);
        res.json(code);
      } catch (error: any) {
        console.error("❌ [Admin] Erro ao alternar status do código:", error);
        res.status(500).json({
          error: "Falha ao alternar status do código",
          message: error.message,
        });
      }
    }
  );

  /**
   * DELETE /promotion-codes/:id
   * Excluir código promocional (soft delete no DB, hard delete no Stripe)
   */
  router.delete(
    "/promotion-codes/:id",
    isAuthenticated,
    isAdmin,
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        
        console.log(`🗑️ [Admin] Excluindo código promocional ID ${id}`);
        
        await discountService.deletePromotionCode(stripeProvider, id);
        
        console.log(`✅ [Admin] Código promocional excluído com sucesso`);
        res.json({ success: true, message: "Código excluído" });
      } catch (error: any) {
        console.error("❌ [Admin] Erro ao excluir código:", error);
        res.status(500).json({
          error: "Falha ao excluir código",
          message: error.message,
        });
      }
    }
  );

  // ===========================
  // IMPORTAÇÃO DO STRIPE
  // ===========================

  /**
   * GET /fetch-from-stripe
   * Buscar cupons e códigos promocionais diretamente do Stripe que ainda não foram importados
   */
  router.get(
    "/fetch-from-stripe",
    isAuthenticated,
    isAdmin,
    async (req: Request, res: Response) => {
      try {
        console.log("🔍 [Admin] Buscando cupons e códigos do Stripe...");

        // Buscar TODOS os cupons do Stripe (com paginação automática via listAllCoupons)
        const allStripeCoupons = await stripeProvider.listAllCoupons();
        // Filtrar apenas cupons válidos e não deletados
        const stripeCoupons = allStripeCoupons.filter((c: any) => !c.deleted && c.valid);
        console.log(`   Encontrados ${stripeCoupons.length} cupons válidos no Stripe (${allStripeCoupons.length} total)`);

        // Buscar TODOS os códigos promocionais do Stripe (com paginação automática)
        const allStripePromoCodes = await stripeProvider.listPromotionCodes();
        // Filtrar apenas códigos ativos
        const stripePromoCodes = allStripePromoCodes.filter((c: any) => c.active);
        console.log(`   Encontrados ${stripePromoCodes.length} códigos ativos no Stripe (${allStripePromoCodes.length} total)`);

        // Buscar IDs já importados do banco (incluir expirados para não duplicar)
        const existingCoupons = await discountService.listCoupons({ includeExpired: true });
        const existingCodes = await discountService.listPromotionCodes({ includeExpired: true });
        
        const existingCouponIds = new Set(existingCoupons.map(c => c.stripeCouponId));
        const existingCodeIds = new Set(existingCodes.map(c => c.stripePromotionCodeId));

        // Filtrar apenas os que ainda não foram importados
        const availableCoupons = stripeCoupons.filter(c => !existingCouponIds.has(c.id));
        const availableCodes = stripePromoCodes.filter(c => !existingCodeIds.has(c.id));

        console.log(`✅ [Admin] ${availableCoupons.length} cupons e ${availableCodes.length} códigos disponíveis para importação`);

        res.json({
          success: true,
          data: {
            coupons: availableCoupons,
            promotionCodes: availableCodes
          }
        });
      } catch (error: any) {
        console.error("❌ [Admin] Erro ao buscar dados do Stripe:", error);
        res.status(500).json({
          error: "Falha ao buscar dados do Stripe",
          message: error.message,
        });
      }
    }
  );

  /**
   * POST /import
   * Importar cupons e códigos promocionais selecionados do Stripe para o banco
   * IMPORTANTE: Apenas persiste dados já existentes no Stripe, NÃO cria novos objetos
   */
  router.post(
    "/import",
    isAuthenticated,
    isAdmin,
    async (req: Request, res: Response) => {
      try {
        // Validar payload
        const validatedPayload = importPayloadSchema.parse(req.body);
        const { items } = validatedPayload;

        console.log(`📥 [Admin] Iniciando importação de ${items.length} item(s)...`);

        const results = {
          successful: 0,
          failed: 0,
          errors: [] as string[],
        };

        const userId = (req.user as any).id;

        // Separar cupons e códigos promocionais
        const coupons = items.filter(item => item.type === 'coupon' || item.code === undefined);
        const promoCodes = items.filter(item => item.type === 'promotion_code' || item.code !== undefined);

        // 1. Importar cupons PRIMEIRO (códigos dependem deles)
        for (const coupon of coupons) {
          try {
            await discountService.importCouponFromStripe(coupon, userId);
            console.log(`   ✅ Cupom importado: ${coupon.name || coupon.id}`);
            results.successful++;
          } catch (err: any) {
            console.error(`   ❌ Falha ao importar cupom ${coupon.id}:`, err.message);
            results.failed++;
            results.errors.push(`Cupom ${coupon.id}: ${err.message}`);
          }
        }

        // 2. Importar códigos promocionais DEPOIS (precisam dos cupons no banco)
        for (const promoCode of promoCodes) {
          try {
            await discountService.importPromotionCodeFromStripe(promoCode, userId);
            console.log(`   ✅ Código importado: ${promoCode.code}`);
            results.successful++;
          } catch (err: any) {
            console.error(`   ❌ Falha ao importar código ${promoCode.code}:`, err.message);
            results.failed++;
            results.errors.push(`Código ${promoCode.code}: ${err.message}`);
          }
        }

        console.log(`✅ [Admin] Importação concluída: ${results.successful} sucesso, ${results.failed} falhas`);

        res.json({
          success: true,
          data: {
            summary: results,
            message: `${results.successful} item(s) importado(s) com sucesso`
          }
        });
      } catch (error: any) {
        console.error("❌ [Admin] Erro na importação:", error);
        res.status(500).json({
          error: "Falha na importação",
          message: error.message,
        });
      }
    }
  );

  /**
   * POST /bulk-create-codes
   * Criar múltiplos códigos promocionais em lote
   */
  router.post(
    "/bulk-create-codes",
    isAuthenticated,
    isAdmin,
    async (req: Request, res: Response) => {
      try {
        const { couponName, prefix, quantity, maxRedemptions } = req.body;

        if (!couponName || !prefix || !quantity) {
          return res.status(400).json({ 
            error: "Parâmetros obrigatórios: couponName, prefix, quantity" 
          });
        }

        console.log(`📝 [Admin] Criando ${quantity} códigos em lote para cupom ${couponName}`);

        // Buscar cupom no banco
        const coupons = await discountService.listCoupons({});
        const coupon = coupons.find(c => c.name === couponName);

        if (!coupon) {
          return res.status(404).json({ error: `Cupom ${couponName} não encontrado` });
        }

        const userId = (req.user as any).id;
        const createdCodes = [];
        const errors = [];

        // Gerar códigos únicos
        function generateRandomCode(prefix: string): string {
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          let suffix = '';
          for (let i = 0; i < 4; i++) {
            suffix += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return `${prefix}${suffix}`;
        }

        // Criar códigos
        for (let i = 0; i < quantity; i++) {
          try {
            const code = generateRandomCode(prefix);
            
            const promoCode = await discountService.createPromotionCode(stripeProvider, {
              stripeCouponId: coupon.stripeCouponId,
              code,
              maxRedemptions: maxRedemptions || 1,
              oneTimePerCustomer: true,
              createdByUserId: userId,
            });

            createdCodes.push(promoCode);
            console.log(`   ✅ Código criado: ${code}`);
          } catch (err: any) {
            console.error(`   ❌ Erro ao criar código:`, err.message);
            errors.push(err.message);
          }
        }

        console.log(`✅ [Admin] ${createdCodes.length} códigos criados com sucesso`);

        res.json({
          success: true,
          data: {
            created: createdCodes.length,
            failed: errors.length,
            codes: createdCodes,
            errors,
          }
        });
      } catch (error: any) {
        console.error("❌ [Admin] Erro na criação em lote:", error);
        res.status(500).json({
          error: "Falha na criação em lote",
          message: error.message,
        });
      }
    }
  );

  console.log("✅ [Routes] Router de admin de descontos criado");
  return router;
}
