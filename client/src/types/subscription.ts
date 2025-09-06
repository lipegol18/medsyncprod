export interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  priceMonthly: number;
  stripePriceId?: string;
  trialDays?: number;
  features?: string[];
}

export interface UserSubscription {
  id: number;
  userId: number;
  planId: number;
  status: string;
  trialEndsAt?: Date;
  paymentProvider?: string;
}