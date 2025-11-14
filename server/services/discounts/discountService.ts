/**
 * Serviço de Descontos - Coordena Stripe e Banco de Dados
 * Responsável por criar, listar e validar cupons e códigos promocionais
 */

import { db } from "../../db";
import { 
  stripeCoupons, 
  stripePromotionCodes, 
  stripeDiscountRedemptions,
  type StripeCoupon,
  type StripePromotionCode,
  type InsertStripeCoupon,
  type InsertStripePromotionCode,
  type InsertStripeDiscountRedemption
} from "../../../shared/schema";
import { eq, and, or, gte, lte, isNull, sql } from "drizzle-orm";
import { StripeProvider } from "../../payments/stripeProvider";
import Stripe from "stripe";

/**
 * Validar janela de tempo de um desconto
 */
export function validateDiscountWindow(
  validFrom: Date | null,
  validUntil: Date | null,
  now: Date = new Date()
): { valid: boolean; reason?: string } {
  if (validFrom && now < validFrom) {
    return { valid: false, reason: "Desconto ainda não está válido" };
  }
  
  if (validUntil && now > validUntil) {
    return { valid: false, reason: "Desconto expirado" };
  }
  
  return { valid: true };
}

/**
 * Criar cupom no Stripe e persistir no banco
 */
export async function createCoupon(
  stripeProvider: StripeProvider,
  params: {
    name: string;
    description?: string;
    discountType: 'percent' | 'amount';
    percentOff?: number;
    amountOffCents?: number;
    duration: 'once' | 'repeating' | 'forever';
    durationInMonths?: number;
    maxRedemptions?: number;
    validFrom?: Date;
    validUntil?: Date;
    applicablePlans?: number[];
    metadata?: Record<string, string>;
    createdByUserId?: number;
  }
): Promise<StripeCoupon> {
  // 1. Criar no Stripe primeiro
  const stripeCoupon = await stripeProvider.createCoupon({
    name: params.name,
    percentOff: params.discountType === 'percent' ? params.percentOff : undefined,
    amountOff: params.discountType === 'amount' ? params.amountOffCents : undefined,
    currency: params.discountType === 'amount' ? 'brl' : undefined,
    duration: params.duration,
    durationInMonths: params.durationInMonths,
    maxRedemptions: params.maxRedemptions,
    redeemBy: params.validUntil ? Math.floor(params.validUntil.getTime() / 1000) : undefined,
    metadata: params.metadata,
  });

  // 2. Persistir no banco de dados
  const [dbCoupon] = await db.insert(stripeCoupons).values({
    name: params.name,
    description: params.description,
    stripeCouponId: stripeCoupon.id,
    discountType: params.discountType,
    // percentOff é numeric(5,2) - armazenar como número
    percentOff: params.discountType === 'percent' && params.percentOff !== undefined 
      ? params.percentOff
      : null,
    // amountOffCents é integer. null para cupons de porcentagem
    amountOffCents: params.discountType === 'amount' ? params.amountOffCents ?? null : null,
    currency: params.discountType === 'amount' ? 'brl' : null,
    duration: params.duration,
    durationInMonths: params.durationInMonths,
    maxRedemptions: params.maxRedemptions,
    redeemedCount: 0,
    validFrom: params.validFrom,
    validUntil: params.validUntil,
    metadata: params.metadata,
    applicablePlans: params.applicablePlans,
    isActive: true,
    createdByUserId: params.createdByUserId,
    updatedByUserId: params.createdByUserId,
    lastSyncAt: new Date(),
    syncStatus: 'synced',
  }).returning();

  return dbCoupon;
}

/**
 * Listar cupons do banco de dados
 */
export async function listCoupons(params?: {
  isActive?: boolean;
  includeExpired?: boolean;
}): Promise<StripeCoupon[]> {
  const now = new Date();
  
  const conditions = [];
  
  if (params?.isActive !== undefined) {
    conditions.push(eq(stripeCoupons.isActive, params.isActive));
  }
  
  if (!params?.includeExpired) {
    conditions.push(
      or(
        isNull(stripeCoupons.validUntil),
        gte(stripeCoupons.validUntil, now)
      )
    );
  }
  
  const coupons = await db
    .select()
    .from(stripeCoupons)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(stripeCoupons.createdAt);
  
  return coupons;
}

/**
 * Buscar cupom individual
 */
export async function getCoupon(stripeCouponId: string): Promise<StripeCoupon | null> {
  const [coupon] = await db
    .select()
    .from(stripeCoupons)
    .where(eq(stripeCoupons.stripeCouponId, stripeCouponId))
    .limit(1);
  
  return coupon || null;
}

/**
 * Criar código promocional no Stripe e persistir no banco
 */
export async function createPromotionCode(
  stripeProvider: StripeProvider,
  params: {
    stripeCouponId: string;
    code: string;
    maxRedemptions?: number;
    oneTimePerCustomer?: boolean;
    expiresAt?: Date;
    metadata?: Record<string, string>;
    notes?: string;
    createdByUserId?: number;
  }
): Promise<StripePromotionCode> {
  // 1. Verificar se o cupom existe
  const coupon = await getCoupon(params.stripeCouponId);
  if (!coupon) {
    throw new Error(`Cupom não encontrado: ${params.stripeCouponId}`);
  }

  // 2. Criar no Stripe
  const stripePromoCode = await stripeProvider.createPromotionCode({
    coupon: params.stripeCouponId,
    code: params.code,
    active: true,
    maxRedemptions: params.maxRedemptions,
    expiresAt: params.expiresAt ? Math.floor(params.expiresAt.getTime() / 1000) : undefined,
    metadata: params.metadata,
  });

  // 3. Persistir no banco de dados
  const [dbPromoCode] = await db.insert(stripePromotionCodes).values({
    stripeCouponId: params.stripeCouponId,
    code: params.code.toUpperCase(),
    stripePromotionCodeId: stripePromoCode.id,
    maxRedemptions: params.maxRedemptions,
    redeemedCount: 0,
    oneTimePerCustomer: params.oneTimePerCustomer ?? true,
    expiresAt: params.expiresAt,
    metadata: params.metadata,
    notes: params.notes,
    isActive: true,
    createdByUserId: params.createdByUserId,
    updatedByUserId: params.createdByUserId,
    lastSyncAt: new Date(),
    syncStatus: 'synced',
  }).returning();

  return dbPromoCode;
}

/**
 * Listar códigos promocionais
 */
export async function listPromotionCodes(params?: {
  stripeCouponId?: string;
  isActive?: boolean;
  includeExpired?: boolean;
}): Promise<StripePromotionCode[]> {
  const now = new Date();
  
  const conditions = [];
  
  if (params?.stripeCouponId) {
    conditions.push(eq(stripePromotionCodes.stripeCouponId, params.stripeCouponId));
  }
  
  if (params?.isActive !== undefined) {
    conditions.push(eq(stripePromotionCodes.isActive, params.isActive));
  }
  
  if (!params?.includeExpired) {
    conditions.push(
      or(
        isNull(stripePromotionCodes.expiresAt),
        gte(stripePromotionCodes.expiresAt, now)
      )
    );
  }
  
  const codes = await db
    .select()
    .from(stripePromotionCodes)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(stripePromotionCodes.createdAt);
  
  return codes;
}

/**
 * Buscar código promocional individual
 */
export async function getPromotionCode(stripePromotionCodeId: string): Promise<StripePromotionCode | null> {
  const [code] = await db
    .select()
    .from(stripePromotionCodes)
    .where(eq(stripePromotionCodes.stripePromotionCodeId, stripePromotionCodeId))
    .limit(1);
  
  return code || null;
}

/**
 * Buscar código promocional pelo código digitável
 */
export async function findPromotionCodeByCode(code: string): Promise<StripePromotionCode | null> {
  const [promoCode] = await db
    .select()
    .from(stripePromotionCodes)
    .where(eq(stripePromotionCodes.code, code.toUpperCase()))
    .limit(1);
  
  return promoCode || null;
}

/**
 * Validar se um código promocional pode ser aplicado
 */
export async function validatePromotionCode(
  code: string,
  userId: number
): Promise<{
  valid: boolean;
  reason?: string;
  promoCode?: StripePromotionCode;
  coupon?: StripeCoupon;
}> {
  // 1. Buscar código promocional
  const promoCode = await findPromotionCodeByCode(code);
  if (!promoCode) {
    return { valid: false, reason: "Código promocional não encontrado" };
  }

  // 2. Verificar se está ativo
  if (!promoCode.isActive) {
    return { valid: false, reason: "Código promocional inativo" };
  }

  // 3. Verificar expiração
  if (promoCode.expiresAt && new Date() > promoCode.expiresAt) {
    return { valid: false, reason: "Código promocional expirado" };
  }

  // 4. Verificar limite de redenções do código
  if (promoCode.maxRedemptions && promoCode.redeemedCount >= promoCode.maxRedemptions) {
    return { valid: false, reason: "Código promocional esgotado" };
  }

  // 5. Verificar se é uma vez por cliente
  if (promoCode.oneTimePerCustomer) {
    const existingRedemption = await db
      .select()
      .from(stripeDiscountRedemptions)
      .where(
        and(
          eq(stripeDiscountRedemptions.userId, userId),
          eq(stripeDiscountRedemptions.stripePromotionCodeId, promoCode.stripePromotionCodeId)
        )
      )
      .limit(1);

    if (existingRedemption.length > 0) {
      return { valid: false, reason: "Você já utilizou este código promocional" };
    }
  }

  // 6. Buscar cupom associado
  const coupon = await getCoupon(promoCode.stripeCouponId);
  if (!coupon) {
    return { valid: false, reason: "Cupom associado não encontrado" };
  }

  // 7. Verificar se o cupom está ativo
  if (!coupon.isActive) {
    return { valid: false, reason: "Cupom inativo" };
  }

  // 8. Verificar janela de validade do cupom
  const windowValidation = validateDiscountWindow(
    coupon.validFrom, 
    coupon.validUntil
  );
  if (!windowValidation.valid) {
    return { valid: false, reason: windowValidation.reason };
  }

  // 9. Verificar limite de redenções do cupom
  if (coupon.maxRedemptions && coupon.redeemedCount >= coupon.maxRedemptions) {
    return { valid: false, reason: "Cupom esgotado" };
  }

  // Tudo válido!
  return { valid: true, promoCode, coupon };
}

/**
 * Registrar resgate de código promocional (chamado pelos webhooks)
 */
export async function recordRedemption(
  params: InsertStripeDiscountRedemption
): Promise<void> {
  await db.transaction(async (tx) => {
    // 1. Inserir registro de resgate
    await tx.insert(stripeDiscountRedemptions).values(params);

    // 2. Incrementar contador de resgates no código promocional (SQL direto)
    await tx
      .update(stripePromotionCodes)
      .set({
        redeemedCount: sql`${stripePromotionCodes.redeemedCount} + 1`,
      })
      .where(eq(stripePromotionCodes.stripePromotionCodeId, params.stripePromotionCodeId));

    // 3. Incrementar contador de resgates no cupom (SQL direto)
    await tx
      .update(stripeCoupons)
      .set({
        redeemedCount: sql`${stripeCoupons.redeemedCount} + 1`,
      })
      .where(eq(stripeCoupons.stripeCouponId, params.stripeCouponId));
  });
}

/**
 * Alternar status ativo/inativo de um cupom
 */
export async function toggleCouponStatus(id: number): Promise<StripeCoupon> {
  const [coupon] = await db
    .select()
    .from(stripeCoupons)
    .where(eq(stripeCoupons.id, id))
    .limit(1);

  if (!coupon) {
    throw new Error("Cupom não encontrado");
  }

  const [updated] = await db
    .update(stripeCoupons)
    .set({ 
      isActive: !coupon.isActive,
      updatedAt: new Date(),
    })
    .where(eq(stripeCoupons.id, id))
    .returning();

  return updated;
}

/**
 * Excluir cupom do banco e do Stripe
 */
export async function deleteCoupon(
  stripeProvider: StripeProvider,
  id: number
): Promise<void> {
  const [coupon] = await db
    .select()
    .from(stripeCoupons)
    .where(eq(stripeCoupons.id, id))
    .limit(1);

  if (!coupon) {
    throw new Error("Cupom não encontrado");
  }

  // 1. Excluir do Stripe
  try {
    await stripeProvider.deleteCoupon(coupon.stripeCouponId);
  } catch (error) {
    console.error("Erro ao excluir cupom do Stripe:", error);
    // Continuar mesmo se falhar no Stripe (pode já ter sido deletado)
  }

  // 2. Excluir do banco (CASCADE deleta códigos promocionais vinculados)
  await db
    .delete(stripeCoupons)
    .where(eq(stripeCoupons.id, id));
}

/**
 * Alternar status ativo/inativo de um código promocional
 */
export async function togglePromotionCodeStatus(id: number): Promise<StripePromotionCode> {
  const [code] = await db
    .select()
    .from(stripePromotionCodes)
    .where(eq(stripePromotionCodes.id, id))
    .limit(1);

  if (!code) {
    throw new Error("Código promocional não encontrado");
  }

  const [updated] = await db
    .update(stripePromotionCodes)
    .set({ 
      isActive: !code.isActive,
      updatedAt: new Date(),
    })
    .where(eq(stripePromotionCodes.id, id))
    .returning();

  return updated;
}

/**
 * Excluir código promocional do banco e do Stripe
 */
export async function deletePromotionCode(
  stripeProvider: StripeProvider,
  id: number
): Promise<void> {
  const [code] = await db
    .select()
    .from(stripePromotionCodes)
    .where(eq(stripePromotionCodes.id, id))
    .limit(1);

  if (!code) {
    throw new Error("Código promocional não encontrado");
  }

  // 1. Excluir do Stripe
  try {
    await stripeProvider.updatePromotionCode(code.stripePromotionCodeId, { active: false });
  } catch (error) {
    console.error("Erro ao desativar código no Stripe:", error);
    // Continuar mesmo se falhar no Stripe
  }

  // 2. Excluir do banco
  await db
    .delete(stripePromotionCodes)
    .where(eq(stripePromotionCodes.id, id));
}

// ===========================
// IMPORTAÇÃO DO STRIPE
// ===========================

/**
 * Importar cupom já existente do Stripe para o banco local
 * NÃO cria novo cupom no Stripe - apenas persiste o existente
 */
export async function importCouponFromStripe(
  stripeCoupon: Stripe.Coupon,
  createdByUserId?: number
): Promise<StripeCoupon> {
  // Validar que o cupom tem um tipo de desconto válido
  if (!stripeCoupon.percent_off && !stripeCoupon.amount_off) {
    throw new Error(
      `Cupom ${stripeCoupon.id} não possui desconto válido (percent_off ou amount_off ausentes)`
    );
  }

  // Usar transação para garantir atomicidade
  const [dbCoupon] = await db.transaction(async (tx) => {
    // Verificar duplicatas dentro da transação
    const existing = await tx
      .select()
      .from(stripeCoupons)
      .where(eq(stripeCoupons.stripeCouponId, stripeCoupon.id))
      .limit(1);

    if (existing.length > 0) {
      throw new Error(`Cupom ${stripeCoupon.id} já foi importado`);
    }

    // Persistir no banco de dados com mapeamento correto
    return tx.insert(stripeCoupons).values({
      name: stripeCoupon.name || stripeCoupon.id,
      description: stripeCoupon.metadata?.description || null, // Top-level field from Stripe metadata
      stripeCouponId: stripeCoupon.id,
      discountType: stripeCoupon.percent_off ? 'percent' : 'amount',
      percentOff: stripeCoupon.percent_off || null,
      amountOffCents: stripeCoupon.amount_off || null,
      currency: stripeCoupon.currency || null,
      duration: stripeCoupon.duration,
      durationInMonths: stripeCoupon.duration_in_months || null,
      maxRedemptions: stripeCoupon.max_redemptions || null,
      redeemedCount: stripeCoupon.times_redeemed || 0,
      validFrom: null, // Stripe não tem validFrom
      validUntil: stripeCoupon.redeem_by ? new Date(stripeCoupon.redeem_by * 1000) : null,
      metadata: stripeCoupon.metadata || undefined,
      applicablePlans: [],
      isActive: stripeCoupon.valid,
      createdByUserId,
      updatedByUserId: createdByUserId,
      lastSyncAt: new Date(),
      syncStatus: 'synced',
    }).returning();
  });

  console.log(`✅ Cupom importado do Stripe: ${dbCoupon.stripeCouponId}`);
  return dbCoupon;
}

/**
 * Importar código promocional já existente do Stripe para o banco local
 * NÃO cria novo código no Stripe - apenas persiste o existente
 * IMPORTANTE: O cupom vinculado DEVE existir no banco antes da importação
 */
export async function importPromotionCodeFromStripe(
  stripePromoCode: Stripe.PromotionCode,
  createdByUserId?: number
): Promise<StripePromotionCode> {
  // Usar transação para garantir atomicidade e consistência
  const [dbPromoCode] = await db.transaction(async (tx) => {
    // Verificar duplicatas dentro da transação
    const existing = await tx
      .select()
      .from(stripePromotionCodes)
      .where(eq(stripePromotionCodes.stripePromotionCodeId, stripePromoCode.id))
      .limit(1);

    if (existing.length > 0) {
      throw new Error(`Código promocional ${stripePromoCode.code} já foi importado`);
    }

    // Buscar cupom vinculado no banco (obrigatório!)
    const couponId = typeof stripePromoCode.coupon === 'string' 
      ? stripePromoCode.coupon 
      : stripePromoCode.coupon.id;

    const [linkedCoupon] = await tx
      .select()
      .from(stripeCoupons)
      .where(eq(stripeCoupons.stripeCouponId, couponId))
      .limit(1);

    if (!linkedCoupon) {
      throw new Error(
        `Cupom ${couponId} não encontrado no banco. Importe o cupom primeiro.`
      );
    }

    // Persistir no banco de dados com mapeamento correto dos campos
    return tx.insert(stripePromotionCodes).values({
      code: stripePromoCode.code,
      stripeCouponId: linkedCoupon.stripeCouponId, // FK para stripe_coupons.stripe_coupon_id
      stripePromotionCodeId: stripePromoCode.id,
      maxRedemptions: stripePromoCode.max_redemptions || null,
      redeemedCount: stripePromoCode.times_redeemed || 0, // Campo correto: redeemedCount
      // Stripe não tem oneTimePerCustomer - usar default (true)
      oneTimePerCustomer: true,
      expiresAt: stripePromoCode.expires_at ? new Date(stripePromoCode.expires_at * 1000) : null,
      metadata: stripePromoCode.metadata || undefined,
      notes: null,
      isActive: stripePromoCode.active,
      createdByUserId,
      updatedByUserId: createdByUserId,
      lastSyncAt: new Date(),
      syncStatus: 'synced',
    }).returning();
  });

  console.log(`✅ Código promocional importado do Stripe: ${dbPromoCode.code}`);
  return dbPromoCode;
}
