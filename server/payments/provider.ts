/**
 * Interface abstrata para provedores de pagamento
 * Permite trocar entre Stripe, PagSeguro, Mercado Pago, etc.
 */

import { 
  ProductInput, 
  ProductResult, 
  PriceInput, 
  PriceResult, 
  CustomerInput, 
  CustomerResult, 
  CheckoutInput, 
  CheckoutResult, 
  PaymentIntentInput,
  PaymentIntentResult,
  SubscriptionRetrieveInput,
  SubscriptionResult,
  WebhookEvent 
} from './types';

export interface PaymentProvider {
  /**
   * Cria ou garante que existe um produto no provedor
   */
  ensureProduct(input: ProductInput): Promise<ProductResult>;

  /**
   * Cria ou garante que existe um preço no provedor
   */
  ensurePrice(input: PriceInput): Promise<PriceResult>;

  /**
   * Cria ou atualiza um cliente no provedor
   */
  createOrUpdateCustomer(input: CustomerInput): Promise<CustomerResult>;

  /**
   * Cria uma sessão de checkout para pagamento/assinatura
   */
  createCheckoutSession(input: CheckoutInput): Promise<CheckoutResult>;

  /**
   * Cria um PaymentIntent para pagamento único
   */
  createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>;

  /**
   * Cria uma assinatura diretamente
   */
  createSubscription(customerId: string, priceId: string, metadata?: Record<string, string>): Promise<SubscriptionResult>;

  /**
   * Recupera informações de uma assinatura
   */
  retrieveSubscription(input: SubscriptionRetrieveInput): Promise<SubscriptionResult>;

  /**
   * Cancela uma assinatura
   */
  cancelSubscription(subscriptionId: string): Promise<void>;

  /**
   * Processa webhook events do provedor
   */
  parseWebhook(rawBody: Buffer, signature: string): Promise<WebhookEvent>;

  /**
   * Nome do provedor para logging/debug
   */
  getProviderName(): string;
}