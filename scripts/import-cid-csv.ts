import { db } from "../server/db";
import { cidCodes } from "../shared/schema";
import { eq } from "drizzle-orm";
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Função para categorizar automaticamente os códigos CID-10
function categorizeCidCode(code: string): string {
  const codeUpper = code.toUpperCase();
  
  // Remover pontos para análise
  const cleanCode = codeUpper.replace('.', '');
  
  // Extrair letra e números
  const letter = cleanCode.charAt(0);
  const number = parseInt(cleanCode.substring(1, 3));
  
  switch (letter) {
    case 'A':
    case 'B':
      return 'Doenças Infecciosas e Parasitárias';
    
    case 'C':
      if (number >= 0 && number <= 97) {
        return 'Neoplasias';
      }
      return 'Outros';
    
    case 'D':
      if (number >= 0 && number <= 48) {
        return 'Neoplasias';
      } else if (number >= 50 && number <= 89) {
        return 'Doenças do Sangue e Órgãos Hematopoéticos';
      }
      return 'Outros';
    
    case 'E':
      return 'Doenças Endócrinas e Metabólicas';
    
    case 'F':
      return 'Transtornos Mentais e Comportamentais';
    
    case 'G':
      return 'Doenças do Sistema Nervoso';
    
    case 'H':
      if (number >= 0 && number <= 59) {
        return 'Doenças do Olho e Anexos';
      } else if (number >= 60 && number <= 95) {
        return 'Doenças do Ouvido';
      }
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
      // Mapeamento específico para códigos ortopédicos
      if ((number >= 17 && number <= 19) || (number >= 22 && number <= 25)) {
        return 'Joelho'; // Gonartrose e outros problemas do joelho
      } else if (number >= 40 && number <= 54) {
        return 'Coluna'; // Dorsopatias
      } else if (number >= 75 && number <= 77) {
        return 'Ombro'; // Lesões do ombro
      } else if (number >= 16 && number <= 16) {
        return 'Quadril'; // Coxartrose
      } else if (number >= 20 && number <= 21) {
        return 'Pé e tornozelo'; // Deformidades dos dedos do pé
      }
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
      // Mapeamento específico para traumatismos ortopédicos
      if (number >= 80 && number <= 89) {
        return 'Joelho'; // Traumatismos do joelho e perna
      } else if (number >= 10 && number <= 19) {
        return 'Coluna'; // Traumatismos do pescoço e tronco
      } else if (number >= 40 && number <= 49) {
        return 'Ombro'; // Traumatismos do ombro e braço
      } else if (number >= 70 && number <= 79) {
        return 'Quadril'; // Traumatismos do quadril e coxa
      } else if (number >= 90 && number <= 99) {
        return 'Pé e tornozelo'; // Traumatismos do tornozelo e pé
      }
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

async function importCidCsv() {
  console.log("Iniciando importação dos códigos CID-10 do arquivo CSV...");
  
  try {
    // Verificar se já existem códigos CID na tabela
    const existingCodes = await db.select().from(cidCodes).limit(1);
    
    if (existingCodes.length > 0) {
      console.log("⚠️  Já existem códigos CID-10 no banco. Continuando com a importação...");
      console.log("A importação adicionará apenas códigos que não existem.");
    }
    
    // Ler o arquivo CSV
    const csvFilePath = path.resolve(process.cwd(), 'attached_assets/CID-10_toImport.csv');
    
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`Arquivo não encontrado: ${csvFilePath}`);
    }
    
    let fileContent = fs.readFileSync(csvFilePath, { encoding: 'utf-8' });
    
    // Remover BOM UTF-8 se presente
    if (fileContent.charCodeAt(0) === 0xFEFF) {
      fileContent = fileContent.substring(1);
    }
    
    // Parsear o conteúdo do CSV com separador ;
    const records = parse(fileContent, {
      columns: ['code', 'description', 'col3', 'col4', 'col5'], // Definir todas as colunas
      skip_empty_lines: true,
      delimiter: ';',
      trim: true,
      from: 2 // Pular o cabeçalho
    });
    
    console.log(`📄 Arquivo carregado com ${records.length} registros`);
    
    let insertedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Processar cada registro
    for (const record of records) {
      try {
        const code = record.code?.trim();
        const description = record.description?.trim();
        
        // Validar dados obrigatórios
        if (!code || !description) {
          console.log(`⚠️  Pulando registro inválido: código="${code}" descrição="${description}"`);
          skippedCount++;
          continue;
        }
        
        // Verificar se o código já existe
        const existingCode = await db.select().from(cidCodes).where(eq(cidCodes.code, code)).limit(1);
        
        if (existingCode.length > 0) {
          skippedCount++;
          continue;
        }
        
        // Categorizar automaticamente
        const category = categorizeCidCode(code);
        
        // Inserir o registro
        await db.insert(cidCodes).values({
          code: code,
          description: description,
          category: category as any
        });
        
        insertedCount++;
        
        // Log progresso a cada 100 registros
        if (insertedCount % 100 === 0) {
          console.log(`✅ Processados ${insertedCount} códigos...`);
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Erro ao processar código ${record.code}: ${error.message}`);
      }
    }
    
    console.log("\n🎉 Importação concluída!");
    console.log(`✅ Códigos inseridos: ${insertedCount}`);
    console.log(`⏭️  Códigos já existentes (pulados): ${skippedCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`📊 Total processado: ${insertedCount + skippedCount + errorCount}`);
    
  } catch (error) {
    console.error("❌ Erro durante a importação:", error);
  } finally {
    process.exit(0);
  }
}

// Executar a importação
importCidCsv();