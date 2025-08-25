-- =====================================================
-- SQL INSERT PARA TABELA MEDICAL_ORDER_CIDS
-- =====================================================
-- Tabela: medical_order_cids
-- Descrição: Associações entre ordens médicas e códigos CID-10
-- Foco: Relacionamento N:N entre medical_orders e cid_codes
-- Data: 14/07/2025

-- Estrutura da tabela:
-- id (integer, auto-increment)
-- order_id (integer, NOT NULL) - FK para medical_orders
-- cid_code_id (integer, NOT NULL) - FK para cid_codes
-- created_at (timestamp, auto)

-- IMPORTANTE: Esta tabela estabelece relação N:N entre ordens médicas e CIDs
-- Uma ordem médica pode ter múltiplos CIDs
-- Um CID pode estar associado a múltiplas ordens médicas

-- =====================================================
-- INSERÇÃO DE ASSOCIAÇÕES MÉDICAS REALISTAS
-- =====================================================

-- Primeiro, vamos verificar se temos ordens médicas e CIDs disponíveis
-- (Esta consulta será comentada na execução final)

-- SELECT COUNT(*) FROM medical_orders;
-- SELECT COUNT(*) FROM cid_codes;

-- =====================================================
-- ASSOCIAÇÕES PARA ORTOPEDIA E TRAUMATOLOGIA - OMBRO
-- =====================================================

INSERT INTO medical_order_cids (order_id, cid_code_id) VALUES
-- Ordens médicas focadas em síndrome do manguito rotador (M75.1)
(170, 26),  -- Ordem 170 + M75.1 (Síndrome do manguito rotador)
(171, 26),  -- Ordem 171 + M75.1 (Síndrome do manguito rotador)
(172, 26),  -- Ordem 172 + M75.1 (Síndrome do manguito rotador)

-- Ordens com lesões traumáticas do ombro
(173, 33),  -- Ordem 173 + S42.2 (Fratura da extremidade superior do úmero)
(174, 31),  -- Ordem 174 + S42.0 (Fratura da clavícula)
(175, 29),  -- Ordem 175 + M75.4 (Síndrome de colisão do ombro)

-- Ordens com múltiplos CIDs de ombro (casos complexos)
(176, 26),  -- Ordem 176 + M75.1 (Síndrome do manguito rotador)
(176, 25),  -- Ordem 176 + M75.0 (Capsulite adesiva do ombro)
(177, 26),  -- Ordem 177 + M75.1 (Síndrome do manguito rotador)
(177, 29),  -- Ordem 177 + M75.4 (Síndrome de colisão do ombro)

-- =====================================================
-- ASSOCIAÇÕES PARA ORTOPEDIA E TRAUMATOLOGIA - JOELHO
-- =====================================================

-- Ordens médicas focadas em gonartrose
(178, 1),   -- Ordem 178 + M17.0 (Gonartrose primária bilateral)
(179, 1),   -- Ordem 179 + M17.0 (Gonartrose primária bilateral)
(180, 1),   -- Ordem 180 + M17.0 (Gonartrose primária bilateral)

-- Ordens com lesões meniscais
(181, 6),   -- Ordem 181 + M23.2 (Transtorno do menisco devido a ruptura)
(182, 7),   -- Ordem 182 + M23.3 (Outros transtornos do menisco)
(183, 8),   -- Ordem 183 + M23.4 (Afrouxamento do corpo livre na articulação)

-- Ordens com múltiplos CIDs de joelho (casos complexos)
(184, 1),   -- Ordem 184 + M17.0 (Gonartrose primária bilateral)
(184, 6),   -- Ordem 184 + M23.2 (Transtorno do menisco devido a ruptura)
(185, 7),   -- Ordem 185 + M23.3 (Outros transtornos do menisco)
(185, 803), -- Ordem 185 + M23.8 (Outros transtornos internos do joelho)

-- =====================================================
-- ASSOCIAÇÕES PARA ORTOPEDIA E TRAUMATOLOGIA - QUADRIL
-- =====================================================

-- Ordens médicas focadas em coxartrose
(186, 38),  -- Ordem 186 + M16.3 (Outras coxartroses displásicas)
(187, 38),  -- Ordem 187 + M16.3 (Outras coxartroses displásicas)
(188, 38),  -- Ordem 188 + M16.3 (Outras coxartroses displásicas)

-- =====================================================
-- ASSOCIAÇÕES PARA OUTRAS ESPECIALIDADES
-- =====================================================

-- Ordens médicas de outras especialidades
(189, 475), -- Ordem 189 + D10 (Neoplasia benigna da boca e da faringe)
(190, 660), -- Ordem 190 + M01.0 (Artrite meningocócica)
(191, 665), -- Ordem 191 + M01.5 (Artrite em outras doenças virais)

-- =====================================================
-- ASSOCIAÇÕES PARA CASOS MULTIDISCIPLINARES
-- =====================================================

-- Ordens com múltiplos CIDs de diferentes especialidades
(192, 26),  -- Ordem 192 + M75.1 (Síndrome do manguito rotador)
(192, 1),   -- Ordem 192 + M17.0 (Gonartrose primária bilateral)
(193, 38),  -- Ordem 193 + M16.3 (Outras coxartroses displásicas)
(193, 47),  -- Ordem 193 + M10.0 (Gota idiopática)

-- =====================================================
-- ASSOCIAÇÕES PARA CASOS HISTÓRICOS (ORDENS EXISTENTES)
-- =====================================================

-- Associações para ordens médicas já existentes no sistema
(53, 8),    -- Ordem 53 + M23.4 (Afrouxamento do corpo livre na articulação)
(55, 47),   -- Ordem 55 + M10.0 (Gota idiopática)
(56, 38),   -- Ordem 56 + M16.3 (Outras coxartroses displásicas)
(64, 26),   -- Ordem 64 + M75.1 (Síndrome do manguito rotador)
(66, 26),   -- Ordem 66 + M75.1 (Síndrome do manguito rotador)
(72, 1),    -- Ordem 72 + M17.0 (Gonartrose primária bilateral)
(75, 26),   -- Ordem 75 + M75.1 (Síndrome do manguito rotador)
(76, 6),    -- Ordem 76 + M23.2 (Transtorno do menisco devido a ruptura)
(79, 29),   -- Ordem 79 + M75.4 (Síndrome de colisão do ombro)
(80, 1),    -- Ordem 80 + M17.0 (Gonartrose primária bilateral)

-- =====================================================
-- ASSOCIAÇÕES PARA CASOS ESPECIAIS
-- =====================================================

-- Ordens com CIDs principais + CIDs secundários automáticos
(194, 26),  -- Ordem 194 + M75.1 (Síndrome do manguito rotador - CID principal)
(195, 26),  -- Ordem 195 + M75.1 (Síndrome do manguito rotador - CID principal)
(196, 1),   -- Ordem 196 + M17.0 (Gonartrose primária bilateral - CID principal)
(197, 38),  -- Ordem 197 + M16.3 (Outras coxartroses displásicas - CID principal)

-- =====================================================
-- ASSOCIAÇÕES PARA TESTES DE AUTO-PREENCHIMENTO
-- =====================================================

-- Ordens específicas para testar funcionalidade de auto-preenchimento
(198, 26),  -- Ordem 198 + M75.1 (para teste de auto-preenchimento)
(199, 26),  -- Ordem 199 + M75.1 (para teste de auto-preenchimento)
(200, 1),   -- Ordem 200 + M17.0 (para teste de auto-preenchimento)

-- =====================================================
-- ASSOCIAÇÕES PARA CASOS COMPLEXOS
-- =====================================================

-- Ordens com múltiplos CIDs para casos complexos
(201, 26),  -- Ordem 201 + M75.1 (Síndrome do manguito rotador)
(201, 25),  -- Ordem 201 + M75.0 (Capsulite adesiva do ombro)
(201, 29),  -- Ordem 201 + M75.4 (Síndrome de colisão do ombro)

(202, 1),   -- Ordem 202 + M17.0 (Gonartrose primária bilateral)
(202, 6),   -- Ordem 202 + M23.2 (Transtorno do menisco devido a ruptura)
(202, 7),   -- Ordem 202 + M23.3 (Outros transtornos do menisco)

(203, 38),  -- Ordem 203 + M16.3 (Outras coxartroses displásicas)
(203, 47),  -- Ordem 203 + M10.0 (Gota idiopática)

-- =====================================================
-- ASSOCIAÇÕES PARA ORDENS RECENTES
-- =====================================================

-- Associações para ordens médicas mais recentes
(204, 26),  -- Ordem 204 + M75.1 (Síndrome do manguito rotador)
(205, 1),   -- Ordem 205 + M17.0 (Gonartrose primária bilateral)
(206, 38),  -- Ordem 206 + M16.3 (Outras coxartroses displásicas)
(207, 6),   -- Ordem 207 + M23.2 (Transtorno do menisco devido a ruptura)
(208, 29),  -- Ordem 208 + M75.4 (Síndrome de colisão do ombro)

-- =====================================================
-- ASSOCIAÇÕES PARA CASOS DE URGÊNCIA
-- =====================================================

-- Ordens médicas de urgência com CIDs traumáticos
(209, 33),  -- Ordem 209 + S42.2 (Fratura da extremidade superior do úmero)
(210, 31),  -- Ordem 210 + S42.0 (Fratura da clavícula)
(211, 33),  -- Ordem 211 + S42.2 (Fratura da extremidade superior do úmero)

-- =====================================================
-- ASSOCIAÇÕES PARA CASOS ELETIVOS
-- =====================================================

-- Ordens médicas eletivas com CIDs degenerativos
(212, 26),  -- Ordem 212 + M75.1 (Síndrome do manguito rotador)
(213, 1),   -- Ordem 213 + M17.0 (Gonartrose primária bilateral)
(214, 38),  -- Ordem 214 + M16.3 (Outras coxartroses displásicas)
(215, 25),  -- Ordem 215 + M75.0 (Capsulite adesiva do ombro)

-- =====================================================
-- VERIFICAÇÃO E ESTATÍSTICAS
-- =====================================================

-- Verificar total de registros inseridos
SELECT COUNT(*) as total_associacoes_inseridas FROM medical_order_cids;

-- Verificar associações por ordem médica
SELECT order_id, COUNT(*) as quantidade_cids
FROM medical_order_cids 
GROUP BY order_id 
HAVING COUNT(*) > 1
ORDER BY quantidade_cids DESC
LIMIT 10;

-- Verificar CIDs mais utilizados
SELECT c.code, c.description, COUNT(moc.id) as quantidade_uso
FROM medical_order_cids moc
JOIN cid_codes c ON moc.cid_code_id = c.id
GROUP BY c.code, c.description
ORDER BY quantidade_uso DESC
LIMIT 15;

-- Verificar associações por categoria de CID
SELECT c.category, COUNT(moc.id) as quantidade_associacoes
FROM medical_order_cids moc
JOIN cid_codes c ON moc.cid_code_id = c.id
GROUP BY c.category
ORDER BY quantidade_associacoes DESC;

-- Verificar ordens com múltiplos CIDs
SELECT moc.order_id, 
       STRING_AGG(c.code || ' - ' || c.description, '; ') as cids_associados
FROM medical_order_cids moc
JOIN cid_codes c ON moc.cid_code_id = c.id
GROUP BY moc.order_id
HAVING COUNT(*) > 1
ORDER BY moc.order_id
LIMIT 10;

-- Verificar associações por especialidade (categoria)
SELECT c.category, 
       COUNT(DISTINCT moc.order_id) as ordens_distintas,
       COUNT(moc.id) as total_associacoes
FROM medical_order_cids moc
JOIN cid_codes c ON moc.cid_code_id = c.id
GROUP BY c.category
ORDER BY total_associacoes DESC;

-- Verificar se há ordens sem CIDs associados
SELECT mo.id as order_id, mo.created_at
FROM medical_orders mo
LEFT JOIN medical_order_cids moc ON mo.id = moc.order_id
WHERE moc.id IS NULL
ORDER BY mo.created_at DESC
LIMIT 10;

-- Resetar sequência se necessário
SELECT setval('medical_order_cids_id_seq', (SELECT MAX(id) FROM medical_order_cids));

-- =====================================================
-- MENSAGEM FINAL
-- =====================================================
SELECT 'ASSOCIAÇÕES MEDICAL_ORDER_CIDS INSERIDAS COM SUCESSO!' as status,
       'Total de ' || COUNT(*) || ' associações entre ordens médicas e CIDs adicionadas' as resultado
FROM medical_order_cids
WHERE created_at >= CURRENT_DATE;