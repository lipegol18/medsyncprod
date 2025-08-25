import * as XLSX from 'xlsx';
import { db } from '../server/db';
import { healthInsurancePlans, healthInsuranceProviders } from '../shared/schema';
import { eq } from 'drizzle-orm';

interface OperadoraANS {
  'Registro ANS': string;
  'Razão Social': string;
  'Nome Fantasia': string;
  'CNPJ': string;
  'Modalidade': string;
  'Situação': string;
  'Data de Registro': string;
  'UF': string;
  'Município': string;
}

interface PlanoANS {
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
}

async function importFullHealthInsuranceData() {
  try {
    console.log('🔄 Iniciando importação completa dos dados da ANS...');
    
    // Ler arquivo Excel das operadoras
    const operadorasWorkbook = XLSX.readFile('attached_assets/OperadorasSaude_toImport_1749412471325.xlsx');
    const operadorasSheetName = operadorasWorkbook.SheetNames[0];
    const operadorasSheet = operadorasWorkbook.Sheets[operadorasSheetName];
    const operadorasData: OperadoraANS[] = XLSX.utils.sheet_to_json(operadorasSheet);

    console.log(`📊 Encontradas ${operadorasData.length} operadoras no arquivo`);

    // Processar operadoras
    let operadorasImportadas = 0;
    let operadorasAtualizadas = 0;

    for (const operadora of operadorasData) {
      if (!operadora['Registro ANS'] || !operadora['Razão Social']) {
        continue;
      }

      const ansCode = operadora['Registro ANS'].toString().trim();
      const name = operadora['Razão Social'].trim();
      const fantasyName = operadora['Nome Fantasia']?.trim() || '';
      const cnpj = operadora['CNPJ']?.toString().replace(/\D/g, '') || '';
      const modality = operadora['Modalidade']?.trim() || '';
      const status = operadora['Situação']?.trim() || '';
      const registrationDate = operadora['Data de Registro']?.trim() || '';
      const state = operadora['UF']?.trim() || '';
      const city = operadora['Município']?.trim() || '';

      try {
        // Verificar se operadora já existe
        const existingProvider = await db
          .select()
          .from(healthInsuranceProviders)
          .where(eq(healthInsuranceProviders.ansCode, ansCode))
          .limit(1);

        if (existingProvider.length > 0) {
          // Atualizar operadora existente
          await db
            .update(healthInsuranceProviders)
            .set({
              name,
              fantasyName,
              cnpj,
              modality,
              status,
              registrationDate,
              state,
              city,
              updatedAt: new Date().toISOString()
            })
            .where(eq(healthInsuranceProviders.ansCode, ansCode));
          
          operadorasAtualizadas++;
        } else {
          // Inserir nova operadora
          await db.insert(healthInsuranceProviders).values({
            name,
            fantasyName,
            ansCode,
            cnpj,
            modality,
            status,
            registrationDate,
            state,
            city,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          
          operadorasImportadas++;
        }

        if ((operadorasImportadas + operadorasAtualizadas) % 100 === 0) {
          console.log(`📈 Processadas ${operadorasImportadas + operadorasAtualizadas} operadoras...`);
        }
      } catch (error) {
        console.error(`❌ Erro ao processar operadora ${ansCode}:`, error);
      }
    }

    console.log(`✅ Operadoras processadas: ${operadorasImportadas} novas, ${operadorasAtualizadas} atualizadas`);

    // Verificar se existe arquivo de planos para importar
    try {
      // Procurar por arquivo de planos (nome pode variar)
      const planosFiles = [
        'attached_assets/PlanosSaude_ANS_completo.xlsx',
        'attached_assets/planos_saude_ans.xlsx',
        'attached_assets/Planos_ANS.xlsx'
      ];

      let planosData: PlanoANS[] = [];
      
      for (const fileName of planosFiles) {
        try {
          const planosWorkbook = XLSX.readFile(fileName);
          const planosSheetName = planosWorkbook.SheetNames[0];
          const planosSheet = planosWorkbook.Sheets[planosSheetName];
          planosData = XLSX.utils.sheet_to_json(planosSheet);
          console.log(`📊 Encontrados ${planosData.length} planos no arquivo ${fileName}`);
          break;
        } catch (err) {
          // Arquivo não encontrado, continuar para o próximo
          continue;
        }
      }

      if (planosData.length > 0) {
        console.log('🔄 Iniciando importação dos planos de saúde...');
        
        let planosImportados = 0;
        let planosAtualizados = 0;

        for (const plano of planosData) {
          if (!plano['Registro ANS'] || !plano['Número do Plano']) {
            continue;
          }

          const registroAns = plano['Registro ANS'].toString().trim();
          const numeroPlano = plano['Número do Plano'].toString().trim();
          const nomeComercial = plano['Nome Comercial do Plano']?.trim() || '';
          const segmentacao = plano['Segmentação']?.trim() || '';
          const tipoContratacao = plano['Tipo de Contratação']?.trim() || '';
          const abrangencia = plano['Abrangência Geográfica']?.trim() || '';
          const situacao = plano['Situação do Plano']?.trim() || '';
          const dataRegistro = plano['Data de Registro']?.trim() || '';
          const faixaEtariaInicial = plano['Faixa Etária Inicial']?.toString() || '';
          const faixaEtariaFinal = plano['Faixa Etária Final']?.toString() || '';
          const valor = plano['Valor']?.toString() || '';

          try {
            // Verificar se plano já existe
            const existingPlan = await db
              .select()
              .from(healthInsurancePlans)
              .where(eq(healthInsurancePlans.planNumber, numeroPlano))
              .limit(1);

            if (existingPlan.length > 0) {
              // Atualizar plano existente
              await db
                .update(healthInsurancePlans)
                .set({
                  commercialName: nomeComercial,
                  segmentation: segmentacao,
                  contractType: tipoContratacao,
                  geographicScope: abrangencia,
                  status: situacao,
                  registrationDate: dataRegistro,
                  initialAgeRange: faixaEtariaInicial,
                  finalAgeRange: faixaEtariaFinal,
                  value: valor,
                  updatedAt: new Date().toISOString()
                })
                .where(eq(healthInsurancePlans.planNumber, numeroPlano));
              
              planosAtualizados++;
            } else {
              // Inserir novo plano
              await db.insert(healthInsurancePlans).values({
                registroAns,
                planNumber: numeroPlano,
                commercialName: nomeComercial,
                segmentation: segmentacao,
                contractType: tipoContratacao,
                geographicScope: abrangencia,
                status: situacao,
                registrationDate: dataRegistro,
                initialAgeRange: faixaEtariaInicial,
                finalAgeRange: faixaEtariaFinal,
                value: valor,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
              
              planosImportados++;
            }

            if ((planosImportados + planosAtualizados) % 500 === 0) {
              console.log(`📈 Processados ${planosImportados + planosAtualizados} planos...`);
            }
          } catch (error) {
            console.error(`❌ Erro ao processar plano ${numeroPlano}:`, error);
          }
        }

        console.log(`✅ Planos processados: ${planosImportados} novos, ${planosAtualizados} atualizados`);
      } else {
        console.log('ℹ️ Nenhum arquivo de planos encontrado para importação');
      }

    } catch (planosError) {
      console.log('ℹ️ Arquivo de planos não encontrado, importando apenas operadoras');
    }

    // Estatísticas finais
    const totalProviders = await db.select().from(healthInsuranceProviders);
    const totalPlans = await db.select().from(healthInsurancePlans);
    
    console.log('\n📊 ESTATÍSTICAS FINAIS:');
    console.log(`📋 Total de operadoras no banco: ${totalProviders.length}`);
    console.log(`📄 Total de planos no banco: ${totalPlans.length}`);
    console.log('✅ Importação completa finalizada com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante a importação:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  importFullHealthInsuranceData()
    .then(() => {
      console.log('✅ Script finalizado com sucesso');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro no script:', error);
      process.exit(1);
    });
}

export { importFullHealthInsuranceData };