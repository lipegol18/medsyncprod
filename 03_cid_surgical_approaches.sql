-- =====================================================
-- SCRIPT 03: CID × SURGICAL APPROACHES (ASSOCIAÇÕES CID-CONDUTA)
-- =====================================================
-- Tabela: cid_surgical_approaches
-- Descrição: Associações entre códigos CID-10 e condutas cirúrgicas
-- Ordem de execução: 3º (após surgical_approaches)
-- Dependências: surgical_approaches, cid_codes

-- Limpar dados existentes (opcional)
-- DELETE FROM cid_surgical_approaches;

-- Inserir associações CID × Conduta Cirúrgica
-- Necessário identificar os IDs corretos das tabelas de referência
INSERT INTO cid_surgical_approaches (id, cid_code_id, surgical_approach_id, is_preferred, notes) VALUES
(12, 26, 1, true, 'Videoartroscopia é a conduta preferencial para síndrome do manguito rotador devido ao menor trauma cirúrgico'),
(13, 26, 2, false, 'Cirurgia aberta para casos complexos ou quando há necessidade de reparo extenso'),
(14, 26, 3, false, 'Cirurgia robótica oferece precisão adicional para reparos complexos do manguito rotador');

-- Nota: Os IDs utilizados são:
-- cid_code_id = 26 (M75.1 - Síndrome do manguito rotador)
-- surgical_approach_id = 1 (Videoartroscopia)
-- surgical_approach_id = 2 (Cirurgia Aberta)
-- surgical_approach_id = 3 (Cirurgia Robótica)

-- Resetar sequência (se necessário)
SELECT setval('cid_surgical_approaches_id_seq', (SELECT MAX(id) FROM cid_surgical_approaches));

-- Verificar dados inseridos
SELECT COUNT(*) as total_associacoes FROM cid_surgical_approaches;

-- Verificar associações criadas
SELECT 
    csa.id,
    cc.code as cid_code,
    cc.description as cid_description,
    sa.name as surgical_approach,
    csa.is_preferred,
    csa.notes
FROM cid_surgical_approaches csa
JOIN cid_codes cc ON csa.cid_code_id = cc.id
JOIN surgical_approaches sa ON csa.surgical_approach_id = sa.id
ORDER BY csa.id;