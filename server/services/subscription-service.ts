import { db } from "../db";
import { userSubscriptions, subscriptionPlans } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface SubscriptionWithPlan {
  id: number;
  userId: number;
  planId: number;
  status: string;
  startedAt: Date | null;
  expiresAt: Date | null;
  trialEndsAt: Date | null;
  paymentProviderCustomerId: string | null;
  paymentProviderSubscriptionId: string | null;
  paymentProvider: string | null;
  originalPrice: number | null;
  discountPercent: number | null;
  discountAmount: number | null;
  finalPrice: number | null;
  discountCode: string | null;
  discountDescription: string | null;
  promotionalPrice: number | null;
  promotionalEndsAt: Date | null;
  promotionalDescription: string | null;
  pastDueStartedAt: Date | null; // Data de início do status past_due (dunning)
  createdAt: Date | null;
  updatedAt: Date | null;
  plan: {
    id: number;
    name: string;
    description: string | null;
    priceMonthly: string;
    priceYearly: string;
  } | null;
}

export class SubscriptionService {
  async checkAndUpdateTrialStatus(userId: number): Promise<boolean> {
    try {
      const [subscription] = await db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.userId, userId))
        .limit(1);

      if (!subscription) {
        return false;
      }

      if (subscription.status === 'trial' && subscription.trialEndsAt) {
        const now = new Date();
        const trialEndDate = new Date(subscription.trialEndsAt);

        if (now > trialEndDate) {
          console.log(`🔄 [SubscriptionService] Auto-updating trial status to trial_expired for user ${userId}`);
          
          await db
            .update(userSubscriptions)
            .set({ 
              status: 'trial_expired',
              updatedAt: new Date()
            })
            .where(eq(userSubscriptions.userId, userId));

          return true;
        }
      }

      return false;
    } catch (error) {
      console.error(`❌ [SubscriptionService] Error checking trial status for user ${userId}:`, error);
      return false;
    }
  }

  async getSubscriptionWithAutoUpdate(userId: number): Promise<SubscriptionWithPlan | null> {
    try {
      await this.checkAndUpdateTrialStatus(userId);

      const [subscriptionData] = await db
        .select({
          id: userSubscriptions.id,
          userId: userSubscriptions.userId,
          planId: userSubscriptions.planId,
          status: userSubscriptions.status,
          startedAt: userSubscriptions.startedAt,
          expiresAt: userSubscriptions.expiresAt,
          trialEndsAt: userSubscriptions.trialEndsAt,
          paymentProviderCustomerId: userSubscriptions.paymentProviderCustomerId,
          paymentProviderSubscriptionId: userSubscriptions.paymentProviderSubscriptionId,
          paymentProvider: userSubscriptions.paymentProvider,
          originalPrice: userSubscriptions.originalPrice,
          discountPercent: userSubscriptions.discountPercent,
          discountAmount: userSubscriptions.discountAmount,
          finalPrice: userSubscriptions.finalPrice,
          discountCode: userSubscriptions.discountCode,
          discountDescription: userSubscriptions.discountDescription,
          promotionalPrice: userSubscriptions.promotionalPrice,
          promotionalEndsAt: userSubscriptions.promotionalEndsAt,
          promotionalDescription: userSubscriptions.promotionalDescription,
          pastDueStartedAt: userSubscriptions.pastDueStartedAt,
          createdAt: userSubscriptions.createdAt,
          updatedAt: userSubscriptions.updatedAt,
          plan: {
            id: subscriptionPlans.id,
            name: subscriptionPlans.name,
            description: subscriptionPlans.description,
            priceMonthly: subscriptionPlans.priceMonthly,
            priceYearly: subscriptionPlans.priceYearly,
          }
        })
        .from(userSubscriptions)
        .leftJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
        .where(eq(userSubscriptions.userId, userId))
        .limit(1);

      return subscriptionData || null;
    } catch (error) {
      console.error(`❌ [SubscriptionService] Error fetching subscription for user ${userId}:`, error);
      return null;
    }
  }
}

export const subscriptionService = new SubscriptionService();
