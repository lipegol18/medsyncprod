-- Adiciona as colunas opme_item_ids e opme_item_quantities à tabela medical_orders
ALTER TABLE medical_orders 
ADD COLUMN IF NOT EXISTS opme_item_ids integer[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS opme_item_quantities integer[] DEFAULT '{}';