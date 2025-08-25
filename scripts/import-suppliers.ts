import { db } from "../server/db";
import { suppliers, municipalities } from "../shared/schema";
import { eq } from "drizzle-orm";
import * as fs from 'fs';
import * as path from 'path';

async function importSuppliers() {
  console.log("Iniciando importação dos fornecedores...");
  
  try {
    // Ler o arquivo CSV
    const csvPath = path.join(process.cwd(), 'attached_assets', 'SUPPLIERS_toImport_1749408323392.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').slice(1); // Pular cabeçalho
    
    // Mapear códigos IBGE incorretos para corretos
    const ibgeMapping: Record<string, number> = {
      '330455': 3304557, // Rio de Janeiro
      '330100': 3300100, // Angra dos Reis  
      '330330': 3303302, // Niterói
      '330600': 3306008, // Três Rios
      '312770': 3127701, // Governador Valadares
      '351380': 3513801, // Diadema
      '355030': 3550308, // São Paulo
    };
    
    // Buscar todos os municípios para mapear IBGE code para ID
    const allMunicipalities = await db.select().from(municipalities);
    const municipalityMap = new Map(allMunicipalities.map(m => [m.ibgeCode, m.id]));
    
    // Função para gerar nome comercial abreviado
    function generateTradeName(companyName: string): string {
      const words = companyName.toUpperCase().split(' ');
      const stopWords = ['LTDA', 'ME', 'EPP', 'EIRELI', 'S/A', 'SA', 'DE', 'DA', 'DO', 'DOS', 'DAS', 'E', 'EM', 'COMERCIO', 'COMERCIAL', 'INDUSTRIA', 'IMPORTACAO', 'EXPORTACAO', 'PRODUTOS', 'HOSPITALARES', 'MATERIAIS', 'CIRURGICOS'];
      
      // Filtrar palavras relevantes (não stop words)
      const relevantWords = words.filter(word => !stopWords.includes(word) && word.length > 2);
      
      // Se temos palavras relevantes, usar as 2 primeiras
      if (relevantWords.length >= 2) {
        return relevantWords.slice(0, 2).join(' ');
      } else if (relevantWords.length === 1) {
        // Se só temos 1 palavra relevante, adicionar uma palavra adicional
        const additionalWord = words.find(word => !stopWords.includes(word) && word !== relevantWords[0]);
        return additionalWord ? `${relevantWords[0]} ${additionalWord}` : relevantWords[0];
      } else {
        // Fallback: usar as 2 primeiras palavras originais
        return words.slice(0, 2).join(' ');
      }
    }

    const suppliersToImport: Array<{
      companyName: string;
      tradeName: string;
      cnpj: string;
      municipalityId: number;
      address?: string;
      neighborhood?: string;
      postalCode?: string;
      anvisaCode?: string;
      active: boolean;
    }> = [];
    
    let processedCount = 0;
    let skippedCount = 0;
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const columns = line.split(';');
      if (columns.length < 11) continue;
      
      const cnpj = columns[0]?.trim();
      const companyName = columns[1]?.trim();
      const anvisaNumber = columns[2]?.trim();
      const situacao = columns[4]?.trim();
      const endereco = columns[7]?.trim();
      const bairro = columns[8]?.trim();
      const cep = columns[9]?.trim();
      const codigoIbge = columns[10]?.trim();
      
      if (!cnpj || !companyName || !codigoIbge) {
        console.log(`Linha pulada: dados obrigatórios faltando`);
        skippedCount++;
        continue;
      }
      
      // Mapear código IBGE do CSV para código correto
      const ibgeCorreto = ibgeMapping[codigoIbge] || parseInt(codigoIbge);
      const municipalityId = municipalityMap.get(ibgeCorreto);
      
      if (!municipalityId) {
        console.log(`Município não encontrado para código IBGE: ${codigoIbge} (correto: ${ibgeCorreto})`);
        skippedCount++;
        continue;
      }
      
      // Extrair apenas o código ANVISA limpo (antes dos parênteses)
      let anvisaCode = '';
      if (anvisaNumber) {
        const match = anvisaNumber.match(/^([^(]+)/);
        anvisaCode = match ? match[1].trim() : '';
      }
      
      // Limpar CEP (remover hífens e espaços)
      const postalCode = cep ? cep.replace(/[-\s]/g, '') : '';
      
      // Limpar endereço (remover aspas extras)
      const address = endereco ? endereco.replace(/["]/g, '').trim() : '';
      
      const tradeName = generateTradeName(companyName);
      
      suppliersToImport.push({
        companyName,
        tradeName,
        cnpj,
        municipalityId,
        address: address || undefined,
        neighborhood: bairro || undefined,
        postalCode: postalCode || undefined,
        anvisaCode: anvisaCode || undefined,
        active: situacao === 'ATIVA'
      });
      
      processedCount++;
    }
    
    console.log(`Processados: ${processedCount} fornecedores`);
    console.log(`Pulados: ${skippedCount} fornecedores`);
    console.log(`Prontos para importar: ${suppliersToImport.length} fornecedores`);
    
    if (suppliersToImport.length > 0) {
      // Verificar se já existem fornecedores
      const existingSuppliers = await db.select().from(suppliers);
      console.log(`Fornecedores existentes no banco: ${existingSuppliers.length}`);
      
      // Filtrar fornecedores que já existem (por CNPJ)
      const existingCnpjs = existingSuppliers.map(s => s.cnpj);
      const newSuppliers = suppliersToImport.filter(s => !existingCnpjs.includes(s.cnpj));
      
      if (newSuppliers.length > 0) {
        await db.insert(suppliers).values(newSuppliers);
        console.log(`✓ ${newSuppliers.length} novos fornecedores importados com sucesso!`);
        
        // Mostrar alguns exemplos importados
        console.log("\nExemplos importados:");
        newSuppliers.slice(0, 3).forEach(s => {
          console.log(`- ${s.companyName}`);
          console.log(`  Trade Name: ${s.tradeName}`);
          console.log(`  CNPJ: ${s.cnpj} - Município ID: ${s.municipalityId}`);
        });
      } else {
        console.log("Todos os fornecedores já estão cadastrados no sistema");
      }
    }
    
  } catch (error) {
    console.error("Erro ao importar fornecedores:", error);
  } finally {
    console.log("Importação finalizada.");
    process.exit(0);
  }
}

// Executar a função
importSuppliers();