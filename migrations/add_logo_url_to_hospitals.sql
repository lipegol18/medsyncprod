-- Adiciona a coluna logo_url à tabela hospitals
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS logo_url TEXT;