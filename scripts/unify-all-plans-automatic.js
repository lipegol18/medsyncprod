import pkg from 'pg';
import { fileURLToPath } from 'url';

const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

// Função para normalizar nomes de planos
function normalizePlanName(planName) {
  if (!planName) return '';
  
  // Remover caracteres especiais e espaços extras
  let normalized = planName
    .replace(/["""]/g, '') // Remover aspas
    .replace(/\s+/g, ' ') // Normalizar espaços
    .trim();

  // Padrões de simplificação
  const patterns = [
    // Remover variações numéricas e códigos
    { pattern: /\s+(I{1,4}|V|VI{1,3}|IX|X)(\s|$)/, replacement: '' },
    { pattern: /\s+\d+(\s|$)/, replacement: '' },
    { pattern: /\s+[A-Z]\d*(\s|$)/, replacement: '' },
    { pattern: /\s+R\d+(\s|$)/, replacement: '' },
    
    // Remover especificações detalhadas
    { pattern: /\s+copart(\s|$)/, replacement: '' },
    { pattern: /\s+sem obst(\s|$)/, replacement: '' },
    { pattern: /\s+SPP(\s|$)/, replacement: '' },
    { pattern: /\s+CO(\s|$)/, replacement: '' },
    { pattern: /\s+CA(\s|$)/, replacement: '' },
    { pattern: /\s+CE(\s|$)/, replacement: '' },
    { pattern: /\s+Nacional(\s|$)/, replacement: ' Nacional' },
    
    // Remover códigos específicos no final
    { pattern: /\s+[A-Z]+\d*$/, replacement: '' },
    { pattern: /\s+\d+$/, replacement: '' }
  ];

  // Aplicar padrões de limpeza
  patterns.forEach(({ pattern, replacement }) => {
    normalized = normalized.replace(pattern, replacement);
  });

  // Limpar espaços extras finais
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

// Função para extrair categoria base do plano
function extractBaseCategory(planName) {
  if (!planName) return 'Plano Básico';

  const name = planName.toLowerCase();
  
  // Categorias específicas conhecidas
  if (name.includes('executivo')) return 'Executivo';
  if (name.includes('especial')) return 'Especial';
  if (name.includes('adesão') || name.includes('adesao')) return 'Adesão';
  if (name.includes('efetivo')) return 'Efetivo';
  if (name.includes('hospitalar')) return 'Hospitalar';
  if (name.includes('ambulatorial')) return 'Ambulatorial';
  if (name.includes('clinic')) return 'Clinic';
  if (name.includes('top')) return 'Top';
  if (name.includes('plus') || name.includes('nplus')) return 'Plus';
  if (name.includes('premium')) return 'Premium';
  if (name.includes('master')) return 'Master';
  if (name.includes('gold')) return 'Gold';
  if (name.includes('silver')) return 'Silver';
  if (name.includes('bronze')) return 'Bronze';
  if (name.includes('basico') || name.includes('básico')) return 'Básico';
  if (name.includes('standard')) return 'Standard';
  if (name.includes('family')) return 'Familiar';
  if (name.includes('empresarial')) return 'Empresarial';
  if (name.includes('individual')) return 'Individual';
  
  // Se não encontrar categoria específica, usar primeira palavra significativa
  const words = planName.split(' ').filter(word => 
    word.length > 2 && 
    !['saúde', 'saude', 'plano', 'de', 'da', 'do', 'com', 'sem'].includes(word.toLowerCase())
  );
  
  if (words.length > 0) {
    return words[0];
  }
  
  return 'Básico';
}

async function unifyAllPlansAutomatic() {
  try {
    await client.connect();
    console.log('📊 Conectado ao banco de dados');

    // Obter todas as seguradoras distintas
    const insurersResult = await client.query(`
      SELECT DISTINCT registro_ans, COUNT(*) as plan_count
      FROM health_insurance_plans 
      WHERE situacao = 'Ativo'
      GROUP BY registro_ans
      HAVING COUNT(*) > 5
      ORDER BY plan_count DESC
    `);

    console.log(`🏢 Encontradas ${insurersResult.rows.length} seguradoras com mais de 5 planos ativos`);

    let totalProcessed = 0;
    let totalRemoved = 0;

    for (const insurer of insurersResult.rows) {
      console.log(`\n=== PROCESSANDO SEGURADORA ${insurer.registro_ans} (${insurer.plan_count} planos) ===`);
      
      const result = await processInsurerPlans(insurer.registro_ans);
      totalProcessed += result.processed;
      totalRemoved += result.removed;
    }

    console.log('\n' + '='.repeat(80));
    console.log('📈 RELATÓRIO FINAL DE UNIFICAÇÃO');
    console.log('='.repeat(80));
    console.log(`🏢 Seguradoras processadas: ${insurersResult.rows.length}`);
    console.log(`📋 Planos processados: ${totalProcessed}`);
    console.log(`🗑️ Planos removidos: ${totalRemoved}`);

    // Estatísticas finais
    const finalStats = await client.query(`
      SELECT 
        COUNT(*) as total_plans,
        COUNT(DISTINCT registro_ans) as total_insurers
      FROM health_insurance_plans 
      WHERE situacao = 'Ativo'
    `);

    console.log(`📊 Total final de planos ativos: ${finalStats.rows[0].total_plans}`);
    console.log(`🏢 Total de seguradoras: ${finalStats.rows[0].total_insurers}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.end();
  }
}

async function processInsurerPlans(registroAns) {
  // Obter todos os planos ativos desta seguradora
  const plansResult = await client.query(`
    SELECT id, nm_plano, modalidade, segmentacao, acomodacao, tipo_contratacao
    FROM health_insurance_plans 
    WHERE registro_ans = $1 AND situacao = 'Ativo'
    ORDER BY nm_plano
  `, [registroAns]);

  const plans = plansResult.rows;
  console.log(`   📋 ${plans.length} planos ativos encontrados`);

  if (plans.length <= 1) {
    return { processed: plans.length, removed: 0 };
  }

  // Agrupar planos por categoria base
  const groupedPlans = {};
  
  plans.forEach(plan => {
    const normalized = normalizePlanName(plan.nm_plano);
    const category = extractBaseCategory(normalized);
    
    if (!groupedPlans[category]) {
      groupedPlans[category] = [];
    }
    
    groupedPlans[category].push({
      ...plan,
      normalized: normalized,
      category: category
    });
  });

  console.log(`   📂 Agrupados em ${Object.keys(groupedPlans).length} categorias`);

  let removedCount = 0;

  // Processar cada categoria
  for (const [category, categoryPlans] of Object.entries(groupedPlans)) {
    if (categoryPlans.length > 1) {
      // Manter o primeiro plano da categoria
      const keepPlan = categoryPlans[0];
      
      // Criar nome genérico
      const genericName = await createGenericPlanName(registroAns, category);
      
      // Atualizar o plano mantido
      await client.query(`
        UPDATE health_insurance_plans 
        SET nm_plano = $1 
        WHERE id = $2
      `, [genericName, keepPlan.id]);

      // Remover os outros planos da categoria
      const idsToRemove = categoryPlans.slice(1).map(p => p.id);
      
      if (idsToRemove.length > 0) {
        await client.query(`
          DELETE FROM health_insurance_plans 
          WHERE id = ANY($1)
        `, [idsToRemove]);

        removedCount += idsToRemove.length;
        console.log(`   ✅ ${category}: mantido "${genericName}", removidos ${idsToRemove.length} similares`);
      }
    } else {
      // Mesmo para planos únicos, normalizar o nome
      const plan = categoryPlans[0];
      const genericName = await createGenericPlanName(registroAns, category);
      
      await client.query(`
        UPDATE health_insurance_plans 
        SET nm_plano = $1 
        WHERE id = $2
      `, [genericName, plan.id]);

      console.log(`   📝 ${category}: normalizado para "${genericName}"`);
    }
  }

  return { processed: plans.length, removed: removedCount };
}

async function createGenericPlanName(registroAns, category) {
  // Obter nome da seguradora para criar nome mais descritivo
  const insurerResult = await client.query(`
    SELECT name FROM health_insurance_providers 
    WHERE ans_code = $1
  `, [registroAns]);

  let insurerName = 'Seguradora';
  if (insurerResult.rows.length > 0) {
    insurerName = insurerResult.rows[0].name
      .replace(/\s+(S\.A\.|LTDA|EIRELI|ME|EPP)(\s|$)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Limitar tamanho do nome da seguradora
  if (insurerName.length > 25) {
    const words = insurerName.split(' ');
    insurerName = words[0];
    if (words.length > 1 && insurerName.length < 15) {
      insurerName += ` ${words[1]}`;
    }
  }

  return `${insurerName} ${category}`;
}

// Executar o script
unifyAllPlansAutomatic().catch(console.error);

export { unifyAllPlansAutomatic };