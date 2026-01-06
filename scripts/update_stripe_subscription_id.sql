-- Script para atualizar o campo stripe_subscription_id na tabela users
-- Execute este script diretamente no banco de dados de desenvolvimento

BEGIN;

-- 1. Verificar o estado atual do campo stripe_subscription_id
SELECT 
    id,
    username,
    email,
    name,
    stripe_customer_id,
    stripe_subscription_id,
    subscription_status,
    subscription_start_date,
    subscription_end_date,
    trial_status
FROM users 
WHERE stripe_subscription_id IS NOT NULL 
   OR stripe_customer_id IS NOT NULL
   OR subscription_status IS NOT NULL;

-- 2. Limpar valores existentes de stripe_subscription_id se necessário
-- (descomente se quiser resetar todos os valores)
-- UPDATE users 
-- SET stripe_subscription_id = NULL 
-- WHERE stripe_subscription_id IS NOT NULL;

-- 3. Atualizar stripe_subscription_id baseado em critérios específicos
-- Exemplo: Definir um ID de assinatura padrão para usuários ativos com stripe_customer_id
UPDATE users 
SET 
    stripe_subscription_id = CASE 
        -- Se já tem customer_id e está com subscription ativa
        WHEN stripe_customer_id IS NOT NULL 
             AND subscription_status = 'active' 
             AND stripe_subscription_id IS NULL 
        THEN CONCAT('sub_', LOWER(REPLACE(username, '.', '_')), '_', EXTRACT(EPOCH FROM NOW())::bigint)
        
        -- Se tem trial ativo e não tem subscription_id
        WHEN trial_status = 'active' 
             AND stripe_subscription_id IS NULL 
             AND stripe_customer_id IS NOT NULL
        THEN CONCAT('sub_trial_', LOWER(REPLACE(username, '.', '_')), '_', EXTRACT(EPOCH FROM NOW())::bigint)
        
        -- Manter valor existente se já tem
        ELSE stripe_subscription_id
    END,
    
    -- Atualizar também o subscription_status se necessário
    subscription_status = CASE
        WHEN stripe_customer_id IS NOT NULL 
             AND subscription_status IS NULL 
             AND trial_status = 'active'
        THEN 'trialing'
        
        WHEN stripe_customer_id IS NOT NULL 
             AND subscription_status IS NULL 
        THEN 'active'
        
        ELSE subscription_status
    END,
    
    -- Atualizar updated_at
    updated_at = NOW()

WHERE 
    -- Aplicar apenas para usuários que precisam de atualização
    (stripe_customer_id IS NOT NULL AND stripe_subscription_id IS NULL)
    OR (subscription_status IS NULL AND stripe_customer_id IS NOT NULL);

-- 4. Verificar os resultados da atualização
SELECT 
    id,
    username,
    email,
    stripe_customer_id,
    stripe_subscription_id,
    subscription_status,
    trial_status,
    updated_at
FROM users 
WHERE stripe_subscription_id IS NOT NULL 
   OR stripe_customer_id IS NOT NULL
ORDER BY updated_at DESC;

-- 5. Estatísticas finais
SELECT 
    COUNT(*) as total_users,
    COUNT(stripe_customer_id) as users_with_customer_id,
    COUNT(stripe_subscription_id) as users_with_subscription_id,
    COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as active_subscriptions,
    COUNT(CASE WHEN subscription_status = 'trialing' THEN 1 END) as trial_subscriptions
FROM users;

COMMIT;

-- Em caso de erro, fazer rollback:
-- ROLLBACK;