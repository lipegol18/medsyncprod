import { db } from "../server/db";
import { healthInsurancePlans } from "../shared/schema";
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";

interface HealthPlanCSVData {
  registro_ans?: string;
  cd_plano?: string;
  nm_plano?: string;
  modalidade?: string;
  segmentacao?: string;
  acomodacao?: string;
  tipo_contratacao?: string;
  abrangencia_geografica?: string;
  situacao?: string;
  dt_inicio_comercializacao?: string;
}

async function importHealthInsurancePlansFromCSV() {
  try {
    console.log("🏥 Iniciando importação de planos de saúde de CSV...");

    // Buscar arquivos CSV relacionados a planos de saúde
    const csvFiles = [
      "attached_assets/planos_saude.csv",
      "attached_assets/health_insurance_plans.csv",
      "attached_assets/plans.csv"
    ];

    let csvFile = null;
    for (const file of csvFiles) {
      if (fs.existsSync(file)) {
        csvFile = file;
        break;
      }
    }

    if (!csvFile) {
      console.log("❌ Nenhum arquivo CSV de planos encontrado");
      console.log("📝 Criando planos de teste baseados nas operadoras existentes...");
      await createTestPlans();
      return;
    }

    console.log(`📁 Processando arquivo: ${csvFile}`);
    
    const csvContent = fs.readFileSync(csvFile, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ',',
      quote: '"',
      escape: '"'
    });

    console.log(`📊 Encontrados ${records.length} registros no CSV`);

    let imported = 0;
    let skipped = 0;

    for (const record of records) {
      try {
        // Mapear campos do CSV para o schema
        const planData: any = {
          registroAns: record.registro_ans || record.ans_code || record.codigo_ans || '',
          cdPlano: record.cd_plano || record.plan_code || record.codigo_plano || '',
          nmPlano: record.nm_plano || record.nome_plano || record.plan_name || record.nome || '',
          modalidade: record.modalidade || record.modality || '',
          segmentacao: record.segmentacao || record.segmentation || '',
          acomodacao: record.acomodacao || record.accommodation || '',
          tipoContratacao: record.tipo_contratacao || record.contract_type || '',
          abrangenciaGeografica: record.abrangencia_geografica || record.geographic_coverage || '',
          situacao: record.situacao || record.status || 'Ativo',
          dtInicioComercializacao: record.dt_inicio_comercializacao || record.commercialization_date || ''
        };

        // Validar campos obrigatórios
        if (!planData.registroAns || !planData.cdPlano) {
          console.log(`⚠️ Pulando registro sem código ANS ou código do plano`);
          skipped++;
          continue;
        }

        // Garantir que nm_plano tenha um valor
        if (!planData.nmPlano || planData.nmPlano.trim() === '') {
          planData.nmPlano = `Plano ${planData.cdPlano}`;
        }

        await db.insert(healthInsurancePlans).values(planData);
        imported++;

        if (imported % 50 === 0) {
          console.log(`📈 Processados ${imported} planos...`);
        }

      } catch (error) {
        console.error(`❌ Erro ao importar plano:`, error);
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

async function createTestPlans() {
  try {
    console.log("🏗️ Criando planos de teste para operadoras existentes...");

    // Buscar algumas operadoras para criar planos de teste
    const providers = await db.execute(`
      SELECT ans_code, name 
      FROM health_insurance_providers 
      LIMIT 10
    `);

    if (!providers.rows || providers.rows.length === 0) {
      console.log("⚠️ Nenhuma operadora encontrada para criar planos");
      return;
    }

    const planTypes = [
      {
        suffix: "BÁSICO",
        segmentacao: "Médico-Hospitalar",
        tipoContratacao: "Individual ou Familiar",
        acomodacao: "Enfermaria"
      },
      {
        suffix: "PREMIUM",
        segmentacao: "Médico-Hospitalar",
        tipoContratacao: "Individual ou Familiar", 
        acomodacao: "Apartamento"
      },
      {
        suffix: "EMPRESARIAL",
        segmentacao: "Médico-Hospitalar",
        tipoContratacao: "Coletivo Empresarial",
        acomodacao: "Enfermaria"
      }
    ];

    let created = 0;

    for (const provider of providers.rows) {
      const ansCode = provider.ans_code;
      const providerName = provider.name;

      for (let i = 0; i < planTypes.length; i++) {
        const planType = planTypes[i];
        
        try {
          const planData = {
            registroAns: ansCode,
            cdPlano: `${ansCode}${String(i + 1).padStart(3, '0')}`,
            nmPlano: `${providerName} - ${planType.suffix}`,
            segmentacao: planType.segmentacao,
            tipoContratacao: planType.tipoContratacao,
            abrangenciaGeografica: "Regional",
            situacao: "Ativo",
            acomodacao: planType.acomodacao,
            dtInicioComercializacao: new Date().toISOString().split('T')[0]
          };

          await db.insert(healthInsurancePlans).values(planData);
          created++;

        } catch (error) {
          console.error(`❌ Erro ao criar plano para ${providerName}:`, error);
        }
      }
    }

    console.log(`✅ Criados ${created} planos de teste`);

  } catch (error) {
    console.error("❌ Erro ao criar planos de teste:", error);
  }
}

// Executar importação se chamado diretamente
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  importHealthInsurancePlansFromCSV()
    .then(() => {
      console.log("✅ Script concluído");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Erro no script:", error);
      process.exit(1);
    });
}

export { importHealthInsurancePlansFromCSV };