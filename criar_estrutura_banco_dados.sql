--
-- MedSync - Script de Criação da Estrutura do Banco de Dados
-- Sistema de autorização médica para profissionais de saúde brasileiros
--

-- Configurações iniciais
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Tipos Personalizados
--

-- Categorias de CID-10
CREATE TYPE public.cid_categories AS ENUM (
    'Joelho',
    'Coluna',
    'Ombro',
    'Quadril',
    'Pé e tornozelo',
    'Outros',
    'Doenças Infecciosas e Parasitárias',
    'Neoplasias',
    'Doenças do Sangue e Órgãos Hematopoéticos',
    'Doenças Endócrinas e Metabólicas',
    'Transtornos Mentais e Comportamentais',
    'Doenças do Sistema Nervoso',
    'Doenças do Olho e Anexos',
    'Doenças do Ouvido',
    'Doenças do Aparelho Circulatório',
    'Doenças do Aparelho Respiratório',
    'Doenças do Aparelho Digestivo',
    'Doenças da Pele e Tecido Subcutâneo',
    'Doenças do Sistema Osteomuscular',
    'Doenças do Aparelho Geniturinário',
    'Gravidez, Parto e Puerpério',
    'Afecções Período Perinatal',
    'Malformações Congênitas',
    'Sintomas e Sinais Anormais',
    'Lesões e Envenenamentos',
    'Causas Externas',
    'Fatores que Influenciam o Estado de Saúde'
);

-- Lateralidade (esquerdo, direito, bilateral, indeterminado)
CREATE TYPE public.cid_laterality AS ENUM (
    'esquerdo',
    'direito',
    'bilateral',
    'indeterminado'
);

-- Cidades do Rio de Janeiro (pode ser expandido)
CREATE TYPE public.cidades_rj AS ENUM (
    'Rio de Janeiro',
    'São Gonçalo',
    'Niterói'
);

-- Tipos de notificação
CREATE TYPE public.notification_type AS ENUM (
    'info',
    'warning',
    'success'
);

-- Permissões do sistema
CREATE TYPE public.permission AS ENUM (
    'dashboard_view',
    'patients_view',
    'patients_create',
    'patients_edit',
    'patients_delete',
    'hospitals_view',
    'hospitals_create',
    'hospitals_edit',
    'hospitals_delete',
    'medical_orders_view',
    'medical_orders_create',
    'medical_orders_edit',
    'medical_orders_delete',
    'reports_view',
    'reports_generate',
    'users_view',
    'users_create',
    'users_edit',
    'users_delete',
    'system_admin'
);

-- Lateralidade de procedimentos
CREATE TYPE public.procedure_laterality AS ENUM (
    'esquerdo',
    'direito',
    'bilateral',
    'indeterminado'
);

-- Tipos de procedimento
CREATE TYPE public.procedure_type AS ENUM (
    'eletiva',
    'urgencia'
);

-- Status dos pedidos médicos
CREATE TYPE public.status_code AS ENUM (
    'em_preenchimento',
    'aguardando_envio',
    'enviado',
    'em_analise',
    'aprovado',
    'rejeitado',
    'cancelado'
);

--
-- TABELAS PRINCIPAIS
--

-- 1. Tabela de Perfis/Funções
CREATE TABLE public.roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    permissions public.permission[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Tabela de Municípios
CREATE TABLE public.municipalities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    state_code VARCHAR(2) NOT NULL,
    ibge_code VARCHAR(7) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Tabela de Usuários
CREATE TABLE public.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    role_id INTEGER NOT NULL REFERENCES public.roles(id),
    crm INTEGER,
    active BOOLEAN DEFAULT true,
    phone VARCHAR(20),
    specialty VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    birth_date DATE,
    logo_url TEXT,
    signature_note TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Tabela de Hospitais
CREATE TABLE public.hospitals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    business_name VARCHAR(255),
    cnpj VARCHAR(18) UNIQUE,
    municipality_id INTEGER REFERENCES public.municipalities(id),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Tabela de Associações Usuário-Hospital
CREATE TABLE public.user_hospital_associations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    hospital_id INTEGER NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, hospital_id)
);

-- 6. Tabela de Operadoras de Saúde
CREATE TABLE public.health_insurance_operators (
    id SERIAL PRIMARY KEY,
    registro_ans VARCHAR(10) NOT NULL,
    cd_plano VARCHAR(10) NOT NULL,
    nm_plano VARCHAR(255),
    modalidade VARCHAR(100),
    segmentacao VARCHAR(100),
    acomodacao VARCHAR(100),
    tipo_contratacao VARCHAR(100),
    abrangencia_geografica VARCHAR(100),
    situacao VARCHAR(50),
    dt_inicio_comercializacao VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(registro_ans, cd_plano)
);

-- 7. Tabela de Pacientes
CREATE TABLE public.patients (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE,
    birth_date DATE,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    municipality_id INTEGER REFERENCES public.municipalities(id),
    gender VARCHAR(10),
    emergency_contact VARCHAR(255),
    emergency_phone VARCHAR(20),
    insurance_number VARCHAR(50),
    plan VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. Tabela de Códigos CID-10
CREATE TABLE public.cid_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category public.cid_categories DEFAULT 'Outros',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 9. Tabela de Procedimentos CBHPM
CREATE TABLE public.procedures (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    porte VARCHAR(10),
    custo_operacional VARCHAR(20),
    porte_anestesista VARCHAR(10),
    numero_auxiliares INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 10. Tabela de Associações CID-CBHPM
CREATE TABLE public.cid_cbhpm_associations (
    id SERIAL PRIMARY KEY,
    cid_code_id INTEGER NOT NULL REFERENCES public.cid_codes(id) ON DELETE CASCADE,
    procedure_id INTEGER NOT NULL REFERENCES public.procedures(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(cid_code_id, procedure_id)
);

-- 11. Tabela de Itens OPME
CREATE TABLE public.opme_items (
    id SERIAL PRIMARY KEY,
    anvisa_registration_number VARCHAR(50),
    process_number VARCHAR(50),
    technical_name VARCHAR(500) NOT NULL,
    commercial_name VARCHAR(500) NOT NULL,
    risk_class VARCHAR(10),
    registration_holder VARCHAR(500),
    manufacturer_name VARCHAR(500),
    model VARCHAR(200),
    catalogue_number VARCHAR(100),
    gtin_ean VARCHAR(20),
    is_valid BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 12. Tabela de Fornecedores
CREATE TABLE public.suppliers (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    cnpj VARCHAR(18) NOT NULL UNIQUE,
    municipality_id INTEGER NOT NULL REFERENCES public.municipalities(id),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 13. Tabela de Fornecedores OPME
CREATE TABLE public.opme_suppliers (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    cnpj VARCHAR(18) NOT NULL UNIQUE,
    municipality_id INTEGER NOT NULL REFERENCES public.municipalities(id),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 14. Tabela de Pedidos Médicos (Principal)
CREATE TABLE public.medical_orders (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES public.patients(id),
    user_id INTEGER NOT NULL REFERENCES public.users(id),
    hospital_id INTEGER REFERENCES public.hospitals(id),
    procedure_id INTEGER NOT NULL REFERENCES public.procedures(id),
    procedure_date DATE,
    report_content TEXT,
    clinical_indication TEXT NOT NULL,
    cid_code_id INTEGER REFERENCES public.cid_codes(id),
    procedure_cbhpm_id INTEGER REFERENCES public.procedures(id),
    procedure_cbhpm_quantity INTEGER DEFAULT 1,
    secondary_procedure_ids INTEGER[],
    secondary_procedure_quantities INTEGER[],
    opme_item_ids INTEGER[],
    opme_item_quantities INTEGER[],
    procedure_type public.procedure_type,
    medical_report_url TEXT,
    additional_notes TEXT,
    complexity TEXT,
    cid_laterality public.cid_laterality,
    procedure_laterality public.cid_laterality,
    secondary_procedure_lateralities TEXT[],
    status_code public.status_code DEFAULT 'em_preenchimento' NOT NULL,
    exam_images_url TEXT[],
    exam_image_count INTEGER DEFAULT 0,
    clinical_justification TEXT,
    multiple_cid_ids INTEGER[] DEFAULT '{}',
    supplier_ids INTEGER[],
    order_pdf_url TEXT,
    received_value INTEGER,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 15. Tabela de Notificações
CREATE TABLE public.notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type public.notification_type DEFAULT 'info',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

--
-- ÍNDICES PARA PERFORMANCE
--

-- Índices para usuários
CREATE INDEX idx_users_role_id ON public.users(role_id);
CREATE INDEX idx_users_active ON public.users(active);

-- Índices para hospitais
CREATE INDEX idx_hospitals_municipality_id ON public.hospitals(municipality_id);
CREATE INDEX idx_hospitals_active ON public.hospitals(active);

-- Índices para pacientes
CREATE INDEX idx_patients_municipality_id ON public.patients(municipality_id);
CREATE INDEX idx_patients_cpf ON public.patients(cpf);

-- Índices para códigos CID
CREATE INDEX idx_cid_codes_code ON public.cid_codes(code);
CREATE INDEX idx_cid_codes_category ON public.cid_codes(category);

-- Índices para procedimentos
CREATE INDEX idx_procedures_code ON public.procedures(code);
CREATE INDEX idx_procedures_active ON public.procedures(active);

-- Índices para pedidos médicos
CREATE INDEX idx_medical_orders_patient_id ON public.medical_orders(patient_id);
CREATE INDEX idx_medical_orders_user_id ON public.medical_orders(user_id);
CREATE INDEX idx_medical_orders_hospital_id ON public.medical_orders(hospital_id);
CREATE INDEX idx_medical_orders_status_code ON public.medical_orders(status_code);
CREATE INDEX idx_medical_orders_created_at ON public.medical_orders(created_at);

-- Índices para notificações
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);

--
-- DADOS INICIAIS ESSENCIAIS
--

-- Inserir perfis padrão
INSERT INTO public.roles (name, description, permissions) VALUES 
('Administrador', 'Acesso total ao sistema', ARRAY['system_admin']::public.permission[]),
('Médico', 'Acesso para criação e gestão de pedidos médicos', ARRAY['dashboard_view','patients_view','patients_create','patients_edit','hospitals_view','medical_orders_view','medical_orders_create','medical_orders_edit']::public.permission[]),
('Assistente', 'Acesso limitado para auxiliar médicos', ARRAY['dashboard_view','patients_view','medical_orders_view']::public.permission[]);

-- Inserir alguns municípios essenciais do RJ
INSERT INTO public.municipalities (name, state_code, ibge_code) VALUES 
('Rio de Janeiro', 'RJ', '3304557'),
('Niterói', 'RJ', '3303302'),
('São Gonçalo', 'RJ', '3304904'),
('Duque de Caxias', 'RJ', '3301702'),
('Nova Iguaçu', 'RJ', '3303500');

-- Inserir usuário administrador padrão
-- Senha: admin123 (hash bcrypt)
INSERT INTO public.users (username, password, email, name, role_id, active) VALUES 
('admin', '$2b$10$rGDJr7PkYBD8.vWsOdtY5.kZvJZl0zBfJpEYx7kJWzF8yNcG8WdQa', 'admin@medsync.com', 'Administrador', 1, true);

--
-- COMENTÁRIOS NAS TABELAS
--

COMMENT ON TABLE public.roles IS 'Perfis e permissões dos usuários';
COMMENT ON TABLE public.users IS 'Usuários do sistema (médicos, assistentes, admins)';
COMMENT ON TABLE public.municipalities IS 'Municípios brasileiros com códigos IBGE';
COMMENT ON TABLE public.hospitals IS 'Hospitais e clínicas cadastrados';
COMMENT ON TABLE public.patients IS 'Pacientes cadastrados no sistema';
COMMENT ON TABLE public.cid_codes IS 'Códigos CID-10 para diagnósticos';
COMMENT ON TABLE public.procedures IS 'Procedimentos CBHPM';
COMMENT ON TABLE public.medical_orders IS 'Pedidos cirúrgicos e autorizações médicas';
COMMENT ON TABLE public.opme_items IS 'Órteses, Próteses e Materiais Especiais';
COMMENT ON TABLE public.suppliers IS 'Fornecedores de produtos médicos';
COMMENT ON TABLE public.notifications IS 'Notificações do sistema';

-- Final
SELECT 'Estrutura do banco de dados MedSync criada com sucesso!' AS status;