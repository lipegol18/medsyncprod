-- Criar nova tabela para gestão de aprovações parciais de procedimentos
CREATE TABLE IF NOT EXISTS medical_order_procedures (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES medical_orders(id) ON DELETE CASCADE,
  procedure_id INTEGER NOT NULL,
  quantity_requested INTEGER NOT NULL DEFAULT 1,
  quantity_approved INTEGER NULL,
  status TEXT NOT NULL DEFAULT 'em_analise', -- 'em_analise', 'aprovado', 'negado', 'parcial'
  is_main BOOLEAN NOT NULL DEFAULT false, -- Identifica o procedimento principal do pedido
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_medical_order_procedures_order_id ON medical_order_procedures(order_id);
CREATE INDEX IF NOT EXISTS idx_medical_order_procedures_procedure_id ON medical_order_procedures(procedure_id);
CREATE INDEX IF NOT EXISTS idx_medical_order_procedures_status ON medical_order_procedures(status);
CREATE INDEX IF NOT EXISTS idx_medical_order_procedures_is_main ON medical_order_procedures(is_main);

-- Adicionar comentários para documentação
COMMENT ON TABLE medical_order_procedures IS 'Tabela para gestão individual de procedimentos e suas aprovações por pedido médico';
COMMENT ON COLUMN medical_order_procedures.order_id IS 'ID do pedido médico (FK para medical_orders)';
COMMENT ON COLUMN medical_order_procedures.procedure_id IS 'ID do procedimento CBHPM';
COMMENT ON COLUMN medical_order_procedures.quantity_requested IS 'Quantidade solicitada do procedimento';
COMMENT ON COLUMN medical_order_procedures.quantity_approved IS 'Quantidade aprovada pela operadora (NULL = não analisado)';
COMMENT ON COLUMN medical_order_procedures.status IS 'Status da aprovação: em_analise, aprovado, negado, parcial';
COMMENT ON COLUMN medical_order_procedures.is_main IS 'Indica se é o procedimento principal (maior porte) do pedido';