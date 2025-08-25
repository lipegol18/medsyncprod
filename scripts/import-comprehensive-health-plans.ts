import { db } from "../server/db";
import { healthInsurancePlans } from "../shared/schema";
import { eq, sql } from "drizzle-orm";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

interface ANSPlanData {
  'Registro ANS': string;
  'Número do Plano': string;
  'Nome Comercial do Plano': string;
  'Segmentação': string;
  'Tipo de Contratação': string;
  'Abrangência Geográfica': string;
  'Situação do Plano': string;
  'Data de Registro': string;
  'Faixa Etária Inicial': string;
  'Faixa Etária Final': string;
  'Valor': string;
  'Acomodação': string;
  'Enfermaria': string;
  'Apartamento': string;
  'Data de Início de Comercialização': string;
}

async function importComprehensiveHealthPlans() {
  console.log("🏥 Iniciando importação completa de planos de saúde da ANS...");

  try {
    // Verificar se há arquivo de planos na pasta attached_assets
    const attachedAssetsPath = path.join(process.cwd(), "attached_assets");
    const files = fs.readdirSync(attachedAssetsPath);
    
    // Procurar por arquivos de planos de saúde
    const planFiles = files.filter(file => 
      (file.toLowerCase().includes('plano') || file.toLowerCase().includes('plan')) &&
      (file.endsWith('.xlsx') || file.endsWith('.csv'))
    );

    if (planFiles.length === 0) {
      console.log("ℹ️ Nenhum arquivo de planos encontrado em attached_assets");
      console.log("📋 Criando planos padrão baseados nas operadoras existentes...");
      await createDefaultPlansForExistingProviders();
      return;
    }

    console.log(`📁 Encontrados ${planFiles.length} arquivo(s) de planos: ${planFiles.join(', ')}`);

    for (const fileName of planFiles) {
      const filePath = path.join(attachedAssetsPath, fileName);
      console.log(`📖 Processando arquivo: ${fileName}`);

      let data: ANSPlanData[] = [];

      if (fileName.endsWith('.xlsx')) {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(worksheet);
      } else if (fileName.endsWith('.csv')) {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(worksheet);
      }

      console.log(`📊 Total de registros no arquivo: ${data.length}`);

      let imported = 0;
      let skipped = 0;
      let errors = 0;

      for (const row of data) {
        try {
          if (!row['Registro ANS'] || !row['Número do Plano']) {
            skipped++;
            continue;
          }

          // Verificar se o plano já existe
          const existingPlan = await db
            .select()
            .from(healthInsurancePlans)
            .where(eq(healthInsurancePlans.registroAns, row['Registro ANS']))
            .limit(1);

          if (existingPlan.length > 0) {
            skipped++;
            continue;
          }

          // Mapear os dados do arquivo para o schema do banco
          const planData = {
            registroAns: row['Registro ANS']?.toString() || '',
            cdPlano: row['Número do Plano']?.toString() || '',
            nomeComercial: row['Nome Comercial do Plano']?.toString() || `Plano ${row['Número do Plano']}`,
            segmentacao: row['Segmentação']?.toString() || '',
            tipoContratacao: row['Tipo de Contratação']?.toString() || '',
            abrangenciaGeografica: row['Abrangência Geográfica']?.toString() || '',
            situacao: row['Situação do Plano']?.toString() || '',
            acomodacao: row['Acomodação']?.toString() || '',
            dtInicioComercializacao: row['Data de Início de Comercialização']?.toString() || ''
          };

          await db.insert(healthInsurancePlans).values(planData);
          imported++;

          if (imported % 1000 === 0) {
            console.log(`✅ Importados ${imported} planos...`);
          }

        } catch (error) {
          console.error(`❌ Erro ao importar plano ${row['Número do Plano']}:`, error);
          errors++;
        }
      }

      console.log(`📈 Resumo do arquivo ${fileName}:`);
      console.log(`  ✅ Importados: ${imported}`);
      console.log(`  ⏭️ Ignorados (já existem): ${skipped}`);
      console.log(`  ❌ Erros: ${errors}`);
    }

    console.log("🎉 Importação de planos de saúde concluída!");

  } catch (error) {
    console.error("❌ Erro durante a importação:", error);
  }
}

async function createDefaultPlansForExistingProviders() {
  try {
    console.log("🏗️ Criando planos padrão para operadoras existentes...");

    // Buscar operadoras que não têm planos
    const providersWithoutPlansResult = await db.execute(sql`
      SELECT DISTINCT hp.ans_code, hp.name 
      FROM health_insurance_providers hp
      LEFT JOIN health_insurance_plans pl ON hp.ans_code = pl.registro_ans
      WHERE pl.id IS NULL
      LIMIT 50
    `);

    const providersWithoutPlans = providersWithoutPlansResult.rows;
    console.log(`📋 Encontradas ${providersWithoutPlans.length} operadoras sem planos`);

    const commonPlanTypes = [
      { 
        suffix: "BÁSICO", 
        segmentacao: "Médico-Hospitalar", 
        tipoContratacao: "Individual ou Familiar",
        acomodacao: "Enfermaria",
        abrangencia: "Estadual"
      },
      { 
        suffix: "PREMIUM", 
        segmentacao: "Médico-Hospitalar", 
        tipoContratacao: "Individual ou Familiar",
        acomodacao: "Apartamento",
        abrangencia: "Nacional"
      },
      { 
        suffix: "EMPRESARIAL", 
        segmentacao: "Médico-Hospitalar", 
        tipoContratacao: "Coletivo Empresarial",
        acomodacao: "Enfermaria",
        abrangencia: "Regional"
      }
    ];

    let created = 0;
    
    for (const provider of providersWithoutPlans) {
      const ansCode = provider.ans_code;
      const providerName = provider.name;

      for (let i = 0; i < commonPlanTypes.length; i++) {
        const planType = commonPlanTypes[i];
        
        try {
          const planData = {
            registroAns: ansCode,
            cdPlano: `${ansCode}${String(i + 1).padStart(3, '0')}`,
            nomeComercial: `${providerName} ${planType.suffix}`,
            segmentacao: planType.segmentacao,
            tipoContratacao: planType.tipoContratacao,
            abrangenciaGeografica: planType.abrangencia,
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

    console.log(`✅ Criados ${created} planos padrão`);

  } catch (error) {
    console.error("❌ Erro ao criar planos padrão:", error);
  }
}

// Executar importação se chamado diretamente
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] === __filename) {
  importComprehensiveHealthPlans()
    .then(() => {
      console.log("✅ Script concluído");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Erro no script:", error);
      process.exit(1);
    });
}

export { importComprehensiveHealthPlans };