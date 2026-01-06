import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import { procedures } from '../shared/schema.js';

// Para ES modules, precisamos criar __dirname manualmente
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function importCBHPMProcedures() {
  try {
    console.log('🚀 Iniciando importação dos códigos CBHPM...');
    
    // Ler o arquivo CSV dos novos procedimentos 3.14.03
    const csvPath = path.join(__dirname, '../attached_assets/3.14.03_processed.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Processar CSV linha por linha
    const lines = csvContent.split('\n');
    const header = lines[0]; // Pular cabeçalho
    console.log('📋 Cabeçalho do CSV:', header);
    
    const proceduresToInsert = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Pular linhas vazias
      
      // Dividir por ponto e vírgula
      const fields = line.split(';');
      
      if (fields.length < 6) {
        console.log(`⚠️  Linha ${i + 1} ignorada (campos insuficientes):`, line);
        errorCount++;
        continue;
      }
      
      const [codigo, procedimento, porte, aux, porteAnestesico, especialidade] = fields;
      
      // Validar se o código existe
      if (!codigo || !procedimento) {
        console.log(`⚠️  Linha ${i + 1} ignorada (código ou procedimento vazio):`, line);
        errorCount++;
        continue;
      }
      
      // Preparar dados para inserção
      const procedureData = {
        code: codigo.trim(),
        name: procedimento.trim(),
        porte: porte ? porte.trim() : null,
        numeroAuxiliares: aux && aux.trim() ? parseInt(aux.trim()) : null,
        porteAnestesista: porteAnestesico ? porteAnestesico.trim() : null,
        custoOperacional: null, // Deixando vazio conforme solicitado (ignorando especialidade)
        description: null, // Deixando vazio conforme solicitado
        active: true
      };
      
      proceduresToInsert.push(procedureData);
      successCount++;
      
      // Log de progresso a cada 50 registros
      if (successCount % 50 === 0) {
        console.log(`📊 Processados ${successCount} registros...`);
      }
    }
    
    console.log(`\n📈 Resumo do processamento:`);
    console.log(`✅ Registros válidos: ${successCount}`);
    console.log(`❌ Registros com erro: ${errorCount}`);
    console.log(`📋 Total de linhas processadas: ${lines.length - 1}`);
    
    if (proceduresToInsert.length === 0) {
      console.log('❌ Nenhum registro válido para importar!');
      return;
    }
    
    // Inserir em lotes para melhor performance
    console.log(`\n💾 Iniciando inserção no banco de dados...`);
    const batchSize = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < proceduresToInsert.length; i += batchSize) {
      const batch = proceduresToInsert.slice(i, i + batchSize);
      
      try {
        await db.insert(procedures).values(batch).onConflictDoNothing();
        insertedCount += batch.length;
        console.log(`📦 Lote ${Math.floor(i / batchSize) + 1} inserido (${batch.length} registros)`);
      } catch (error) {
        console.error(`❌ Erro ao inserir lote ${Math.floor(i / batchSize) + 1}:`, error.message);
        
        // Tentar inserir um por um para identificar problemas específicos
        for (const procedure of batch) {
          try {
            await db.insert(procedures).values(procedure).onConflictDoNothing();
          } catch (singleError) {
            console.error(`❌ Erro ao inserir procedimento ${procedure.code}:`, singleError.message);
          }
        }
      }
    }
    
    console.log(`\n🎉 Importação concluída!`);
    console.log(`✅ Total de registros inseridos: ${insertedCount}`);
    
    // Verificar quantos registros existem na tabela agora
    const totalCount = await db.$count(procedures);
    console.log(`📊 Total de procedimentos na tabela: ${totalCount}`);
    
  } catch (error) {
    console.error('❌ Erro durante a importação:', error);
  } finally {
    await pool.end();
  }
}

// Executar a importação
importCBHPMProcedures();