// FASE 4: Serviço de limpeza automática para registros incompletos expirados
import { db } from '../db';
import { incompleteRegistrations } from '@shared/schema';
import { lt, isNull, and, eq, sql, isNotNull, gte } from 'drizzle-orm';

export interface CleanupStats {
  expiredRegistrations: number;
  totalCleaned: number;
  cleanupTime: string;
  errors: string[];
}

export class CleanupService {
  // Tempo de expiração padrão: 24 horas
  private static readonly EXPIRATION_HOURS = 24;

  /**
   * FASE 4: Limpeza de registros incompletos expirados
   * Remove registros que não foram completados há mais de 24h
   */
  static async cleanupExpiredRegistrations(): Promise<CleanupStats> {
    const startTime = new Date();
    const stats: CleanupStats = {
      expiredRegistrations: 0,
      totalCleaned: 0,
      cleanupTime: startTime.toISOString(),
      errors: []
    };

    try {
      console.log('🧹 [CLEANUP] Iniciando limpeza de registros expirados...');

      // Calcular data de expiração (24 horas atrás)
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() - this.EXPIRATION_HOURS);

      console.log(`🕐 [CLEANUP] Removendo registros incompletos criados antes de: ${expirationDate.toISOString()}`);

      // Buscar registros expirados (não completados e criados há mais de 24h)
      const expiredRegistrations = await db
        .select()
        .from(incompleteRegistrations)
        .where(
          and(
            lt(incompleteRegistrations.createdAt, expirationDate),
            isNull(incompleteRegistrations.completedAt)
          )
        );

      stats.expiredRegistrations = expiredRegistrations.length;

      if (expiredRegistrations.length === 0) {
        console.log('✅ [CLEANUP] Nenhum registro expirado encontrado.');
        return stats;
      }

      console.log(`📊 [CLEANUP] Encontrados ${expiredRegistrations.length} registros expirados para remoção.`);

      // Remover registros expirados
      const deleteResult = await db
        .delete(incompleteRegistrations)
        .where(
          and(
            lt(incompleteRegistrations.createdAt, expirationDate),
            isNull(incompleteRegistrations.completedAt)
          )
        );

      stats.totalCleaned = stats.expiredRegistrations;

      console.log(`✅ [CLEANUP] ${stats.totalCleaned} registros expirados removidos com sucesso.`);

      return stats;

    } catch (error: any) {
      const errorMsg = `Erro durante limpeza: ${error.message}`;
      stats.errors.push(errorMsg);
      console.error(`❌ [CLEANUP] ${errorMsg}`, error);
      return stats;
    }
  }

  /**
   * FASE 4: Limpeza com filtros específicos (para uso administrativo)
   */
  static async cleanupWithFilters(options: {
    hoursOld?: number;
    leadStatus?: string;
    dryRun?: boolean;
  }): Promise<CleanupStats> {
    const startTime = new Date();
    const stats: CleanupStats = {
      expiredRegistrations: 0,
      totalCleaned: 0,
      cleanupTime: startTime.toISOString(),
      errors: []
    };

    try {
      const hoursOld = options.hoursOld || this.EXPIRATION_HOURS;
      const dryRun = options.dryRun || false;

      console.log(`🧹 [CLEANUP${dryRun ? ' DRY-RUN' : ''}] Limpeza com filtros: ${hoursOld}h antigas, leadStatus: ${options.leadStatus || 'any'}`);

      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() - hoursOld);

      // Construir condições dinamicamente
      const conditions = [
        lt(incompleteRegistrations.createdAt, expirationDate),
        isNull(incompleteRegistrations.completedAt)
      ];

      // Adicionar filtro de leadStatus se especificado
      if (options.leadStatus) {
        conditions.push(sql`${incompleteRegistrations.leadStatus} = ${options.leadStatus}`);
      }

      const expiredRegistrations = await db
        .select()
        .from(incompleteRegistrations)
        .where(and(...conditions));

      stats.expiredRegistrations = expiredRegistrations.length;

      if (expiredRegistrations.length === 0) {
        console.log('✅ [CLEANUP] Nenhum registro encontrado com os filtros especificados.');
        return stats;
      }

      if (dryRun) {
        console.log(`🔍 [CLEANUP DRY-RUN] Seriam removidos ${expiredRegistrations.length} registros.`);
        expiredRegistrations.forEach(reg => {
          console.log(`  - ID: ${reg.id}, Email: ${reg.email}, Criado: ${reg.createdAt}`);
        });
        return stats;
      }

      // Executar remoção com as mesmas condições
      await db
        .delete(incompleteRegistrations)
        .where(and(...conditions));

      stats.totalCleaned = stats.expiredRegistrations;
      console.log(`✅ [CLEANUP] ${stats.totalCleaned} registros removidos com filtros específicos.`);

      return stats;

    } catch (error: any) {
      const errorMsg = `Erro durante limpeza com filtros: ${error.message}`;
      stats.errors.push(errorMsg);
      console.error(`❌ [CLEANUP] ${errorMsg}`, error);
      return stats;
    }
  }

  /**
   * FASE 4: Obter estatísticas de registros sem executar limpeza
   */
  static async getCleanupStats(): Promise<{
    total: number;
    completed: number;
    pending: number;
    expired: number;
  }> {
    try {
      const now = new Date();
      const expirationDate = new Date();
      expirationDate.setHours(now.getHours() - this.EXPIRATION_HOURS);

      // Total de registros
      const [totalResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(incompleteRegistrations);

      // Registros completados
      const [completedResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(incompleteRegistrations)
        .where(isNotNull(incompleteRegistrations.completedAt));

      // Registros pendentes (não completados e ainda dentro do prazo)
      const [pendingResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(incompleteRegistrations)
        .where(
          and(
            isNull(incompleteRegistrations.completedAt),
            gte(incompleteRegistrations.createdAt, expirationDate) // Criados após o limite de expiração
          )
        );

      // Registros expirados (não completados e criados há mais de 24h)
      const [expiredResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(incompleteRegistrations)
        .where(
          and(
            lt(incompleteRegistrations.createdAt, expirationDate),
            isNull(incompleteRegistrations.completedAt)
          )
        );

      return {
        total: totalResult?.count || 0,
        completed: completedResult?.count || 0,
        pending: pendingResult?.count || 0,
        expired: expiredResult?.count || 0
      };

    } catch (error: any) {
      console.error('❌ [CLEANUP] Erro ao obter estatísticas:', error);
      return {
        total: 0,
        completed: 0,
        pending: 0,
        expired: 0
      };
    }
  }
}