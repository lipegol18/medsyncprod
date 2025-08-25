-- =====================================================
-- SCRIPT 06: SURGICAL APPROACH × SUPPLIERS (CONDUTA-FORNECEDORES)
-- =====================================================
-- Tabela: surgical_approach_suppliers
-- Descrição: Associações entre condutas cirúrgicas e fornecedores
-- Ordem de execução: 6º (após surgical_approaches)
-- Dependências: surgical_approaches, suppliers

-- Limpar dados existentes (opcional)
-- DELETE FROM surgical_approach_suppliers;

-- Inserir associações Conduta × Fornecedor
INSERT INTO surgical_approach_suppliers (id, surgical_approach_id, supplier_id, priority, is_preferred, contract_number, price_range, notes) VALUES
-- Videoartroscopia (surgical_approach_id = 1)
(1, 1, 1, 1, true, 'CTRX-2024-001', 'R$ 5000-15000', 'Arthrex Brasil - fornecedor principal para videoartroscopia'),
(2, 1, 2, 2, false, 'PS-2024-002', 'R$ 4500-12000', 'Porto Surgical - fornecedor alternativo'),
(3, 1, 3, 3, false, 'SIM-2024-003', 'R$ 4000-11000', 'SIM Medical - terceira opção'),

-- Cirurgia Aberta (surgical_approach_id = 2)
(4, 2, 4, 1, true, 'NI-2024-004', 'R$ 8000-25000', 'Next Implantes - especialista em cirurgia aberta'),
(5, 2, 5, 2, false, 'GB-2024-005', 'R$ 7500-22000', 'Globus Medical - fornecedor alternativo'),
(6, 2, 6, 3, false, 'ON-2024-006', 'R$ 7000-20000', 'Ortoneuro - terceira opção'),

-- Cirurgia Robótica (surgical_approach_id = 3)
(7, 3, 7, 1, true, 'CONMED-2024-007', 'R$ 15000-40000', 'Conmed - especialista em cirurgia robótica'),
(8, 3, 8, 2, false, 'SINTEX-2024-008', 'R$ 12000-35000', 'Sintex Medical - fornecedor alternativo'),
(9, 3, 1, 3, false, 'CTRX-2024-009', 'R$ 10000-30000', 'Arthrex Brasil - terceira opção robótica');

-- Nota: Os IDs de fornecedores são baseados nos dados existentes
-- Supplier IDs correspondem aos registros na tabela suppliers
-- priority: 1 = Principal, 2 = Alternativo, 3 = Terceira opção
-- is_preferred: true para fornecedor principal de cada conduta

-- Resetar sequência (se necessário)
SELECT setval('surgical_approach_suppliers_id_seq', (SELECT MAX(id) FROM surgical_approach_suppliers));

-- Verificar dados inseridos
SELECT COUNT(*) as total_associacoes FROM surgical_approach_suppliers;

-- Verificar associações criadas
SELECT 
    sas.id,
    sa.name as surgical_approach,
    s.company_name as supplier,
    sas.priority,
    sas.is_preferred,
    sas.contract_number,
    sas.price_range,
    sas.notes
FROM surgical_approach_suppliers sas
JOIN surgical_approaches sa ON sas.surgical_approach_id = sa.id
JOIN suppliers s ON sas.supplier_id = s.id
ORDER BY sas.id;