-- MedSync Database Validation Script
-- Run this script after restoration to verify data integrity

-- 1. Check all tables exist
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 2. Verify data counts
SELECT 
    'users' as table_name, 
    COUNT(*) as record_count,
    'Expected: 10-20' as expected_range
FROM users
UNION ALL
SELECT 
    'medical_orders', 
    COUNT(*),
    'Expected: 180+' 
FROM medical_orders
UNION ALL
SELECT 
    'patients', 
    COUNT(*),
    'Expected: 50+' 
FROM patients
UNION ALL
SELECT 
    'hospitals', 
    COUNT(*),
    'Expected: 100+' 
FROM hospitals
UNION ALL
SELECT 
    'cbhpm_procedures', 
    COUNT(*),
    'Expected: 8000+' 
FROM procedures
UNION ALL
SELECT 
    'cid_codes', 
    COUNT(*),
    'Expected: 10000+' 
FROM cid_codes
UNION ALL
SELECT 
    'suppliers', 
    COUNT(*),
    'Expected: 100+' 
FROM suppliers
UNION ALL
SELECT 
    'opme_items', 
    COUNT(*),
    'Expected: 1000+' 
FROM opme_items
ORDER BY table_name;

-- 3. Check foreign key constraints
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- 4. Check sequences are properly set
SELECT 
    s.schemaname,
    s.sequencename,
    s.last_value,
    t.max_id,
    CASE 
        WHEN s.last_value >= t.max_id THEN 'OK'
        ELSE 'NEEDS RESET'
    END as status
FROM pg_sequences s
LEFT JOIN (
    SELECT 
        'users_id_seq' as seq_name,
        MAX(id) as max_id
    FROM users
    UNION ALL
    SELECT 
        'medical_orders_id_seq',
        MAX(id)
    FROM medical_orders
    UNION ALL
    SELECT 
        'patients_id_seq',
        MAX(id)
    FROM patients
    UNION ALL
    SELECT 
        'hospitals_id_seq',
        MAX(id)
    FROM hospitals
    UNION ALL
    SELECT 
        'procedures_id_seq',
        MAX(id)
    FROM procedures
    UNION ALL
    SELECT 
        'cid_codes_id_seq',
        MAX(id)
    FROM cid_codes
    UNION ALL
    SELECT 
        'suppliers_id_seq',
        MAX(id)
    FROM suppliers
    UNION ALL
    SELECT 
        'opme_items_id_seq',
        MAX(id)
    FROM opme_items
) t ON s.sequencename = t.seq_name
WHERE s.schemaname = 'public'
ORDER BY s.sequencename;

-- 5. Check indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 6. Check user roles and permissions
SELECT 
    u.id,
    u.username,
    u.email,
    u.name,
    r.name as role_name,
    u.active,
    u.created_at
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
ORDER BY u.id;

-- 7. Check recent medical orders
SELECT 
    mo.id,
    mo.created_at,
    p.name as patient_name,
    h.name as hospital_name,
    u.name as doctor_name,
    os.name as status_name
FROM medical_orders mo
LEFT JOIN patients p ON mo.patient_id = p.id
LEFT JOIN hospitals h ON mo.hospital_id = h.id
LEFT JOIN users u ON mo.user_id = u.id
LEFT JOIN order_statuses os ON mo.status_id = os.id
ORDER BY mo.created_at DESC
LIMIT 10;

-- 8. Check database size
SELECT 
    pg_database.datname,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
WHERE datname = current_database();

-- 9. Check for any data corruption
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_dead_tup as dead_tuples
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 10. Test basic application queries
-- Check authentication flow
SELECT 
    COUNT(*) as active_users,
    COUNT(CASE WHEN last_login > NOW() - INTERVAL '7 days' THEN 1 END) as recent_logins
FROM users 
WHERE active = true;

-- Check medical orders with relationships
SELECT 
    mo.id,
    COUNT(DISTINCT moc.cid_code_id) as cid_count,
    COUNT(DISTINCT mop.procedure_id) as procedure_count,
    COUNT(DISTINCT moo.opme_item_id) as opme_count,
    COUNT(DISTINCT mos.supplier_id) as supplier_count
FROM medical_orders mo
LEFT JOIN medical_order_cids moc ON mo.id = moc.order_id
LEFT JOIN medical_order_procedures mop ON mo.id = mop.order_id
LEFT JOIN medical_order_opme_items moo ON mo.id = moo.order_id
LEFT JOIN medical_order_suppliers mos ON mo.id = mos.order_id
GROUP BY mo.id
ORDER BY mo.id DESC
LIMIT 5;

-- Success message
SELECT 'Database validation completed successfully!' as message;