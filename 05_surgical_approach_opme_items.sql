-- =====================================================
-- SCRIPT 05: SURGICAL APPROACH × OPME ITEMS (CONDUTA-ITENS OPME)
-- =====================================================
-- Tabela: surgical_approach_opme_items
-- Descrição: Associações entre condutas cirúrgicas e itens OPME
-- Ordem de execução: 5º (após surgical_approaches)
-- Dependências: surgical_approaches, opme_items

-- Limpar dados existentes (opcional)
-- DELETE FROM surgical_approach_opme_items;

-- Inserir associações Conduta × Item OPME
INSERT INTO surgical_approach_opme_items (id, surgical_approach_id, opme_item_id, is_required, quantity, alternative_items, notes) VALUES
-- Videoartroscopia (surgical_approach_id = 1)
(1, 1, 1, true, 2, '26,27', 'Cânulas de artroscopia essenciais para acesso articular'),
(2, 1, 2, true, 1, '70,71', 'Kit de sutura para reparo meniscal'),
(3, 1, 3, true, 2, '52,53', 'Fio de alta resistência para sutura artroscópica'),
(4, 1, 4, false, 2, '87', 'Parafuso de interferência para fixação'),

-- Cirurgia Aberta (surgical_approach_id = 2)
(5, 2, 5, true, 1, '93,94', 'Placa bloqueada para fixação óssea'),
(6, 2, 6, true, 1, '94', 'Placa específica para úmero proximal'),
(7, 2, 7, true, 4, '82,83', 'Parafusos bloqueados para fixação'),
(8, 2, 8, false, 1, '44', 'Enxerto ósseo para preenchimento'),

-- Cirurgia Robótica (surgical_approach_id = 3)
(9, 3, 4, true, 2, '87', 'Parafuso de interferência para fixação robótica'),
(10, 3, 9, true, 3, '82', 'Parafuso canulado para fixação precisa'),
(11, 3, 10, true, 1, '53,54', 'Fio de passagem para enxerto robótico');

-- Nota: Os IDs de OPME items são baseados nos dados existentes
-- OPME IDs correspondem aos registros na tabela opme_items
-- alternative_items contém IDs de itens alternativos separados por vírgula

-- Resetar sequência (se necessário)
SELECT setval('surgical_approach_opme_items_id_seq', (SELECT MAX(id) FROM surgical_approach_opme_items));

-- Verificar dados inseridos
SELECT COUNT(*) as total_associacoes FROM surgical_approach_opme_items;

-- Verificar associações criadas
SELECT 
    saoi.id,
    sa.name as surgical_approach,
    oi.commercial_name as opme_item,
    saoi.is_required,
    saoi.quantity,
    saoi.alternative_items,
    saoi.notes
FROM surgical_approach_opme_items saoi
JOIN surgical_approaches sa ON saoi.surgical_approach_id = sa.id
JOIN opme_items oi ON saoi.opme_item_id = oi.id
ORDER BY saoi.id;