import { db } from "../server/db";
import { healthInsurancePlans } from "../shared/schema";
import * as fs from "fs";
import { parse } from "csv-parse/sync";

async function importHealthPlansFromCSV() {
  try {
    console.log("🏥 Importando planos de saúde do CSV...");

    const csvFile = "attached_assets/lista_reduzida_teste_1749418608027.csv";
    
    if (!fs.existsSync(csvFile)) {
      throw new Error(`Arquivo não encontrado: ${csvFile}`);
    }

    console.log(`📁 Processando arquivo: ${csvFile}`);
    
    const csvContent = fs.readFileSync(csvFile, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ';',
      quote: '"',
      escape: '"'
    });

    console.log(`📊 Encontrados ${records.length} registros no CSV`);

    let imported = 0;
    let skipped = 0;

    for (const record of records) {
      try {
        // Mapear campos do CSV para o schema
        const planData = {
          registroAns: record.REGISTRO_OPERADORA || '',
          cdPlano: record.CD_PLANO || '',
          nmPlano: record.NM_PLANO || '',
          modalidade: record.GR_MODALIDADE || '',
          segmentacao: record.SGMT_ASSISTENCIAL || '',
          acomodacao: record.ACOMODACAO_HOSPITALAR || '',
          tipoContratacao: record.CONTRATACAO || '',
          abrangenciaGeografica: record.ABRANGENCIA_COBERTURA || '',
          situacao: record.SITUACAO_PLANO || '',
          dtInicioComercializacao: record.DT_REGISTRO_PLANO || ''
        };

        // Validar campos obrigatórios
        if (!planData.registroAns || !planData.cdPlano) {
          console.log(`⚠️ Pulando registro sem código ANS ou código do plano: ${planData.nmPlano}`);
          skipped++;
          continue;
        }

        // Garantir que nm_plano tenha um valor
        if (!planData.nmPlano || planData.nmPlano.trim() === '') {
          planData.nmPlano = `Plano ${planData.cdPlano}`;
        }

        await db.insert(healthInsurancePlans).values(planData);
        imported++;

        if (imported % 10 === 0) {
          console.log(`📈 Processados ${imported} planos...`);
        }

      } catch (error) {
        console.error(`❌ Erro ao importar plano ${record.NM_PLANO}:`, error);
        skipped++;
      }
    }

    console.log(`✅ Importação concluída:`);
    console.log(`   📊 Total processados: ${records.length}`);
    console.log(`   ✅ Importados: ${imported}`);
    console.log(`   ⚠️ Pulados: ${skipped}`);

  } catch (error) {
    console.error("❌ Erro na importação:", error);
    throw error;
  }
}

// Executar importação se chamado diretamente
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  importHealthPlansFromCSV()
    .then(() => {
      console.log("✅ Script concluído");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Erro no script:", error);
      process.exit(1);
    });
}

export { importHealthPlansFromCSV };