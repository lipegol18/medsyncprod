import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import { healthInsuranceProviders } from '../shared/schema.js';
import XLSX from 'xlsx';
import { sql } from 'drizzle-orm';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function importHealthInsuranceProviders() {
  try {
    console.log('🔄 Iniciando importação das operadoras de saúde...');
    
    // Lê o arquivo Excel
    const workbook = XLSX.readFile('../attached_assets/OperadorasSaude_toImport_1749412471325.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Converte para JSON
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log(`📊 Arquivo lido com ${data.length} registros`);
    
    // Mostra as primeiras linhas para verificar estrutura
    console.log('📋 Primeiras linhas do arquivo:');
    console.log(JSON.stringify(data.slice(0, 3), null, 2));
    
    // Limpa a tabela existente
    console.log('🗑️ Removendo dados existentes...');
    await db.delete(healthInsuranceProviders);
    
    // Reinicia a sequência do ID
    console.log('🔄 Reiniciando sequência de IDs...');
    await db.execute(sql`ALTER SEQUENCE health_insurance_providers_id_seq RESTART WITH 1`);
    
    // Prepara os dados para inserção
    const providersToInsert = data.map((row: any) => {
      // Mapeia as colunas baseado na estrutura esperada
      const keys = Object.keys(row);
      
      // Mapeamento específico baseado na estrutura real do Excel
      const nameKey = 'Razao_Social';
      const cnpjKey = 'CNPJ';
      const ansKey = 'Registro_ANS';
      const cityKey = 'Cidade';
      const stateKey = 'UF';
      const zipKey = 'CEP';
      const phoneKey = 'Telefone';
      const emailKey = 'Endereco_eletronico';
      const contactKey = 'Representante';
      
      // Constrói endereço completo a partir dos campos separados
      const logradouro = row['Logradouro'] || '';
      const numero = row['Numero'] || '';
      const complemento = row['Complemento'] || '';
      const bairro = row['Bairro'] || '';
      
      let endereco = '';
      if (logradouro) {
        endereco = logradouro;
        if (numero) endereco += `, ${numero}`;
        if (complemento) endereco += ` ${complemento}`;
        if (bairro) endereco += `, ${bairro}`;
      }
      
      return {
        name: row[nameKey] || '',
        cnpj: row[cnpjKey] ? String(row[cnpjKey]) : '',
        ansCode: row[ansKey] ? String(row[ansKey]) : '',
        address: endereco || null,
        city: row[cityKey] || null,
        state: row[stateKey] || null,
        zipCode: row[zipKey] ? String(row[zipKey]) : null,
        phone: row[phoneKey] ? String(row[phoneKey]) : null,
        email: row[emailKey] || null,
        website: null,
        contactPerson: row[contactKey] || null,
        active: true
      };
    }).filter(provider => provider.name && provider.cnpj && provider.ansCode);
    
    console.log(`✅ Preparados ${providersToInsert.length} registros válidos para inserção`);
    
    // Insere os novos dados
    if (providersToInsert.length > 0) {
      await db.insert(healthInsuranceProviders).values(providersToInsert);
      console.log(`✅ ${providersToInsert.length} operadoras de saúde importadas com sucesso!`);
    } else {
      console.log('⚠️ Nenhum registro válido encontrado para importação');
    }
    
    // Verifica o resultado
    const count = await db.$count(healthInsuranceProviders);
    console.log(`📊 Total de operadoras na tabela: ${count}`);
    
  } catch (error) {
    console.error('❌ Erro durante a importação:', error);
  } finally {
    await pool.end();
  }
}

// Executa o script
importHealthInsuranceProviders();