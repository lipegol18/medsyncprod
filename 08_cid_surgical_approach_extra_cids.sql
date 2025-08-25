-- =====================================================
-- SCRIPT 08: CID SURGICAL APPROACH EXTRA CIDS (CIDS AUTOMÁTICOS)
-- =====================================================
-- Tabela: cid_surgical_approach_extra_cids
-- Descrição: CIDs que são adicionados automaticamente baseados em CID + Conduta
-- Ordem de execução: 8º (após cid_surgical_approaches)
-- Dependências: cid_codes, surgical_approaches

-- Limpar dados existentes (opcional)
-- DELETE FROM cid_surgical_approach_extra_cids;

-- Inserir CIDs extras automáticos
-- Exemplo: M75.1 + Cirurgia Aberta → adiciona automaticamente S460
INSERT INTO cid_surgical_approach_extra_cids (id, primary_cid_id, surgical_approach_id, extra_cid_id, is_required, notes) VALUES
-- M75.1 (Síndrome do manguito rotador) + Cirurgia Aberta → S460 (Traumatismo de tendão do manguito rotador)
(1, 26, 2, 3236, true, 'Quando M75.1 é associado à cirurgia aberta, S460 é automaticamente adicionado para documentar o traumatismo do tendão'),

-- M75.1 (Síndrome do manguito rotador) + Videoartroscopia → S460 (Traumatismo de tendão do manguito rotador)
(2, 26, 1, 3236, false, 'S460 pode ser adicionado opcionalmente em videoartroscopia de manguito rotador'),

-- M75.1 (Síndrome do manguito rotador) + Cirurgia Robótica → S460 (Traumatismo de tendão do manguito rotador)
(3, 26, 3, 3236, true, 'Em cirurgia robótica para M75.1, S460 é requerido para documentação completa');

-- Nota: Os IDs utilizados são:
-- primary_cid_id = 26 (M75.1 - Síndrome do manguito rotador)
-- surgical_approach_id = 1 (Videoartroscopia)
-- surgical_approach_id = 2 (Cirurgia Aberta)
-- surgical_approach_id = 3 (Cirurgia Robótica)
-- extra_cid_id = 3236 (S460 - Traumatismo de tendão do manguito rotador do ombro)

-- Resetar sequência (se necessário)
SELECT setval('cid_surgical_approach_extra_cids_id_seq', (SELECT MAX(id) FROM cid_surgical_approach_extra_cids));

-- Verificar dados inseridos
SELECT COUNT(*) as total_cids_extras FROM cid_surgical_approach_extra_cids;

-- Verificar associações criadas
SELECT 
    csaec.id,
    cc1.code as primary_cid,
    cc1.description as primary_description,
    sa.name as surgical_approach,
    cc2.code as extra_cid,
    cc2.description as extra_description,
    csaec.is_required,
    csaec.notes
FROM cid_surgical_approach_extra_cids csaec
JOIN cid_codes cc1 ON csaec.primary_cid_id = cc1.id
JOIN surgical_approaches sa ON csaec.surgical_approach_id = sa.id
JOIN cid_codes cc2 ON csaec.extra_cid_id = cc2.id
ORDER BY csaec.id;