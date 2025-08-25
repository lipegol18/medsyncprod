import { db } from "../server/db";
import { suppliers } from "../shared/schema";
import { eq } from "drizzle-orm";
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

async function seedFornecedores() {
  console.log("Iniciando importação dos fornecedores do Rio de Janeiro...");
  
  try {
    // Verificar se a tabela já possui fornecedores
    const fornecedoresExistentes = await db.select().from(suppliers);
    
    if (fornecedoresExistentes.length > 0) {
      console.log(`A tabela já possui ${fornecedoresExistentes.length} fornecedores. Pulando importação.`);
      return;
    }
    
    // Ler o arquivo CSV
    const csvFilePath = path.resolve(__dirname, '../attached_assets/fornecedores_rj_total.csv');
    const fileContent = fs.readFileSync(csvFilePath, { encoding: 'utf-8' });
    
    // Parsear o conteúdo do CSV
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    // Preparar os dados para importação
    const fornecedores = records.map((record: any) => {
      // Gerar um CNPJ fake para registros sem CNPJ (já que é obrigatório)
      const cnpj = record.cnpj || generateFakeCNPJ();
      
      return {
        companyName: record.company_name,
        tradeName: record.trade_name,
        cnpj: cnpj,
        municipalityId: parseInt(record.municipality_id) || 1, // Usando 1 (Rio de Janeiro) como padrão
        address: record.address || '',
        neighborhood: record.neighborhood || '',
        postalCode: record.postal_code || '',
        phone: record.phone || '',
        email: record.email || '',
        website: record.website || '',
        anvisaCode: record.anvisa_code || '',
        active: record.active?.toLowerCase() === 'true'
      };
    });
    
    // Inserir os fornecedores no banco de dados
    if (fornecedores.length > 0) {
      await db.insert(suppliers).values(fornecedores);
      console.log(`Sucesso! ${fornecedores.length} fornecedores foram importados.`);
    } else {
      console.log("Nenhum fornecedor encontrado no arquivo CSV.");
    }
  } catch (error) {
    console.error("Erro ao importar fornecedores:", error);
  } finally {
    console.log("Operação de importação finalizada.");
    process.exit(0);
  }
}

// Função auxiliar para gerar um CNPJ fictício
function generateFakeCNPJ(): string {
  const base = Math.floor(10000000000000 + Math.random() * 90000000000000).toString();
  return base.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

// Executar a função de importação
seedFornecedores();