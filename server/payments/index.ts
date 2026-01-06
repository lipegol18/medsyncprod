/**
 * Ponto de entrada principal para o sistema de pagamentos
 * Integra a nova factory extensível com a API antiga para compatibilidade
 */

import { PaymentProvider } from './provider';
import { PaymentProviderFactory, createDefaultPaymentProvider, PaymentProviderType } from './factory';

// Instância cached para compatibilidade com API antiga
let cachedProvider: PaymentProvider | null = null;

/**
 * Factory principal - cria o provedor baseado na configuração do ambiente
 * Mantém compatibilidade com a API antiga
 */
export function getPaymentProvider(): PaymentProvider {
  // Retornar instância cached se já existe
  if (cachedProvider) {
    return cachedProvider;
  }

  // Usar a nova factory para criar o provider padrão
  try {
    cachedProvider = createDefaultPaymentProvider();
    console.log(`✅ [PaymentFactory] Provedor inicializado: ${cachedProvider.getProviderName()}`);
    return cachedProvider;
  } catch (error: any) {
    console.error('❌ [PaymentFactory] Erro ao inicializar provedor:', error.message);
    throw error;
  }
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
  PaymentProviderFactory.clearCache();
  console.log(`🧹 [PaymentFactory] Cache do provedor limpo`);
}

// Exportar tipos para uso externo
export * from './types';
export * from './provider';
export * from './factory';
export * from './stripeProvider';