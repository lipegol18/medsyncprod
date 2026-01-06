export interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  productId?: string;
  priceIdMonthly?: string;
  priceIdYearly?: string;
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
  pastDueStartedAt?: Date | string | null; // Data de início do status past_due (dunning)
}