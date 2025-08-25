import { db } from "../server/db";
import { opmeItems } from "../shared/schema";
import * as fs from 'fs';
import * as path from 'path';

async function importOpmeItems() {
  console.log("Iniciando importação dos itens OPME...");
  
  try {
    // Ler o arquivo CSV
    const csvPath = path.join(process.cwd(), 'attached_assets', 'OPME_ORTO_toImport_1749410984483.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').slice(1); // Pular cabeçalho
    
    const opmeItemsToImport: Array<{
      technicalName: string;
      commercialName: string;
      isValid: boolean;
    }> = [];
    
    let processedCount = 0;
    let skippedCount = 0;
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const columns = line.split(';');
      if (columns.length === 0) continue;
      
      const itemName = columns[0]?.trim();
      
      // Pular linhas vazias ou com apenas pontos/vírgulas
      if (!itemName || itemName === '' || itemName === 'NOME') {
        skippedCount++;
        continue;
      }
      
      // Usar o mesmo nome para technical_name e commercial_name
      opmeItemsToImport.push({
        technicalName: itemName,
        commercialName: itemName,
        isValid: true
      });
      
      processedCount++;
    }
    
    console.log(`Processados: ${processedCount} itens OPME`);
    console.log(`Pulados: ${skippedCount} linhas`);
    console.log(`Prontos para importar: ${opmeItemsToImport.length} itens`);
    
    if (opmeItemsToImport.length > 0) {
      // Importar em lotes para evitar problemas de memória
      const batchSize = 100;
      let importedCount = 0;
      
      for (let i = 0; i < opmeItemsToImport.length; i += batchSize) {
        const batch = opmeItemsToImport.slice(i, i + batchSize);
        await db.insert(opmeItems).values(batch);
        importedCount += batch.length;
        console.log(`Importados ${importedCount}/${opmeItemsToImport.length} itens...`);
      }
      
      console.log(`✓ ${opmeItemsToImport.length} itens OPME importados com sucesso!`);
      
      // Mostrar alguns exemplos importados
      console.log("\nExemplos importados:");
      opmeItemsToImport.slice(0, 5).forEach((item, index) => {
        console.log(`${index + 1}. ${item.technicalName}`);
      });
    }
    
  } catch (error) {
    console.error("Erro ao importar itens OPME:", error);
  } finally {
    console.log("Importação finalizada.");
    process.exit(0);
  }
}

// Executar a função
importOpmeItems();