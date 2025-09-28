/**
 * Serviço para gerenciar metadata de provedores de pagamento
 * Integra com a tabela discount_codes e outros modelos que precisam de metadata flexível
 */

import { db } from '../db';
import { discountCodes } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { 
  ProviderMetadata, 
  ProviderRestrictions, 
  ProviderMetadataManager,
  StripeMetadata,
  PagSeguroMetadata,
  MercadoPagoMetadata,
  PixMetadata,
  createStripeMetadata,
  createPagSeguroMetadata,
  createMercadoPagoMetadata,
  createPixMetadata
} from '../../shared/provider-metadata';

export class DiscountCodeMetadataService {
  /**
   * Atualiza metadata de um código de desconto
   */
  static async updateMetadata(
    codeId: number, 
    metadata: Partial<ProviderMetadata>
  ): Promise<void> {
    try {
      // Buscar código existente
      const [existingCode] = await db
        .select()
        .from(discountCodes)
        .where(eq(discountCodes.id, codeId));

      if (!existingCode) {
        throw new Error('Código de desconto não encontrado');
      }

      // Atualizar metadata existente
      const updatedMetadata = ProviderMetadataManager.updateMetadata(
        existingCode.metadata,
        metadata
      );

      // Salvar no banco
      await db
        .update(discountCodes)
        .set({ 
          metadata: updatedMetadata,
          updatedAt: new Date()
        })
        .where(eq(discountCodes.id, codeId));

      console.log(`✅ Metadata atualizado para código ${codeId}`);
    } catch (error: any) {
      console.error('❌ Erro ao atualizar metadata:', error);
      throw error;
    }
  }

  /**
   * Obtém metadata tipado de um código de desconto
   */
  static async getMetadata<T extends ProviderMetadata>(
    codeId: number,
    provider?: string
  ): Promise<T | null> {
    try {
      const [code] = await db
        .select()
        .from(discountCodes)
        .where(eq(discountCodes.id, codeId));

      if (!code || !code.metadata) {
        return null;
      }

      if (provider) {
        return ProviderMetadataManager.getProviderMetadata<T>(code.metadata, provider);
      }

      return ProviderMetadataManager.deserializeMetadata<T>(code.metadata);
    } catch (error: any) {
      console.error('❌ Erro ao obter metadata:', error);
      return null;
    }
  }

  /**
   * Atualiza restrictions de um código de desconto
   */
  static async updateRestrictions(
    codeId: number,
    restrictions: ProviderRestrictions
  ): Promise<void> {
    try {
      const serializedRestrictions = ProviderMetadataManager.serializeRestrictions(restrictions);

      await db
        .update(discountCodes)
        .set({ 
          restrictions: serializedRestrictions,
          updatedAt: new Date()
        })
        .where(eq(discountCodes.id, codeId));

      console.log(`✅ Restrictions atualizadas para código ${codeId}`);
    } catch (error: any) {
      console.error('❌ Erro ao atualizar restrictions:', error);
      throw error;
    }
  }

  /**
   * Obtém restrictions tipadas de um código de desconto
   */
  static async getRestrictions<T extends ProviderRestrictions>(
    codeId: number
  ): Promise<T | null> {
    try {
      const [code] = await db
        .select()
        .from(discountCodes)
        .where(eq(discountCodes.id, codeId));

      if (!code || !code.restrictions) {
        return null;
      }

      return ProviderMetadataManager.deserializeRestrictions<T>(code.restrictions);
    } catch (error: any) {
      console.error('❌ Erro ao obter restrictions:', error);
      return null;
    }
  }

  /**
   * Inicializa metadata padrão baseado no provedor
   */
  static async initializeProviderMetadata(
    codeId: number,
    provider: string,
    environment: 'sandbox' | 'production' = 'production'
  ): Promise<void> {
    try {
      let defaultMetadata: ProviderMetadata;

      switch (provider) {
        case 'stripe':
          defaultMetadata = createStripeMetadata({ environment });
          break;
        case 'pagseguro':
          defaultMetadata = createPagSeguroMetadata({ environment });
          break;
        case 'mercadopago':
          defaultMetadata = createMercadoPagoMetadata({ environment });
          break;
        case 'pix':
          defaultMetadata = createPixMetadata({ environment });
          break;
        default:
          defaultMetadata = ProviderMetadataManager.createDefaultMetadata(provider, environment);
      }

      await this.updateMetadata(codeId, defaultMetadata);
      console.log(`✅ Metadata padrão inicializado para provedor ${provider}`);
    } catch (error: any) {
      console.error('❌ Erro ao inicializar metadata:', error);
      throw error;
    }
  }

  /**
   * Valida se metadata está consistente com o provedor
   */
  static validateProviderConsistency(
    paymentProvider: string,
    metadata: ProviderMetadata | null
  ): boolean {
    if (!metadata) return true; // Metadata opcional
    
    const baseMetadata = metadata as any;
    if (baseMetadata.providerId && baseMetadata.providerId !== paymentProvider) {
      console.warn(`⚠️ Inconsistência: provedor ${paymentProvider} mas metadata indica ${baseMetadata.providerId}`);
      return false;
    }

    return ProviderMetadataManager.validateMetadata(metadata);
  }

  /**
   * Migra dados antigos específicos do Stripe para o novo formato de metadata
   */
  static async migrateStripeDataToMetadata(codeId: number): Promise<void> {
    try {
      const [code] = await db
        .select()
        .from(discountCodes)
        .where(eq(discountCodes.id, codeId));

      if (!code) {
        throw new Error('Código não encontrado');
      }

      // Se já tem metadata, não migrar
      if (code.metadata) {
        console.log(`⏭️ Código ${codeId} já tem metadata, pulando migração`);
        return;
      }

      // Criar metadata baseado nos campos existentes
      const stripeMetadata = createStripeMetadata({
        stripeCouponId: code.externalCouponId || undefined,
        stripePromotionCodeId: code.externalPromotionCodeId || undefined,
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
      });

      await this.updateMetadata(codeId, stripeMetadata);
      console.log(`✅ Dados Stripe migrados para metadata no código ${codeId}`);
    } catch (error: any) {
      console.error('❌ Erro na migração Stripe:', error);
      throw error;
    }
  }

  /**
   * Busca códigos que precisam de sincronização baseado no metadata
   */
  static async findCodesNeedingSync(provider: string): Promise<number[]> {
    try {
      const codes = await db
        .select()
        .from(discountCodes)
        .where(eq(discountCodes.paymentProvider, provider));

      const needingSync: number[] = [];

      for (const code of codes) {
        const metadata = ProviderMetadataManager.deserializeMetadata(code.metadata);
        
        if (!metadata || code.syncStatus === 'error' || code.syncStatus === 'pending') {
          needingSync.push(code.id);
        }
      }

      console.log(`🔍 Encontrados ${needingSync.length} códigos ${provider} precisando de sincronização`);
      return needingSync;
    } catch (error: any) {
      console.error('❌ Erro ao buscar códigos para sync:', error);
      return [];
    }
  }
}

// === TIPOS ESPECÍFICOS PARA O SERVIÇO ===

export interface MetadataUpdateRequest {
  codeId: number;
  provider: string;
  metadata: Partial<ProviderMetadata>;
  restrictions?: ProviderRestrictions;
}

export interface MetadataQueryOptions {
  includeRestrictions?: boolean;
  validateProvider?: boolean;
  provider?: string;
}

// === FACTORY FUNCTIONS PARA FACILITAR USO ===

export function createStripeDiscountMetadata(data: {
  stripeCouponId?: string;
  stripePromotionCodeId?: string;
  testMode?: boolean;
}): StripeMetadata {
  return createStripeMetadata(data);
}

export function createPagSeguroDiscountMetadata(data: {
  pagSeguroCouponId?: string;
  pagSeguroOrderId?: string;
  sandboxMode?: boolean;
}): PagSeguroMetadata {
  return createPagSeguroMetadata(data);
}

export function createMercadoPagoDiscountMetadata(data: {
  mercadoPagoCouponId?: string;
  mercadoPagoPreferenceId?: string;
}): MercadoPagoMetadata {
  return createMercadoPagoMetadata(data);
}