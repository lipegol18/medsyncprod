import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Cria as pastas necessárias para organizar as imagens de um hospital específico
 * Estrutura: uploads/hospitals/{hospitalId}/
 */
export async function createHospitalFolders(hospitalId: number): Promise<{ logoPath: string }> {
  const baseDir = join(process.cwd(), 'uploads', 'hospitals', hospitalId.toString());

  try {
    await fs.mkdir(baseDir, { recursive: true });

    console.log(`✅ Pasta criada para hospital ${hospitalId}:`);
    console.log(`   - Logos: ${baseDir}`);

    return {
      logoPath: baseDir
    };
  } catch (error) {
    console.error(`❌ Erro ao criar pasta para hospital ${hospitalId}:`, error);
    throw error;
  }
}

/**
 * Retorna o caminho da pasta de um hospital (sem criar se não existir)
 */
export function getHospitalFolderPath(hospitalId: number): string {
  return join(process.cwd(), 'uploads', 'hospitals', hospitalId.toString());
}

/**
 * Verifica se a pasta de um hospital existe
 */
export async function checkHospitalFolderExists(hospitalId: number): Promise<boolean> {
  const folderPath = getHospitalFolderPath(hospitalId);

  try {
    await fs.access(folderPath);
    return true;
  } catch (error) {
    return false;
  }
}
