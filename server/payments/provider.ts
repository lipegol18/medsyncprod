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

  // === MÉTODOS PARA GESTÃO DE CUPONS DE DESCONTO ===

  /**
   * Criar cupom de desconto no provedor
   */
  createCoupon(couponData: any): Promise<any>;

  /**
   * Buscar cupom por ID
   */
  getCoupon(couponId: string): Promise<any>;

  /**
   * Atualizar cupom (limitado pelo que o provedor permite)
   */
  updateCoupon(couponId: string, updates: any): Promise<any>;

  /**
   * Excluir/desativar cupom
   */
  deleteCoupon(couponId: string): Promise<any>;

  /**
   * Listar cupons do provedor
   */
  listCoupons(params?: any): Promise<any>;

  /**
   * Criar código promocional baseado em cupom
   */
  createPromotionCode(couponId: string, codeData: any): Promise<any>;

  /**
   * Buscar código promocional por ID
   */
  getPromotionCode(promotionCodeId: string): Promise<any>;

  /**
   * Atualizar código promocional
   */
  updatePromotionCode(promotionCodeId: string, updates: any): Promise<any>;

  /**
   * Listar códigos promocionais (com paginação automática)
   */
  listPromotionCodes(params?: any): Promise<any[]>;

  /**
   * Listar todos os cupons (com paginação automática)
   */
  listAllCoupons(params?: any): Promise<any[]>;
}
