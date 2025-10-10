import { Router } from 'express';
import { storage } from '../storage';
import { insertMedicalSpecialtySchema } from '@shared/schema';

const router = Router();

/**
 * Buscar todas as especialidades médicas ativas
 * GET /api/medical-specialties
 */
router.get('/', async (req, res) => {
  try {
    const specialties = await storage.getMedicalSpecialties();
    res.json(specialties);
  } catch (error) {
    console.error('Erro ao buscar especialidades médicas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Buscar todas as especialidades médicas ativas (rota pública)
 * GET /api/medical-specialties/public
 */
router.get('/public', async (req, res) => {
  try {
    const specialties = await storage.getMedicalSpecialties();
    res.json(specialties);
  } catch (error) {
    console.error('Erro ao buscar especialidades médicas (público):', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Buscar especialidade médica por ID
 * GET /api/medical-specialties/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const specialty = await storage.getMedicalSpecialty(id);
    if (!specialty) {
      return res.status(404).json({ error: 'Especialidade médica não encontrada' });
    }

    res.json(specialty);
  } catch (error) {
    console.error('Erro ao buscar especialidade médica:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Criar nova especialidade médica
 * POST /api/medical-specialties
 */
router.post('/', async (req, res) => {
  try {
    const validatedData = insertMedicalSpecialtySchema.parse(req.body);
    
    // Verificar se já existe especialidade com o mesmo nome
    const existingSpecialty = await storage.getMedicalSpecialtyByName(validatedData.name);
    if (existingSpecialty) {
      return res.status(409).json({ error: 'Especialidade médica já existe' });
    }

    const newSpecialty = await storage.createMedicalSpecialty(validatedData);
    res.status(201).json(newSpecialty);
  } catch (error: any) {
    console.error('Erro ao criar especialidade médica:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;