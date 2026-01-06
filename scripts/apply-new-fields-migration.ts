import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../server/db';

// Obter o caminho do diretório atual para módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  try {
    console.log('Iniciando aplicação da migração para adicionar campos clinical_justification e multiple_cid_ids...');
    
    // Ler o arquivo de migração
    const migrationPath = path.join(__dirname, '../migrations/add_clinical_justification_multiple_cids.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Aplicar a migração
    await pool.query(migrationSQL);
    
    console.log('Migração aplicada com sucesso!');
    console.log('Campos adicionados:');
    console.log('- clinical_justification: Para armazenar sugestões de justificativa clínica');
    console.log('- multiple_cid_ids: Para armazenar um array de IDs de códigos CID-10 adicionais');
    
    // Verificar se os campos foram adicionados
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'medical_orders' 
        AND column_name IN ('clinical_justification', 'multiple_cid_ids')
      ORDER BY ordinal_position
    `);
    
    console.log('\nCampos verificados no banco de dados:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });
    
  } catch (error) {
    console.error('Erro ao aplicar a migração:', error);
  } finally {
    // Fechar a conexão
    await pool.end();
  }
}

// Executar a migração
applyMigration();