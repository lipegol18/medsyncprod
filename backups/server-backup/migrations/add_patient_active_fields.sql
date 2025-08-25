-- Adiciona campos para controle de paciente ativo
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS activated_by TEXT;