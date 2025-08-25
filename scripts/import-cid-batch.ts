import { db } from "../server/db";
import { cidCodes } from "../shared/schema";
import { eq, sql } from "drizzle-orm";
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Função para categorizar automaticamente os códigos CID-10
function categorizeCidCode(code: string): string {
  const codeUpper = code.toUpperCase();
  const cleanCode = codeUpper.replace('.', '');
  const letter = cleanCode.charAt(0);
  const number = parseInt(cleanCode.substring(1, 3));
  
  switch (letter) {
    case 'A':
    case 'B':
      return 'Doenças Infecciosas e Parasitárias';
    case 'C':
      return (number >= 0 && number <= 97) ? 'Neoplasias' : 'Outros';
    case 'D':
      if (number >= 0 && number <= 48) return 'Neoplasias';
      if (number >= 50 && number <= 89) return 'Doenças do Sangue e Órgãos Hematopoéticos';
      return 'Outros';
    case 'E':
      return 'Doenças Endócrinas e Metabólicas';
    case 'F':
      return 'Transtornos Mentais e Comportamentais';
    case 'G':
      return 'Doenças do Sistema Nervoso';
    case 'H':
      if (number >= 0 && number <= 59) return 'Doenças do Olho e Anexos';
      if (number >= 60 && number <= 95) return 'Doenças do Ouvido';
      return 'Outros';
    case 'I':
      return 'Doenças do Aparelho Circulatório';
    case 'J':
      return 'Doenças do Aparelho Respiratório';
    case 'K':
      return 'Doenças do Aparelho Digestivo';
    case 'L':
      return 'Doenças da Pele e Tecido Subcutâneo';
    case 'M':
      if ((number >= 17 && number <= 19) || (number >= 22 && number <= 25)) return 'Joelho';
      if (number >= 40 && number <= 54) return 'Coluna';
      if (number >= 75 && number <= 77) return 'Ombro';
      if (number >= 16 && number <= 16) return 'Quadril';
      if (number >= 20 && number <= 21) return 'Pé e tornozelo';
      return 'Doenças do Sistema Osteomuscular';
    case 'N':
      return 'Doenças do Aparelho Geniturinário';
    case 'O':
      return 'Gravidez, Parto e Puerpério';
    case 'P':
      return 'Afecções Período Perinatal';
    case 'Q':
      return 'Malformações Congênitas';
    case 'R':
      return 'Sintomas e Sinais Anormais';
    case 'S':
      if (number >= 80 && number <= 89) return 'Joelho';
      if (number >= 10 && number <= 19) return 'Coluna';
      if (number >= 40 && number <= 49) return 'Ombro';
      if (number >= 70 && number <= 79) return 'Quadril';
      if (number >= 90 && number <= 99) return 'Pé e tornozelo';
      return 'Lesões e Envenenamentos';
    case 'T':
      return 'Lesões e Envenenamentos';
    case 'V':
    case 'W':
    case 'X':
    case 'Y':
      return 'Causas Externas';
    case 'Z':
      return 'Fatores que Influenciam o Estado de Saúde';
    default:
      return 'Outros';
  }
}

async function importCidBatch() {
  console.log("🚀 Iniciando importação otimizada dos códigos CID-10...");
  
  try {
    // Verificar conexão
    await db.execute(sql`SELECT 1`);
    console.log("✅ Conexão ao PostgreSQL estabelecida");

    // Ler arquivo CSV
    const csvFilePath = path.resolve(process.cwd(), 'attached_assets/CID-10_toImport.csv');
    
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`❌ Arquivo não encontrado: ${csvFilePath}`);
    }

    let fileContent = fs.readFileSync(csvFilePath, { encoding: 'utf-8' });
    
    // Remover BOM UTF-8 se presente
    if (fileContent.charCodeAt(0) === 0xFEFF) {
      fileContent = fileContent.substring(1);
    }

    const records = parse(fileContent, {
      columns: ['code', 'description', 'col3', 'col4', 'col5'],
      skip_empty_lines: true,
      delimiter: ';',
      trim: true,
      from: 2
    });

    console.log(`📄 Arquivo carregado: ${records.length} registros`);

    // Obter códigos existentes de uma só vez
    const existingCodes = await db.select({ code: cidCodes.code }).from(cidCodes);
    const existingSet = new Set(existingCodes.map(c => c.code));
    
    console.log(`📋 Códigos já existentes: ${existingSet.size}`);

    // Preparar dados para inserção
    const newRecords = [];
    let skipped = 0;

    for (const record of records) {
      const code = record.code?.trim();
      const description = record.description?.trim();

      if (!code || !description) {
        skipped++;
        continue;
      }

      if (existingSet.has(code)) {
        skipped++;
        continue;
      }

      const category = categorizeCidCode(code);
      newRecords.push({ code, description, category });
    }

    console.log(`🔄 Novos códigos para inserir: ${newRecords.length}`);
    console.log(`⏭️  Códigos ignorados: ${skipped}`);

    if (newRecords.length === 0) {
      console.log("✅ Todos os códigos já estão no banco de dados!");
      return;
    }

    // Inserir em lotes de 100
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < newRecords.length; i += batchSize) {
      const batch = newRecords.slice(i, i + batchSize);
      
      try {
        await db.insert(cidCodes).values(batch);
        inserted += batch.length;
        
        console.log(`✅ Lote ${Math.ceil((i + 1) / batchSize)}: ${inserted}/${newRecords.length} inseridos`);
        
      } catch (error) {
        console.log(`❌ Erro no lote ${Math.ceil((i + 1) / batchSize)}: ${error.message}`);
      }
    }

    // Verificar resultado final
    const finalCount = await db.select({ count: sql`count(*)` }).from(cidCodes);
    
    console.log("\n🎉 IMPORTAÇÃO CONCLUÍDA!");
    console.log(`📊 Total de códigos no banco: ${finalCount[0].count}`);
    console.log(`✅ Novos códigos inseridos: ${inserted}`);
    console.log(`⏭️  Códigos ignorados (duplicados): ${skipped}`);

  } catch (error) {
    console.error("❌ Erro durante a importação:", error);
    process.exit(1);
  }
}

// Executar a importação
importCidBatch()
  .then(() => {
    console.log("✅ Script finalizado com sucesso!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Erro fatal:", error);
    process.exit(1);
  });