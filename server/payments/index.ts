/**
 * Factory para provedores de pagamento
 * Permite trocar entre Stripe, PagSeguro, Mercado Pago, etc. via configuração
 */

import { PaymentProvider } from './provider';
import { StripeProvider } from './stripeProvider';

// Singleton instance
let cachedProvider: PaymentProvider | null = null;

/**
 * Tipos de provedor suportados
 */
export type PaymentProviderType = 'stripe' | 'pagSeguro' | 'mercadoPago';

/**
 * Factory principal - cria o provedor baseado na configuração do ambiente
 */
export function getPaymentProvider(): PaymentProvider {
  // Retornar instância cached se já existe
  if (cachedProvider) {
    return cachedProvider;
  }

  // Ler configuração do ambiente (default: stripe)
  const providerType = (process.env.PAYMENT_PROVIDER || 'stripe') as PaymentProviderType;
  
  console.log(`🏭 [PaymentFactory] Inicializando provedor: ${providerType}`);

  switch (providerType) {
    case 'stripe':
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) {
        throw new Error('STRIPE_SECRET_KEY environment variable is required when using Stripe provider');
      }
      cachedProvider = new StripeProvider(stripeSecretKey);
      break;

    case 'pagSeguro':
      // TODO: Implementar PagSeguroProvider no futuro
      throw new Error('PagSeguro provider not implemented yet');

    case 'mercadoPago':
      // TODO: Implementar MercadoPagoProvider no futuro
      throw new Error('Mercado Pago provider not implemented yet');

    default:
      throw new Error(`Unsupported payment provider: ${providerType}`);
  }

  console.log(`✅ [PaymentFactory] Provedor ${providerType} inicializado com sucesso`);
  return cachedProvider;
}

/**
 * Permite injetar um provedor customizado (útil para testes)
 */
export function setPaymentProvider(provider: PaymentProvider): void {
  cachedProvider = provider;
  console.log(`🔧 [PaymentFactory] Provedor customizado injetado: ${provider.getProviderName()}`);
}

/**
 * Limpa o cache do provedor (útil para testes)
 */
export function clearPaymentProvider(): void {
  cachedProvider = null;
  console.log(`🧹 [PaymentFactory] Cache do provedor limpo`);
}

// Exportar tipos para uso externo
export * from './types';
export * from './provider';
export * from './stripeProvider';