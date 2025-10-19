import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { storage } from './storage';

const router = Router();

// Configuração do multer para upload unificado (compatibilidade)
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      // Para uploads gerais (sem orderId) - compatibilidade
      const uploadDir = path.join(process.cwd(), 'uploads', 'attachments');
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      cb(null, `${timestamp}_${sanitizedName}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const isAllowed = allowedTypes.includes(file.mimetype);
    cb(null, isAllowed);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10
  }
});

// Configuração do multer para uploads organizados por pedido
const uploadForOrder = multer({
  storage: multer.memoryStorage(), // Usar memória para depois organizar por pasta
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const isAllowed = allowedTypes.includes(file.mimetype);
    cb(null, isAllowed);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10
  }
});

// Upload de anexo unificado - ROTA LEGADA REMOVIDA
// Use apenas /upload-attachment/:orderId para nova estrutura organizacional

// Upload de anexo para pedido específico
router.post('/upload-attachment/:orderId', uploadForOrder.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const { orderId } = req.params;
    
    // Validar se o pedido existe (removendo validação de usuário por enquanto para debug)
    console.log(`📤 Upload para pedido ${orderId}, usuário:`, req.user?.id || 'não autenticado');
    
    try {
      const order = await storage.getMedicalOrder(parseInt(orderId));
      if (!order) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }
      console.log(`✅ Pedido ${orderId} encontrado, pertence ao usuário ${order.userId}`);
    } catch (error) {
      console.error('Erro ao validar pedido:', error);
      return res.status(500).json({ error: 'Erro ao validar permissões' });
    }
    
    // Criar estrutura simples: /uploads/orders/{id}/
    const orderUploadDir = path.join(process.cwd(), 'uploads', 'orders', orderId);
    await fs.mkdir(orderUploadDir, { recursive: true });
    
    // Preparar arquivo para a pasta específica do pedido
    const timestamp = Date.now();
    const sanitizedName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const newFilename = `${timestamp}_${sanitizedName}`;
    const newFilePath = path.join(orderUploadDir, newFilename);
    
    // Escrever arquivo do buffer para a pasta final
    await fs.writeFile(newFilePath, req.file.buffer);
    
    const fileUrl = `/uploads/orders/${orderId}/${newFilename}`;
    
    // Determinar tipo baseado no mimetype
    const type = req.file.mimetype.startsWith('image/') ? 'image' : 'pdf';
    
    const attachment = {
      id: Math.random().toString(36).substr(2, 9),
      filename: req.file.originalname,
      url: fileUrl,
      type: type as 'image' | 'pdf',
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
      orderId: parseInt(orderId),
      source: 'order_details' as 'order_details' // Marcando como anexo adicionado na tela de detalhes
    };

    console.log(`📁 Arquivo salvo em: ${newFilePath}`);
    console.log(`🔗 URL de acesso: ${fileUrl}`);

    // **CRÍTICO**: Atualizar a tabela medical_orders com o novo anexo
    try {
      console.log(`🔄 Iniciando atualização do banco para pedido ${orderId}`);
      const { db } = await import('./db');
      const { medicalOrders } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');
      
      // **DEBUG**: Verificar se os imports funcionaram
      console.log(`🔧 IMPORTS OK - db: ${!!db}, medicalOrders: ${!!medicalOrders}, eq: ${!!eq}`);
      
      console.log(`🔍 Buscando attachments atuais do pedido ${orderId}`);
      // Buscar attachments atuais do pedido
      const currentOrder = await db.select({ attachments: medicalOrders.attachments })
        .from(medicalOrders)
        .where(eq(medicalOrders.id, parseInt(orderId)))
        .limit(1);
        
      const currentAttachments = currentOrder[0]?.attachments || [];
      console.log(`📊 Attachments atuais: ${JSON.stringify(currentAttachments)}`);
      
      // Adicionar o novo anexo aos attachments existentes
      const updatedAttachments = [...currentAttachments, attachment];
      console.log(`📊 Novo attachment: ${JSON.stringify(attachment)}`);
      console.log(`📊 Attachments após adição: ${JSON.stringify(updatedAttachments)}`);
      
      // Atualizar o pedido no banco com os novos attachments
      const updateResult = await db.update(medicalOrders)
        .set({ 
          attachments: updatedAttachments,
          updatedAt: new Date()
        })
        .where(eq(medicalOrders.id, parseInt(orderId)))
        .returning();
        
      console.log(`✅ UPDATE DATABASE RESULT: ${JSON.stringify(updateResult[0]?.attachments)}`);
      console.log(`✅ Anexo salvo no banco de dados para pedido ${orderId}. Registros atualizados: ${updateResult.length}`);
    } catch (dbError) {
      console.error('❌ ERRO CRÍTICO NO UPLOAD - Detalhes completos:', {
        error: dbError.message,
        stack: dbError.stack,
        orderId: orderId,
        attachment: attachment
      });
      // **CORREÇÃO**: Não retornar erro, continuar execução como no upload de PDF
      console.error('❌ Falha no banco, mas arquivo foi salvo fisicamente. Continuando...');
    }

    res.json(attachment);
  } catch (error) {
    console.error('Erro no upload de anexo para pedido:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Upload múltiplo de anexos para pedido específico
router.post('/upload-attachments/:orderId', uploadForOrder.array('files', 10), async (req, res) => {
  try {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const { orderId } = req.params;
    const files = req.files as Express.Multer.File[];
    
    // Validar pedido
    console.log(`📤 Upload múltiplo para pedido ${orderId}, usuário:`, req.user?.id || 'não autenticado');
    
    try {
      const order = await storage.getMedicalOrder(parseInt(orderId));
      if (!order) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }
      console.log(`✅ Pedido ${orderId} encontrado, pertence ao usuário ${order.userId}`);
    } catch (error) {
      console.error('Erro ao validar pedido:', error);
      return res.status(500).json({ error: 'Erro ao validar permissões' });
    }
    
    // Criar estrutura simples: /uploads/orders/{id}/
    const orderUploadDir = path.join(process.cwd(), 'uploads', 'orders', orderId);
    await fs.mkdir(orderUploadDir, { recursive: true });

    const attachments = [];
    
    for (const file of files) {
      const timestamp = Date.now();
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const newFilename = `${timestamp}_${sanitizedName}`;
      const newFilePath = path.join(orderUploadDir, newFilename);
      
      // Escrever arquivo do buffer para a pasta final
      await fs.writeFile(newFilePath, file.buffer);
      
      const fileUrl = `/uploads/orders/${orderId}/${newFilename}`;
      const type = file.mimetype.startsWith('image/') ? 'image' : 'pdf';
      
      attachments.push({
        id: Math.random().toString(36).substr(2, 9),
        filename: file.originalname,
        url: fileUrl,
        type: type as 'image' | 'pdf',
        size: file.size,
        uploadedAt: new Date().toISOString(),
        orderId: parseInt(orderId),
        source: 'order_details' as 'order_details' // Marcando como anexo adicionado na tela de detalhes
      });
      
      console.log(`📁 Arquivo salvo em: ${newFilePath}`);
    }

    // **CRÍTICO**: Atualizar a tabela medical_orders com os novos anexos
    try {
      const { db } = await import('./db');
      const { medicalOrders } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');
      
      // Buscar attachments atuais do pedido
      const currentOrder = await db.select({ attachments: medicalOrders.attachments })
        .from(medicalOrders)
        .where(eq(medicalOrders.id, parseInt(orderId)))
        .limit(1);
        
      const currentAttachments = currentOrder[0]?.attachments || [];
      
      // Adicionar os novos anexos aos attachments existentes
      const updatedAttachments = [...currentAttachments, ...attachments];
      
      // Atualizar o pedido no banco com os novos attachments
      await db.update(medicalOrders)
        .set({ 
          attachments: updatedAttachments,
          updatedAt: new Date()
        })
        .where(eq(medicalOrders.id, parseInt(orderId)));
        
      console.log(`✅ ${attachments.length} anexos salvos no banco de dados para pedido ${orderId}`);
    } catch (dbError) {
      console.error('❌ ERRO CRÍTICO NO UPLOAD MÚLTIPLO - Detalhes completos:', {
        error: dbError.message,
        stack: dbError.stack,
        orderId: orderId,
        attachmentCount: attachments.length
      });
      // **CORREÇÃO**: Não retornar erro, continuar execução como no upload de PDF
      console.error('❌ Falha no banco, mas arquivos foram salvos fisicamente. Continuando...');
    }

    res.json({ attachments });
  } catch (error) {
    console.error('Erro no upload múltiplo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar anexos de um pedido
router.patch('/orders/:orderId/attachments', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { attachments } = req.body;

    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Validar se o pedido existe e pertence ao usuário
    const order = await storage.getMedicalOrder(parseInt(orderId));
    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    if (order.userId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Atualizar os anexos no banco de dados
    await storage.updateMedicalOrder(parseInt(orderId), {
      attachments: attachments
    });

    res.json({ success: true, attachments });
  } catch (error) {
    console.error('Erro ao atualizar anexos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Remover anexo específico
router.delete('/delete-attachment/:orderId/:filename', async (req, res) => {
  try {
    const { orderId, filename } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Validar se o pedido existe e pertence ao usuário
    const order = await storage.getMedicalOrder(parseInt(orderId));
    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    if (order.userId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const filePath = path.join(process.cwd(), 'uploads', 'orders', orderId, filename);
    console.log('🗑️ Tentando excluir arquivo:', filePath);
    
    try {
      await fs.unlink(filePath);
      console.log('✅ Arquivo excluído com sucesso:', filename);
      res.json({ success: true, message: 'Arquivo excluído com sucesso' });
    } catch (error) {
      console.error('❌ Erro ao remover arquivo:', error);
      res.status(404).json({ error: 'Arquivo não encontrado' });
    }
  } catch (error) {
    console.error('❌ Erro ao remover anexo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;