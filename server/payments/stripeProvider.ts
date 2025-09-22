/**
 * Implementação do PaymentProvider para Stripe
 * Adapta a API do Stripe para nossa interface genérica
 */

import Stripe from 'stripe';
import { PaymentProvider } from './provider';
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
  WebhookEvent,
  PaymentError 
} from './types';

export class StripeProvider implements PaymentProvider {
  private stripe: Stripe;

  constructor(secretKey: string) {
    if (!secretKey) {
      throw new PaymentError('MISSING_SECRET_KEY', 'Stripe secret key is required');
    }

    if (!secretKey.startsWith('sk_')) {
      throw new PaymentError('INVALID_SECRET_KEY', 'Invalid Stripe secret key format');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-08-27.basil',
    });
  }

  getProviderName(): string {
    return 'stripe';
  }

  async ensureProduct(input: ProductInput): Promise<ProductResult> {
    try {
      console.log(`🚀 [Stripe] Criando produto: ${input.name}`);
      
      const productData: Stripe.ProductCreateParams = {
        name: input.name,
        description: input.description,
        metadata: {
          source: 'medsync',
          ...input.metadata
        }
      };

      const stripeProduct = await this.stripe.products.create(productData);
      
      console.log(`✅ [Stripe] Produto criado: ${stripeProduct.id}`);
      
      return {
        id: stripeProduct.id,
        name: stripeProduct.name,
        description: stripeProduct.description || undefined
      };
    } catch (error: any) {
      console.error('❌ [Stripe] Erro ao criar produto:', error);
      throw new PaymentError('PRODUCT_CREATION_FAILED', `Falha ao criar produto: ${error.message}`);
    }
  }

  async ensurePrice(input: PriceInput): Promise<PriceResult> {
    try {
      console.log(`🚀 [Stripe] Criando preço: ${input.amount} ${input.currency} (${input.interval})`);
      
      const priceData: Stripe.PriceCreateParams = {
        product: input.productId,
        unit_amount: input.amount,
        currency: input.currency,
        recurring: {
          interval: input.interval
        },
        metadata: {
          source: 'medsync',
          billing_period: input.interval === 'month' ? 'monthly' : 'yearly',
          ...input.metadata
        }
      };

      const stripePrice = await this.stripe.prices.create(priceData);
      
      console.log(`✅ [Stripe] Preço criado: ${stripePrice.id}`);
      
      return {
        id: stripePrice.id,
        productId: input.productId,
        amount: input.amount,
        currency: input.currency,
        interval: input.interval
      };
    } catch (error: any) {
      console.error('❌ [Stripe] Erro ao criar preço:', error);
      throw new PaymentError('PRICE_CREATION_FAILED', `Falha ao criar preço: ${error.message}`);
    }
  }

  async createOrUpdateCustomer(input: CustomerInput): Promise<CustomerResult> {
    try {
      console.log(`🚀 [Stripe] Criando/atualizando cliente: ${input.email}`);
      
      const customerData: Stripe.CustomerCreateParams = {
        email: input.email,
        name: input.name,
        phone: input.phone,
        address: input.address ? {
          line1: input.address.line1,
          city: input.address.city,
          state: input.address.state,
          postal_code: input.address.postal_code,
          country: input.address.country
        } : undefined,
        metadata: {
          source: 'medsync',
          ...input.metadata
        }
      };

      const stripeCustomer = await this.stripe.customers.create(customerData);
      
      console.log(`✅ [Stripe] Cliente criado: ${stripeCustomer.id}`);

      // Adicionar CPF como tax_id para compliance fiscal brasileiro
      if (input.cpf) {
        try {
          const cleanCpf = input.cpf.replace(/\D/g, ''); // Remove formatação
          
          await this.stripe.customers.createTaxId(stripeCustomer.id, {
            type: 'br_cpf',
            value: cleanCpf
          });
          
          console.log(`✅ [Stripe] CPF adicionado como tax_id: ${cleanCpf}`);
        } catch (taxIdError: any) {
          console.warn(`⚠️ [Stripe] Erro ao adicionar CPF como tax_id:`, taxIdError.message);
          // Não falhar a criação do customer por erro no tax_id
        }
      }
      
      return {
        id: stripeCustomer.id,
        email: stripeCustomer.email!,
        name: stripeCustomer.name || undefined
      };
    } catch (error: any) {
      console.error('❌ [Stripe] Erro ao criar cliente:', error);
      throw new PaymentError('CUSTOMER_CREATION_FAILED', `Falha ao criar cliente: ${error.message}`);
    }
  }

  async createCheckoutSession(input: CheckoutInput): Promise<CheckoutResult> {
    try {
      console.log(`🚀 [Stripe] Criando sessão de checkout: ${input.priceId}`);
      
      const sessionData: Stripe.Checkout.SessionCreateParams = {
        mode: input.mode,
        line_items: [
          {
            price: input.priceId,
            quantity: 1,
          },
        ],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        customer_update: { address: "auto" }, // Permite atualizar dados do cliente
        metadata: {
          source: 'medsync',
          ...input.metadata
        }
      };

      // Nota: automatic_tax removido pois nem todas as contas Stripe suportam
      // Para compliance fiscal brasileiro, usamos CPF como tax_id no Customer

      // Adicionar cliente se fornecido
      if (input.customerId) {
        sessionData.customer = input.customerId;
      }

      // Adicionar cupons se fornecido
      if (input.couponId) {
        sessionData.discounts = [{
          coupon: input.couponId
        }];
      }

      // Habilitar códigos promocionais se solicitado
      if (input.allowPromotionCodes) {
        sessionData.allow_promotion_codes = true;
      }

      const session = await this.stripe.checkout.sessions.create(sessionData);
      
      console.log(`✅ [Stripe] Sessão criada: ${session.id}`);
      
      return {
        id: session.id,
        url: session.url || undefined
      };
    } catch (error: any) {
      console.error('❌ [Stripe] Erro ao criar checkout:', error);
      throw new PaymentError('CHECKOUT_CREATION_FAILED', `Falha ao criar checkout: ${error.message}`);
    }
  }

  async createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    try {
      console.log(`🚀 [Stripe] Criando PaymentIntent para R$ ${input.amount}`);
      
      const paymentIntentData: Stripe.PaymentIntentCreateParams = {
        amount: Math.round(input.amount * 100), // Converter para centavos
        currency: input.currency || 'brl',
        metadata: {
          source: 'medsync',
          ...input.metadata
        }
      };

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentData);
      
      console.log(`✅ [Stripe] PaymentIntent criado: ${paymentIntent.id}`);
      
      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || '',
        amount: paymentIntent.amount / 100, // Converter de volta para reais
        currency: paymentIntent.currency,
        status: paymentIntent.status
      };
    } catch (error: any) {
      console.error('❌ [Stripe] Erro ao criar PaymentIntent:', error);
      throw new PaymentError('PAYMENT_INTENT_CREATION_FAILED', `Falha ao criar PaymentIntent: ${error.message}`);
    }
  }

  async createSubscription(customerId: string, priceId: string, metadata?: Record<string, string>): Promise<SubscriptionResult> {
    try {
      console.log(`🚀 [Stripe] Criando assinatura para cliente ${customerId} com preço ${priceId}`);
      
      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: priceId }],
        metadata: {
          source: 'medsync',
          ...metadata
        }
      };

      const subscription = await this.stripe.subscriptions.create(subscriptionData);
      
      console.log(`✅ [Stripe] Assinatura criada: ${subscription.id}`);
      
      return {
        id: subscription.id,
        status: subscription.status,
        customerId: subscription.customer as string,
        priceId: subscription.items.data[0]?.price.id,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        metadata: subscription.metadata
      };
    } catch (error: any) {
      console.error('❌ [Stripe] Erro ao criar assinatura:', error);
      throw new PaymentError('SUBSCRIPTION_CREATION_FAILED', `Falha ao criar assinatura: ${error.message}`);
    }
  }

  async retrieveSubscription(input: SubscriptionRetrieveInput): Promise<SubscriptionResult> {
    try {
      console.log(`🚀 [Stripe] Recuperando assinatura: ${input.subscriptionId}`);
      
      const subscription = await this.stripe.subscriptions.retrieve(input.subscriptionId);
      
      console.log(`✅ [Stripe] Assinatura recuperada: ${subscription.id} - Status: ${subscription.status}`);
      
      return {
        id: subscription.id,
        status: subscription.status,
        customerId: subscription.customer as string,
        priceId: subscription.items.data[0]?.price.id,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        metadata: subscription.metadata
      };
    } catch (error: any) {
      console.error('❌ [Stripe] Erro ao recuperar assinatura:', error);
      throw new PaymentError('SUBSCRIPTION_RETRIEVAL_FAILED', `Falha ao recuperar assinatura: ${error.message}`);
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      console.log(`🚀 [Stripe] Cancelando assinatura: ${subscriptionId}`);
      
      await this.stripe.subscriptions.cancel(subscriptionId);
      
      console.log(`✅ [Stripe] Assinatura cancelada: ${subscriptionId}`);
    } catch (error: any) {
      console.error('❌ [Stripe] Erro ao cancelar assinatura:', error);
      throw new PaymentError('SUBSCRIPTION_CANCELLATION_FAILED', `Falha ao cancelar assinatura: ${error.message}`);
    }
  }

  async parseWebhook(rawBody: Buffer, signature: string): Promise<WebhookEvent> {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new PaymentError('MISSING_WEBHOOK_SECRET', 'Stripe webhook secret not configured');
      }

      const event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      
      return {
        type: event.type,
        data: event.data
      };
    } catch (error: any) {
      console.error('❌ [Stripe] Erro ao processar webhook:', error);
      throw new PaymentError('WEBHOOK_PROCESSING_FAILED', `Falha ao processar webhook: ${error.message}`);
    }
  }

  // Buscar checkout session por ID
  async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    try {
      console.log(`🔍 Buscando checkout session: ${sessionId}`);
      
      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['customer', 'subscription', 'line_items']
      });

      console.log(`✅ Session encontrada: ${session.id} - Status: ${session.status}`);
      return session;
    } catch (error: any) {
      console.error('❌ Erro ao buscar checkout session:', error.message);
      throw new Error(`Erro ao buscar session: ${error.message}`);
    }
  }

  // Processar webhook do Stripe (alias para parseWebhook para compatibilidade)
  async processWebhook(payload: string | Buffer, signature: string): Promise<any> {
    try {
      console.log('🔍 Processando webhook do Stripe...');
      
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!endpointSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET não configurado');
      }

      // Construir evento a partir do payload e assinatura
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        endpointSecret
      );

      console.log(`✅ Webhook verificado: ${event.type} - ${event.id}`);
      return event;
    } catch (error: any) {
      console.error('❌ Erro ao processar webhook:', error.message);
      throw new Error(`Webhook inválido: ${error.message}`);
    }
  }
}