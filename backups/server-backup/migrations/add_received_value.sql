-- Migration para adicionar campo de valor recebido na tabela medical_orders

-- Adicionar campo de valor recebido (em centavos)
ALTER TABLE medical_orders
ADD COLUMN received_value INTEGER;

-- Comentário no novo campo para documentação
COMMENT ON COLUMN medical_orders.received_value IS 'Valor recebido pela cirurgia em centavos';