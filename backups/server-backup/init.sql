-- MedSync Database Initialization Script
-- This script creates the initial database structure

-- Create database if it doesn't exist
-- Note: In Docker, this is handled by POSTGRES_DB environment variable

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'America/Sao_Paulo';

-- Create initial admin user (password: admin123)
-- This will be done after Drizzle schema is applied
-- INSERT INTO users (username, email, password_hash, user_type) 
-- VALUES ('admin', 'admin@medsync.com', '$2b$10$...', 'admin');

-- Create indexes for performance
-- These will be created by Drizzle migrations

-- Set default permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO medsync_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO medsync_user;

-- Log initialization
\echo 'MedSync database initialization completed'