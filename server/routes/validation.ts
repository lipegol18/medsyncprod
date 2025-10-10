import { Router } from 'express';
import { storage } from '../storage';
import { z } from 'zod';

const router = Router();

// Schema para validação de unicidade
const checkUniqueSchema = z.object({
  field: z.enum(['cpf', 'crm', 'phone', 'email', 'username']),
  value: z.string().min(1),
  excludeUserId: z.number().optional() // Para excluir o próprio usuário em edições
});

/**
 * Verifica se um campo é único na base de dados
 * POST /api/validate/unique
 */
router.post('/unique', async (req, res) => {
  try {
    const { field, value, excludeUserId } = checkUniqueSchema.parse(req.body);
    
    // Buscar se existe usuário com esse valor no campo especificado
    const existingUser = await storage.getUserByField(field, value);
    
    // Se não existe, o valor é único
    if (!existingUser) {
      return res.json({ isUnique: true });
    }
    
    // Se existe mas é o próprio usuário (para edição), ainda é único
    if (excludeUserId && existingUser.id === excludeUserId) {
      return res.json({ isUnique: true });
    }
    
    // Se existe e não é o próprio usuário, não é único
    return res.json({ isUnique: false });
    
  } catch (error: any) {
    console.error('Erro na validação de unicidade:', error);
    return res.status(400).json({ 
      error: 'Dados inválidos para validação',
      details: error.message 
    });
  }
});

export default router;