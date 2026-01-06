import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { healthInsurancePlans, healthInsuranceProviders } from "../shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const client = postgres(connectionString);
const db = drizzle(client);

// Função para normalizar texto removendo acentos
function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

async function importHealthInsurancePlans() {
  try {
    console.log("Iniciando importação de planos de saúde...");

    // Ler o arquivo CSV
    const csvPath = path.join(process.cwd(), "attached_assets", "Lista_Planos_toImport_1749426735010.csv");
    const csvContent = fs.readFileSync(csvPath, "utf-8");
    const lines = csvContent.split("\n");
    
    // Remover header e linhas vazias
    const dataLines = lines.slice(1).filter(line => line.trim() !== "");
    
    console.log(`Processando ${dataLines.length} planos de saúde...`);

    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const batchSize = 1000;
    let batch = [];

    // Buscar todas as operadoras existentes para verificação rápida
    const existingProviders = await db.select({ ansCode: healthInsuranceProviders.ansCode }).from(healthInsuranceProviders);
    const providerCodes = new Set(existingProviders.map(p => p.ansCode));

    // Buscar todos os planos existentes para verificação rápida
    const existingPlans = await db.select({ cdPlano: healthInsurancePlans.cdPlano }).from(healthInsurancePlans);
    const existingPlanCodes = new Set(existingPlans.map(p => p.cdPlano));

    console.log(`Operadoras disponíveis: ${providerCodes.size}`);
    console.log(`Planos já existentes: ${existingPlanCodes.size}`);

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      
      try {
        const columns = line.split(";");
        
        if (columns.length < 25) {
          skippedCount++;
          continue;
        }

        const [
          idPlano,
          cdPlano,
          nmPlano,
          registroOperadora,
          razaoSocial,
          grModalidade,
          porteOperadora,
          vigenciaPlano,
          contratacao,
          grContratacao,
          sgmtAssistencial,
          grSgmtAssistencial,
          lgOdontologico,
          obstetricia,
          cobertura,
          tipoFinanciamento,
          abrangenciaCobertura,
          idGeoCobertura,
          fatorModerador,
          acomodacaoHospitalar,
          livreEscolha,
          situacaoPlano,
          dtSituacao,
          dtRegistroPlano,
          dtAtualizacao
        ] = columns;

        const planCode = cdPlano.trim();
        const providerCode = registroOperadora.trim();

        // Verificação rápida se operadora existe
        if (!providerCodes.has(providerCode)) {
          skippedCount++;
          continue;
        }

        // Verificação rápida se plano já existe
        if (existingPlanCodes.has(planCode)) {
          skippedCount++;
          continue;
        }

        // Preparar dados para inserção
        const planData = {
          registroAns: providerCode,
          cdPlano: planCode,
          nmPlano: nmPlano.trim() || null,
          commercialName: nmPlano.trim() || null,
          commercialNameNormalized: normalizeText(nmPlano.trim() || ""),
          modalidade: grModalidade.trim() || null,
          contratacao: contratacao.trim() || null,
          segmentacao: sgmtAssistencial.trim() || null,
          cobertura: cobertura.trim() || null,
          situacao: situacaoPlano.trim() || null,
          createdAt: new Date()
        };

        batch.push(planData);
        existingPlanCodes.add(planCode); // Adicionar ao conjunto para evitar duplicatas no mesmo lote

        // Inserir em lotes
        if (batch.length >= batchSize) {
          await db.insert(healthInsurancePlans).values(batch);
          importedCount += batch.length;
          console.log(`Importados ${importedCount} planos...`);
          batch = [];
        }

      } catch (error) {
        console.error(`Erro ao processar linha ${i + 1}: ${line.substring(0, 100)}...`, error);
        errorCount++;
      }
    }

    // Inserir o último lote se houver dados restantes
    if (batch.length > 0) {
      await db.insert(healthInsurancePlans).values(batch);
      importedCount += batch.length;
      console.log(`Importados ${importedCount} planos (lote final)...`);
    }

    console.log("\n=== RELATÓRIO DE IMPORTAÇÃO ===");
    console.log(`✅ Planos importados: ${importedCount}`);
    console.log(`⏭️  Planos ignorados: ${skippedCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`📊 Total processado: ${importedCount + skippedCount + errorCount}`);

  } catch (error) {
    console.error("Erro durante a importação:", error);
  } finally {
    await client.end();
  }
}

// Executar diretamente
importHealthInsurancePlans().catch(console.error);