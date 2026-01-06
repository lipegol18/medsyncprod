const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { drizzle } = require('drizzle-orm/postgres-js');
const { procedures } = require('../shared/schema');
const postgres = require('postgres');

// Configuração do banco de dados
const sql = postgres(process.env.DATABASE_URL);
const db = drizzle(sql);

async function importNewCBHPMProcedures() {
  try {
    console.log('🚀 Iniciando importação dos novos códigos CBHPM...');
    
    // Ler o arquivo Excel
    const xlsxPath = path.join(__dirname, '../attached_assets/3.14.03_toImport_1749536025313.xlsx');
    const workbook = XLSX.readFile(xlsxPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Converter para JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log('📋 Estrutura do arquivo:');
    console.log('Total de linhas:', data.length);
    if (data.length > 0) {
      console.log('Cabeçalho:', data[0]);
    }
    
    // Mostrar primeiras linhas para análise
    console.log('\n📊 Primeiras 5 linhas:');
    for (let i = 0; i < Math.min(5, data.length); i++) {
      console.log(`Linha ${i}:`, data[i]);
    }
    
    const proceduresToInsert = [];
    let successCount = 0;
    let errorCount = 0;
    
    // Processar dados (começando da linha 1 para pular cabeçalho)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue; // Pular linhas vazias
      
      // Extrair dados baseado na estrutura esperada
      // Ajustar índices conforme a estrutura real do arquivo
      const codigo = row[0] ? String(row[0]).trim() : '';
      const procedimento = row[1] ? String(row[1]).trim() : '';
      const porte = row[2] ? String(row[2]).trim() : null;
      const aux = row[3] ? String(row[3]).trim() : null;
      const porteAnestesico = row[4] ? String(row[4]).trim() : null;
      
      // Validar se o código e procedimento existem
      if (!codigo || !procedimento) {
        console.log(`⚠️  Linha ${i + 1} ignorada (código ou procedimento vazio):`, row);
        errorCount++;
        continue;
      }
      
      // Preparar dados para inserção
      const procedureData = {
        code: codigo,
        name: procedimento,
        porte: porte || null,
        numeroAuxiliares: aux || null,
        porteAnestesista: porteAnestesico || null,
        custoOperacional: null,
        description: null,
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
    console.log(`📋 Total de linhas processadas: ${data.length - 1}`);
    
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
    await sql.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  importNewCBHPMProcedures();
}

module.exports = { importNewCBHPMProcedures };