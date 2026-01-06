import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function createHealthInsuranceProvidersTable() {
  try {
    console.log('Criando tabela de operadoras de saúde...');
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS health_insurance_providers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        cnpj TEXT NOT NULL UNIQUE,
        ans_code TEXT NOT NULL UNIQUE,
        address TEXT,
        city TEXT,
        state TEXT,
        zip_code TEXT,
        phone TEXT,
        email TEXT,
        website TEXT,
        contact_person TEXT,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    
    console.log('Tabela de operadoras de saúde criada com sucesso!');
  } catch (error) {
    console.error('Erro ao criar tabela de operadoras de saúde:', error);
  }
}

createHealthInsuranceProvidersTable()
  .then(() => {
    console.log('Script finalizado.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro no script:', error);
    process.exit(1);
  });