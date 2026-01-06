/**
 * Implementação do PaymentProvider para Stripe
 * Adapta a API do Stripe para nossa interface genérica
 */

import Stripe from "stripe";
import { PaymentProvider } from "./provider";
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
  PaymentError,
} from "./types";

export class StripeProvider implements PaymentProvider {
  private stripe: Stripe;

  constructor(secretKey: string) {
    if (!secretKey) {
      throw new PaymentError(
        "MISSING_SECRET_KEY",
        "Stripe secret key is required",
      );
    }

    if (!secretKey.startsWith("sk_")) {
      throw new PaymentError(
        "INVALID_SECRET_KEY",
        "Invalid Stripe secret key format",
      );
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: "2025-08-27.basil",
    });
  }

  getProviderName(): string {
    return "stripe";
  }

  async ensureProduct(input: ProductInput): Promise<ProductResult> {
    try {
      console.log(`🚀 [Stripe] Criando produto: ${input.name}`);

      const productData: Stripe.ProductCreateParams = {
        name: input.name,
        description: input.description,
        metadata: {
          source: "medsync",
          ...input.metadata,
        },
      };

      const stripeProduct = await this.stripe.products.create(productData);

      console.log(`✅ [Stripe] Produto criado: ${stripeProduct.id}`);

      return {
        id: stripeProduct.id,
        name: stripeProduct.name,
        description: stripeProduct.description || undefined,
      };
    } catch (error: any) {
      console.error("❌ [Stripe] Erro ao criar produto:", error);
      throw new PaymentError(
        "PRODUCT_CREATION_FAILED",
        `Falha ao criar produto: ${error.message}`,
      );
    }
  }

  async ensurePrice(input: PriceInput): Promise<PriceResult> {
    try {
      console.log(
        `🚀 [Stripe] Criando preço: ${input.amount} ${input.currency} (${input.interval})`,
      );

      const priceData: Stripe.PriceCreateParams = {
        product: input.productId,
        unit_amount: input.amount,
        currency: input.currency,
        recurring: {
          interval: input.interval,
        },
        metadata: {
          source: "medsync",
          billing_period: input.interval === "month" ? "monthly" : "yearly",
          ...input.metadata,
        },
      };

      const stripePrice = await this.stripe.prices.create(priceData);

      console.log(`✅ [Stripe] Preço criado: ${stripePrice.id}`);

      return {
        id: stripePrice.id,
        productId: input.productId,
        amount: input.amount,
        currency: input.currency,
        interval: input.interval,
      };
    } catch (error: any) {
      console.error("❌ [Stripe] Erro ao criar preço:", error);
      throw new PaymentError(
        "PRICE_CREATION_FAILED",
        `Falha ao criar preço: ${error.message}`,
      );
    }
  }

  async createOrUpdateCustomer(input: CustomerInput): Promise<CustomerResult> {
    try {
      console.log(`🚀 [Stripe] Criando/atualizando cliente: ${input.email}`);

      const customerData: Stripe.CustomerCreateParams = {
        email: input.email,
        name: input.name,
        phone: input.phone,
        address: input.address
          ? {
              line1: input.address.line1,
              city: input.address.city,
              state: input.address.state,
              postal_code: input.address.postal_code,
              country: input.address.country,
            }
          : undefined,
        metadata: {
          source: "medsync",
          ...input.metadata,
        },
      };

      const stripeCustomer = await this.stripe.customers.create(customerData);

      console.log(`✅ [Stripe] Cliente criado: ${stripeCustomer.id}`);

      // Adicionar CPF como tax_id para compliance fiscal brasileiro
      if (input.cpf) {
        try {
          const cleanCpf = input.cpf.replace(/\D/g, ""); // Remove formatação

          await this.stripe.customers.createTaxId(stripeCustomer.id, {
            type: "br_cpf",
            value: cleanCpf,
          });

          console.log(`✅ [Stripe] CPF adicionado como tax_id: ${cleanCpf}`);
        } catch (taxIdError: any) {
          console.warn(
            `⚠️ [Stripe] Erro ao adicionar CPF como tax_id:`,
            taxIdError.message,
          );
          // Não falhar a criação do customer por erro no tax_id
        }
      }

      return {
        id: stripeCustomer.id,
        email: stripeCustomer.email!,
        name: stripeCustomer.name || undefined,
      };
    } catch (error: any) {
      console.error("❌ [Stripe] Erro ao criar cliente:", error);
      throw new PaymentError(
        "CUSTOMER_CREATION_FAILED",
        `Falha ao criar cliente: ${error.message}`,
      );
    }
  }

  async createCheckoutSession(input: CheckoutInput): Promise<CheckoutResult> {
    try {
      console.log(
        "\n🎯 [StripeProvider] ========== INÍCIO: createCheckoutSession ==========",
      );
      console.log(
        "📥 Input recebido:",
        JSON.stringify(
          {
            priceId: input.priceId,
            mode: input.mode,
            successUrl: input.successUrl,
            cancelUrl: input.cancelUrl,
            couponId: input.couponId,
            hasCustomerId: !!input.customerId,
            hasCustomerData: !!input.customerData,
            customerEmail: input.customerData?.email,
            metadata: input.metadata,
          },
          null,
          2,
        ),
      );

      let customerId = input.customerId;

      // Criar Customer automaticamente se dados fornecidos e customerId não existir
      if (!customerId && input.customerData) {
        console.log(
          `👤 [Stripe] Criando Customer com dados completos para ${input.customerData.email}`,
        );

        const customerResult = await this.createOrUpdateCustomer(
          input.customerData,
        );
        customerId = customerResult.id;

        console.log(
          `✅ [Stripe] Customer criado automaticamente: ${customerId}`,
        );
      }

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
          source: "medsync",
          ...input.metadata,
        },
      };

      // Adicionar cliente se disponível
      if (customerId) {
        sessionData.customer = customerId;
        console.log(`👤 [Stripe] Usando Customer: ${customerId}`);
      }

      // Configurar códigos promocionais baseado nos parâmetros
      // IMPORTANTE: Stripe não permite usar 'discounts' junto com 'allow_promotion_codes'
      // Devemos escolher um OU outro
      if (input.promotionCodeId) {
        // Aplicar código promocional específico via discounts (não usar allow_promotion_codes)
        sessionData.discounts = [{ promotion_code: input.promotionCodeId }];
        // NÃO definir allow_promotion_codes quando usando discounts
        console.log(`🎫 [Stripe] Código promocional fixo aplicado via discounts: ${input.promotionCodeId}`);
      } else if (input.allowPromotionCodes === false) {
        // Desabilitar códigos promocionais explicitamente (sem discounts)
        sessionData.allow_promotion_codes = false;
        console.log(`🎫 [Stripe] Códigos promocionais desabilitados`);
      } else {
        // Permitir códigos promocionais manuais (padrão para planos mensais)
        sessionData.allow_promotion_codes = true;
        console.log(`🎫 [Stripe] Habilitando códigos promocionais manuais (usuário pode digitar código)`);
      }

      // Para compliance fiscal brasileiro - CPF já adicionado como tax_id no Customer
      // Custom fields removidos temporariamente devido a incompatibilidade da API
      // O CPF já está disponível no Customer como tax_id para compliance fiscal
      if (input.customerData?.cpf) {
        console.log(
          `🇧🇷 [Stripe] Compliance fiscal brasileiro: CPF adicionado como tax_id no Customer`,
        );
      }

      const session = await this.stripe.checkout.sessions.create(sessionData);

      console.log("\n✅ [StripeProvider] Sessão de Checkout criada:");
      console.log("🆔 Session ID:", session.id);
      console.log("🔗 URL:", session.url);
      console.log(
        "💵 Valor:",
        session.amount_total
          ? `${session.amount_total / 100} ${session.currency?.toUpperCase()}`
          : "N/A",
      );
      console.log("👤 Customer:", session.customer || "Não definido");
      console.log(
        "🎫 Desconto aplicado:",
        session.total_details?.amount_discount ? "Sim" : "Não",
      );
      console.log("========== FIM: createCheckoutSession ==========\n");

      return {
        id: session.id,
        url: session.url || undefined,
      };
    } catch (error: any) {
      console.error(
        "\n💥 [StripeProvider] ========== ERRO NO CHECKOUT ==========",
      );
      console.error("🚨 Tipo:", error.constructor?.name || "Unknown");
      console.error("📝 Mensagem:", error.message);
      console.error("📊 Código:", error.code || "N/A");
      console.error("🔍 Type:", error.type || "N/A");

      // Dados específicos do Stripe
      if (error.raw) {
        console.error("📦 Raw Error:", JSON.stringify(error.raw, null, 2));
      }

      if (error.statusCode) {
        console.error("🌐 HTTP Status:", error.statusCode);
      }

      if (error.param) {
        console.error("⚙️ Parâmetro com erro:", error.param);
      }

      // Stack trace completo
      console.error("📚 Stack trace:", error.stack);
      console.error("========== FIM: ERRO NO CHECKOUT ==========\n");

      throw new PaymentError(
        "CHECKOUT_CREATION_FAILED",
        `Falha ao criar checkout: ${error.message}`,
      );
    }
  }

  async createPaymentIntent(
    input: PaymentIntentInput,
  ): Promise<PaymentIntentResult> {
    try {
      console.log(`🚀 [Stripe] Criando PaymentIntent para R$ ${input.amount}`);

      const paymentIntentData: Stripe.PaymentIntentCreateParams = {
        amount: Math.round(input.amount * 100), // Converter para centavos
        currency: input.currency || "brl",
        metadata: {
          source: "medsync",
          ...input.metadata,
        },
      };

      const paymentIntent =
        await this.stripe.paymentIntents.create(paymentIntentData);

      console.log(`✅ [Stripe] PaymentIntent criado: ${paymentIntent.id}`);

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || "",
        amount: paymentIntent.amount / 100, // Converter de volta para reais
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      };
    } catch (error: any) {
      console.error("❌ [Stripe] Erro ao criar PaymentIntent:", error);
      throw new PaymentError(
        "PAYMENT_INTENT_CREATION_FAILED",
        `Falha ao criar PaymentIntent: ${error.message}`,
      );
    }
  }

  async createSubscription(
    customerId: string,
    priceId: string,
    metadata?: Record<string, string>,
  ): Promise<SubscriptionResult> {
    try {
      console.log(
        `🚀 [Stripe] Criando assinatura para cliente ${customerId} com preço ${priceId}`,
      );

      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: priceId }],
        metadata: {
          source: "medsync",
          ...metadata,
        },
      };

      const subscription =
        await this.stripe.subscriptions.create(subscriptionData);

      console.log(`✅ [Stripe] Assinatura criada: ${subscription.id}`);

      return {
        id: subscription.id,
        status: subscription.status,
        customerId: subscription.customer as string,
        priceId: subscription.items.data[0]?.price.id,
        currentPeriodStart: new Date(
          (subscription as any).current_period_start * 1000,
        ),
        currentPeriodEnd: new Date(
          (subscription as any).current_period_end * 1000,
        ),
        metadata: subscription.metadata,
      };
    } catch (error: any) {
      console.error("❌ [Stripe] Erro ao criar assinatura:", error);
      throw new PaymentError(
        "SUBSCRIPTION_CREATION_FAILED",
        `Falha ao criar assinatura: ${error.message}`,
      );
    }
  }

  async retrieveSubscription(
    input: SubscriptionRetrieveInput,
  ): Promise<SubscriptionResult> {
    try {
      console.log(
        `🚀 [Stripe] Recuperando assinatura: ${input.subscriptionId}`,
      );

      const subscription = await this.stripe.subscriptions.retrieve(
        input.subscriptionId,
      );

      console.log(
        `✅ [Stripe] Assinatura recuperada: ${subscription.id} - Status: ${subscription.status}`,
      );

      return {
        id: subscription.id,
        status: subscription.status,
        customerId: subscription.customer as string,
        priceId: subscription.items.data[0]?.price.id,
        currentPeriodStart: new Date(
          (subscription as any).current_period_start * 1000,
        ),
        currentPeriodEnd: new Date(
          (subscription as any).current_period_end * 1000,
        ),
        metadata: subscription.metadata,
      };
    } catch (error: any) {
      console.error("❌ [Stripe] Erro ao recuperar assinatura:", error);
      throw new PaymentError(
        "SUBSCRIPTION_RETRIEVAL_FAILED",
        `Falha ao recuperar assinatura: ${error.message}`,
      );
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      console.log(`🚀 [Stripe] Cancelando assinatura: ${subscriptionId}`);

      await this.stripe.subscriptions.cancel(subscriptionId);

      console.log(`✅ [Stripe] Assinatura cancelada: ${subscriptionId}`);
    } catch (error: any) {
      console.error("❌ [Stripe] Erro ao cancelar assinatura:", error);
      throw new PaymentError(
        "SUBSCRIPTION_CANCELLATION_FAILED",
        `Falha ao cancelar assinatura: ${error.message}`,
      );
    }
  }

  async createBillingPortalSession(input: { customerId: string; returnUrl: string }): Promise<{ url: string }> {
    try {
      console.log(`🔧 [Stripe] Criando sessão do Billing Portal para customer: ${input.customerId}`);

      const session = await this.stripe.billingPortal.sessions.create({
        customer: input.customerId,
        return_url: input.returnUrl,
      });

      console.log(`✅ [Stripe] Sessão do Billing Portal criada: ${session.url}`);

      return { url: session.url };
    } catch (error: any) {
      console.error("❌ [Stripe] Erro ao criar sessão do Billing Portal:", error);
      throw new PaymentError(
        "BILLING_PORTAL_SESSION_FAILED",
        `Falha ao criar sessão do Billing Portal: ${error.message}`,
      );
    }
  }

  async parseWebhook(
    rawBody: Buffer,
    signature: string,
  ): Promise<WebhookEvent> {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new PaymentError(
          "MISSING_WEBHOOK_SECRET",
          "Stripe webhook secret not configured",
        );
      }

      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );

      return {
        type: event.type,
        data: event.data,
      };
    } catch (error: any) {
      console.error("❌ [Stripe] Erro ao processar webhook:", error);
      throw new PaymentError(
        "WEBHOOK_PROCESSING_FAILED",
        `Falha ao processar webhook: ${error.message}`,
      );
    }
  }

  // Buscar checkout session por ID
  async getCheckoutSession(
    sessionId: string,
  ): Promise<Stripe.Checkout.Session> {
    try {
      console.log(`🔍 Buscando checkout session: ${sessionId}`);

      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: [
          "customer",
          "subscription",
          "line_items",
          "total_details",
          "discounts",
        ],
      });

      console.log(
        `✅ Session encontrada: ${session.id} - Status: ${session.status}`,
      );
      return session;
    } catch (error: any) {
      console.error("❌ Erro ao buscar checkout session:", error.message);
      throw new Error(`Erro ao buscar session: ${error.message}`);
    }
  }

  // Processar webhook do Stripe (alias para parseWebhook para compatibilidade)
  async processWebhook(
    payload: string | Buffer,
    signature: string,
  ): Promise<any> {
    try {
      console.log("🔍 Processando webhook do Stripe...");

      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!endpointSecret) {
        throw new Error("STRIPE_WEBHOOK_SECRET não configurado");
      }

      // Construir evento a partir do payload e assinatura
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        endpointSecret,
      );

      console.log(`✅ Webhook verificado: ${event.type} - ${event.id}`);
      return event;
    } catch (error: any) {
      console.error("❌ Erro ao processar webhook:", error.message);
      throw new Error(`Webhook inválido: ${error.message}`);
    }
  }

  // === MÉTODOS PARA GESTÃO DE CUPONS DE DESCONTO ===

  /**
   * Criar cupom de desconto no Stripe
   */
  async createCoupon(
    couponData: Stripe.CouponCreateParams,
  ): Promise<Stripe.Coupon> {
    try {
      console.log(
        `🎫 [Stripe] Criando cupom: ${couponData.id || "auto-generated"}`,
      );

      const coupon = await this.stripe.coupons.create(couponData);

      console.log(`✅ [Stripe] Cupom criado: ${coupon.id}`);
      return coupon;
    } catch (error: any) {
      console.error("❌ [Stripe] Erro ao criar cupom:", error);
      throw new PaymentError(
        "COUPON_CREATION_FAILED",
        `Falha ao criar cupom: ${error.message}`,
      );
    }
  }

  /**
   * Buscar cupom por ID
   */
  async getCoupon(couponId: string): Promise<Stripe.Coupon> {
    try {
      console.log(`🔍 [Stripe] Buscando cupom: ${couponId}`);

      const coupon = await this.stripe.coupons.retrieve(couponId);

      console.log(
        `✅ [Stripe] Cupom encontrado: ${coupon.id} - Válido: ${coupon.valid}`,
      );
      return coupon;
    } catch (error: any) {
      console.error("❌ [Stripe] Erro ao buscar cupom:", error);
      throw new PaymentError(
        "COUPON_RETRIEVAL_FAILED",
        `Falha ao buscar cupom: ${error.message}`,
      );
    }
  }

  /**
   * Atualizar metadados do cupom (Stripe só permite atualizar metadata)
   */
  async updateCoupon(
    couponId: string,
    updates: Stripe.CouponUpdateParams,
  ): Promise<Stripe.Coupon> {
    try {
      console.log(`📝 [Stripe] Atualizando cupom: ${couponId}`);

      const coupon = await this.stripe.coupons.update(couponId, updates);

      console.log(`✅ [Stripe] Cupom atualizado: ${coupon.id}`);
      return coupon;
    } catch (error: any) {
      console.error("❌ [Stripe] Erro ao atualizar cupom:", error);
      throw new PaymentError(
        "COUPON_UPDATE_FAILED",
        `Falha ao atualizar cupom: ${error.message}`,
      );
    }
  }

  /**
   * Excluir/desativar cupom no Stripe
   */
  async deleteCoupon(couponId: string): Promise<Stripe.DeletedCoupon> {
    try {
      console.log(`🗑️ [Stripe] Excluindo cupom: ${couponId}`);

      const deleted = await this.stripe.coupons.del(couponId);

      console.log(`✅ [Stripe] Cupom excluído: ${deleted.id}`);
      return deleted;
    } catch (error: any) {
      console.error("❌ [Stripe] Erro ao excluir cupom:", error);
      throw new PaymentError(
        "COUPON_DELETION_FAILED",
        `Falha ao excluir cupom: ${error.message}`,
      );
    }
  }

  /**
   * Listar todos os cupons
   */
  async listCoupons(
    params?: Stripe.CouponListParams,
  ): Promise<Stripe.ApiList<Stripe.Coupon>> {
    try {
      console.log("📋 [Stripe] Listando cupons");

      const coupons = await this.stripe.coupons.list(params);

      console.log(`✅ [Stripe] ${coupons.data.length} cupons encontrados`);
      return coupons;
    } catch (error: any) {
      console.error("❌ [Stripe] Erro ao listar cupons:", error);
      throw new PaymentError(
        "COUPON_LIST_FAILED",
        `Falha ao listar cupons: ${error.message}`,
      );
    }
  }

  /**
   * Criar código promocional (promotion code) baseado em um cupom
   */
  async createPromotionCode(
    couponId: string,
    codeData: Omit<Stripe.PromotionCodeCreateParams, "coupon">,
  ): Promise<Stripe.PromotionCode> {
    try {
      console.log(
        `🎟️ [Stripe] Criando código promocional para cupom: ${couponId}`,
      );

      const promotionCode = await this.stripe.promotionCodes.create({
        coupon: couponId,
        ...codeData,
      });

      console.log(
        `✅ [Stripe] Código promocional criado: ${promotionCode.id} - Código: ${promotionCode.code}`,
      );
      return promotionCode;
    } catch (error: any) {
      console.error("❌ [Stripe] Erro ao criar código promocional:", error);
      throw new PaymentError(
        "PROMOTION_CODE_CREATION_FAILED",
        `Falha ao criar código promocional: ${error.message}`,
      );
    }
  }

  /**
   * Buscar código promocional por ID
   */
  async getPromotionCode(
    promotionCodeId: string,
  ): Promise<Stripe.PromotionCode> {
    try {
      console.log(
        `🔍 [Stripe] Buscando código promocional: ${promotionCodeId}`,
      );

      const promotionCode =
        await this.stripe.promotionCodes.retrieve(promotionCodeId);

      console.log(
        `✅ [Stripe] Código promocional encontrado: ${promotionCode.id} - Ativo: ${promotionCode.active}`,
      );
      return promotionCode;
    } catch (error: any) {
      console.error("❌ [Stripe] Erro ao buscar código promocional:", error);
      throw new PaymentError(
        "PROMOTION_CODE_RETRIEVAL_FAILED",
        `Falha ao buscar código promocional: ${error.message}`,
      );
    }
  }

  /**
   * Atualizar código promocional
   */
  async updatePromotionCode(
    promotionCodeId: string,
    updates: Stripe.PromotionCodeUpdateParams,
  ): Promise<Stripe.PromotionCode> {
    try {
      console.log(
        `📝 [Stripe] Atualizando código promocional: ${promotionCodeId}`,
      );

      const promotionCode = await this.stripe.promotionCodes.update(
        promotionCodeId,
        updates,
      );

      console.log(
        `✅ [Stripe] Código promocional atualizado: ${promotionCode.id}`,
      );
      return promotionCode;
    } catch (error: any) {
      console.error("❌ [Stripe] Erro ao atualizar código promocional:", error);
      throw new PaymentError(
        "PROMOTION_CODE_UPDATE_FAILED",
        `Falha ao atualizar código promocional: ${error.message}`,
      );
    }
  }

  /**
   * Listar códigos promocionais com paginação automática
   */
  async listPromotionCodes(
    params?: Stripe.PromotionCodeListParams,
  ): Promise<Stripe.PromotionCode[]> {
    try {
      console.log("📋 [Stripe] Listando códigos promocionais");

      const allPromotionCodes: Stripe.PromotionCode[] = [];
      let hasMore = true;
      let startingAfter: string | undefined = undefined;

      // Paginação automática
      while (hasMore) {
        const response = await this.stripe.promotionCodes.list({
          ...params,
          limit: 100, // Máximo permitido pela API
          starting_after: startingAfter,
        });

        allPromotionCodes.push(...response.data);
        hasMore = response.has_more;
        
        if (hasMore && response.data.length > 0) {
          startingAfter = response.data[response.data.length - 1].id;
        }
      }

      console.log(
        `✅ [Stripe] ${allPromotionCodes.length} códigos promocionais encontrados`,
      );
      return allPromotionCodes;
    } catch (error: any) {
      console.error("❌ [Stripe] Erro ao listar códigos promocionais:", error);
      throw new PaymentError(
        "PROMOTION_CODE_LIST_FAILED",
        `Falha ao listar códigos promocionais: ${error.message}`,
      );
    }
  }

  /**
   * Listar todos os cupons com paginação automática
   */
  async listAllCoupons(
    params?: Stripe.CouponListParams,
  ): Promise<Stripe.Coupon[]> {
    try {
      console.log("📋 [Stripe] Listando todos os cupons com paginação");

      const allCoupons: Stripe.Coupon[] = [];
      let hasMore = true;
      let startingAfter: string | undefined = undefined;

      // Paginação automática
      while (hasMore) {
        const response = await this.stripe.coupons.list({
          ...params,
          limit: 100, // Máximo permitido pela API
          starting_after: startingAfter,
        });

        allCoupons.push(...response.data);
        hasMore = response.has_more;
        
        if (hasMore && response.data.length > 0) {
          startingAfter = response.data[response.data.length - 1].id;
        }
      }

      console.log(
        `✅ [Stripe] ${allCoupons.length} cupons encontrados`,
      );
      return allCoupons;
    } catch (error: any) {
      console.error("❌ [Stripe] Erro ao listar todos os cupons:", error);
      throw new PaymentError(
        "COUPON_LIST_ALL_FAILED",
        `Falha ao listar todos os cupons: ${error.message}`,
      );
    }
  }

  // ===========================
  // COUPON MANAGEMENT METHODS
  // ===========================

  /**
   * Criar novo cupom no Stripe
   */
  async createCoupon(params: {
    id?: string; // ID customizado opcional
    name?: string;
    percentOff?: number; // 1-100
    amountOff?: number; // em centavos
    currency?: string;
    duration: 'once' | 'repeating' | 'forever';
    durationInMonths?: number;
    maxRedemptions?: number;
    redeemBy?: number; // Unix timestamp
    metadata?: Record<string, string>;
  }): Promise<Stripe.Coupon> {
    try {
      console.log(`🎟️ [Stripe] Criando cupom: ${params.name || params.id || 'sem nome'}`);

      const couponData: Stripe.CouponCreateParams = {
        id: params.id,
        name: params.name,
        percent_off: params.percentOff,
        amount_off: params.amountOff,
        currency: params.currency || 'brl',
        duration: params.duration,
        duration_in_months: params.durationInMonths,
        max_redemptions: params.maxRedemptions,
        redeem_by: params.redeemBy,
        metadata: params.metadata,
      };

      const coupon = await this.stripe.coupons.create(couponData);
      console.log(`✅ [Stripe] Cupom criado: ${coupon.id}`);
      return coupon;
    } catch (error: any) {
      console.error("❌ [Stripe] Erro ao criar cupom:", error);
      throw new PaymentError(
        "COUPON_CREATE_FAILED",
        `Falha ao criar cupom: ${error.message}`,
      );
    }
  }

  /**
   * Buscar cupom individual
   */
  async getCoupon(couponId: string): Promise<Stripe.Coupon> {
    try {
      console.log(`🔍 [Stripe] Buscando cupom: ${couponId}`);
      const coupon = await this.stripe.coupons.retrieve(couponId);
      return coupon;
    } catch (error: any) {
      console.error("❌ [Stripe] Erro ao buscar cupom:", error);
      throw new PaymentError(
        "COUPON_RETRIEVE_FAILED",
        `Falha ao buscar cupom: ${error.message}`,
      );
    }
  }

  /**
   * Atualizar metadados de cupom (Stripe só permite atualizar metadata e name)
   */
  async updateCoupon(
    couponId: string,
    params: { name?: string; metadata?: Record<string, string> }
  ): Promise<Stripe.Coupon> {
    try {
      console.log(`🔄 [Stripe] Atualizando cupom: ${couponId}`);
      const coupon = await this.stripe.coupons.update(couponId, params);
      console.log(`✅ [Stripe] Cupom atualizado: ${coupon.id}`);
      return coupon;
    } catch (error: any) {
      console.error("❌ [Stripe] Erro ao atualizar cupom:", error);
      throw new PaymentError(
        "COUPON_UPDATE_FAILED",
        `Falha ao atualizar cupom: ${error.message}`,
      );
    }
  }

  /**
   * Deletar cupom (cuidado: irreversível!)
   */
  async deleteCoupon(couponId: string): Promise<void> {
    try {
      console.log(`🗑️ [Stripe] Deletando cupom: ${couponId}`);
      await this.stripe.coupons.del(couponId);
      console.log(`✅ [Stripe] Cupom deletado: ${couponId}`);
    } catch (error: any) {
      console.error("❌ [Stripe] Erro ao deletar cupom:", error);
      throw new PaymentError(
        "COUPON_DELETE_FAILED",
        `Falha ao deletar cupom: ${error.message}`,
      );
    }
  }

  // ===========================
  // PROMOTION CODE MANAGEMENT
  // ===========================

  /**
   * Criar código promocional vinculado a um cupom
   */
  async createPromotionCode(params: {
    coupon: string; // ID do cupom Stripe
    code: string; // Código digitável (ex: BLACKFRIDAY)
    active?: boolean;
    maxRedemptions?: number;
    expiresAt?: number; // Unix timestamp
    restrictions?: {
      first_time_transaction?: boolean;
      minimum_amount?: number;
      minimum_amount_currency?: string;
    };
    metadata?: Record<string, string>;
  }): Promise<Stripe.PromotionCode> {
    try {
      console.log(`🎫 [Stripe] Criando código promocional: ${params.code}`);

      const promoData: Stripe.PromotionCodeCreateParams = {
        coupon: params.coupon,
        code: params.code.toUpperCase(), // Sempre uppercase
        active: params.active ?? true,
        max_redemptions: params.maxRedemptions,
        expires_at: params.expiresAt,
        restrictions: params.restrictions,
        metadata: params.metadata,
      };

      const promoCode = await this.stripe.promotionCodes.create(promoData);
      console.log(`✅ [Stripe] Código promocional criado: ${promoCode.id}`);
      return promoCode;
    } catch (error: any) {
      console.error("❌ [Stripe] Erro ao criar código promocional:", error);
      throw new PaymentError(
        "PROMOTION_CODE_CREATE_FAILED",
        `Falha ao criar código promocional: ${error.message}`,
      );
    }
  }

  /**
   * Buscar código promocional individual
   */
  async getPromotionCode(promoCodeId: string): Promise<Stripe.PromotionCode> {
    try {
      console.log(`🔍 [Stripe] Buscando código promocional: ${promoCodeId}`);
      const promoCode = await this.stripe.promotionCodes.retrieve(promoCodeId);
      return promoCode;
    } catch (error: any) {
      console.error("❌ [Stripe] Erro ao buscar código promocional:", error);
      throw new PaymentError(
        "PROMOTION_CODE_RETRIEVE_FAILED",
        `Falha ao buscar código promocional: ${error.message}`,
      );
    }
  }

  /**
   * Atualizar código promocional (só metadata e active)
   */
  async updatePromotionCode(
    promoCodeId: string,
    params: { active?: boolean; metadata?: Record<string, string> }
  ): Promise<Stripe.PromotionCode> {
    try {
      console.log(`🔄 [Stripe] Atualizando código promocional: ${promoCodeId}`);
      const promoCode = await this.stripe.promotionCodes.update(promoCodeId, params);
      console.log(`✅ [Stripe] Código promocional atualizado: ${promoCode.id}`);
      return promoCode;
    } catch (error: any) {
      console.error("❌ [Stripe] Erro ao atualizar código promocional:", error);
      throw new PaymentError(
        "PROMOTION_CODE_UPDATE_FAILED",
        `Falha ao atualizar código promocional: ${error.message}`,
      );
    }
  }

  /**
   * Buscar código promocional pelo código digitável (não pelo ID)
   */
  async findPromotionCodeByCode(code: string): Promise<Stripe.PromotionCode | null> {
    try {
      console.log(`🔍 [Stripe] Buscando código promocional pelo código: ${code}`);
      
      const result = await this.stripe.promotionCodes.list({
        code: code.toUpperCase(),
        limit: 1,
      });

      if (result.data.length === 0) {
        console.log(`⚠️ [Stripe] Código não encontrado: ${code}`);
        return null;
      }

      return result.data[0];
    } catch (error: any) {
      console.error("❌ [Stripe] Erro ao buscar código por string:", error);
      throw new PaymentError(
        "PROMOTION_CODE_FIND_FAILED",
        `Falha ao buscar código: ${error.message}`,
      );
    }
  }
}
