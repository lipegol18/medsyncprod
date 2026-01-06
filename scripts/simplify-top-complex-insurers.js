import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function simplifyTopComplexInsurers() {
  try {
    await client.connect();
    console.log('Iniciando simplificação das seguradoras mais complexas...');

    // Lista das seguradoras mais problemáticas
    const complexInsurers = ['309222', '350249', '701', '367087'];
    
    let totalRemoved = 0;

    for (const registroAns of complexInsurers) {
      console.log(`\nProcessando seguradora ${registroAns}...`);
      const removed = await simplifyInsurer(registroAns);
      totalRemoved += removed;
      console.log(`Removidos ${removed} planos duplicados`);
    }

    console.log(`\nTotal de planos removidos: ${totalRemoved}`);

    // Verificar resultado final
    const finalStats = await client.query(`
      SELECT registro_ans, COUNT(*) as remaining_plans
      FROM health_insurance_plans 
      WHERE registro_ans = ANY($1) AND situacao = 'Ativo'
      GROUP BY registro_ans
      ORDER BY COUNT(*) DESC
    `, [complexInsurers]);

    console.log('\nPlanos restantes após simplificação:');
    finalStats.rows.forEach(row => {
      console.log(`${row.registro_ans}: ${row.remaining_plans} planos`);
    });

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await client.end();
  }
}

async function simplifyInsurer(registroAns) {
  // Obter nome da seguradora
  const insurerResult = await client.query(`
    SELECT name FROM health_insurance_providers WHERE ans_code = $1
  `, [registroAns]);

  let insurerName = `Seguradora ${registroAns}`;
  if (insurerResult.rows.length > 0) {
    insurerName = insurerResult.rows[0].name
      .replace(/\s+(S\.A\.|LTDA|EIRELI|ME|EPP|ASSISTENCIA|MEDICA|SAUDE|COOPERATIVA|TRABALHO|MÉDICO)(\s|$)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const words = insurerName.split(' ').filter(w => w.length > 2);
    if (words.length > 3) {
      insurerName = words.slice(0, 3).join(' ');
    }
  }

  // Obter todos os planos desta seguradora
  const plansResult = await client.query(`
    SELECT id, nm_plano, segmentacao FROM health_insurance_plans 
    WHERE registro_ans = $1 AND situacao = 'Ativo'
    ORDER BY nm_plano
  `, [registroAns]);

  if (plansResult.rows.length <= 5) {
    return 0; // Já está simplificado
  }

  // Categorizar planos por padrões
  const categories = new Map();
  
  plansResult.rows.forEach(plan => {
    let category = extractCategory(plan.nm_plano, plan.segmentacao);
    
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category).push(plan);
  });

  let removedCount = 0;

  // Simplificar cada categoria
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
      // Normalizar nome do plano único
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

function extractCategory(planName, segmentacao) {
  if (!planName) return 'Básico';

  const name = planName.toLowerCase();
  
  // Categorias por segmentação
  if (segmentacao) {
    const seg = segmentacao.toLowerCase();
    if (seg.includes('ambulatorial') && seg.includes('hospitalar')) {
      if (name.includes('premium') || name.includes('top') || name.includes('vip')) return 'Premium';
      if (name.includes('plus') || name.includes('superior')) return 'Plus';
      return 'Completo';
    } else if (seg.includes('hospitalar')) {
      return 'Hospitalar';
    } else if (seg.includes('ambulatorial')) {
      return 'Ambulatorial';
    } else if (seg.includes('odontológica') || seg.includes('odontologica')) {
      return 'Odontológico';
    }
  }
  
  // Categorias por nome do plano
  if (name.includes('premium') || name.includes('top') || name.includes('vip') || name.includes('superior')) {
    return 'Premium';
  } else if (name.includes('plus') || name.includes('executivo')) {
    return 'Plus';
  } else if (name.includes('empresarial') || name.includes('corporativo')) {
    return 'Empresarial';
  } else if (name.includes('adesão') || name.includes('adesao')) {
    return 'Adesão';
  } else if (name.includes('individual') || name.includes('familiar')) {
    return 'Individual';
  } else if (name.includes('hospitalar')) {
    return 'Hospitalar';
  } else if (name.includes('ambulatorial')) {
    return 'Ambulatorial';
  } else if (name.includes('odonto') || name.includes('dent')) {
    return 'Odontológico';
  } else if (name.includes('flex')) {
    return 'Flex';
  } else if (name.includes('essencial') || name.includes('básico') || name.includes('basico')) {
    return 'Básico';
  }
  
  return 'Padrão';
}

simplifyTopComplexInsurers().catch(console.error);