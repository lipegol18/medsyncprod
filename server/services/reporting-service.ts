// FASE 4: Serviço de relatórios e métricas de conversão
import { db } from '../db';
import { incompleteRegistrations, users, userSubscriptions, subscriptionPlans } from '@shared/schema';
import { sql, and, gte, lte, isNull, isNotNull, eq, desc } from 'drizzle-orm';

export interface ConversionMetrics {
  period: {
    start: string;
    end: string;
  };
  registrations: {
    total: number;
    completed: number;
    pending: number;
    expired: number;
    conversionRate: number;
  };
  leadSources: {
    [key: string]: number;
  };
  planBreakdown: {
    planId: number;
    planName: string;
    registrations: number;
    conversions: number;
    conversionRate: number;
  }[];
  timeline: {
    date: string;
    registrations: number;
    conversions: number;
  }[];
}

export interface PerformanceReport {
  overview: {
    totalRegistrations: number;
    totalUsers: number;
    totalActiveSubscriptions: number;
    overallConversionRate: number;
  };
  recent: {
    last24h: ConversionMetrics;
    last7days: ConversionMetrics;
    last30days: ConversionMetrics;
  };
  top: {
    performingPlans: {
      planId: number;
      planName: string;
      totalRevenue: number;
      activeSubscriptions: number;
    }[];
    recentConversions: {
      userId: number;
      email: string;
      planName: string;
      convertedAt: string;
      revenue: number;
    }[];
  };
}

export class ReportingService {
  
  /**
   * FASE 4: Obter métricas de conversão para um período específico
   */
  static async getConversionMetrics(
    startDate: Date, 
    endDate: Date
  ): Promise<ConversionMetrics> {
    try {
      console.log(`📊 [REPORTS] Gerando métricas de conversão: ${startDate.toISOString()} - ${endDate.toISOString()}`);

      // 1. Estatísticas básicas de registros
      const totalRegistrations = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(incompleteRegistrations)
        .where(
          and(
            gte(incompleteRegistrations.createdAt, startDate),
            lte(incompleteRegistrations.createdAt, endDate)
          )
        );

      const completedRegistrations = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(incompleteRegistrations)
        .where(
          and(
            gte(incompleteRegistrations.createdAt, startDate),
            lte(incompleteRegistrations.createdAt, endDate),
            isNotNull(incompleteRegistrations.completedAt)
          )
        );

      const pendingRegistrations = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(incompleteRegistrations)
        .where(
          and(
            gte(incompleteRegistrations.createdAt, startDate),
            lte(incompleteRegistrations.createdAt, endDate),
            isNull(incompleteRegistrations.completedAt)
          )
        );

      // 2. Calcular expirados (registros não completados há mais de 24h)
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() - 24);
      
      const expiredRegistrations = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(incompleteRegistrations)
        .where(
          and(
            gte(incompleteRegistrations.createdAt, startDate),
            lte(incompleteRegistrations.createdAt, endDate),
            isNull(incompleteRegistrations.completedAt),
            lte(incompleteRegistrations.createdAt, expirationDate)
          )
        );

      // 3. Breakdown por plano (usando dados dos JSONs)
      const planBreakdown = await db
        .select({
          planId: sql<number>`cast(coalesce(user_data_json->>'planId', '1') as integer)`,
          totalRegistrations: sql<number>`count(*)::int`,
          completedRegistrations: sql<number>`count(case when ${incompleteRegistrations.completedAt} is not null then 1 end)::int`
        })
        .from(incompleteRegistrations)
        .where(
          and(
            gte(incompleteRegistrations.createdAt, startDate),
            lte(incompleteRegistrations.createdAt, endDate)
          )
        )
        .groupBy(sql`cast(coalesce(user_data_json->>'planId', '1') as integer)`);

      // 4. Timeline diária
      const timeline = await db
        .select({
          date: sql<string>`date(${incompleteRegistrations.createdAt})`,
          registrations: sql<number>`count(*)::int`,
          conversions: sql<number>`count(case when ${incompleteRegistrations.completedAt} is not null then 1 end)::int`
        })
        .from(incompleteRegistrations)
        .where(
          and(
            gte(incompleteRegistrations.createdAt, startDate),
            lte(incompleteRegistrations.createdAt, endDate)
          )
        )
        .groupBy(sql`date(${incompleteRegistrations.createdAt})`)
        .orderBy(sql`date(${incompleteRegistrations.createdAt})`);

      // 5. Lead sources (fonte padrão para compatibilidade)  
      const total = totalRegistrations[0]?.count || 0;
      const completed = completedRegistrations[0]?.count || 0;
      const pending = pendingRegistrations[0]?.count || 0;
      const expired = expiredRegistrations[0]?.count || 0;

      return {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        registrations: {
          total,
          completed,
          pending,
          expired,
          conversionRate: total > 0 ? Math.round((completed / total) * 100 * 100) / 100 : 0
        },
        leadSources: { 'direct': total },
        planBreakdown: await Promise.all(planBreakdown.map(async (plan) => {
          // Buscar nome do plano
          const [planInfo] = await db
            .select({ name: subscriptionPlans.name })
            .from(subscriptionPlans)
            .where(eq(subscriptionPlans.id, plan.planId || 1))
            .limit(1);
            
          return {
            planId: plan.planId || 1,
            planName: planInfo?.name || 'Plano Básico',
            registrations: plan.totalRegistrations,
            conversions: plan.completedRegistrations,
            conversionRate: plan.totalRegistrations > 0 
              ? Math.round((plan.completedRegistrations / plan.totalRegistrations) * 100 * 100) / 100 
              : 0
          };
        })),
        timeline: timeline.map(day => ({
          date: day.date,
          registrations: day.registrations,
          conversions: day.conversions
        }))
      };

    } catch (error: any) {
      console.error('❌ [REPORTS] Erro ao gerar métricas de conversão:', error);
      throw new Error(`Erro ao gerar relatório: ${error.message}`);
    }
  }

  /**
   * FASE 4: Relatório completo de performance do sistema
   */
  static async getPerformanceReport(): Promise<PerformanceReport> {
    try {
      console.log('📈 [REPORTS] Gerando relatório completo de performance...');

      const now = new Date();

      // Overview geral
      const [totalRegResult] = await db.select({ count: sql<number>`count(*)::int` }).from(incompleteRegistrations);
      const [totalUsersResult] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
      const [activeSubsResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(userSubscriptions)
        .where(eq(userSubscriptions.status, 'active'));
      
      const [completedRegResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(incompleteRegistrations)
        .where(isNotNull(incompleteRegistrations.completedAt));

      const totalReg = totalRegResult?.count || 0;
      const completedReg = completedRegResult?.count || 0;
      const overallConversionRate = totalReg > 0 ? Math.round((completedReg / totalReg) * 100 * 100) / 100 : 0;

      // Métricas por período
      const last24h = await this.getConversionMetrics(
        new Date(now.getTime() - 24 * 60 * 60 * 1000),
        now
      );

      const last7days = await this.getConversionMetrics(
        new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        now
      );

      const last30days = await this.getConversionMetrics(
        new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        now
      );

      // Top performing plans (por número de assinaturas ativas)
      const performingPlans = await db
        .select({
          planId: userSubscriptions.planId,
          planName: subscriptionPlans.name,
          activeSubscriptions: sql<number>`count(*)::int`,
          totalRevenue: sql<number>`count(*) * coalesce(${subscriptionPlans.priceMonthly}, 0)::int`
        })
        .from(userSubscriptions)
        .leftJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
        .where(eq(userSubscriptions.status, 'active'))
        .groupBy(userSubscriptions.planId, subscriptionPlans.name, subscriptionPlans.priceMonthly)
        .orderBy(desc(sql`count(*)`))
        .limit(5);

      // Conversões recentes
      const recentConversions = await db
        .select({
          userId: users.id,
          email: users.email,
          planName: subscriptionPlans.name,
          convertedAt: sql<string>`${incompleteRegistrations.completedAt}::text`,
          revenue: sql<number>`coalesce(${subscriptionPlans.priceMonthly}, 0)`
        })
        .from(incompleteRegistrations)
        .innerJoin(users, sql`${users.email} = ${incompleteRegistrations.email}`)
        .leftJoin(userSubscriptions, eq(userSubscriptions.userId, users.id))
        .leftJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
        .where(isNotNull(incompleteRegistrations.completedAt))
        .orderBy(desc(incompleteRegistrations.completedAt))
        .limit(10);

      return {
        overview: {
          totalRegistrations: totalReg,
          totalUsers: totalUsersResult?.count || 0,
          totalActiveSubscriptions: activeSubsResult?.count || 0,
          overallConversionRate
        },
        recent: {
          last24h,
          last7days,
          last30days
        },
        top: {
          performingPlans: performingPlans.map(plan => ({
            planId: plan.planId,
            planName: plan.planName || 'Plano Desconhecido',
            totalRevenue: plan.totalRevenue || 0,
            activeSubscriptions: plan.activeSubscriptions
          })),
          recentConversions: recentConversions.map(conv => ({
            userId: conv.userId,
            email: conv.email,
            planName: conv.planName || 'Plano Desconhecido',
            convertedAt: conv.convertedAt,
            revenue: conv.revenue || 0
          }))
        }
      };

    } catch (error: any) {
      console.error('❌ [REPORTS] Erro ao gerar relatório de performance:', error);
      throw new Error(`Erro ao gerar relatório de performance: ${error.message}`);
    }
  }

  /**
   * FASE 4: Relatório simplificado para dashboard
   */
  static async getDashboardMetrics() {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [todayStats] = await db
        .select({
          registrations: sql<number>`count(*)::int`,
          conversions: sql<number>`count(case when ${incompleteRegistrations.completedAt} is not null then 1 end)::int`
        })
        .from(incompleteRegistrations)
        .where(gte(incompleteRegistrations.createdAt, yesterday));

      const [overallStats] = await db
        .select({
          totalRegistrations: sql<number>`count(*)::int`,
          totalConversions: sql<number>`count(case when ${incompleteRegistrations.completedAt} is not null then 1 end)::int`
        })
        .from(incompleteRegistrations);

      return {
        today: {
          registrations: todayStats?.registrations || 0,
          conversions: todayStats?.conversions || 0,
          conversionRate: todayStats?.registrations > 0 
            ? Math.round((todayStats.conversions / todayStats.registrations) * 100 * 100) / 100 
            : 0
        },
        overall: {
          totalRegistrations: overallStats?.totalRegistrations || 0,
          totalConversions: overallStats?.totalConversions || 0,
          conversionRate: overallStats?.totalRegistrations > 0 
            ? Math.round((overallStats.totalConversions / overallStats.totalRegistrations) * 100 * 100) / 100 
            : 0
        }
      };

    } catch (error: any) {
      console.error('❌ [REPORTS] Erro ao gerar métricas do dashboard:', error);
      return {
        today: { registrations: 0, conversions: 0, conversionRate: 0 },
        overall: { totalRegistrations: 0, totalConversions: 0, conversionRate: 0 }
      };
    }
  }
}