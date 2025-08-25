-- Script para gerar INSERT SQL dos procedimentos
SELECT 
  'INSERT INTO procedures (id, name, description, code, active, porte, custo_operacional, numero_auxiliares, porte_anestesista, created_at, updated_at) VALUES' AS sql_statement
UNION ALL
SELECT 
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN '(' 
    ELSE ',(' 
  END ||
  id || ', ' || 
  quote_literal(name) || ', ' || 
  COALESCE(quote_literal(description), 'NULL') || ', ' || 
  quote_literal(code) || ', ' || 
  COALESCE(active::text, 'NULL') || ', ' || 
  COALESCE(quote_literal(porte), 'NULL') || ', ' || 
  COALESCE(quote_literal(custo_operacional), 'NULL') || ', ' || 
  COALESCE(numero_auxiliares::text, 'NULL') || ', ' || 
  COALESCE(quote_literal(porte_anestesista), 'NULL') || ', ' || 
  quote_literal(created_at::text) || ', ' || 
  quote_literal(updated_at::text) || ')' ||
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY id) = (SELECT COUNT(*) FROM procedures) THEN ';' 
    ELSE '' 
  END
FROM procedures
ORDER BY id;
