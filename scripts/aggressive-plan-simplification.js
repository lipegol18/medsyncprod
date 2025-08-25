import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function aggressivePlanSimplification() {
  try {
    await client.connect();
    console.log('Conectado ao banco de dados');

    // Processar todas as seguradoras com muitos planos
    const insurersResult = await client.query(`
      SELECT registro_ans, COUNT(*) as plan_count
      FROM health_insurance_plans 
      WHERE situacao = 'Ativo'
      GROUP BY registro_ans
      HAVING COUNT(*) > 3
      ORDER BY plan_count DESC
    `);

    console.log(`Processando ${insurersResult.rows.length} seguradoras`);

    let totalRemoved = 0;

    for (const insurer of insurersResult.rows) {
      const removed = await simplifyInsurerPlans(insurer.registro_ans);
      totalRemoved += removed;
      
      if (removed > 0) {
        console.log(`${insurer.registro_ans}: removidos ${removed} planos`);
      }
    }

    console.log(`\nTotal de planos removidos: ${totalRemoved}`);

    // Estatísticas finais
    const finalStats = await client.query(`
      SELECT COUNT(*) as total_plans FROM health_insurance_plans WHERE situacao = 'Ativo'
    `);

    console.log(`Planos restantes: ${finalStats.rows[0].total_plans}`);

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await client.end();
  }
}

async function simplifyInsurerPlans(registroAns) {
  // Obter nome da seguradora
  const insurerResult = await client.query(`
    SELECT name FROM health_insurance_providers WHERE ans_code = $1
  `, [registroAns]);

  let insurerName = registroAns;
  if (insurerResult.rows.length > 0) {
    insurerName = insurerResult.rows[0].name
      .replace(/\s+(S\.A\.|LTDA|EIRELI|ME|EPP|ASSISTENCIA|MEDICA|SAUDE)(\s|$)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Pegar apenas as primeiras palavras significativas
    const words = insurerName.split(' ').filter(w => w.length > 2);
    if (words.length > 2) {
      insurerName = words.slice(0, 2).join(' ');
    }
  }

  // Obter todos os planos desta seguradora
  const plansResult = await client.query(`
    SELECT id, nm_plano, segmentacao FROM health_insurance_plans 
    WHERE registro_ans = $1 AND situacao = 'Ativo'
    ORDER BY nm_plano
  `, [registroAns]);

  if (plansResult.rows.length <= 3) {
    return 0; // Não mexer se já tem poucos planos
  }

  // Criar categorias básicas baseadas na segmentação
  const categories = new Map();
  
  plansResult.rows.forEach(plan => {
    let category = 'Básico';
    
    if (plan.segmentacao) {
      const seg = plan.segmentacao.toLowerCase();
      if (seg.includes('ambulatorial') && seg.includes('hospitalar')) {
        category = 'Completo';
      } else if (seg.includes('hospitalar')) {
        category = 'Hospitalar';
      } else if (seg.includes('ambulatorial')) {
        category = 'Ambulatorial';
      } else if (seg.includes('odontológica') || seg.includes('odontologica')) {
        category = 'Odontológico';
      } else if (seg.includes('referência') || seg.includes('referencia')) {
        category = 'Referência';
      }
    }
    
    // Ajustar categoria com base no nome do plano
    const planName = plan.nm_plano.toLowerCase();
    if (planName.includes('premium') || planName.includes('top')) {
      category = 'Premium';
    } else if (planName.includes('executivo')) {
      category = 'Executivo';
    } else if (planName.includes('plus')) {
      category = 'Plus';
    } else if (planName.includes('hospitalar')) {
      category = 'Hospitalar';
    } else if (planName.includes('ambulatorial')) {
      category = 'Ambulatorial';
    } else if (planName.includes('odonto') || planName.includes('dent')) {
      category = 'Odontológico';
    }

    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category).push(plan);
  });

  let removedCount = 0;

  // Para cada categoria, manter apenas um plano
  for (const [category, plans] of categories) {
    if (plans.length > 1) {
      // Manter o primeiro plano e renomear
      const keepPlan = plans[0];
      const newName = `${insurerName} ${category}`;
      
      await client.query(`
        UPDATE health_insurance_plans 
        SET nm_plano = $1 
        WHERE id = $2
      `, [newName, keepPlan.id]);

      // Remover os outros planos da categoria
      const idsToRemove = plans.slice(1).map(p => p.id);
      
      await client.query(`
        DELETE FROM health_insurance_plans 
        WHERE id = ANY($1)
      `, [idsToRemove]);

      removedCount += idsToRemove.length;
    } else {
      // Mesmo para plano único, normalizar o nome
      const plan = plans[0];
      const newName = `${insurerName} ${category}`;
      
      await client.query(`
        UPDATE health_insurance_plans 
        SET nm_plano = $1 
        WHERE id = $2
      `, [newName, plan.id]);
    }
  }

  return removedCount;
}

aggressivePlanSimplification().catch(console.error);