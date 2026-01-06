import { Router } from 'express';
import { relationalOrderService } from './relational-services';
import { z } from 'zod';
import { isAuthenticated } from './auth';

const router = Router();

// Schema para validação - suporta múltiplos formatos de entrada
const updateCidsSchema = z.object({
  // Formato legado: array de IDs simples
  cidIds: z.array(z.number()).optional(),
  // Formato novo: array de objetos com associações cirúrgicas
  cids: z.array(z.object({
    cidId: z.number(),
    surgicalApproachId: z.number().nullable().optional(),
    surgicalProcedureId: z.number().nullable().optional()
  })).optional()
});

const updateOpmeItemsSchema = z.object({
  opmeItems: z.array(z.object({
    opmeItemId: z.number(),
    quantity: z.number().min(1),
    procedureId: z.number().optional(),
    surgicalApproachId: z.number().nullable().optional(),
    surgicalProcedureId: z.number().nullable().optional()
  })).default([])
});

const updateSuppliersSchema = z.object({
  // Formato legado: array de IDs simples
  supplierIds: z.array(z.number()).optional(),
  // Formato novo: array de objetos com associações cirúrgicas
  suppliers: z.array(z.object({
    supplierId: z.number(),
    surgicalApproachId: z.number().nullable().optional(),
    surgicalProcedureId: z.number().nullable().optional(),
    isApproved: z.boolean().optional()
  })).optional()
});

const updateProceduresSchema = z.object({
  procedures: z.array(z.object({
    procedureId: z.number(),
    quantityRequested: z.number().min(1),
    isMain: z.boolean().optional(),
    surgicalApproachId: z.number().nullable().optional(),
    surgicalProcedureId: z.number().nullable().optional()
  })).default([])
});

const addProcedureSchema = z.object({
  procedureId: z.number(),
  quantityRequested: z.number().min(1).default(1)
});

// Rotas para CIDs
router.get('/orders/:orderId/cids', isAuthenticated, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    console.log(`=== GET /orders/${orderId}/cids ===`);
    const cidIds = await relationalOrderService.getOrderCids(orderId);
    console.log(`Retornando ${cidIds.length} CIDs para pedido ${orderId}`);
    res.json(cidIds);
  } catch (error) {
    console.error('Erro ao buscar CIDs do pedido:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

router.put('/orders/:orderId/cids', isAuthenticated, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const { cidIds, cids } = updateCidsSchema.parse(req.body);
    
    // Converter para formato unificado com associações cirúrgicas
    let cidsToSave: { cidCodeId: number; surgicalApproachId?: number | null; surgicalProcedureId?: number | null }[] = [];
    
    if (cids && cids.length > 0) {
      // Novo formato com associações
      cidsToSave = cids.map(c => ({
        cidCodeId: c.cidId,
        surgicalApproachId: c.surgicalApproachId || null,
        surgicalProcedureId: c.surgicalProcedureId || null
      }));
    } else if (cidIds && cidIds.length > 0) {
      // Formato legado (apenas IDs)
      cidsToSave = cidIds.map(id => ({
        cidCodeId: id,
        surgicalApproachId: null,
        surgicalProcedureId: null
      }));
    }
    
    console.log(`PUT /orders/${orderId}/cids - Salvando ${cidsToSave.length} CIDs:`, cidsToSave);
    await relationalOrderService.updateOrderCids(orderId, cidsToSave);
    res.json({ message: 'CIDs atualizados com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar CIDs do pedido:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rotas para OPME Items
router.get('/orders/:orderId/opme-items', isAuthenticated, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    console.log(`=== GET /orders/${orderId}/opme-items ===`);
    const opmeItems = await relationalOrderService.getOrderOpmeItems(orderId);
    console.log(`Retornando ${opmeItems.length} itens OPME para pedido ${orderId}`);
    res.json(opmeItems);
  } catch (error) {
    console.error('Erro ao buscar itens OPME do pedido:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

router.put('/orders/:orderId/opme-items', isAuthenticated, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    console.log(`=== PUT /orders/${orderId}/opme-items ===`);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const validation = updateOpmeItemsSchema.safeParse(req.body);
    if (!validation.success) {
      console.error('Validation error:', validation.error);
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: validation.error.issues 
      });
    }
    
    const { opmeItems } = validation.data;
    await relationalOrderService.updateOrderOpmeItems(orderId, opmeItems);
    console.log(`Itens OPME atualizados com sucesso para pedido ${orderId}`);
    res.json({ message: 'Itens OPME atualizados com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar itens OPME do pedido:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rotas para Suppliers
router.get('/orders/:orderId/suppliers', isAuthenticated, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    console.log(`=== GET /orders/${orderId}/suppliers ===`);
    const supplierIds = await relationalOrderService.getOrderSuppliers(orderId);
    console.log(`Retornando ${supplierIds.length} fornecedores para pedido ${orderId}`);
    res.json(supplierIds);
  } catch (error) {
    console.error('Erro ao buscar fornecedores do pedido:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

router.put('/orders/:orderId/suppliers', isAuthenticated, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    console.log(`=== PUT /orders/${orderId}/suppliers ===`);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { supplierIds, suppliers } = updateSuppliersSchema.parse(req.body);
    
    // Converter para formato unificado com associações cirúrgicas
    let suppliersToSave: { 
      supplierId: number; 
      surgicalApproachId?: number | null; 
      surgicalProcedureId?: number | null;
      isApproved?: boolean;
    }[] = [];
    
    if (suppliers && suppliers.length > 0) {
      // Novo formato com associações
      suppliersToSave = suppliers.map(s => ({
        supplierId: s.supplierId,
        surgicalApproachId: s.surgicalApproachId || null,
        surgicalProcedureId: s.surgicalProcedureId || null,
        isApproved: s.isApproved || false
      }));
    } else if (supplierIds && supplierIds.length > 0) {
      // Formato legado (apenas IDs)
      suppliersToSave = supplierIds.map(id => ({
        supplierId: id,
        surgicalApproachId: null,
        surgicalProcedureId: null,
        isApproved: false
      }));
    }
    
    console.log(`PUT /orders/${orderId}/suppliers - Salvando ${suppliersToSave.length} fornecedores:`, suppliersToSave);
    await relationalOrderService.updateOrderSuppliers(orderId, suppliersToSave);
    res.json({ message: 'Fornecedores atualizados com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar fornecedores do pedido:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// === ROTAS PARA PROCEDIMENTOS CBHPM ===

// GET /api/orders/:orderId/procedures - Buscar procedimentos de um pedido
router.get('/orders/:orderId/procedures', isAuthenticated, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    console.log(`=== GET /orders/${orderId}/procedures ===`);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: "ID do pedido inválido" });
    }

    const procedures = await relationalOrderService.getOrderProcedures(orderId);
    console.log(`Retornando ${procedures.length} procedimentos para pedido ${orderId}`);
    res.json(procedures);
  } catch (error) {
    console.error('Erro ao buscar procedimentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/orders/:orderId/procedures - Atualizar procedimentos de um pedido
router.put('/orders/:orderId/procedures', isAuthenticated, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    console.log(`=== PUT /orders/${orderId}/procedures ===`);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: "ID do pedido inválido" });
    }

    const validation = updateProceduresSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.message });
    }

    await relationalOrderService.updateOrderProcedures(orderId, validation.data.procedures);
    console.log(`Procedimentos atualizados com sucesso para pedido ${orderId}`);
    res.json({ message: 'Procedimentos atualizados com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar procedimentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/orders/:orderId/procedures - Adicionar procedimento a um pedido
router.post('/orders/:orderId/procedures', isAuthenticated, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    console.log(`=== POST /orders/${orderId}/procedures ===`);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: "ID do pedido inválido" });
    }

    const validation = addProcedureSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.message });
    }

    const { procedureId, quantityRequested } = validation.data;
    const newProcedure = await relationalOrderService.addProcedureToOrder(orderId, procedureId, quantityRequested);
    
    if (!newProcedure) {
      return res.status(400).json({ error: 'Erro ao adicionar procedimento' });
    }

    console.log(`Procedimento ${procedureId} adicionado ao pedido ${orderId}`);
    res.status(201).json(newProcedure);
  } catch (error) {
    console.error('Erro ao adicionar procedimento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/orders/procedures/:procedureOrderId - Remover procedimento de um pedido
router.delete('/orders/procedures/:procedureOrderId', isAuthenticated, async (req, res) => {
  try {
    const procedureOrderId = parseInt(req.params.procedureOrderId);
    console.log(`=== DELETE /orders/procedures/${procedureOrderId} ===`);
    
    if (isNaN(procedureOrderId)) {
      return res.status(400).json({ error: "ID do procedimento inválido" });
    }

    const success = await relationalOrderService.removeProcedureFromOrder(procedureOrderId);
    
    if (!success) {
      return res.status(404).json({ error: 'Procedimento não encontrado' });
    }

    console.log(`Procedimento ${procedureOrderId} removido com sucesso`);
    res.json({ message: 'Procedimento removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover procedimento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;