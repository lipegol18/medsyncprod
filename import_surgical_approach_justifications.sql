-- Script para importar associações de justificativas clínicas
-- Mapeamento: Procedimento + Conduta → Justificativa

-- 1. Reparo do manguito rotador + Artroscopia
INSERT INTO surgical_approach_justifications 
(surgical_procedure_id, surgical_approach_id, justification_id, is_preferred, custom_notes, created_at, updated_at)
SELECT 
  sp.id as surgical_procedure_id,
  sa.id as surgical_approach_id, 
  cj.id as justification_id,
  true as is_preferred,
  'Justificativa para Reparo do Manguito Rotador via Artroscopia - Auto-importado do CSV' as custom_notes,
  NOW() as created_at,
  NOW() as updated_at
FROM surgical_procedures sp
CROSS JOIN surgical_approaches sa  
CROSS JOIN clinical_justifications cj
WHERE sp.name = 'Reparo do manguito rotador'
AND sa.name = 'Artroscopia'
AND cj.category = 'Reparo do Manguito Rotador'
AND cj.procedure_type = 'Artroscopia';

-- 2. Reparo do manguito rotador + Cirurgia aberta
INSERT INTO surgical_approach_justifications 
(surgical_procedure_id, surgical_approach_id, justification_id, is_preferred, custom_notes, created_at, updated_at)
SELECT 
  sp.id as surgical_procedure_id,
  sa.id as surgical_approach_id, 
  cj.id as justification_id,
  true as is_preferred,
  'Justificativa para Reparo do Manguito Rotador via Cirurgia Aberta - Auto-importado do CSV' as custom_notes,
  NOW() as created_at,
  NOW() as updated_at
FROM surgical_procedures sp
CROSS JOIN surgical_approaches sa  
CROSS JOIN clinical_justifications cj
WHERE sp.name = 'Reparo do manguito rotador'
AND sa.name = 'Cirurgia aberta'
AND cj.category = 'Reparo do Manguito Rotador'
AND cj.procedure_type = 'Cirurgia Aberta';

-- 3. Infiltração e bloqueio do ombro + Bloqueio - Guiado por USG
INSERT INTO surgical_approach_justifications 
(surgical_procedure_id, surgical_approach_id, justification_id, is_preferred, custom_notes, created_at, updated_at)
SELECT 
  sp.id as surgical_procedure_id,
  sa.id as surgical_approach_id, 
  cj.id as justification_id,
  true as is_preferred,
  'Justificativa para Infiltração e Bloqueio do Ombro via Bloqueio Guiado por USG - Auto-importado do CSV' as custom_notes,
  NOW() as created_at,
  NOW() as updated_at
FROM surgical_procedures sp
CROSS JOIN surgical_approaches sa  
CROSS JOIN clinical_justifications cj
WHERE sp.name = 'Infiltração e bloqueio do ombro'
AND sa.name = 'Bloqueio - Guiado por USG'
AND cj.category = 'Infiltração e Bloqueio'
AND cj.procedure_type = 'Bloqueio - Guiado por USG';

-- 4. Luxação glenoumeral + Artroscopia  
INSERT INTO surgical_approach_justifications 
(surgical_procedure_id, surgical_approach_id, justification_id, is_preferred, custom_notes, created_at, updated_at)
SELECT 
  sp.id as surgical_procedure_id,
  sa.id as surgical_approach_id, 
  cj.id as justification_id,
  true as is_preferred,
  'Justificativa para Luxação Glenoumeral via Artroscopia - Auto-importado do CSV' as custom_notes,
  NOW() as created_at,
  NOW() as updated_at
FROM surgical_procedures sp
CROSS JOIN surgical_approaches sa  
CROSS JOIN clinical_justifications cj
WHERE sp.name = 'Luxação glenoumeral'
AND sa.name = 'Artroscopia'
AND cj.category = 'Luxação glenoumeral'
AND cj.procedure_type = 'Artroscopia';

-- 5. Luxação glenoumeral + Latarjet
INSERT INTO surgical_approach_justifications 
(surgical_procedure_id, surgical_approach_id, justification_id, is_preferred, custom_notes, created_at, updated_at)
SELECT 
  sp.id as surgical_procedure_id,
  sa.id as surgical_approach_id, 
  cj.id as justification_id,
  true as is_preferred,
  'Justificativa para Luxação Glenoumeral via Latarjet - Auto-importado do CSV' as custom_notes,
  NOW() as created_at,
  NOW() as updated_at
FROM surgical_procedures sp
CROSS JOIN surgical_approaches sa  
CROSS JOIN clinical_justifications cj
WHERE sp.name = 'Luxação glenoumeral'
AND sa.name = 'Latarjet'
AND cj.category = 'Luxação glenoumeral'
AND cj.procedure_type = 'Latarjet';

-- 6. Luxação acrômio-clavicular (LAC) + LAC
INSERT INTO surgical_approach_justifications 
(surgical_procedure_id, surgical_approach_id, justification_id, is_preferred, custom_notes, created_at, updated_at)
SELECT 
  sp.id as surgical_procedure_id,
  sa.id as surgical_approach_id, 
  cj.id as justification_id,
  true as is_preferred,
  'Justificativa para Luxação Acrômio-Clavicular via LAC - Auto-importado do CSV' as custom_notes,
  NOW() as created_at,
  NOW() as updated_at
FROM surgical_procedures sp
CROSS JOIN surgical_approaches sa  
CROSS JOIN clinical_justifications cj
WHERE sp.name = 'Luxação acrômio-clavicular (LAC)'
AND sa.name = 'LAC'
AND cj.category = 'Luxação Acrômio-Clavicular'
AND cj.procedure_type = 'LAC';

-- 7. Artroplastia reversa do ombro + Artroplastia (mapeamento: Artropatia → Artroplastia)
INSERT INTO surgical_approach_justifications 
(surgical_procedure_id, surgical_approach_id, justification_id, is_preferred, custom_notes, created_at, updated_at)
SELECT 
  sp.id as surgical_procedure_id,
  sa.id as surgical_approach_id, 
  cj.id as justification_id,
  true as is_preferred,
  'Justificativa para Artroplastia Reversa via Artroplastia (mapeamento CSV: Artropatia) - Auto-importado do CSV' as custom_notes,
  NOW() as created_at,
  NOW() as updated_at
FROM surgical_procedures sp
CROSS JOIN surgical_approaches sa  
CROSS JOIN clinical_justifications cj
WHERE sp.name = 'Artroplastia reversa do ombro'
AND sa.name = 'Artroplastia'
AND cj.category LIKE '%Artroplastia%';

-- 8. Artroplastia reversa do ombro + Fratura
INSERT INTO surgical_approach_justifications 
(surgical_procedure_id, surgical_approach_id, justification_id, is_preferred, custom_notes, created_at, updated_at)
SELECT 
  sp.id as surgical_procedure_id,
  sa.id as surgical_approach_id, 
  cj.id as justification_id,
  true as is_preferred,
  'Justificativa para Artroplastia Reversa via Fratura - Auto-importado do CSV' as custom_notes,
  NOW() as created_at,
  NOW() as updated_at
FROM surgical_procedures sp
CROSS JOIN surgical_approaches sa  
CROSS JOIN clinical_justifications cj
WHERE sp.name = 'Artroplastia reversa do ombro'
AND sa.name = 'Fratura'
AND cj.category LIKE '%Artroplastia%'
AND cj.procedure_type LIKE '%Fratura%';

-- 9. Artroplastia reversa do ombro + Revisão
INSERT INTO surgical_approach_justifications 
(surgical_procedure_id, surgical_approach_id, justification_id, is_preferred, custom_notes, created_at, updated_at)
SELECT 
  sp.id as surgical_procedure_id,
  sa.id as surgical_approach_id, 
  cj.id as justification_id,
  true as is_preferred,
  'Justificativa para Artroplastia Reversa via Revisão - Auto-importado do CSV' as custom_notes,
  NOW() as created_at,
  NOW() as updated_at
FROM surgical_procedures sp
CROSS JOIN surgical_approaches sa  
CROSS JOIN clinical_justifications cj
WHERE sp.name = 'Artroplastia reversa do ombro'
AND sa.name = 'Revisão'
AND cj.category LIKE '%Artroplastia%'
AND cj.procedure_type LIKE '%Revisão%';

-- 10. Fratura da escápula + Osteossíntese
INSERT INTO surgical_approach_justifications 
(surgical_procedure_id, surgical_approach_id, justification_id, is_preferred, custom_notes, created_at, updated_at)
SELECT 
  sp.id as surgical_procedure_id,
  sa.id as surgical_approach_id, 
  cj.id as justification_id,
  true as is_preferred,
  'Justificativa para Fratura da Escápula via Osteossíntese - Auto-importado do CSV' as custom_notes,
  NOW() as created_at,
  NOW() as updated_at
FROM surgical_procedures sp
CROSS JOIN surgical_approaches sa  
CROSS JOIN clinical_justifications cj
WHERE sp.name = 'Fratura da escápula'
AND sa.name = 'Osteossíntese'
AND cj.category LIKE '%Escápula%';

-- 11. Fratura da clavícula + Osteossíntese
INSERT INTO surgical_approach_justifications 
(surgical_procedure_id, surgical_approach_id, justification_id, is_preferred, custom_notes, created_at, updated_at)
SELECT 
  sp.id as surgical_procedure_id,
  sa.id as surgical_approach_id, 
  cj.id as justification_id,
  true as is_preferred,
  'Justificativa para Fratura da Clavícula via Osteossíntese - Auto-importado do CSV' as custom_notes,
  NOW() as created_at,
  NOW() as updated_at
FROM surgical_procedures sp
CROSS JOIN surgical_approaches sa  
CROSS JOIN clinical_justifications cj
WHERE sp.name = 'Fratura da clavícula'
AND sa.name = 'Osteossíntese'
AND cj.category LIKE '%Clavícula%';

-- 12. Fratura do coracóide + Osteossíntese
INSERT INTO surgical_approach_justifications 
(surgical_procedure_id, surgical_approach_id, justification_id, is_preferred, custom_notes, created_at, updated_at)
SELECT 
  sp.id as surgical_procedure_id,
  sa.id as surgical_approach_id, 
  cj.id as justification_id,
  true as is_preferred,
  'Justificativa para Fratura do Coracóide via Osteossíntese - Auto-importado do CSV' as custom_notes,
  NOW() as created_at,
  NOW() as updated_at
FROM surgical_procedures sp
CROSS JOIN surgical_approaches sa  
CROSS JOIN clinical_justifications cj
WHERE sp.name = 'Fratura do coracóide'
AND sa.name = 'Osteossíntese'
AND cj.category LIKE '%Coracóide%';

-- 13. Fratura da extremidade proximal do úmero + Placa e parafusos
INSERT INTO surgical_approach_justifications 
(surgical_procedure_id, surgical_approach_id, justification_id, is_preferred, custom_notes, created_at, updated_at)
SELECT 
  sp.id as surgical_procedure_id,
  sa.id as surgical_approach_id, 
  cj.id as justification_id,
  true as is_preferred,
  'Justificativa para Fratura da Extremidade Proximal do Úmero via Placa e Parafusos - Auto-importado do CSV' as custom_notes,
  NOW() as created_at,
  NOW() as updated_at
FROM surgical_procedures sp
CROSS JOIN surgical_approaches sa  
CROSS JOIN clinical_justifications cj
WHERE sp.name = 'Fratura da extremidade proximal do úmero'
AND sa.name = 'Placa e parafusos'
AND cj.category LIKE '%Extremidade Proximal%';

-- 14. Fratura diafisária do úmero + Haste intramedular
INSERT INTO surgical_approach_justifications 
(surgical_procedure_id, surgical_approach_id, justification_id, is_preferred, custom_notes, created_at, updated_at)
SELECT 
  sp.id as surgical_procedure_id,
  sa.id as surgical_approach_id, 
  cj.id as justification_id,
  true as is_preferred,
  'Justificativa para Fratura Diafisária do Úmero via Haste Intramedular - Auto-importado do CSV' as custom_notes,
  NOW() as created_at,
  NOW() as updated_at
FROM surgical_procedures sp
CROSS JOIN surgical_approaches sa  
CROSS JOIN clinical_justifications cj
WHERE sp.name = 'Fratura diafisária do úmero'
AND sa.name = 'Haste intramedular'
AND cj.category LIKE '%Diafisária do Úmero%'
AND cj.procedure_type LIKE '%Haste%';

-- 15. Fratura diafisária do úmero + Placa e parafusos
INSERT INTO surgical_approach_justifications 
(surgical_procedure_id, surgical_approach_id, justification_id, is_preferred, custom_notes, created_at, updated_at)
SELECT 
  sp.id as surgical_procedure_id,
  sa.id as surgical_approach_id, 
  cj.id as justification_id,
  true as is_preferred,
  'Justificativa para Fratura Diafisária do Úmero via Placa e Parafusos - Auto-importado do CSV' as custom_notes,
  NOW() as created_at,
  NOW() as updated_at
FROM surgical_procedures sp
CROSS JOIN surgical_approaches sa  
CROSS JOIN clinical_justifications cj
WHERE sp.name = 'Fratura diafisária do úmero'
AND sa.name = 'Placa e parafusos'
AND cj.category LIKE '%Diafisária do Úmero%'
AND cj.procedure_type LIKE '%Placa%';

-- 16. Fratura da extremidade distal do úmero + Placa e parafusos
INSERT INTO surgical_approach_justifications 
(surgical_procedure_id, surgical_approach_id, justification_id, is_preferred, custom_notes, created_at, updated_at)
SELECT 
  sp.id as surgical_procedure_id,
  sa.id as surgical_approach_id, 
  cj.id as justification_id,
  true as is_preferred,
  'Justificativa para Fratura da Extremidade Distal do Úmero via Placa e Parafusos - Auto-importado do CSV' as custom_notes,
  NOW() as created_at,
  NOW() as updated_at
FROM surgical_procedures sp
CROSS JOIN surgical_approaches sa  
CROSS JOIN clinical_justifications cj
WHERE sp.name = 'Fratura da extremidade distal do úmero'
AND sa.name = 'Placa e parafusos'
AND cj.category LIKE '%Extremidade Distal%';

-- 17. Fratura da cabeça do rádio + Osteossíntese
INSERT INTO surgical_approach_justifications 
(surgical_procedure_id, surgical_approach_id, justification_id, is_preferred, custom_notes, created_at, updated_at)
SELECT 
  sp.id as surgical_procedure_id,
  sa.id as surgical_approach_id, 
  cj.id as justification_id,
  true as is_preferred,
  'Justificativa para Fratura da Cabeça do Rádio via Osteossíntese - Auto-importado do CSV' as custom_notes,
  NOW() as created_at,
  NOW() as updated_at
FROM surgical_procedures sp
CROSS JOIN surgical_approaches sa  
CROSS JOIN clinical_justifications cj
WHERE sp.name = 'Fratura da cabeça do rádio'
AND sa.name = 'Osteossíntese'
AND cj.category LIKE '%Cabeça do Rádio%'
AND cj.procedure_type = 'Osteossíntese';

-- 18. Fratura da cabeça do rádio + Artroplastia
INSERT INTO surgical_approach_justifications 
(surgical_procedure_id, surgical_approach_id, justification_id, is_preferred, custom_notes, created_at, updated_at)
SELECT 
  sp.id as surgical_procedure_id,
  sa.id as surgical_approach_id, 
  cj.id as justification_id,
  true as is_preferred,
  'Justificativa para Fratura da Cabeça do Rádio via Artroplastia - Auto-importado do CSV' as custom_notes,
  NOW() as created_at,
  NOW() as updated_at
FROM surgical_procedures sp
CROSS JOIN surgical_approaches sa  
CROSS JOIN clinical_justifications cj
WHERE sp.name = 'Fratura da cabeça do rádio'
AND sa.name = 'Artroplastia'
AND cj.category LIKE '%Cabeça do Rádio%'
AND cj.procedure_type = 'Artroplastia';

-- 19. Fratura do olécrano + Osteossíntese
INSERT INTO surgical_approach_justifications 
(surgical_procedure_id, surgical_approach_id, justification_id, is_preferred, custom_notes, created_at, updated_at)
SELECT 
  sp.id as surgical_procedure_id,
  sa.id as surgical_approach_id, 
  cj.id as justification_id,
  true as is_preferred,
  'Justificativa para Fratura do Olécrano via Osteossíntese - Auto-importado do CSV' as custom_notes,
  NOW() as created_at,
  NOW() as updated_at
FROM surgical_procedures sp
CROSS JOIN surgical_approaches sa  
CROSS JOIN clinical_justifications cj
WHERE sp.name = 'Fratura do olécrano'
AND sa.name = 'Osteossíntese'
AND cj.category LIKE '%Olécrano%';

-- 20. Epicondilite lateral + Infiltração
INSERT INTO surgical_approach_justifications 
(surgical_procedure_id, surgical_approach_id, justification_id, is_preferred, custom_notes, created_at, updated_at)
SELECT 
  sp.id as surgical_procedure_id,
  sa.id as surgical_approach_id, 
  cj.id as justification_id,
  true as is_preferred,
  'Justificativa para Epicondilite Lateral via Infiltração - Auto-importado do CSV' as custom_notes,
  NOW() as created_at,
  NOW() as updated_at
FROM surgical_procedures sp
CROSS JOIN surgical_approaches sa  
CROSS JOIN clinical_justifications cj
WHERE sp.name = 'Epicondilite lateral'
AND sa.name = 'Infiltração'
AND cj.category = 'Epicondilite Lateral'
AND cj.procedure_type = 'Infiltração';

-- 21. Epicondilite lateral + Artroscopia
INSERT INTO surgical_approach_justifications 
(surgical_procedure_id, surgical_approach_id, justification_id, is_preferred, custom_notes, created_at, updated_at)
SELECT 
  sp.id as surgical_procedure_id,
  sa.id as surgical_approach_id, 
  cj.id as justification_id,
  true as is_preferred,
  'Justificativa para Epicondilite Lateral via Artroscopia - Auto-importado do CSV' as custom_notes,
  NOW() as created_at,
  NOW() as updated_at
FROM surgical_procedures sp
CROSS JOIN surgical_approaches sa  
CROSS JOIN clinical_justifications cj
WHERE sp.name = 'Epicondilite lateral'
AND sa.name = 'Artroscopia'
AND cj.category = 'Epicondilite Lateral'
AND cj.procedure_type = 'Artroscopia';

-- 22. Epicondilite lateral + Cirurgia aberta
INSERT INTO surgical_approach_justifications 
(surgical_procedure_id, surgical_approach_id, justification_id, is_preferred, custom_notes, created_at, updated_at)
SELECT 
  sp.id as surgical_procedure_id,
  sa.id as surgical_approach_id, 
  cj.id as justification_id,
  true as is_preferred,
  'Justificativa para Epicondilite Lateral via Cirurgia Aberta - Auto-importado do CSV' as custom_notes,
  NOW() as created_at,
  NOW() as updated_at
FROM surgical_procedures sp
CROSS JOIN surgical_approaches sa  
CROSS JOIN clinical_justifications cj
WHERE sp.name = 'Epicondilite lateral'
AND sa.name = 'Cirurgia aberta'
AND cj.category = 'Epicondilite Lateral'
AND cj.procedure_type = 'Cirurgia Aberta';

-- 23. Epicondilite medial + Infiltração
INSERT INTO surgical_approach_justifications 
(surgical_procedure_id, surgical_approach_id, justification_id, is_preferred, custom_notes, created_at, updated_at)
SELECT 
  sp.id as surgical_procedure_id,
  sa.id as surgical_approach_id, 
  cj.id as justification_id,
  true as is_preferred,
  'Justificativa para Epicondilite Medial via Infiltração - Auto-importado do CSV' as custom_notes,
  NOW() as created_at,
  NOW() as updated_at
FROM surgical_procedures sp
CROSS JOIN surgical_approaches sa  
CROSS JOIN clinical_justifications cj
WHERE sp.name = 'Epicondilite medial'
AND sa.name = 'Infiltração'
AND cj.category = 'Epicondilite Medial'
AND cj.procedure_type = 'Infiltração';

-- 24. Epicondilite medial + Tratamento cirúrgico
INSERT INTO surgical_approach_justifications 
(surgical_procedure_id, surgical_approach_id, justification_id, is_preferred, custom_notes, created_at, updated_at)
SELECT 
  sp.id as surgical_procedure_id,
  sa.id as surgical_approach_id, 
  cj.id as justification_id,
  true as is_preferred,
  'Justificativa para Epicondilite Medial via Tratamento Cirúrgico - Auto-importado do CSV' as custom_notes,
  NOW() as created_at,
  NOW() as updated_at
FROM surgical_procedures sp
CROSS JOIN surgical_approaches sa  
CROSS JOIN clinical_justifications cj
WHERE sp.name = 'Epicondilite medial'
AND sa.name = 'Tratamento cirúrgico'
AND cj.category = 'Epicondilite Medial'
AND cj.procedure_type = 'Tratamento cirúrgico';

-- 25. Bursite de olécrano + Tratamento cirúrgico
INSERT INTO surgical_approach_justifications 
(surgical_procedure_id, surgical_approach_id, justification_id, is_preferred, custom_notes, created_at, updated_at)
SELECT 
  sp.id as surgical_procedure_id,
  sa.id as surgical_approach_id, 
  cj.id as justification_id,
  true as is_preferred,
  'Justificativa para Bursite de Olécrano via Tratamento Cirúrgico - Auto-importado do CSV' as custom_notes,
  NOW() as created_at,
  NOW() as updated_at
FROM surgical_procedures sp
CROSS JOIN surgical_approaches sa  
CROSS JOIN clinical_justifications cj
WHERE sp.name = 'Bursite de olécrano'
AND sa.name = 'Tratamento cirúrgico'
AND cj.category = 'Bursite de Olécrano'
AND cj.procedure_type = 'Tratamento cirúrgico';

-- Verificar total de associações criadas
SELECT COUNT(*) as total_associacoes_criadas FROM surgical_approach_justifications;