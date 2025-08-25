-- =====================================================
-- SCRIPT 01: SURGICAL APPROACHES (CONDUTAS CIRÚRGICAS)
-- =====================================================
-- Tabela: surgical_approaches
-- Descrição: Condutas cirúrgicas disponíveis no sistema
-- Ordem de execução: 1º

-- Limpar dados existentes (opcional)
-- DELETE FROM surgical_approaches;

-- Inserir condutas cirúrgicas
INSERT INTO surgical_approaches (id, name, description) VALUES
(1, 'Videoartroscopia', 'Cirurgia minimamente invasiva realizada através de pequenas incisões com auxílio de câmera'),
(2, 'Cirurgia Aberta', 'Procedimento cirúrgico convencional com incisão direta para acesso à área a ser tratada'),
(3, 'Cirurgia Robótica', 'Procedimento assistido por robô cirúrgico com alta precisão'),
(4, 'Microcirurgia', 'Técnica cirúrgica realizada com magnificação óptica para estruturas muito pequenas'),
(5, 'Cirurgia Endoscópica', 'Procedimento realizado através de endoscópio com visualização interna'),
(6, 'Artroscopia', 'Procedimento cirúrgico minimamente invasivo realizado através de pequenas incisões com auxílio de artroscópio para visualização e tratamento de estruturas articulares'),
(7, 'Cirurgia aberta', 'Procedimento cirúrgico convencional com incisão direta ampla para acesso completo à área a ser tratada, permitindo visualização direta das estruturas'),
(8, 'Guiado por USG', 'Procedimento realizado com orientação ultrassonográfica em tempo real para maior precisão e segurança na localização de estruturas anatômicas'),
(9, 'Latarjet', 'Técnica cirúrgica para tratamento da instabilidade anterior do ombro através da transferência do processo coracóide para a margem glenoidal anterior'),
(10, 'LAC', 'Ligamentoplastia do Ligamento Cruzado Anterior, procedimento para reconstrução do LCA utilizando enxerto autólogo ou heterólogo'),
(11, 'Artropatia', 'Procedimento cirúrgico para tratamento de doenças articulares degenerativas, incluindo artroplastias parciais ou totais'),
(12, 'Fratura', 'Tratamento cirúrgico de fraturas ósseas através de redução aberta e fixação interna com diversos métodos de síntese'),
(13, 'Revisão', 'Procedimento cirúrgico secundário para correção, substituição ou reparo de cirurgia prévia que apresentou complicações ou falha'),
(14, 'Osteossíntese', 'Técnica cirúrgica para fixação de fragmentos ósseos utilizando materiais de síntese como placas, parafusos, fios ou hastes'),
(15, 'Placa e parafusos', 'Método de fixação interna utilizando placas metálicas fixadas com parafusos para estabilização de fraturas ou osteotomias'),
(16, 'Haste intramedular', 'Técnica de osteossíntese utilizando haste inserida no canal medular do osso para tratamento de fraturas diafisárias'),
(17, 'Infiltração', 'Procedimento minimamente invasivo para administração de medicamentos (corticoides, anestésicos, viscosuplementação) diretamente na articulação ou tecidos periarticulares');

-- Resetar sequência (se necessário)
SELECT setval('surgical_approaches_id_seq', (SELECT MAX(id) FROM surgical_approaches));

-- Verificar dados inseridos
SELECT COUNT(*) as total_condutas FROM surgical_approaches;