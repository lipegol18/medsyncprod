import fs from 'fs';
import path from 'path';
import pkg from 'pg';
import { fileURLToPath } from 'url';

const { Client } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do banco de dados
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

// Função para processar o CSV e atualizar a base de dados
async function updateProceduresFromCSV() {
  try {
    await client.connect();
    console.log('📊 Conectado ao banco de dados PostgreSQL');

    // Ler o arquivo CSV
    const csvPath = path.join(__dirname, '../attached_assets/cbhpm_toUpdate_1749625422682.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Processar linhas do CSV (remover BOM se existir)
    const lines = csvContent.replace(/^\ufeff/, '').split('\n').filter(line => line.trim());
    
    console.log(`📋 Total de linhas no CSV: ${lines.length}`);

    let updatedCount = 0;
    let insertedCount = 0;
    let errorCount = 0;
    const updateDetails = [];
    const insertDetails = [];
    const errors = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Dividir campos por ponto e vírgula
      const fields = line.split(';');
      
      if (fields.length !== 6) {
        console.log(`⚠️ Linha ${i + 1}: Formato inválido - ${fields.length} campos encontrados`);
        errorCount++;
        errors.push({ line: i + 1, error: 'Formato inválido', data: line });
        continue;
      }

      const [codigo, nome, porte, custoOperacional, numeroAuxiliares, porteAnestesia] = fields;

      // Converter valores
      const numAuxiliares = numeroAuxiliares === '–' || numeroAuxiliares === '' ? null : parseInt(numeroAuxiliares);
      const custoOp = custoOperacional === '–' ? null : custoOperacional;
      const porteAnest = porteAnestesia === '–' ? null : porteAnestesia;

      try {
        // Verificar se o código já existe
        const existingResult = await client.query(
          'SELECT id, name, porte, custo_operacional, numero_auxiliares, porte_anestesista FROM procedures WHERE code = $1',
          [codigo]
        );

        if (existingResult.rows.length > 0) {
          // Procedimento existe - verificar se precisa atualizar
          const existing = existingResult.rows[0];
          const needsUpdate = 
            existing.name !== nome ||
            existing.porte !== porte ||
            existing.custo_operacional !== custoOp ||
            existing.numero_auxiliares !== numAuxiliares ||
            existing.porte_anestesista !== porteAnest;

          if (needsUpdate) {
            // Atualizar procedimento existente
            await client.query(`
              UPDATE procedures 
              SET name = $1, porte = $2, custo_operacional = $3, 
                  numero_auxiliares = $4, porte_anestesista = $5, updated_at = CURRENT_TIMESTAMP
              WHERE code = $6
            `, [nome, porte, custoOp, numAuxiliares, porteAnest, codigo]);

            updatedCount++;
            updateDetails.push({
              code: codigo,
              changes: {
                name: { old: existing.name, new: nome },
                porte: { old: existing.porte, new: porte },
                custo_operacional: { old: existing.custo_operacional, new: custoOp },
                numero_auxiliares: { old: existing.numero_auxiliares, new: numAuxiliares },
                porte_anestesista: { old: existing.porte_anestesista, new: porteAnest }
              }
            });

            console.log(`✅ Atualizado: ${codigo} - ${nome}`);
          } else {
            console.log(`➡️ Sem alterações: ${codigo} - ${nome}`);
          }
        } else {
          // Procedimento não existe - inserir novo
          await client.query(`
            INSERT INTO procedures (code, name, porte, custo_operacional, numero_auxiliares, porte_anestesista, active)
            VALUES ($1, $2, $3, $4, $5, $6, true)
          `, [codigo, nome, porte, custoOp, numAuxiliares, porteAnest]);

          insertedCount++;
          insertDetails.push({
            code: codigo,
            name: nome,
            porte: porte,
            custo_operacional: custoOp,
            numero_auxiliares: numAuxiliares,
            porte_anestesista: porteAnest
          });

          console.log(`🆕 Inserido: ${codigo} - ${nome}`);
        }

      } catch (error) {
        console.error(`❌ Erro ao processar linha ${i + 1}: ${error.message}`);
        errorCount++;
        errors.push({ line: i + 1, error: error.message, data: line });
      }
    }

    // Buscar procedimentos que não foram atualizados
    const csvCodes = lines.map(line => {
      const fields = line.split(';');
      return fields[0];
    }).filter(code => code && code.trim());

    const notUpdatedResult = await client.query(`
      SELECT code, name FROM procedures 
      WHERE code NOT IN (${csvCodes.map((_, index) => `$${index + 1}`).join(',')}) 
      AND active = true
      ORDER BY code
    `, csvCodes);

    // Relatório final
    console.log('\n' + '='.repeat(80));
    console.log('📊 RELATÓRIO FINAL DE ATUALIZAÇÃO');
    console.log('='.repeat(80));
    console.log(`📝 Total de linhas processadas: ${lines.length}`);
    console.log(`✅ Procedimentos atualizados: ${updatedCount}`);
    console.log(`🆕 Procedimentos inseridos: ${insertedCount}`);
    console.log(`❌ Erros encontrados: ${errorCount}`);
    console.log(`📋 Procedimentos não atualizados (existem na BD mas não no CSV): ${notUpdatedResult.rows.length}`);

    // Salvar relatório detalhado
    const report = {
      summary: {
        totalProcessed: lines.length,
        updated: updatedCount,
        inserted: insertedCount,
        errors: errorCount,
        notUpdated: notUpdatedResult.rows.length
      },
      updateDetails,
      insertDetails,
      errors,
      notUpdatedProcedures: notUpdatedResult.rows,
      timestamp: new Date().toISOString()
    };

    const reportPath = path.join(__dirname, '../procedure-update-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Relatório detalhado salvo em: ${reportPath}`);

    // Mostrar alguns exemplos de atualizações
    if (updateDetails.length > 0) {
      console.log('\n📝 EXEMPLOS DE ATUALIZAÇÕES:');
      updateDetails.slice(0, 5).forEach(update => {
        console.log(`\n🔧 ${update.code}:`);
        Object.entries(update.changes).forEach(([field, change]) => {
          if (change.old !== change.new) {
            console.log(`   ${field}: "${change.old}" → "${change.new}"`);
          }
        });
      });
    }

    // Mostrar procedimentos não atualizados
    if (notUpdatedResult.rows.length > 0) {
      console.log('\n📋 PROCEDIMENTOS NÃO ATUALIZADOS (primeiros 10):');
      notUpdatedResult.rows.slice(0, 10).forEach(proc => {
        console.log(`   ${proc.code} - ${proc.name}`);
      });
      if (notUpdatedResult.rows.length > 10) {
        console.log(`   ... e mais ${notUpdatedResult.rows.length - 10} procedimentos`);
      }
    }

    console.log('\n✅ Processo concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro fatal:', error);
  } finally {
    await client.end();
  }
}

// Executar o script
updateProceduresFromCSV().catch(console.error);

export { updateProceduresFromCSV };