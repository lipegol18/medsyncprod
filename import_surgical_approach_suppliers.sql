-- Script de Importação para surgical_approach_suppliers
-- Dados baseados no arquivo: Pasted-PROCEDIMENTO-DESCRI-O-FORNECEDORES-Reparo-do-manguito-rotador-Artroscopia-Artrhex-Reparo-do-mangu-1753568388538_1753568388540.txt
-- Data: 26/07/2025

BEGIN;

-- Limpar dados existentes (opcional - descomente se necessário)
-- DELETE FROM surgical_approach_suppliers;

-- REPARO DO MANGUITO ROTADOR + ARTROSCOPIA (procedure_id=1, approach_id=1)
INSERT INTO surgical_approach_suppliers (surgical_procedure_id, surgical_approach_id, supplier_id, priority, is_preferred, notes) VALUES
(1, 1, 17, 10, true, 'Arthrex - Líder em artroscopia de ombro'),      -- Arthrex
(1, 1, 2, 9, false, 'Porto Surgical - Ampla gama de produtos'),       -- Porto Surgical  
(1, 1, 48, 8, false, 'Smith & Nephew - Tecnologia avançada'),         -- Smith & Nephew
(1, 1, 51, 7, false, 'ConMed - Produtos especializados'),             -- ConMed
(1, 1, 3, 6, false, 'BlueSynthes - Soluções integradas');             -- BlueSynthes

-- REPARO DO MANGUITO ROTADOR + CIRURGIA ABERTA (procedure_id=1, approach_id=2)
INSERT INTO surgical_approach_suppliers (surgical_procedure_id, surgical_approach_id, supplier_id, priority, is_preferred, notes) VALUES
(1, 2, 17, 10, true, 'Arthrex - Líder em reparo de manguito'),        -- Arthrex
(1, 2, 2, 9, false, 'Porto Surgical - Ampla gama de produtos'),       -- Porto Surgical
(1, 2, 48, 8, false, 'Smith & Nephew - Tecnologia avançada'),         -- Smith & Nephew  
(1, 2, 51, 7, false, 'ConMed - Produtos especializados'),             -- ConMed
(1, 2, 3, 6, false, 'BlueSynthes - Soluções integradas');             -- BlueSynthes

-- INFILTRAÇÃO E BLOQUEIO DO OMBRO + BLOQUEIO GUIADO POR USG (procedure_id=20, approach_id=3)
INSERT INTO surgical_approach_suppliers (surgical_procedure_id, surgical_approach_id, supplier_id, priority, is_preferred, notes) VALUES
(20, 3, 3, 10, true, 'BlueSynthes - Especialista em procedimentos guiados'),  -- BlueSynthes
(20, 3, 1, 9, false, 'Per Prima - Produtos para infiltração'),                -- PerPrima
(20, 3, 9, 8, false, 'Spine Rio - Soluções para bloqueios'),                  -- Spine Rio
(20, 3, 54, 7, false, 'GusMed - Produtos especializados');                    -- GusMed

-- LUXAÇÃO GLENOUMERAL + ARTROSCOPIA (procedure_id=2, approach_id=1)
INSERT INTO surgical_approach_suppliers (surgical_procedure_id, surgical_approach_id, supplier_id, priority, is_preferred, notes) VALUES
(2, 1, 17, 10, true, 'Arthrex - Líder em artroscopia de ombro'),      -- Arthrex
(2, 1, 2, 9, false, 'Porto Surgical - Ampla gama de produtos'),       -- Porto Surgical
(2, 1, 48, 8, false, 'Smith & Nephew - Tecnologia avançada'),         -- Smith & Nephew
(2, 1, 51, 7, false, 'ConMed - Produtos especializados'),             -- ConMed
(2, 1, 3, 6, false, 'BlueSynthes - Soluções integradas');             -- BlueSynthes

-- LUXAÇÃO GLENOUMERAL + LATARJET (procedure_id=2, approach_id=4)
INSERT INTO surgical_approach_suppliers (surgical_procedure_id, surgical_approach_id, supplier_id, priority, is_preferred, notes) VALUES
(2, 4, 17, 10, true, 'Arthrex - Especialista em Latarjet'),           -- Arthrex
(2, 4, 48, 9, false, 'Smith & Nephew - Tecnologia para Latarjet');    -- Smith & Nephew

-- LUXAÇÃO ACRÔMIO-CLAVICULAR + LAC (procedure_id=3, approach_id=15)
INSERT INTO surgical_approach_suppliers (surgical_procedure_id, surgical_approach_id, supplier_id, priority, is_preferred, notes) VALUES
(3, 15, 17, 10, true, 'Arthrex - Líder em LAC'),                      -- Arthrex
(3, 15, 48, 9, false, 'Smith & Nephew - Soluções para LAC');          -- Smith & Nephew

-- ARTROPLASTIA REVERSA DO OMBRO + ARTROPLASTIA (procedure_id=4, approach_id=6)
INSERT INTO surgical_approach_suppliers (surgical_procedure_id, surgical_approach_id, supplier_id, priority, is_preferred, notes) VALUES
(4, 6, 2, 10, true, 'Porto Surgical - Especialista em artroplastias'),        -- Porto Surgical
(4, 6, 57, 9, false, 'AtlasMed (Lima) - Próteses de qualidade'),              -- AtlasMed (Lima)
(4, 6, 59, 8, false, 'Zimmer Biomet - Tecnologia avançada'),                  -- Zimmer Biomet
(4, 6, 60, 7, false, 'UP Medical - Soluções ortopédicas');                    -- UP Medical

-- ARTROPLASTIA REVERSA DO OMBRO + FRATURA (procedure_id=4, approach_id=7)
INSERT INTO surgical_approach_suppliers (surgical_procedure_id, surgical_approach_id, supplier_id, priority, is_preferred, notes) VALUES
(4, 7, 2, 10, true, 'Porto Surgical - Especialista em fraturas'),             -- Porto Surgical
(4, 7, 57, 9, false, 'AtlasMed (Lima) - Próteses para fraturas'),             -- AtlasMed (Lima)
(4, 7, 59, 8, false, 'Zimmer Biomet - Tecnologia avançada'),                  -- Zimmer Biomet
(4, 7, 60, 7, false, 'UP Medical - Soluções ortopédicas');                    -- UP Medical

-- ARTROPLASTIA REVERSA DO OMBRO + REVISÃO (procedure_id=4, approach_id=8)
INSERT INTO surgical_approach_suppliers (surgical_procedure_id, surgical_approach_id, supplier_id, priority, is_preferred, notes) VALUES
(4, 8, 2, 10, true, 'Porto Surgical - Especialista em revisões'),             -- Porto Surgical
(4, 8, 56, 9, false, 'AtlasMed - Produtos para revisão'),                     -- AtlasMed (linha 34 mostra só "AtlasMed")
(4, 8, 59, 8, false, 'Zimmer Biomet - Tecnologia avançada'),                  -- Zimmer Biomet
(4, 8, 60, 7, false, 'UP Medical - Soluções ortopédicas');                    -- UP Medical

-- FRATURA DA ESCÁPULA + OSTEOSSÍNTESE (procedure_id=5, approach_id=9)
INSERT INTO surgical_approach_suppliers (surgical_procedure_id, surgical_approach_id, supplier_id, priority, is_preferred, notes) VALUES
(5, 9, 2, 10, true, 'Porto Surgical - Líder em osteossíntese'),               -- Porto Surgical
(5, 9, 1, 9, false, 'Per Prima - Produtos para fraturas'),                    -- PerPrima
(5, 9, 11, 8, false, 'TechBio - Tecnologia em implantes'),                    -- TechBio
(5, 9, 9, 7, false, 'Spine Rio - Soluções ortopédicas'),                      -- Spine Rio
(5, 9, 7, 6, false, 'N.O.S. - Produtos especializados');                      -- N.O.S.

-- FRATURA DA CLAVÍCULA + OSTEOSSÍNTESE (procedure_id=6, approach_id=9)
INSERT INTO surgical_approach_suppliers (surgical_procedure_id, surgical_approach_id, supplier_id, priority, is_preferred, notes) VALUES
(6, 9, 1, 10, true, 'Per Prima - Especialista em clavícula'),                 -- PerPrima
(6, 9, 7, 9, false, 'N.O.S. - Produtos especializados'),                      -- N.O.S.
(6, 9, 2, 8, false, 'Porto Surgical - Ampla gama de produtos'),               -- Porto Surgical
(6, 9, 9, 7, false, 'Spine Rio - Soluções ortopédicas');                      -- Spine Rio

-- FRATURA DO CORACÓIDE + OSTEOSSÍNTESE (procedure_id=7, approach_id=9)
INSERT INTO surgical_approach_suppliers (surgical_procedure_id, surgical_approach_id, supplier_id, priority, is_preferred, notes) VALUES
(7, 9, 1, 10, true, 'Per Prima - Especialista em coracóide'),                 -- PerPrima
(7, 9, 7, 9, false, 'N.O.S. - Produtos especializados'),                      -- N.O.S.
(7, 9, 2, 8, false, 'Porto Surgical - Ampla gama de produtos');               -- Porto Surgical

-- FRATURA DA EXTREMIDADE PROXIMAL DO ÚMERO + PLACA E PARAFUSOS (procedure_id=8, approach_id=10)
INSERT INTO surgical_approach_suppliers (surgical_procedure_id, surgical_approach_id, supplier_id, priority, is_preferred, notes) VALUES
(8, 10, 1, 10, true, 'Per Prima - Especialista em úmero proximal'),           -- PerPrima
(8, 10, 7, 9, false, 'N.O.S. - Produtos especializados'),                     -- N.O.S.
(8, 10, 2, 8, false, 'Porto Surgical - Ampla gama de produtos'),              -- Porto Surgical
(8, 10, 10, 7, false, 'RPM - Soluções ortopédicas');                          -- RPM

-- FRATURA DIAFISÁRIA DO ÚMERO + HASTE INTRAMEDULAR (procedure_id=9, approach_id=11)
INSERT INTO surgical_approach_suppliers (surgical_procedure_id, surgical_approach_id, supplier_id, priority, is_preferred, notes) VALUES
(9, 11, 7, 10, true, 'N.O.S. - Especialista em hastes'),                      -- N.O.S.
(9, 11, 2, 9, false, 'Porto Surgical - Ampla gama de produtos'),              -- Porto Surgical
(9, 11, 10, 8, false, 'RPM - Soluções ortopédicas');                          -- RPM

-- FRATURA DIAFISÁRIA DO ÚMERO + PLACA E PARAFUSOS (procedure_id=9, approach_id=10)
INSERT INTO surgical_approach_suppliers (surgical_procedure_id, surgical_approach_id, supplier_id, priority, is_preferred, notes) VALUES
(9, 10, 1, 10, true, 'Per Prima - Especialista em placas úmero'),             -- PerPrima
(9, 10, 7, 9, false, 'N.O.S. - Produtos especializados'),                     -- N.O.S.
(9, 10, 2, 8, false, 'Porto Surgical - Ampla gama de produtos'),              -- Porto Surgical
(9, 10, 10, 7, false, 'RPM - Soluções ortopédicas');                          -- RPM

-- FRATURA DA EXTREMIDADE DISTAL DO ÚMERO + PLACA E PARAFUSOS (procedure_id=10, approach_id=10)
INSERT INTO surgical_approach_suppliers (surgical_procedure_id, surgical_approach_id, supplier_id, priority, is_preferred, notes) VALUES
(10, 10, 1, 10, true, 'Per Prima - Especialista em úmero distal'),            -- PerPrima
(10, 10, 7, 9, false, 'N.O.S. - Produtos especializados'),                    -- N.O.S.
(10, 10, 2, 8, false, 'Porto Surgical - Ampla gama de produtos'),             -- Porto Surgical
(10, 10, 10, 7, false, 'RPM - Soluções ortopédicas');                         -- RPM

-- FRATURA DA CABEÇA DO RÁDIO + OSTEOSSÍNTESE (procedure_id=11, approach_id=9)
INSERT INTO surgical_approach_suppliers (surgical_procedure_id, surgical_approach_id, supplier_id, priority, is_preferred, notes) VALUES
(11, 9, 1, 10, true, 'Per Prima - Especialista em rádio'),                    -- PerPrima
(11, 9, 10, 9, false, 'RPM - Soluções ortopédicas');                          -- RPM

-- FRATURA DA CABEÇA DO RÁDIO + ARTROPLASTIA (procedure_id=11, approach_id=6)
INSERT INTO surgical_approach_suppliers (surgical_procedure_id, surgical_approach_id, supplier_id, priority, is_preferred, notes) VALUES
(11, 6, 2, 10, true, 'Porto Surgical - Especialista em artroplastias'),       -- Porto Surgical
(11, 6, 10, 9, false, 'RPM - Soluções ortopédicas');                          -- RPM

-- FRATURA DO OLÉCRANO + OSTEOSSÍNTESE (procedure_id=12, approach_id=9)
INSERT INTO surgical_approach_suppliers (surgical_procedure_id, surgical_approach_id, supplier_id, priority, is_preferred, notes) VALUES
(12, 9, 1, 10, true, 'Per Prima - Especialista em olécrano'),                 -- PerPrima
(12, 9, 7, 9, false, 'N.O.S. - Produtos especializados'),                     -- N.O.S.
(12, 9, 2, 8, false, 'Porto Surgical - Ampla gama de produtos');              -- Porto Surgical

-- RUPTURA DO PEITORAL MAIOR + CIRURGIA ABERTA (procedure_id=13, approach_id=2)
INSERT INTO surgical_approach_suppliers (surgical_procedure_id, surgical_approach_id, supplier_id, priority, is_preferred, notes) VALUES
(13, 2, 17, 10, true, 'Arthrex - Especialista em rupturas');                  -- Arthrex

-- RUPTURA DO BÍCEPS DISTAL + CIRURGIA ABERTA (procedure_id=14, approach_id=2)
INSERT INTO surgical_approach_suppliers (surgical_procedure_id, surgical_approach_id, supplier_id, priority, is_preferred, notes) VALUES
(14, 2, 17, 10, true, 'Arthrex - Especialista em rupturas');                  -- Arthrex

-- EPICONDILITE LATERAL + ARTROSCOPIA (procedure_id=15, approach_id=1)
INSERT INTO surgical_approach_suppliers (surgical_procedure_id, surgical_approach_id, supplier_id, priority, is_preferred, notes) VALUES
(15, 1, 7, 10, true, 'N.O.S. - Especialista em epicondilite'),                -- N.O.S.
(15, 1, 3, 9, false, 'BlueSynthes - Soluções integradas'),                    -- BlueSynthes
(15, 1, 2, 8, false, 'Porto Surgical - Ampla gama de produtos'),              -- Porto Surgical
(15, 1, 17, 7, false, 'Arthrex - Tecnologia avançada');                       -- Arthrex

-- EPICONDILITE LATERAL + CIRURGIA ABERTA (procedure_id=15, approach_id=2)
INSERT INTO surgical_approach_suppliers (surgical_procedure_id, surgical_approach_id, supplier_id, priority, is_preferred, notes) VALUES
(15, 2, 7, 10, true, 'N.O.S. - Especialista em epicondilite'),                -- N.O.S.
(15, 2, 3, 9, false, 'BlueSynthes - Soluções integradas'),                    -- BlueSynthes
(15, 2, 2, 8, false, 'Porto Surgical - Ampla gama de produtos'),              -- Porto Surgical
(15, 2, 17, 7, false, 'Arthrex - Tecnologia avançada');                       -- Arthrex

COMMIT;

-- Verificar total de registros inseridos
SELECT COUNT(*) as total_associations FROM surgical_approach_suppliers;

-- Verificar algumas associações de exemplo
SELECT 
    sp.name as procedure_name,
    sa.name as approach_name,
    s.trade_name as supplier_name,
    sas.priority,
    sas.is_preferred
FROM surgical_approach_suppliers sas
JOIN surgical_procedures sp ON sas.surgical_procedure_id = sp.id
JOIN surgical_approaches sa ON sas.surgical_approach_id = sa.id  
JOIN suppliers s ON sas.supplier_id = s.id
ORDER BY sp.name, sa.name, sas.priority DESC
LIMIT 20;