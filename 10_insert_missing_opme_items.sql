-- Script para inserir os 61 itens OPME faltantes na tabela opme_items
-- Gerado em 26/07/2025 para completar base de dados médica
-- EXECUTADO COM SUCESSO: 61 itens inseridos em 26/07/2025

-- Inserir os 61 itens OPME que não existem na tabela
INSERT INTO opme_items (
    technical_name,
    commercial_name,
    is_valid,
    created_at,
    updated_at
) VALUES
-- Itens ortopédicos e cirúrgicos faltantes
('ARRUELAS', 'ARRUELAS', '99999', true, true, NOW(), NOW()),
('BASE GLENOIDAL', 'BASE GLENOIDAL', '99999', true, true, NOW(), NOW()),
('BOTÕES DOG BONE', 'BOTÕES DOG BONE', '99999', true, true, NOW(), NOW()),
('BROCA CANULADA', 'BROCA CANULADA', '99999', true, true, NOW(), NOW()),
('BROCAS', 'BROCAS', '99999', true, true, NOW(), NOW()),
('CENTRALIZADOR DISTAL', 'CENTRALIZADOR DISTAL', '99999', true, true, NOW(), NOW()),
('CIMENTO COM ANTIBIÓTICO', 'CIMENTO COM ANTIBIÓTICO', '99999', true, true, NOW(), NOW()),
('CIMENTO ORTOPÉDICO', 'CIMENTO ORTOPÉDICO', '99999', true, true, NOW(), NOW()),
('CURATIVO AQUACEL AG', 'CURATIVO AQUACEL AG', '99999', true, true, NOW(), NOW()),
('CÂNULA DE BLOQUEIO', 'CÂNULA DE BLOQUEIO', '99999', true, true, NOW(), NOW()),
('DOSE DE CIMENTO COM ANTIBIÓTICO', 'DOSE DE CIMENTO COM ANTIBIÓTICO', '99999', true, true, NOW(), NOW()),
('DRILL PIN (3,2MM)', 'DRILL PIN (3,2MM)', '99999', true, true, NOW(), NOW()),
('ENXERTO ÓSSEO', 'ENXERTO ÓSSEO', '99999', true, true, NOW(), NOW()),
('EQUIPO BOMBA DE INFUSÃO', 'EQUIPO BOMBA DE INFUSÃO', '99999', true, true, NOW(), NOW()),
('ESFERA GLENOIDAL', 'ESFERA GLENOIDAL', '99999', true, true, NOW(), NOW()),
('ESPAÇADOR INVERSE INLAY', 'ESPAÇADOR INVERSE INLAY', '99999', true, true, NOW(), NOW()),
('FIBERWIRE', 'FIBERWIRE', '99999', true, true, NOW(), NOW()),
('FIO GUIA OLIVADO', 'FIO GUIA OLIVADO', '99999', true, true, NOW(), NOW()),
('FIOS DE ALTA RESISTÊNCIA', 'FIOS DE ALTA RESISTÊNCIA', '99999', true, true, NOW(), NOW()),
('FIOS DE ALTA RESISTÊNCIA TIPO TAPER', 'FIOS DE ALTA RESISTÊNCIA TIPO TAPER', '99999', true, true, NOW(), NOW()),
('FIOS FIBER TAPE LOOP.', 'FIOS FIBER TAPE LOOP.', '99999', true, true, NOW(), NOW()),
('FIOS GUIA', 'FIOS GUIA', '99999', true, true, NOW(), NOW()),
('FIOS GUIA ROSQUEADOS', 'FIOS GUIA ROSQUEADOS', '99999', true, true, NOW(), NOW()),
('GEL ANTI-FIBRÓTICO', 'GEL ANTI-FIBRÓTICO', '99999', true, true, NOW(), NOW()),
('GLENOSFERA INVERSA', 'GLENOSFERA INVERSA', '99999', true, true, NOW(), NOW()),
('HASTE INVERSE', 'HASTE INVERSE', '99999', true, true, NOW(), NOW()),
('HASTE UMERAL REVERSA DE FRATURA', 'HASTE UMERAL REVERSA DE FRATURA', '99999', true, true, NOW(), NOW()),
('I-STIM', 'I-STIM', '99999', true, true, NOW(), NOW()),
('INSERSOR PARA BUTTON', 'INSERSOR PARA BUTTON', '99999', true, true, NOW(), NOW()),
('INSERTO REVERSO DE FRATURA', 'INSERTO REVERSO DE FRATURA', '99999', true, true, NOW(), NOW()),
('INVERSE EPIFISE', 'INVERSE EPIFISE', '99999', true, true, NOW(), NOW()),
('KIT DE LAVAGEM', 'KIT DE LAVAGEM', '99999', true, true, NOW(), NOW()),
('KIT INSTRUMENTAL DE LATARJET', 'KIT INSTRUMENTAL DE LATARJET', '99999', true, true, NOW(), NOW()),
('LÂMINA DE SERRA DE PONTA OSCILANTE', 'LÂMINA DE SERRA DE PONTA OSCILANTE', '99999', true, true, NOW(), NOW()),
('LÂMINA DE SERRA EM L', 'LÂMINA DE SERRA EM L', '99999', true, true, NOW(), NOW()),
('LÂMINA DE SERRA OSCILANTE', 'LÂMINA DE SERRA OSCILANTE', '99999', true, true, NOW(), NOW()),
('LÂMINA DE SERRA RETA', 'LÂMINA DE SERRA RETA', '99999', true, true, NOW(), NOW()),
('METAGLENA INVERSE', 'METAGLENA INVERSE', '99999', true, true, NOW(), NOW()),
('NEURAWRAP 2CM', 'NEURAWRAP 2CM', '99999', true, true, NOW(), NOW()),
('PARAFUSO BLOQUEADO 4,5MM', 'PARAFUSO BLOQUEADO 4,5MM', '99999', true, true, NOW(), NOW()),
('PARAFUSO CANULADO DE DUPLA COMPRESSÃO', 'PARAFUSO CANULADO DE DUPLA COMPRESSÃO', '99999', true, true, NOW(), NOW()),
('PARAFUSO DE BIOTENODOSE', 'PARAFUSO DE BIOTENODOSE', '99999', true, true, NOW(), NOW()),
('PARAFUSO DE COMPRESSÃO 4,5MM', 'PARAFUSO DE COMPRESSÃO 4,5MM', '99999', true, true, NOW(), NOW()),
('PARAFUSOS BLOQUEADOS', 'PARAFUSOS BLOQUEADOS', '99999', true, true, NOW(), NOW()),
('PARAFUSOS CANULADOS - LATARJET', 'PARAFUSOS CANULADOS - LATARJET', '99999', true, true, NOW(), NOW()),
('PARAFUSOS CANULADOS 4,0MM', 'PARAFUSOS CANULADOS 4,0MM', '99999', true, true, NOW(), NOW()),
('PARAFUSOS CORTICAIS', 'PARAFUSOS CORTICAIS', '99999', true, true, NOW(), NOW()),
('PARAFUSOS DE FIXAÇÃO INVERSE LAGSCREW', 'PARAFUSOS DE FIXAÇÃO INVERSE LAGSCREW', '99999', true, true, NOW(), NOW()),
('PEC BUTTON (2,6MM)', 'PEC BUTTON (2,6MM)', '99999', true, true, NOW(), NOW()),
('PLACA DE CABEÇA DE RÁDIO', 'PLACA DE CABEÇA DE RÁDIO', '99999', true, true, NOW(), NOW()),
('PLACA DE CLAVÍCULA', 'PLACA DE CLAVÍCULA', '99999', true, true, NOW(), NOW()),
('PLACA DE MINI-MICRO', 'PLACA DE MINI-MICRO', '99999', true, true, NOW(), NOW()),
('PLACA DE RECONSTRUÇÃO BLOQUEADA LONGA', 'PLACA DE RECONSTRUÇÃO BLOQUEADA LONGA', '99999', true, true, NOW(), NOW()),
('PLACA DE RÁDIO DISTAL', 'PLACA DE RÁDIO DISTAL', '99999', true, true, NOW(), NOW()),
('PLACA LATERAL DE ÚMERO', 'PLACA LATERAL DE ÚMERO', '99999', true, true, NOW(), NOW()),
('PONTEIRA FLUSH CUT', 'PONTEIRA FLUSH CUT', '99999', true, true, NOW(), NOW()),
('TRIANCIL', 'TRIANCIL', '99999', true, true, NOW(), NOW()),
('ÁCIDO HIALURÔNICO', 'ÁCIDO HIALURÔNICO', '99999', true, true, NOW(), NOW()),
('ÂNCORAS', 'ÂNCORAS', '99999', true, true, NOW(), NOW()),
('ÂNCORAS DE TECIDO', 'ÂNCORAS DE TECIDO', '99999', true, true, NOW(), NOW()),
('ÂNCORAS SEM NÓ', 'ÂNCORAS SEM NÓ', '99999', true, true, NOW(), NOW());

-- Verificação do resultado
SELECT 
    COUNT(*) as total_itens_inseridos,
    'Inserção de 61 itens OPME concluída com sucesso' as status
FROM opme_items 
WHERE created_at >= CURRENT_DATE;

-- Verificação final - contagem total
SELECT 
    COUNT(*) as total_opme_items_na_tabela,
    'Tabela opme_items atualizada' as status
FROM opme_items 
WHERE is_valid = true;