-- Script para inserir associações CBHPM com quantidades para Reparo do Manguito Rotador
-- Baseado nos dados fornecidos pelo usuário

-- Reparo do manguito rotador + Artroscopia (surgical_procedure_id=1, surgical_approach_id=1)
INSERT INTO surgical_approach_procedures (surgical_procedure_id, surgical_approach_id, procedure_id, quantity, is_preferred, complexity, notes, created_at, updated_at)
VALUES 
-- 6 códigos CBHPM para Artroscopia
(1, 1, 704, 1, true, 'Alta', 'Procedimento principal - RUPTURA DO MANGUITO ROTADOR', NOW(), NOW()),
(1, 1, 699, 1, false, 'Média', 'Procedimento complementar - SINOVECTOMIA TOTAL', NOW(), NOW()),
(1, 1, 706, 1, false, 'Média', 'Procedimento complementar - RESSECÇÃO LATERAL DA CLAVÍCULA', NOW(), NOW());

-- Buscar IDs dos demais códigos CBHPM para Reparo do Manguito Rotador + Artroscopia
SELECT id, code, name FROM procedures WHERE code IN ('3.07.35.09-2', '3.07.35.03-3', '3.07.35.16-5');

-- Script para continuar após verificar os IDs