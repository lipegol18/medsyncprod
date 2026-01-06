/**
 * Sistema de metadata genérico para provedores de pagamento
 * Permite armazenar e gerenciar dados específicos de cada provedor de forma tipada
 */

// === TIPOS BASE PARA METADATA ===

export interface BaseProviderMetadata {
  providerId?: string;
  providerName?: string;
  environment?: 'sandbox' | 'production';
  lastUpdated?: string;
  version?: string;
}

// === METADATA ESPECÍFICOS POR PROVEDOR ===

export interface StripeMetadata extends BaseProviderMetadata {
  stripeCouponId?: string;
  stripePromotionCodeId?: string;
  stripeCustomerId?: string;
  stripePriceId?: string;
  stripeProductId?: string;
  webhookEndpointId?: string;
  testMode?: boolean;
}

export interface PagSeguroMetadata extends BaseProviderMetadata {
  pagSeguroCouponId?: string;
  pagSeguroOrderId?: string;
  pagSeguroSessionId?: string;
  sandboxMode?: boolean;
  notificationId?: string;
}

export interface MercadoPagoMetadata extends BaseProviderMetadata {
  mercadoPagoCouponId?: string;
  mercadoPagoPreferenceId?: string;
  mercadoPagoCollectorId?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface PixMetadata extends BaseProviderMetadata {
  pixQrCode?: string;
  pixKey?: string;
  bankCode?: string;
  agency?: string;
  account?: string;
  txId?: string;
}

// União de todos os tipos de metadata
export type ProviderMetadata = 
  | StripeMetadata 
  | PagSeguroMetadata 
  | MercadoPagoMetadata 
  | PixMetadata;

// === TYPES PARA RESTRICTIONS ===

export interface BaseRestrictions {
  allowedCountries?: string[];
  blockedCountries?: string[];
  maxUsagePerCustomer?: number;
  minOrderValue?: number;
  maxOrderValue?: number;
  allowedPaymentMethods?: string[];
}

export interface StripeRestrictions extends BaseRestrictions {
  allowedCardBrands?: string[];
  blockedCardBrands?: string[];
  requiresConfirmation?: boolean;
  allowPromotionCodes?: boolean;
}

export interface PagSeguroRestrictions extends BaseRestrictions {
  allowedBanksList?: string[];
  maxInstallments?: number;
  minInstallments?: number;
}

export type ProviderRestrictions = 
  | StripeRestrictions 
  | PagSeguroRestrictions 
  | BaseRestrictions;

// === HELPERS PARA MANIPULAÇÃO DE METADATA ===

export class ProviderMetadataManager {
  /**
   * Serializa metadata para armazenamento no banco
   */
  static serializeMetadata(metadata: ProviderMetadata | null): string | null {
    if (!metadata) return null;
    
    try {
      return JSON.stringify({
        ...metadata,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Erro ao serializar metadata:', error);
      return null;
    }
  }

  /**
   * Deserializa metadata do banco
   */
  static deserializeMetadata<T extends ProviderMetadata>(
    metadataString: string | null
  ): T | null {
    if (!metadataString) return null;
    
    try {
      return JSON.parse(metadataString) as T;
    } catch (error) {
      console.error('❌ Erro ao deserializar metadata:', error);
      return null;
    }
  }

  /**
   * Atualiza metadata existente com novos dados
   */
  static updateMetadata<T extends ProviderMetadata>(
    existingMetadata: string | null,
    updates: Partial<T>
  ): string {
    const current = this.deserializeMetadata<T>(existingMetadata) || {} as T;
    const updated = {
      ...current,
      ...updates,
      lastUpdated: new Date().toISOString()
    } as T;
    
    return this.serializeMetadata(updated) || '{}';
  }

  /**
   * Obtém metadata tipado para um provedor específico
   */
  static getProviderMetadata<T extends ProviderMetadata>(
    metadataString: string | null,
    provider: string
  ): T | null {
    const metadata = this.deserializeMetadata<T>(metadataString);
    if (!metadata) return null;
    
    // Verificar se o metadata pertence ao provedor solicitado
    const baseMetadata = metadata as BaseProviderMetadata;
    if (baseMetadata.providerId && baseMetadata.providerId !== provider) {
      return null;
    }
    
    return metadata;
  }

  /**
   * Serializa restrictions para armazenamento
   */
  static serializeRestrictions(restrictions: ProviderRestrictions | null): string | null {
    if (!restrictions) return null;
    
    try {
      return JSON.stringify(restrictions);
    } catch (error) {
      console.error('❌ Erro ao serializar restrictions:', error);
      return null;
    }
  }

  /**
   * Deserializa restrictions do banco
   */
  static deserializeRestrictions<T extends ProviderRestrictions>(
    restrictionsString: string | null
  ): T | null {
    if (!restrictionsString) return null;
    
    try {
      return JSON.parse(restrictionsString) as T;
    } catch (error) {
      console.error('❌ Erro ao deserializar restrictions:', error);
      return null;
    }
  }

  /**
   * Valida se um metadata está no formato correto
   */
  static validateMetadata(metadata: unknown): boolean {
    if (!metadata || typeof metadata !== 'object') return false;
    
    try {
      const metadataObj = metadata as BaseProviderMetadata;
      
      // Validações básicas
      if (metadataObj.environment && !['sandbox', 'production'].includes(metadataObj.environment)) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cria metadata padrão para um provedor
   */
  static createDefaultMetadata(provider: string, environment: 'sandbox' | 'production' = 'production'): ProviderMetadata {
    const base: BaseProviderMetadata = {
      providerId: provider,
      providerName: provider,
      environment,
      lastUpdated: new Date().toISOString(),
      version: '1.0'
    };

    switch (provider) {
      case 'stripe':
        return {
          ...base,
          testMode: environment === 'sandbox'
        } as StripeMetadata;

      case 'pagseguro':
        return {
          ...base,
          sandboxMode: environment === 'sandbox'
        } as PagSeguroMetadata;

      case 'mercadopago':
        return {
          ...base
        } as MercadoPagoMetadata;

      case 'pix':
        return {
          ...base
        } as PixMetadata;

      default:
        return base as ProviderMetadata;
    }
  }
}

// === FACTORY FUNCTIONS ===

export function createStripeMetadata(data: Partial<StripeMetadata>): StripeMetadata {
  return {
    providerId: 'stripe',
    providerName: 'Stripe',
    environment: 'production',
    lastUpdated: new Date().toISOString(),
    version: '1.0',
    testMode: false,
    ...data
  };
}

export function createPagSeguroMetadata(data: Partial<PagSeguroMetadata>): PagSeguroMetadata {
  return {
    providerId: 'pagseguro',
    providerName: 'PagSeguro',
    environment: 'production',
    lastUpdated: new Date().toISOString(),
    version: '1.0',
    sandboxMode: false,
    ...data
  };
}

export function createMercadoPagoMetadata(data: Partial<MercadoPagoMetadata>): MercadoPagoMetadata {
  return {
    providerId: 'mercadopago',
    providerName: 'Mercado Pago',
    environment: 'production',
    lastUpdated: new Date().toISOString(),
    version: '1.0',
    ...data
  };
}

export function createPixMetadata(data: Partial<PixMetadata>): PixMetadata {
  return {
    providerId: 'pix',
    providerName: 'PIX',
    environment: 'production',
    lastUpdated: new Date().toISOString(),
    version: '1.0',
    ...data
  };
}