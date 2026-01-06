const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

async function analyzeNewCBHPMData() {
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
      console.log('❌ Nenhum registro válido encontrado!');
      return;
    }
    
    // Salvar dados processados em CSV para revisão
    console.log(`\n💾 Salvando dados processados em CSV...`);
    const csvPath = path.join(__dirname, '../attached_assets/3.14.03_processed.csv');
    const csvContent = 'codigo;procedimento;porte;aux;porteAnestesico\n' + 
      proceduresToInsert.map(p => `${p.code};${p.name};${p.porte || ''};${p.numeroAuxiliares || ''};${p.porteAnestesista || ''}`).join('\n');
    
    fs.writeFileSync(csvPath, csvContent);
    console.log(`📄 Arquivo CSV salvo: ${csvPath}`);
    
    console.log(`\n🎉 Análise concluída!`);
    console.log(`✅ Total de registros válidos: ${proceduresToInsert.length}`);
    
  } catch (error) {
    console.error('❌ Erro durante a análise:', error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  analyzeNewCBHPMData();
}

module.exports = { analyzeNewCBHPMData };