/**
 * Factory para criação de provedores de pagamento
 * Permite extensibilidade para adicionar novos provedores como PagSeguro, Mercado Pago, etc.
 */

import { PaymentProvider } from './provider';
import { StripeProvider } from './stripeProvider';
import { PaymentError } from './types';

export type PaymentProviderType = 'stripe' | 'pagseguro' | 'mercadopago' | 'pix';

export interface PaymentProviderConfig {
  type: PaymentProviderType;
  secretKey: string;
  webhookSecret?: string;
  publicKey?: string;
  environment?: 'sandbox' | 'production';
}

export class PaymentProviderFactory {
  private static providers: Map<PaymentProviderType, PaymentProvider> = new Map();

  /**
   * Cria ou retorna uma instância existente do provider
   */
  static createProvider(config: PaymentProviderConfig): PaymentProvider {
    const cacheKey = `${config.type}_${config.environment || 'production'}`;
    
    // Retorna instância existente se já foi criada
    if (this.providers.has(config.type)) {
      return this.providers.get(config.type)!;
    }

    let provider: PaymentProvider;

    switch (config.type) {
      case 'stripe':
        provider = new StripeProvider(config.secretKey);
        break;

      case 'pagseguro':
        // TODO: Implementar PagSeguroProvider quando necessário
        throw new PaymentError('PROVIDER_NOT_IMPLEMENTED', 'PagSeguro provider não implementado ainda');

      case 'mercadopago':
        // TODO: Implementar MercadoPagoProvider quando necessário
        throw new PaymentError('PROVIDER_NOT_IMPLEMENTED', 'Mercado Pago provider não implementado ainda');

      case 'pix':
        // TODO: Implementar PixProvider quando necessário
        throw new PaymentError('PROVIDER_NOT_IMPLEMENTED', 'PIX provider não implementado ainda');

      default:
        throw new PaymentError('UNKNOWN_PROVIDER', `Provedor de pagamento desconhecido: ${config.type}`);
    }

    // Cache da instância para reuso
    this.providers.set(config.type, provider);
    
    console.log(`✅ [PaymentFactory] Provider ${config.type} criado e cached`);
    return provider;
  }

  /**
   * Lista todos os provedores disponíveis
   */
  static getAvailableProviders(): PaymentProviderType[] {
    return ['stripe', 'pagseguro', 'mercadopago', 'pix'];
  }

  /**
   * Lista apenas provedores implementados
   */
  static getImplementedProviders(): PaymentProviderType[] {
    return ['stripe'];
  }

  /**
   * Verifica se um provedor está implementado
   */
  static isProviderImplemented(type: PaymentProviderType): boolean {
    return this.getImplementedProviders().includes(type);
  }

  /**
   * Limpa o cache de providers (útil para testes)
   */
  static clearCache(): void {
    this.providers.clear();
    console.log('🧹 [PaymentFactory] Cache de providers limpo');
  }

  /**
   * Cria uma configuração padrão para um provedor
   */
  static createDefaultConfig(type: PaymentProviderType): Partial<PaymentProviderConfig> {
    const configs: Record<PaymentProviderType, Partial<PaymentProviderConfig>> = {
      stripe: {
        type: 'stripe',
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
        secretKey: process.env.STRIPE_SECRET_KEY || '',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        publicKey: process.env.VITE_STRIPE_PUBLIC_KEY
      },
      pagseguro: {
        type: 'pagseguro',
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
        secretKey: process.env.PAGSEGURO_SECRET_KEY || '',
        publicKey: process.env.PAGSEGURO_PUBLIC_KEY
      },
      mercadopago: {
        type: 'mercadopago',
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
        secretKey: process.env.MERCADOPAGO_SECRET_KEY || '',
        publicKey: process.env.MERCADOPAGO_PUBLIC_KEY
      },
      pix: {
        type: 'pix',
        environment: 'production', // PIX não tem sandbox f
        secretKey: process.env.PIX_SECRET_KEY || ''
      }
    };

    return configs[type];
  }
}

/**
 * Função utilitária para criar o provider padrão baseado nas variáveis de ambiente
 */
export function createDefaultPaymentProvider(): PaymentProvider {
  // Por enquanto, sempre retorna Stripe como padrão
  const defaultType: PaymentProviderType = 'stripe';
  const config = PaymentProviderFactory.createDefaultConfig(defaultType) as PaymentProviderConfig;
  
  if (!config.secretKey) {
    throw new PaymentError('MISSING_SECRET_KEY', 'Chave secreta do provedor de pagamento não configurada');
  }

  return PaymentProviderFactory.createProvider(config);
}
