import { db } from './db';
import { 
  medicalOrderCids, 
  medicalOrderOpmeItems, 
  medicalOrderSuppliers, 
  medicalOrderProcedures,
  medicalOrderSurgicalApproaches,
  procedures,
  surgicalApproaches,
  surgicalProcedures,
  suppliers,
  cidCodes,
  opmeItems,
  type InsertMedicalOrderCid, 
  type InsertMedicalOrderOpmeItem, 
  type InsertMedicalOrderSupplier,
  type InsertMedicalOrderProcedure,
  type MedicalOrderProcedure
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export class RelationalOrderService {
  // Gerenciar CIDs do pedido - suporta formato antigo (array de IDs) e novo (com surgicalApproachId/surgicalProcedureId)
  async updateOrderCids(orderId: number, cids: number[] | Array<{ cidCodeId: number; surgicalApproachId?: number | null; surgicalProcedureId?: number | null }>): Promise<void> {
    // Remover CIDs existentes
    await db.delete(medicalOrderCids).where(eq(medicalOrderCids.orderId, orderId));
    
    // Inserir novos CIDs
    if (cids.length > 0) {
      // Detectar formato: array de números ou objetos
      const isSimpleFormat = typeof cids[0] === 'number';
      
      const cidsToInsert: InsertMedicalOrderCid[] = isSimpleFormat 
        ? (cids as number[]).map(cidId => ({
            orderId,
            cidCodeId: cidId
          }))
        : (cids as Array<{ cidCodeId: number; surgicalApproachId?: number | null; surgicalProcedureId?: number | null }>).map(cid => ({
            orderId,
            cidCodeId: cid.cidCodeId,
            surgicalApproachId: cid.surgicalApproachId || null,
            surgicalProcedureId: cid.surgicalProcedureId || null
          }));
      
      await db.insert(medicalOrderCids).values(cidsToInsert);
    }
  }

  async getOrderCids(orderId: number): Promise<Array<{ cid: { id: number; code: string; description: string; category?: string }; surgicalApproach: { id: number; name: string } | null; surgicalProcedure: { id: number; name: string } | null; }>> {
    try {
      // OTIMIZADO: Uma única query com JOINs em vez de 3N+1 queries
      // ORDER BY id para preservar ordem de inserção (ordem de adição)
      const result = await db
        .select({
          // Dados do CID
          cidId: cidCodes.id,
          cidCode: cidCodes.code,
          cidDescription: cidCodes.description,
          cidCategory: cidCodes.category,
          // Dados do Surgical Approach
          approachId: surgicalApproaches.id,
          approachName: surgicalApproaches.name,
          // Dados do Surgical Procedure
          procedureId: surgicalProcedures.id,
          procedureName: surgicalProcedures.name
        })
        .from(medicalOrderCids)
        .leftJoin(cidCodes, eq(medicalOrderCids.cidCodeId, cidCodes.id))
        .leftJoin(surgicalApproaches, eq(medicalOrderCids.surgicalApproachId, surgicalApproaches.id))
        .leftJoin(surgicalProcedures, eq(medicalOrderCids.surgicalProcedureId, surgicalProcedures.id))
        .where(eq(medicalOrderCids.orderId, orderId))
        .orderBy(medicalOrderCids.id);
      
      // Transformar resultado em formato esperado pelo frontend
      const validCids = result
        .filter(row => row.cidId !== null)
        .map(row => ({
          cid: {
            id: row.cidId!,
            code: row.cidCode!,
            description: row.cidDescription!,
            category: row.cidCategory || undefined
          },
          surgicalApproach: row.approachId ? { id: row.approachId, name: row.approachName! } : null,
          surgicalProcedure: row.procedureId ? { id: row.procedureId, name: row.procedureName! } : null
        }));
      
      console.log(`Encontrados ${validCids.length} CIDs para pedido ${orderId} (query otimizada)`);
      return validCids;
    } catch (error) {
      console.error(`Erro ao buscar CIDs para pedido ${orderId}:`, error);
      return [];
    }
  }

  // Gerenciar OPME Items do pedido - suporta formato com surgicalApproachId/surgicalProcedureId
  async updateOrderOpmeItems(orderId: number, opmeItems: { opmeItemId: number; quantity: number; procedureId?: number; surgicalApproachId?: number | null; surgicalProcedureId?: number | null }[]): Promise<void> {
    console.log(`=== Atualizando itens OPME para pedido ${orderId} ===`);
    console.log('Itens OPME recebidos:', JSON.stringify(opmeItems, null, 2));
    
    try {
      // Remover itens OPME existentes
      await db.delete(medicalOrderOpmeItems).where(eq(medicalOrderOpmeItems.orderId, orderId));
      console.log('Itens OPME existentes removidos com sucesso');
      
      // Inserir novos itens OPME
      if (opmeItems.length > 0) {
        const itemsToInsert: InsertMedicalOrderOpmeItem[] = opmeItems.map(item => ({
          orderId,
          procedureId: item.procedureId || null, // Tornar procedureId opcional
          opmeItemId: item.opmeItemId,
          quantity: item.quantity,
          surgicalApproachId: item.surgicalApproachId || null,
          surgicalProcedureId: item.surgicalProcedureId || null
        }));
        console.log('Itens OPME preparados para inserção:', JSON.stringify(itemsToInsert, null, 2));
        await db.insert(medicalOrderOpmeItems).values(itemsToInsert);
        console.log(`Inseridos ${itemsToInsert.length} itens OPME com sucesso`);
      }
    } catch (error) {
      console.error('Erro ao atualizar itens OPME:', error);
      throw error;
    }
  }

  async getOrderOpmeItems(orderId: number): Promise<Array<{ item: { id: number; technicalName: string; commercialName?: string | null; anvisaRegistrationNumber?: string | null }; quantity: number; surgicalApproach: { id: number; name: string } | null; surgicalProcedure: { id: number; name: string } | null }>> {
    try {
      // OTIMIZADO: Uma única query com JOINs em vez de 3N+1 queries
      // ORDER BY id para preservar ordem de inserção (ordem de adição)
      const result = await db
        .select({
          // Dados do Item OPME
          itemId: opmeItems.id,
          technicalName: opmeItems.technicalName,
          commercialName: opmeItems.commercialName,
          anvisaRegistrationNumber: opmeItems.anvisaRegistrationNumber,
          // Quantidade
          quantity: medicalOrderOpmeItems.quantity,
          // Dados do Surgical Approach
          approachId: surgicalApproaches.id,
          approachName: surgicalApproaches.name,
          // Dados do Surgical Procedure
          procedureId: surgicalProcedures.id,
          procedureName: surgicalProcedures.name
        })
        .from(medicalOrderOpmeItems)
        .leftJoin(opmeItems, eq(medicalOrderOpmeItems.opmeItemId, opmeItems.id))
        .leftJoin(surgicalApproaches, eq(medicalOrderOpmeItems.surgicalApproachId, surgicalApproaches.id))
        .leftJoin(surgicalProcedures, eq(medicalOrderOpmeItems.surgicalProcedureId, surgicalProcedures.id))
        .where(eq(medicalOrderOpmeItems.orderId, orderId))
        .orderBy(medicalOrderOpmeItems.id);
      
      // Transformar resultado em formato esperado pelo frontend
      const validItems = result
        .filter(row => row.itemId !== null)
        .map(row => ({
          item: {
            id: row.itemId!,
            technicalName: row.technicalName!,
            commercialName: row.commercialName,
            anvisaRegistrationNumber: row.anvisaRegistrationNumber
          },
          quantity: row.quantity,
          surgicalApproach: row.approachId ? { id: row.approachId, name: row.approachName! } : null,
          surgicalProcedure: row.procedureId ? { id: row.procedureId, name: row.procedureName! } : null
        }));
      
      console.log(`Encontrados ${validItems.length} itens OPME para pedido ${orderId} (query otimizada)`);
      return validItems;
    } catch (error) {
      console.error(`Erro ao buscar itens OPME para pedido ${orderId}:`, error);
      return [];
    }
  }

  // === GESTÃO DE PROCEDIMENTOS CBHPM ===
  
  async updateOrderProcedures(orderId: number, proceduresInput: Array<{
    procedureId: number;
    quantityRequested: number;
    isMain?: boolean;
    surgicalApproachId?: number | null;
    surgicalProcedureId?: number | null;
  }>): Promise<void> {
    console.log(`=== Atualizando procedimentos para pedido ${orderId} ===`);
    
    // Remover procedimentos existentes
    await db.delete(medicalOrderProcedures).where(eq(medicalOrderProcedures.orderId, orderId));
    
    // Inserir novos procedimentos
    if (proceduresInput.length > 0) {
      // Buscar dados de porte para determinar o procedimento principal
      const { procedures: proceduresTable } = await import('@shared/schema');
      const proceduresWithPorte = await Promise.all(
        proceduresInput.map(async (proc) => {
          const [procedureData] = await db
            .select({ porte: proceduresTable.porte })
            .from(proceduresTable)
            .where(eq(proceduresTable.id, proc.procedureId));
          
          return {
            ...proc,
            porte: procedureData?.porte || null
          };
        })
      );

      // Função para converter porte em valor numérico
      const getPorteValue = (porte: string | null): number => {
        if (!porte) return 0;
        
        // Extrair número do porte (ex: "10B" -> 10, "02A" -> 2)
        const match = porte.match(/^(\d+)/);
        if (match) {
          const baseValue = parseInt(match[1]);
          // Adicionar peso baseado na letra (A=0.1, B=0.2, C=0.3, etc.)
          const letter = porte.replace(/^\d+/, '');
          const letterValue = letter ? (letter.charCodeAt(0) - 64) * 0.1 : 0;
          return baseValue + letterValue;
        }
        return 0;
      };

      // Determinar qual procedimento tem o maior porte
      let maxPorteValue = 0;
      let mainProcedureIndex = 0;
      
      proceduresWithPorte.forEach((proc, index) => {
        const porteValue = getPorteValue(proc.porte);
        console.log(`Procedimento ${proc.procedureId}: porte ${proc.porte} = valor ${porteValue}`);
        if (porteValue > maxPorteValue) {
          maxPorteValue = porteValue;
          mainProcedureIndex = index;
        }
      });

      console.log(`Procedimento principal determinado pelo maior porte: índice ${mainProcedureIndex} (porte valor: ${maxPorteValue})`);
      
      // Criar procedimentos com marcação correta do principal e associações cirúrgicas
      const proceduresToInsert: InsertMedicalOrderProcedure[] = proceduresWithPorte.map((proc, index) => ({
        orderId,
        procedureId: proc.procedureId,
        quantityRequested: proc.quantityRequested,
        isMain: index === mainProcedureIndex, // Procedimento com maior porte é o principal
        status: 'em_analise',
        surgicalApproachId: proc.surgicalApproachId || null,
        surgicalProcedureId: proc.surgicalProcedureId || null
      }));
      
      await db.insert(medicalOrderProcedures).values(proceduresToInsert);
      console.log(`Inseridos ${proceduresToInsert.length} procedimentos - Principal: ID ${proceduresWithPorte[mainProcedureIndex].procedureId}`);
    }
  }

  async getOrderProcedures(orderId: number): Promise<Array<{ 
    procedure: { id: number; code: string; name: string; description?: string | null; porte?: string | null; porteAnestesista?: string | null; numeroAuxiliares?: number | null }; 
    quantity: number; 
    isMain: boolean;
    status: string;
    quantityApproved?: number | null;
    receivedValue?: string | null;
    surgicalApproach: { id: number; name: string } | null; 
    surgicalProcedure: { id: number; name: string } | null 
  }>> {
    try {
      // IMPORTANTE: ORDER BY id para preservar ordem de inserção (ordem de adição)
      const orderProcedures = await db
        .select()
        .from(medicalOrderProcedures)
        .where(eq(medicalOrderProcedures.orderId, orderId))
        .orderBy(medicalOrderProcedures.id);
      
      // Enriquecer com dados do procedimento CBHPM e associações cirúrgicas
      const enrichedProcedures = await Promise.all(
        orderProcedures.map(async (proc) => {
          try {
            const [procedureData] = await db
              .select()
              .from(procedures)
              .where(eq(procedures.id, proc.procedureId));
            
            // Buscar dados de surgicalApproach se existir (formato padronizado: { id, name })
            let surgicalApproachRef: { id: number; name: string } | null = null;
            if (proc.surgicalApproachId) {
              const [approach] = await db
                .select({ id: surgicalApproaches.id, name: surgicalApproaches.name })
                .from(surgicalApproaches)
                .where(eq(surgicalApproaches.id, proc.surgicalApproachId));
              surgicalApproachRef = approach || null;
            }
            
            // Buscar dados de surgicalProcedure se existir (formato padronizado: { id, name })
            let surgicalProcedureRef: { id: number; name: string } | null = null;
            if (proc.surgicalProcedureId) {
              const [surgicalProc] = await db
                .select({ id: surgicalProcedures.id, name: surgicalProcedures.name })
                .from(surgicalProcedures)
                .where(eq(surgicalProcedures.id, proc.surgicalProcedureId));
              surgicalProcedureRef = surgicalProc || null;
            }
            
            return procedureData ? {
              procedure: {
                id: procedureData.id,
                code: procedureData.code,
                name: procedureData.name,
                description: procedureData.description,
                porte: procedureData.porte,
                porteAnestesista: procedureData.porteAnestesista,
                numeroAuxiliares: procedureData.numeroAuxiliares
              },
              quantity: proc.quantityRequested,
              isMain: proc.isMain,
              status: proc.status,
              quantityApproved: proc.quantityApproved,
              receivedValue: proc.receivedValue,
              surgicalApproach: surgicalApproachRef,
              surgicalProcedure: surgicalProcedureRef
            } : null;
          } catch (error) {
            console.error(`Erro ao buscar procedimento ${proc.procedureId}:`, error);
            return null;
          }
        })
      );
      
      const validProcedures = enrichedProcedures.filter(p => p !== null) as Array<{ procedure: { id: number; code: string; name: string; description?: string | null; porte?: string | null; porteAnestesista?: string | null; numeroAuxiliares?: number | null }; quantity: number; isMain: boolean; status: string; quantityApproved?: number | null; receivedValue?: string | null; surgicalApproach: { id: number; name: string } | null; surgicalProcedure: { id: number; name: string } | null }>;
      console.log(`Encontrados ${validProcedures.length} procedimentos para pedido ${orderId}`);
      return validProcedures;
    } catch (error) {
      console.error(`Erro ao buscar procedimentos para pedido ${orderId}:`, error);
      return [];
    }
  }

  async addProcedureToOrder(orderId: number, procedureId: number, quantityRequested: number = 1): Promise<MedicalOrderProcedure | null> {
    try {
      // Verificar se procedimento já existe
      const existing = await db
        .select()
        .from(medicalOrderProcedures)
        .where(and(
          eq(medicalOrderProcedures.orderId, orderId),
          eq(medicalOrderProcedures.procedureId, procedureId)
        ));

      if (existing.length > 0) {
        throw new Error("Procedimento já existe neste pedido");
      }

      // Verificar se é o primeiro procedimento (será o principal)
      const existingProcedures = await db
        .select()
        .from(medicalOrderProcedures)
        .where(eq(medicalOrderProcedures.orderId, orderId));

      const isMain = existingProcedures.length === 0;

      const [newProcedure] = await db
        .insert(medicalOrderProcedures)
        .values({
          orderId,
          procedureId,
          quantityRequested,
          status: 'em_analise',
          isMain
        })
        .returning();

      return newProcedure;
    } catch (error) {
      console.error("Erro ao adicionar procedimento:", error);
      return null;
    }
  }

  async removeProcedureFromOrder(procedureOrderId: number): Promise<boolean> {
    try {
      const procedure = await db
        .select()
        .from(medicalOrderProcedures)
        .where(eq(medicalOrderProcedures.id, procedureOrderId));

      if (procedure.length === 0) {
        return false;
      }

      const wasMain = procedure[0].isMain;
      const orderId = procedure[0].orderId;

      // Remover procedimento
      await db
        .delete(medicalOrderProcedures)
        .where(eq(medicalOrderProcedures.id, procedureOrderId));

      // Se era principal, promover outro procedimento
      if (wasMain) {
        const remainingProcedures = await db
          .select()
          .from(medicalOrderProcedures)
          .where(eq(medicalOrderProcedures.orderId, orderId));

        if (remainingProcedures.length > 0) {
          await db
            .update(medicalOrderProcedures)
            .set({ isMain: true })
            .where(eq(medicalOrderProcedures.id, remainingProcedures[0].id));
        }
      }

      return true;
    } catch (error) {
      console.error("Erro ao remover procedimento:", error);
      return false;
    }
  }

  // === GESTÃO DE FORNECEDORES ===

  // Gerenciar Fornecedores do pedido - suporta formato com surgicalApproachId/surgicalProcedureId para agrupamento por conduta
  async updateOrderSuppliers(orderId: number, supplierItems: Array<{ 
    supplierId: number; 
    surgicalApproachId?: number | null; 
    surgicalProcedureId?: number | null;
    isApproved?: boolean;
    approvedBy?: number | null;
    approvedAt?: Date | null;
  }>): Promise<void> {
    console.log(`=== Atualizando fornecedores para pedido ${orderId} ===`);
    console.log('🔍 DEBUG BACKEND - Fornecedores recebidos:', JSON.stringify(supplierItems, null, 2));
    console.log('🔍 DEBUG BACKEND - Detalhamento de cada fornecedor:');
    supplierItems.forEach((item, index) => {
      console.log(`  [${index}] supplierId=${item.supplierId}, surgicalApproachId=${item.surgicalApproachId}, surgicalProcedureId=${item.surgicalProcedureId}`);
    });
    
    // Remover fornecedores existentes
    await db.delete(medicalOrderSuppliers).where(eq(medicalOrderSuppliers.orderId, orderId));
    
    // Inserir novos fornecedores
    if (supplierItems.length > 0) {
      const itemsToInsert: InsertMedicalOrderSupplier[] = supplierItems.map(item => ({
        orderId,
        supplierId: item.supplierId,
        surgicalApproachId: item.surgicalApproachId || null,
        surgicalProcedureId: item.surgicalProcedureId || null,
        isApproved: item.isApproved || false,
        approvedBy: item.approvedBy || null,
        approvedAt: item.approvedAt || null
      }));
      await db.insert(medicalOrderSuppliers).values(itemsToInsert);
      console.log(`Inseridos ${itemsToInsert.length} fornecedores`);
    }
  }

  async getOrderSuppliers(orderId: number): Promise<Array<{ 
    supplier: { id: number; name: string; cnpj?: string | null; phone?: string | null; email?: string | null }; 
    surgicalApproach: { id: number; name: string } | null; 
    surgicalProcedure: { id: number; name: string } | null;
    isApproved: boolean | null;
  }>> {
    try {
      // OTIMIZADO: Uma única query com JOINs em vez de 3N+1 queries
      // ORDER BY id para preservar ordem de inserção (ordem de adição)
      const result = await db
        .select({
          // Dados do Fornecedor
          supplierId: suppliers.id,
          companyName: suppliers.companyName,
          tradeName: suppliers.tradeName,
          cnpj: suppliers.cnpj,
          phone: suppliers.phone,
          email: suppliers.email,
          // Status de aprovação
          isApproved: medicalOrderSuppliers.isApproved,
          // Dados do Surgical Approach
          approachId: surgicalApproaches.id,
          approachName: surgicalApproaches.name,
          // Dados do Surgical Procedure
          procedureId: surgicalProcedures.id,
          procedureName: surgicalProcedures.name
        })
        .from(medicalOrderSuppliers)
        .leftJoin(suppliers, eq(medicalOrderSuppliers.supplierId, suppliers.id))
        .leftJoin(surgicalApproaches, eq(medicalOrderSuppliers.surgicalApproachId, surgicalApproaches.id))
        .leftJoin(surgicalProcedures, eq(medicalOrderSuppliers.surgicalProcedureId, surgicalProcedures.id))
        .where(eq(medicalOrderSuppliers.orderId, orderId))
        .orderBy(medicalOrderSuppliers.id);
      
      // Transformar resultado em formato esperado pelo frontend
      const validSuppliers = result
        .filter(row => row.supplierId !== null)
        .map(row => ({
          supplier: {
            id: row.supplierId!,
            name: row.companyName!,
            tradeName: row.tradeName,
            cnpj: row.cnpj,
            phone: row.phone,
            email: row.email
          },
          surgicalApproach: row.approachId ? { id: row.approachId, name: row.approachName! } : null,
          surgicalProcedure: row.procedureId ? { id: row.procedureId, name: row.procedureName! } : null,
          isApproved: row.isApproved
        }));
      
      console.log(`Encontrados ${validSuppliers.length} fornecedores para pedido ${orderId} (query otimizada)`);
      return validSuppliers;
    } catch (error) {
      console.error(`Erro ao buscar fornecedores para pedido ${orderId}:`, error);
      return [];
    }
  }

  // === GESTÃO DE CONDUTAS CIRÚRGICAS ===
  
  async updateOrderSurgicalApproaches(orderId: number, approaches: Array<{
    surgicalApproachId: number;
    isPrimary?: boolean;
    justificationUsed?: string;
    additionalNotes?: string;
  }>): Promise<void> {
    console.log(`=== Atualizando condutas cirúrgicas para pedido ${orderId} ===`);
    
    // Remover condutas existentes
    await db.delete(medicalOrderSurgicalApproaches).where(eq(medicalOrderSurgicalApproaches.medicalOrderId, orderId));
    
    // Inserir novas condutas
    if (approaches.length > 0) {
      const { medicalOrderSurgicalApproaches: moSA } = await import('@shared/schema');
      
      await db.insert(moSA).values(
        approaches.map(approach => ({
          medicalOrderId: orderId,
          surgicalApproachId: approach.surgicalApproachId,
          isPrimary: approach.isPrimary || false,
          justificationUsed: approach.justificationUsed || null,
          additionalNotes: approach.additionalNotes || null
        }))
      );
      
      console.log(`${approaches.length} condutas cirúrgicas atualizadas para pedido ${orderId}`);
    } else {
      console.log(`Nenhuma conduta cirúrgica para pedido ${orderId}`);
    }
  }

  // Limpar todos os relacionamentos de um pedido (incluindo procedimentos e condutas)
  async clearOrderRelations(orderId: number): Promise<void> {
    await Promise.all([
      db.delete(medicalOrderCids).where(eq(medicalOrderCids.orderId, orderId)),
      db.delete(medicalOrderOpmeItems).where(eq(medicalOrderOpmeItems.orderId, orderId)),
      db.delete(medicalOrderSuppliers).where(eq(medicalOrderSuppliers.orderId, orderId)),
      db.delete(medicalOrderProcedures).where(eq(medicalOrderProcedures.orderId, orderId)),
      db.delete(medicalOrderSurgicalApproaches).where(eq(medicalOrderSurgicalApproaches.medicalOrderId, orderId))
    ]);
  }
}

export const relationalOrderService = new RelationalOrderService();
