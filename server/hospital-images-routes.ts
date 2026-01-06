import { Express, Request, Response } from 'express';
import multer from 'multer';
import { promises as fs } from 'fs';
import { join, extname } from 'path';
import { isAuthenticated } from './auth';
import { createHospitalFolders, getHospitalFolderPath } from './utils/hospital-folders';
import { db } from './db';
import { hospitals } from '../shared/schema';
import { eq } from 'drizzle-orm';

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
  }
});

export function registerHospitalImageRoutes(app: Express) {
  
  app.post('/api/uploads/hospital-logo', 
    isAuthenticated, 
    upload.single('logo'),
    async (req: Request, res: Response) => {
      try {
        const hospitalId = parseInt(req.body.hospitalId);
        const userId = (req as any).user?.id;
        const userRoleId = (req as any).user?.roleId;
        
        if (!hospitalId || isNaN(hospitalId)) {
          return res.status(400).json({ error: 'Hospital ID inválido' });
        }

        const targetHospital = await db.select({ id: hospitals.id })
          .from(hospitals)
          .where(eq(hospitals.id, hospitalId))
          .limit(1);

        if (targetHospital.length === 0) {
          return res.status(404).json({ error: 'Hospital não encontrado' });
        }

        if (userRoleId !== 1 && userRoleId !== 2) {
          return res.status(403).json({ error: 'Apenas administradores e médicos podem atualizar logos de hospital' });
        }

        if (!req.file) {
          return res.status(400).json({ error: 'Nenhuma imagem foi enviada' });
        }

        await createHospitalFolders(hospitalId);
        const logoPath = getHospitalFolderPath(hospitalId);
        
        const timestamp = Date.now();
        const extension = extname(req.file.originalname);
        const filename = `logo_${hospitalId}_${timestamp}${extension}`;
        const fullPath = join(logoPath, filename);

        await fs.writeFile(fullPath, req.file.buffer);

        const existingHospital = await db.select({ logoUrl: hospitals.logoUrl })
          .from(hospitals)
          .where(eq(hospitals.id, hospitalId))
          .limit(1);

        if (existingHospital.length > 0 && existingHospital[0].logoUrl) {
          try {
            const oldFilePath = join(process.cwd(), existingHospital[0].logoUrl);
            await fs.unlink(oldFilePath);
            console.log(`🗑️ Logo anterior removido: ${oldFilePath}`);
          } catch (error) {
            console.warn('Logo anterior não encontrado para remoção');
          }
        }

        const logoUrl = `/uploads/hospitals/${hospitalId}/${filename}`;

        await db.update(hospitals)
          .set({ logoUrl })
          .where(eq(hospitals.id, hospitalId));

        console.log(`✅ Logo atualizado para hospital ${hospitalId}: ${logoUrl}`);
        
        res.json({
          success: true,
          url: logoUrl,
          logoUrl,
          message: 'Logo atualizado com sucesso'
        });

      } catch (error) {
        console.error('Erro ao fazer upload do logo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  );

  app.delete('/api/hospitals/:hospitalId/logo',
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const hospitalId = parseInt(req.params.hospitalId);
        const userId = (req as any).user?.id;
        const userRoleId = (req as any).user?.roleId;
        
        if (!hospitalId || isNaN(hospitalId)) {
          return res.status(400).json({ error: 'Hospital ID inválido' });
        }

        if (userRoleId !== 1 && userRoleId !== 2) {
          return res.status(403).json({ error: 'Apenas administradores e médicos podem remover logos de hospital' });
        }

        const hospital = await db.select({ logoUrl: hospitals.logoUrl })
          .from(hospitals)
          .where(eq(hospitals.id, hospitalId))
          .limit(1);

        if (hospital.length === 0) {
          return res.status(404).json({ error: 'Hospital não encontrado' });
        }

        if (hospital[0].logoUrl) {
          try {
            const filePath = join(process.cwd(), hospital[0].logoUrl);
            await fs.unlink(filePath);
            console.log(`✅ Arquivo de logo removido: ${filePath}`);
          } catch (fileError) {
            console.warn('Arquivo de logo não encontrado para remoção:', fileError);
          }
        }

        await db.update(hospitals)
          .set({ logoUrl: null })
          .where(eq(hospitals.id, hospitalId));

        res.json({
          success: true,
          message: 'Logo removido com sucesso'
        });

      } catch (error) {
        console.error('Erro ao remover logo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  );

  app.get('/api/hospitals/:hospitalId/images',
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const hospitalId = parseInt(req.params.hospitalId);
        
        if (!hospitalId || isNaN(hospitalId)) {
          return res.status(400).json({ error: 'Hospital ID inválido' });
        }
        
        const hospital = await db.select({
          logoUrl: hospitals.logoUrl
        })
        .from(hospitals)
        .where(eq(hospitals.id, hospitalId))
        .limit(1);

        if (hospital.length === 0) {
          return res.status(404).json({ error: 'Hospital não encontrado' });
        }

        res.json({
          hospitalId,
          logoUrl: hospital[0].logoUrl
        });

      } catch (error) {
        console.error('Erro ao buscar imagens do hospital:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  );
}
