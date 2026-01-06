import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import * as schema from '../shared/schema';
import ws from 'ws';

// Configurar o WebSocket para o Neon
neonConfig.webSocketConstructor = ws;

// Função principal que executa a migração
async function runMigration() {
  console.log('Iniciando migração do banco de dados...');
  
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurada. Verifique suas variáveis de ambiente.');
  }
  
  // Cria uma conexão com o banco de dados
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  
  try {
    // Verifica se os campos opme_item_ids e opme_item_quantities existem na tabela medical_orders
    const checkColumns = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'medical_orders'
      AND column_name IN ('opme_item_ids', 'opme_item_quantities')
    `);

    if (checkColumns.rowCount === 0) {
      console.log('Adicionando colunas opme_item_ids e opme_item_quantities à tabela medical_orders...');
      
      // Adiciona as colunas diretamente
      await pool.query(`
        ALTER TABLE medical_orders 
        ADD COLUMN IF NOT EXISTS opme_item_ids integer[] DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS opme_item_quantities integer[] DEFAULT '{}'
      `);
      
      console.log('Colunas adicionadas com sucesso!');
    } else if (checkColumns.rowCount === 2) {
      console.log('As colunas já existem na tabela. Nada a fazer.');
    } else {
      console.log(`Apenas ${checkColumns.rowCount} colunas encontradas. Adicionando as colunas restantes...`);
      
      // Verifica qual coluna está faltando e adiciona apenas ela
      const existingColumns = checkColumns.rows.map(row => row.column_name);
      
      if (!existingColumns.includes('opme_item_ids')) {
        await pool.query(`
          ALTER TABLE medical_orders 
          ADD COLUMN IF NOT EXISTS opme_item_ids integer[] DEFAULT '{}'
        `);
        console.log('Coluna opme_item_ids adicionada.');
      }
      
      if (!existingColumns.includes('opme_item_quantities')) {
        await pool.query(`
          ALTER TABLE medical_orders 
          ADD COLUMN IF NOT EXISTS opme_item_quantities integer[] DEFAULT '{}'
        `);
        console.log('Coluna opme_item_quantities adicionada.');
      }
    }
    
    console.log('Migração concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante a migração:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Executa a função principal
runMigration()
  .then(() => {
    console.log('Script de migração finalizado.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Falha no script de migração:', error);
    process.exit(1);
  });