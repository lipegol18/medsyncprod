/**
 * Tipos genéricos para operações de pagamento
 * Agnósticos ao provedor (Stripe, PagSeguro, Mercado Pago, etc.)
 */

export interface ProductInput {
  name: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface ProductResult {
  id: string;
  name: string;
  description?: string;
}

export interface PriceInput {
  productId: string;
  amount: number; // Em centavos
  currency: string; // 'brl', 'usd', etc.
  interval: 'month' | 'year';
  metadata?: Record<string, string>;
}

export interface PriceResult {
  id: string;
  productId: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
}

export interface AddressInput {
  line1: string; // Rua + número
  city: string;
  state: string; // UF (ex: "SP")
  postal_code: string; // CEP apenas números (ex: "01311000")
  country: string; // "BR"
}

export interface CustomerInput {
  email: string;
  name?: string;
  phone?: string;
  address?: AddressInput;
  cpf?: string; // CPF para compliance fiscal no Brasil
  metadata?: Record<string, string>;
}

export interface CustomerResult {
  id: string;
  email: string;
  name?: string;
}

export interface CheckoutInput {
  priceId: string;
  customerId?: string;
  customerData?: CustomerInput; // Dados para criar Customer automaticamente
  mode: 'subscription' | 'payment';
  successUrl: string;
  cancelUrl: string;
  allowPromotionCodes?: boolean;
  promotionCodeId?: string; // ID do código promocional (promo_xxx) - pré-aplica e permite troca
  couponId?: string; // Deprecated: use promotionCodeId
  metadata?: Record<string, string>;
}

export interface CheckoutResult {
  id: string;
  url?: string;
}

/**
 * Input para criação de PaymentIntent (pagamento único)
 */
export interface PaymentIntentInput {
  amount: number; // Valor em reais (será convertido para centavos)
  currency?: string; // Padrão: 'brl'
  metadata?: Record<string, string>;
}

/**
 * Resultado da criação de PaymentIntent
 */
export interface PaymentIntentResult {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
}

/**
 * Input para recuperação de assinatura
 */
export interface SubscriptionRetrieveInput {
  subscriptionId: string;
}

/**
 * Resultado da recuperação de assinatura
 */
export interface SubscriptionResult {
  id: string;
  status: string;
  customerId: string;
  priceId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  metadata?: Record<string, string>;
}

export interface WebhookEvent {
  type: string;
  data: any;
}

export class PaymentError extends Error {
  public code: string;
  
  constructor(code: string, message: string) {
    super(message);
    this.name = 'PaymentError';
    this.code = code;
  }
}
