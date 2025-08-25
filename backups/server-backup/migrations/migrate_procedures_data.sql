-- Script para migração dos dados existentes para a nova estrutura
-- Este script migra os procedimentos de medical_orders para medical_order_procedures

DO $$
DECLARE
    order_record RECORD;
    proc_id INTEGER;
    proc_quantity INTEGER;
    i INTEGER;
    main_procedure_id INTEGER;
    main_procedure_porte VARCHAR;
    current_porte VARCHAR;
    max_porte_value INTEGER;
    current_porte_value INTEGER;
BEGIN
    -- Iterar por todos os pedidos que têm procedimentos
    FOR order_record IN 
        SELECT id, procedure_cbhpm_id, procedure_cbhpm_quantity, 
               secondary_procedure_ids, secondary_procedure_quantities
        FROM medical_orders 
        WHERE procedure_cbhpm_id IS NOT NULL OR 
              (secondary_procedure_ids IS NOT NULL AND array_length(secondary_procedure_ids, 1) > 0)
    LOOP
        RAISE NOTICE 'Processando pedido ID: %', order_record.id;
        
        main_procedure_id := NULL;
        max_porte_value := 0;
        
        -- Função para converter porte em valor numérico para comparação
        CREATE OR REPLACE FUNCTION get_porte_value(porte_text VARCHAR) RETURNS INTEGER AS '
        DECLARE
            numero INTEGER;
            letra VARCHAR(1);
            valor_letra INTEGER;
        BEGIN
            IF porte_text IS NULL OR porte_text = '''' THEN
                RETURN 0;
            END IF;
            
            -- Extrair número e letra (ex: "10C" -> numero: 10, letra: "C")
            numero := COALESCE(SUBSTRING(porte_text FROM ''^(\d+)'')::INTEGER, 0);
            letra := UPPER(COALESCE(SUBSTRING(porte_text FROM ''\d+([A-Za-z])$''), ''A''));
            
            -- Converter letra para valor numérico (A=1, B=2, C=3, etc.)
            valor_letra := ASCII(letra) - ASCII(''A'') + 1;
            
            -- Retornar valor combinado: (número * 100) + valor da letra
            RETURN (numero * 100) + valor_letra;
        END;
        ' LANGUAGE plpgsql;
        
        -- 1. Inserir procedimento principal se existir
        IF order_record.procedure_cbhpm_id IS NOT NULL THEN
            -- Buscar porte do procedimento principal
            SELECT porte INTO main_procedure_porte 
            FROM procedure_cbhpm 
            WHERE id = order_record.procedure_cbhpm_id;
            
            max_porte_value := get_porte_value(main_procedure_porte);
            main_procedure_id := order_record.procedure_cbhpm_id;
            
            INSERT INTO medical_order_procedures (
                order_id, procedure_id, quantity_requested, status, is_main
            ) VALUES (
                order_record.id, 
                order_record.procedure_cbhpm_id, 
                COALESCE(order_record.procedure_cbhpm_quantity, 1),
                'em_analise',
                true  -- Temporariamente true, será ajustado depois
            );
            
            RAISE NOTICE 'Inserido procedimento principal ID: % (Porte: %)', order_record.procedure_cbhpm_id, main_procedure_porte;
        END IF;
        
        -- 2. Inserir procedimentos secundários se existirem
        IF order_record.secondary_procedure_ids IS NOT NULL AND 
           array_length(order_record.secondary_procedure_ids, 1) > 0 THEN
            
            FOR i IN 1..array_length(order_record.secondary_procedure_ids, 1) LOOP
                proc_id := order_record.secondary_procedure_ids[i];
                proc_quantity := COALESCE(order_record.secondary_procedure_quantities[i], 1);
                
                -- Buscar porte do procedimento secundário
                SELECT porte INTO current_porte 
                FROM procedure_cbhpm 
                WHERE id = proc_id;
                
                current_porte_value := get_porte_value(current_porte);
                
                -- Verificar se este procedimento tem porte maior que o atual principal
                IF current_porte_value > max_porte_value THEN
                    max_porte_value := current_porte_value;
                    main_procedure_id := proc_id;
                END IF;
                
                INSERT INTO medical_order_procedures (
                    order_id, procedure_id, quantity_requested, status, is_main
                ) VALUES (
                    order_record.id, 
                    proc_id, 
                    proc_quantity,
                    'em_analise',
                    false  -- Será ajustado depois
                );
                
                RAISE NOTICE 'Inserido procedimento secundário ID: % (Porte: %)', proc_id, current_porte;
            END LOOP;
        END IF;
        
        -- 3. Ajustar qual é o procedimento principal (maior porte)
        IF main_procedure_id IS NOT NULL THEN
            -- Primeiro, marcar todos como não principais
            UPDATE medical_order_procedures 
            SET is_main = false 
            WHERE order_id = order_record.id;
            
            -- Depois, marcar apenas o de maior porte como principal
            UPDATE medical_order_procedures 
            SET is_main = true 
            WHERE order_id = order_record.id 
            AND procedure_id = main_procedure_id;
            
            RAISE NOTICE 'Procedimento principal definido: ID % (maior porte)', main_procedure_id;
        END IF;
        
    END LOOP;
    
    -- Limpar função temporária
    DROP FUNCTION IF EXISTS get_porte_value(VARCHAR);
    
    RAISE NOTICE 'Migração concluída com sucesso!';
END $$;