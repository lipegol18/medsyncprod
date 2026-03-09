import { Router } from "express";
import { pool } from "../db";
import OpenAI from "openai";

const router = Router();

const DB_SCHEMA_CONTEXT = `
Você é um especialista em SQL para o sistema MedSync, uma plataforma de gestão de pedidos médicos cirúrgicos no Brasil.

SCHEMA DO BANCO DE DADOS (tabelas principais):

-- Usuários e autenticação
users (id, username, email, name, role_id, active, created_at, medical_specialty_id, crm, crm_state)
roles (id, name, description)

-- Pedidos médicos (core do sistema)
medical_orders (id, user_id, patient_id, hospital_id, status_id, created_at, updated_at, insurance_provider_id, authorization_number, surgery_date, notes)
order_statuses (id, name, description, color)
medical_order_status_history (id, order_id, status_id, changed_by, changed_at, notes)

-- Pacientes
patients (id, name, cpf, birth_date, gender, phone, email, created_by, created_at, insurance_provider_id, insurance_card_number)

-- Hospitais e fornecedores
hospitals (id, name, city, state, cnpj, active)
suppliers (id, name, cnpj, active)

-- Planos de saúde
insurance_providers (id, name, code, active)
health_insurance_plans (id, provider_id, name, code, active)

-- Procedimentos cirúrgicos e OPME
surgical_procedures (id, name, code, specialty_id, active)
opme_items (id, name, code, description, active)
medical_order_opme_items (id, order_id, opme_item_id, quantity, unit_price, approved)
medical_order_surgical_procedures (id, order_id, surgical_procedure_id, quantity)
medical_order_procedures (id, order_id, procedure_id, quantity, side)

-- Procedimentos CBHPM
procedures (id, code, name, description, specialty_id)

-- CID-10
cid_codes (id, code, description)
medical_order_cids (id, order_id, cid_code_id)

-- Agendamentos cirúrgicos
surgery_appointments (id, order_id, doctor_id, hospital_id, scheduled_date, status, notes, created_at)

-- Assinaturas e planos
user_subscriptions (id, user_id, plan_id, status, started_at, expires_at, trial_ends_at, payment_provider)
subscription_plans (id, name, description, price_monthly, price_yearly, max_users, is_active)

-- Especialidades médicas
medical_specialties (id, name, code)

-- Recursos/Apelações
appeals (id, order_id, created_by, created_at, status, reason, response)

-- Notificações
notifications (id, user_id, title, message, read, created_at, type)

REGRAS IMPORTANTES:
1. Retorne APENAS SELECT. Nunca UPDATE, DELETE, INSERT, DROP, ALTER, CREATE ou qualquer DDL/DML.
2. Use aliases descritivos em português (ex: COUNT(*) AS total_pedidos)
3. Para datas, use: DATE_TRUNC('month', created_at) para agrupar por mês
4. Limite resultados a no máximo 100 linhas com LIMIT quando apropriado
5. Prefira JOINs explícitos em vez de subqueries quando possível
6. Para status de pedidos, os IDs mais comuns são: 1=Rascunho, 2=Enviado, 3=Em Análise, 4=Aprovado, 5=Negado
7. O campo user_id em medical_orders refere-se ao médico que criou o pedido
`;

function isSafeSelectQuery(sql: string): boolean {
  const normalized = sql.trim().toUpperCase().replace(/\s+/g, ' ');
  
  const forbidden = [
    /\bUPDATE\b/, /\bDELETE\b/, /\bINSERT\b/, /\bDROP\b/,
    /\bALTER\b/, /\bCREATE\b/, /\bTRUNCATE\b/, /\bEXEC\b/,
    /\bEXECUTE\b/, /\bGRANT\b/, /\bREVOKE\b/, /\bCOPY\b/,
    /\bPG_/
  ];

  for (const pattern of forbidden) {
    if (pattern.test(normalized)) return false;
  }

  if (!normalized.startsWith('SELECT') && !normalized.startsWith('WITH')) return false;
  
  return true;
}

function detectChartType(columns: string[], rows: any[]): string {
  if (rows.length === 0) return 'table';
  if (rows.length === 1 && columns.length === 1) return 'kpi';
  
  const numericCols = columns.filter(col => {
    const val = rows[0][col];
    return typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)));
  });
  
  const dateCols = columns.filter(col => 
    col.toLowerCase().includes('mes') || col.toLowerCase().includes('month') ||
    col.toLowerCase().includes('data') || col.toLowerCase().includes('date') ||
    col.toLowerCase().includes('ano') || col.toLowerCase().includes('year')
  );

  if (rows.length === 1 && numericCols.length >= 1) return 'kpi';
  if (columns.length === 2 && numericCols.length === 1 && dateCols.length > 0) return 'line';
  if (columns.length === 2 && numericCols.length === 1 && rows.length <= 30) return 'bar';
  if (columns.length === 2 && numericCols.length === 1 && rows.length <= 10) return 'pie';
  if (numericCols.length >= 2 && rows.length <= 30) return 'bar';
  
  return 'table';
}

router.post('/admin/analytics-query', async (req: any, res: any) => {
  if (!req.user || req.user.roleId !== 1) {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }

  const { question } = req.body;

  if (!question || typeof question !== 'string' || question.trim().length < 3) {
    return res.status(400).json({ error: 'Pergunta inválida' });
  }

  const openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  let generatedSql = '';
  let explanation = '';

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: DB_SCHEMA_CONTEXT
        },
        {
          role: 'user',
          content: `Pergunta: "${question.trim()}"

Responda em JSON com este formato exato:
{
  "sql": "SELECT ... (apenas SELECT, nunca DDL/DML)",
  "explanation": "Explicação em português do que a query faz",
  "suggestedChart": "bar|line|pie|table|kpi"
}

Retorne APENAS o JSON, sem markdown, sem blocos de código.`
        }
      ],
      max_completion_tokens: 1024,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    generatedSql = (parsed.sql || '').trim();
    explanation = parsed.explanation || '';
    const suggestedChart = parsed.suggestedChart || 'table';

    if (!generatedSql) {
      return res.status(400).json({ error: 'Não foi possível gerar uma consulta para esta pergunta.' });
    }

    if (!isSafeSelectQuery(generatedSql)) {
      return res.status(400).json({ 
        error: 'A consulta gerada contém operações não permitidas. Apenas SELECT é permitido.',
        sql: generatedSql
      });
    }

    const result = await pool.query(generatedSql);
    const rows = result.rows;
    const columns = result.fields.map((f: any) => f.name);
    const chartType = detectChartType(columns, rows);

    return res.json({
      sql: generatedSql,
      explanation,
      rows,
      columns,
      chartType: suggestedChart !== 'table' ? suggestedChart : chartType,
      rowCount: rows.length
    });

  } catch (err: any) {
    console.error('[Analytics] Error:', err?.message);

    if (err?.code && generatedSql) {
      return res.status(422).json({
        error: `Erro ao executar a consulta SQL: ${err.message}`,
        sql: generatedSql,
        explanation
      });
    }

    return res.status(500).json({ error: 'Erro ao processar a consulta. Tente reformular a pergunta.' });
  }
});

export default router;
