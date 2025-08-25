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
      orderId: parseInt(orderId)
    };

    console.log(`📁 Arquivo salvo em: ${newFilePath}`);
    console.log(`🔗 URL de acesso: ${fileUrl}`);

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
        orderId: parseInt(orderId)
      });
      
      console.log(`📁 Arquivo salvo em: ${newFilePath}`);
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