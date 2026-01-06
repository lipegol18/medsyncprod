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

async function updateProceduresComplete() {
  try {
    await client.connect();
    console.log('📊 Conectado ao banco de dados PostgreSQL');

    // Verificar códigos duplicados antes de começar
    const duplicatesResult = await client.query(`
      SELECT code, COUNT(*) as count 
      FROM procedures 
      GROUP BY code 
      HAVING COUNT(*) > 1
    `);

    if (duplicatesResult.rows.length > 0) {
      console.log('⚠️ ATENÇÃO: Códigos duplicados encontrados na base de dados:');
      duplicatesResult.rows.forEach(row => {
        console.log(`   ${row.code}: ${row.count} registros`);
      });
      
      // Remover duplicatas mantendo apenas o mais recente
      for (const duplicate of duplicatesResult.rows) {
        await client.query(`
          DELETE FROM procedures 
          WHERE code = $1 AND id NOT IN (
            SELECT id FROM procedures 
            WHERE code = $1 
            ORDER BY updated_at DESC, created_at DESC 
            LIMIT 1
          )
        `, [duplicate.code]);
        console.log(`✅ Duplicatas removidas para código: ${duplicate.code}`);
      }
    }

    // Ler o arquivo CSV
    const csvPath = path.join(__dirname, '../attached_assets/cbhpm_toUpdate_1749626440556.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Processar linhas do CSV
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    console.log(`📋 Total de linhas no CSV: ${lines.length}`);

    let updatedCount = 0;
    let insertedCount = 0;
    let errorCount = 0;
    let noChangeCount = 0;
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

      // Validar código
      if (!codigo || codigo.trim() === '') {
        console.log(`⚠️ Linha ${i + 1}: Código vazio`);
        errorCount++;
        errors.push({ line: i + 1, error: 'Código vazio', data: line });
        continue;
      }

      // Converter valores - campos vazios ficam como null
      const numAuxiliares = (numeroAuxiliares === '' || numeroAuxiliares === null) ? null : parseInt(numeroAuxiliares);
      const custoOp = (custoOperacional === '' || custoOperacional === null) ? null : custoOperacional;
      const porteAnest = (porteAnestesia === '' || porteAnestesia === null) ? null : porteAnestesia;

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
            
            // Registrar mudanças específicas
            const changes = {};
            if (existing.name !== nome) changes.name = { old: existing.name, new: nome };
            if (existing.porte !== porte) changes.porte = { old: existing.porte, new: porte };
            if (existing.custo_operacional !== custoOp) changes.custo_operacional = { old: existing.custo_operacional, new: custoOp };
            if (existing.numero_auxiliares !== numAuxiliares) changes.numero_auxiliares = { old: existing.numero_auxiliares, new: numAuxiliares };
            if (existing.porte_anestesista !== porteAnest) changes.porte_anestesista = { old: existing.porte_anestesista, new: porteAnest };

            updateDetails.push({
              code: codigo,
              changes: changes
            });

            console.log(`✅ Atualizado: ${codigo} - ${nome}`);
          } else {
            noChangeCount++;
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

    console.log(`\n🔍 Verificando procedimentos não atualizados...`);
    
    const notUpdatedResult = await client.query(`
      SELECT code, name FROM procedures 
      WHERE code NOT IN (${csvCodes.map((_, index) => `$${index + 1}`).join(',')}) 
      AND active = true
      ORDER BY code
    `, csvCodes);

    // Verificar códigos duplicados finais
    const finalDuplicatesResult = await client.query(`
      SELECT code, COUNT(*) as count 
      FROM procedures 
      GROUP BY code 
      HAVING COUNT(*) > 1
    `);

    // Relatório final
    console.log('\n' + '='.repeat(80));
    console.log('📊 RELATÓRIO FINAL DE ATUALIZAÇÃO COMPLETA');
    console.log('='.repeat(80));
    console.log(`📝 Total de linhas processadas: ${lines.length}`);
    console.log(`✅ Procedimentos atualizados: ${updatedCount}`);
    console.log(`🆕 Procedimentos inseridos: ${insertedCount}`);
    console.log(`➡️ Procedimentos sem alterações: ${noChangeCount}`);
    console.log(`❌ Erros encontrados: ${errorCount}`);
    console.log(`📋 Procedimentos na BD não presentes no CSV: ${notUpdatedResult.rows.length}`);
    console.log(`🔍 Códigos duplicados restantes: ${finalDuplicatesResult.rows.length}`);

    // Salvar relatório detalhado
    const report = {
      summary: {
        totalProcessed: lines.length,
        updated: updatedCount,
        inserted: insertedCount,
        noChanges: noChangeCount,
        errors: errorCount,
        notInCSV: notUpdatedResult.rows.length,
        duplicatesRemaining: finalDuplicatesResult.rows.length
      },
      updateDetails,
      insertDetails,
      errors,
      notUpdatedProcedures: notUpdatedResult.rows,
      duplicatesRemaining: finalDuplicatesResult.rows,
      timestamp: new Date().toISOString()
    };

    const reportPath = path.join(__dirname, '../procedure-update-complete-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Relatório detalhado salvo em: ${reportPath}`);

    // Mostrar alguns exemplos de atualizações
    if (updateDetails.length > 0) {
      console.log('\n📝 EXEMPLOS DE ATUALIZAÇÕES:');
      updateDetails.slice(0, 5).forEach(update => {
        console.log(`\n🔧 ${update.code}:`);
        Object.entries(update.changes).forEach(([field, change]) => {
          console.log(`   ${field}: "${change.old}" → "${change.new}"`);
        });
      });
    }

    // Mostrar códigos duplicados se existirem
    if (finalDuplicatesResult.rows.length > 0) {
      console.log('\n⚠️ CÓDIGOS DUPLICADOS RESTANTES:');
      finalDuplicatesResult.rows.forEach(dup => {
        console.log(`   ${dup.code}: ${dup.count} registros`);
      });
    }

    console.log('\n✅ Processo de atualização completa concluído!');

  } catch (error) {
    console.error('❌ Erro fatal:', error);
  } finally {
    await client.end();
  }
}

// Executar o script
updateProceduresComplete().catch(console.error);

export { updateProceduresComplete };