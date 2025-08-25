-- Migration para adicionar campos na tabela medical_orders

-- Adicionar campo de justificativa clínica
ALTER TABLE medical_orders
ADD COLUMN clinical_justification TEXT;

-- Adicionar campo para múltiplos CIDs como array
ALTER TABLE medical_orders
ADD COLUMN multiple_cid_ids INTEGER[] DEFAULT '{}'::INTEGER[];

-- Comentários nos novos campos para documentação
COMMENT ON COLUMN medical_orders.clinical_justification IS 'Sugestão de justificativa clínica para o procedimento';
COMMENT ON COLUMN medical_orders.multiple_cid_ids IS 'Array de IDs de códigos CID-10 adicionais relacionados ao pedido';