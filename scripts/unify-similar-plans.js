import pkg from 'pg';
import { fileURLToPath } from 'url';

const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function unifySimilarPlans() {
  try {
    await client.connect();
    console.log('Conectado ao banco de dados');

    // Estratégia de unificação para registro ANS 424048 (NC)
    await unifyNCPlans();

    // Estratégia de unificação para registro ANS 5711 (Bradesco)
    await unifyBradescoPlans();

    console.log('Unificação concluída!');

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await client.end();
  }
}

async function unifyNCPlans() {
  console.log('\n=== UNIFICANDO PLANOS NC (424048) ===');
  
  // Manter apenas um plano de cada categoria principal
  const plansToKeep = [
    { pattern: 'NC ADESÃO', newName: 'NC ADESÃO' },
    { pattern: 'NC ESPECIAL', newName: 'NC ESPECIAL' },
    { pattern: 'NC EXECUTIVO', newName: 'NC EXECUTIVO' }
  ];

  for (const plan of plansToKeep) {
    // Encontrar todos os planos similares
    const similarPlans = await client.query(`
      SELECT id, nm_plano FROM health_insurance_plans 
      WHERE registro_ans = '424048' 
      AND nm_plano LIKE $1
      ORDER BY id
    `, [`${plan.pattern}%`]);

    if (similarPlans.rows.length > 0) {
      // Manter o primeiro e renomear
      const keepPlan = similarPlans.rows[0];
      
      await client.query(`
        UPDATE health_insurance_plans 
        SET nm_plano = $1 
        WHERE id = $2
      `, [plan.newName, keepPlan.id]);

      console.log(`Mantido: ${plan.newName} (ID: ${keepPlan.id})`);

      // Remover os demais
      if (similarPlans.rows.length > 1) {
        const idsToRemove = similarPlans.rows.slice(1).map(row => row.id);
        
        await client.query(`
          DELETE FROM health_insurance_plans 
          WHERE id = ANY($1)
        `, [idsToRemove]);

        console.log(`Removidos ${idsToRemove.length} planos similares de ${plan.pattern}`);
      }
    }
  }
}

async function unifyBradescoPlans() {
  console.log('\n=== UNIFICANDO PLANOS BRADESCO (5711) ===');
  
  // Categorias principais do Bradesco para manter
  const mainCategories = [
    { pattern: 'Bradesco Saúde 1+', newName: 'Bradesco Saúde 1+' },
    { pattern: 'Bradesco Saúde Efetivo III', newName: 'Bradesco Saúde Efetivo III' },
    { pattern: 'Bradesco Saúde Efetivo IV', newName: 'Bradesco Saúde Efetivo IV' },
    { pattern: 'Bradesco Saúde Hospitalar Nacional', newName: 'Bradesco Saúde Hospitalar Nacional' },
    { pattern: 'Bradesco Saúde Hospitalar NPlus', newName: 'Bradesco Saúde Hospitalar NPlus' },
    { pattern: 'Bradesco Saúde Top', newName: 'Bradesco Saúde Top' },
    { pattern: 'Bradesco Saúde Clinic', newName: 'Bradesco Saúde Clinic' },
    { pattern: 'Bradesco Saúde Nacional', newName: 'Bradesco Saúde Nacional' },
    { pattern: 'Bradesco Saúde Efetivo', newName: 'Bradesco Saúde Efetivo' }
  ];

  for (const category of mainCategories) {
    // Encontrar planos que começam com este padrão
    const matchingPlans = await client.query(`
      SELECT id, nm_plano, situacao FROM health_insurance_plans 
      WHERE registro_ans = '5711' 
      AND nm_plano LIKE $1
      AND situacao = 'Ativo'
      ORDER BY id
    `, [`${category.pattern}%`]);

    if (matchingPlans.rows.length > 0) {
      // Manter apenas o primeiro plano ativo
      const keepPlan = matchingPlans.rows[0];
      
      await client.query(`
        UPDATE health_insurance_plans 
        SET nm_plano = $1 
        WHERE id = $2
      `, [category.newName, keepPlan.id]);

      console.log(`Mantido: ${category.newName} (ID: ${keepPlan.id})`);

      // Remover os outros da mesma categoria
      if (matchingPlans.rows.length > 1) {
        const idsToRemove = matchingPlans.rows.slice(1).map(row => row.id);
        
        await client.query(`
          DELETE FROM health_insurance_plans 
          WHERE id = ANY($1)
        `, [idsToRemove]);

        console.log(`Removidos ${idsToRemove.length} planos similares de ${category.pattern}`);
      }
    }
  }

  // Remover todos os planos suspensos do Bradesco
  const suspendedResult = await client.query(`
    DELETE FROM health_insurance_plans 
    WHERE registro_ans = '5711' 
    AND situacao = 'Suspenso'
  `);

  console.log(`Removidos ${suspendedResult.rowCount} planos suspensos do Bradesco`);

  // Tratar planos numerados (ex: "Bradesco Saúde 106", "107", etc.)
  const numberedPlans = await client.query(`
    SELECT id, nm_plano FROM health_insurance_plans 
    WHERE registro_ans = '5711' 
    AND nm_plano ~ '^Bradesco Saúde [0-9]+'
    AND situacao = 'Ativo'
    ORDER BY nm_plano
  `);

  if (numberedPlans.rows.length > 0) {
    // Manter apenas um representante dos planos numerados
    const keepPlan = numberedPlans.rows[0];
    
    await client.query(`
      UPDATE health_insurance_plans 
      SET nm_plano = 'Bradesco Saúde Numerado' 
      WHERE id = $1
    `, [keepPlan.id]);

    console.log(`Mantido: Bradesco Saúde Numerado (ID: ${keepPlan.id})`);

    // Remover os outros planos numerados
    if (numberedPlans.rows.length > 1) {
      const idsToRemove = numberedPlans.rows.slice(1).map(row => row.id);
      
      await client.query(`
        DELETE FROM health_insurance_plans 
        WHERE id = ANY($1)
      `, [idsToRemove]);

      console.log(`Removidos ${idsToRemove.length} outros planos numerados`);
    }
  }
}

// Executar o script
unifySimilarPlans().catch(console.error);

export { unifySimilarPlans };