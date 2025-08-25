-- Script completo para importação de surgical_approach_opme_items
-- Total esperado: 147 associações conforme CSV processado

-- PARTE 1: Luxação acrômio-clavicular (LAC) + LAC
INSERT INTO surgical_approach_opme_items (surgical_procedure_id, surgical_approach_id, opme_item_id, quantity, is_required, created_at, updated_at)
SELECT 3, 5, oi.id, data.quantity, true, NOW(), NOW()
FROM (VALUES 
    ('LÂMINA DE SHAVER DE PARTES MOLES', 1),
    ('LÂMINA DE SHAVER ÓSSEA', 1),
    ('EQUIPO BOMBA DE INFUSÃO', 1),
    ('PONTEIRA DE RADIOFREQUÊNCIA', 1),
    ('ÂNCORAS', 2),
    ('CÂNULAS DE ARTROSCOPIA PARA OMBRO', 2),
    ('BOTÕES DOG BONE', 2),
    ('FIOS FIBER TAPE LOOP.', 2),
    ('BROCA CANULADA', 1)
) AS data(opme_name, quantity)
INNER JOIN opme_items oi ON (UPPER(TRIM(oi.technical_name)) = UPPER(TRIM(data.opme_name)) OR UPPER(TRIM(oi.commercial_name)) = UPPER(TRIM(data.opme_name)));

-- PARTE 2: Artroplastia reversa do ombro + Artroplastia (ID 6)
INSERT INTO surgical_approach_opme_items (surgical_procedure_id, surgical_approach_id, opme_item_id, quantity, is_required, created_at, updated_at)
SELECT 4, 6, oi.id, data.quantity, true, NOW(), NOW()
FROM (VALUES 
    ('GLENOSFERA INVERSA', 1),
    ('INVERSE EPIFISE', 1),
    ('PARAFUSOS DE FIXAÇÃO INVERSE LAGSCREW', 4),
    ('METAGLENA INVERSE', 1),
    ('HASTE INVERSE', 1),
    ('ESPAÇADOR INVERSE INLAY', 1),
    ('LÂMINA DE SERRA OSCILANTE', 1),
    ('FIOS DE ALTA RESISTÊNCIA TIPO TAPER', 6),
    ('CIMENTO COM ANTIBIÓTICO', 1)
) AS data(opme_name, quantity)
INNER JOIN opme_items oi ON (UPPER(TRIM(oi.technical_name)) = UPPER(TRIM(data.opme_name)) OR UPPER(TRIM(oi.commercial_name)) = UPPER(TRIM(data.opme_name)));

-- PARTE 3: Artroplastia reversa do ombro + Fratura (ID 7)
INSERT INTO surgical_approach_opme_items (surgical_procedure_id, surgical_approach_id, opme_item_id, quantity, is_required, created_at, updated_at)
SELECT 4, 7, oi.id, data.quantity, true, NOW(), NOW()
FROM (VALUES 
    ('GLENOSFERA INVERSA', 1),
    ('INVERSE EPIFISE', 1),
    ('PARAFUSOS DE FIXAÇÃO INVERSE LAGSCREW', 4),
    ('METAGLENA INVERSE', 1),
    ('HASTE INVERSE', 1),
    ('ESPAÇADOR INVERSE INLAY', 1),
    ('LÂMINA DE SERRA OSCILANTE', 1),
    ('FIOS DE ALTA RESISTÊNCIA TIPO TAPER', 6),
    ('CIMENTO COM ANTIBIÓTICO', 1)
) AS data(opme_name, quantity)
INNER JOIN opme_items oi ON (UPPER(TRIM(oi.technical_name)) = UPPER(TRIM(data.opme_name)) OR UPPER(TRIM(oi.commercial_name)) = UPPER(TRIM(data.opme_name)));

-- PARTE 4: Artroplastia reversa do ombro + Revisão (ID 8)
INSERT INTO surgical_approach_opme_items (surgical_procedure_id, surgical_approach_id, opme_item_id, quantity, is_required, created_at, updated_at)
SELECT 4, 8, oi.id, data.quantity, true, NOW(), NOW()
FROM (VALUES 
    ('HASTE UMERAL REVERSA DE FRATURA', 1),
    ('INSERTO REVERSO DE FRATURA', 1),
    ('BASE GLENOIDAL', 1),
    ('ESFERA GLENOIDAL', 1),
    ('PARAFUSO DE COMPRESSÃO 4,5MM', 2),
    ('PARAFUSO BLOQUEADO 4,5MM', 2),
    ('CENTRALIZADOR DISTAL', 1),
    ('DOSE DE CIMENTO COM ANTIBIÓTICO', 1),
    ('LÂMINA DE SERRA DE PONTA OSCILANTE', 1),
    ('FIOS DE ALTA RESISTÊNCIA', 6),
    ('CIMENTO COM ANTIBIÓTICO', 1),
    ('KIT DE LAVAGEM', 1),
    ('PONTEIRA FLUSH CUT', 1),
    ('CURATIVO AQUACEL AG', 1),
    ('ENXERTO ÓSSEO', 1)
) AS data(opme_name, quantity)
INNER JOIN opme_items oi ON (UPPER(TRIM(oi.technical_name)) = UPPER(TRIM(data.opme_name)) OR UPPER(TRIM(oi.commercial_name)) = UPPER(TRIM(data.opme_name)));

-- Contar total inserido até agora
SELECT COUNT(*) as total_registros, 'PROGRESSO ATUAL' as status FROM surgical_approach_opme_items;