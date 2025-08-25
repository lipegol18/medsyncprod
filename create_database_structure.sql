-- ================================================================
-- SCRIPT DE CRIAÇÃO COMPLETA DO BANCO DE DADOS MEDSYNC
-- Versão: PostgreSQL 16.9
-- Data: 2025-06-10
-- ================================================================

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

-- ================================================================
-- CRIAÇÃO DOS TIPOS ENUM CUSTOMIZADOS
-- ================================================================

-- Categorias CID-10
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

-- Lateralidade para procedimentos
CREATE TYPE public.cid_laterality AS ENUM (
    'esquerdo',
    'direito',
    'bilateral',
    'indeterminado'
);

-- Cidades do Rio de Janeiro
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
    'orders_view',
    'orders_create',
    'orders_edit',
    'orders_delete',
    'catalog_view',
    'catalog_create',
    'catalog_edit',
    'catalog_delete',
    'reports_view',
    'reports_create',
    'reports_export',
    'users_view',
    'users_create',
    'users_edit',
    'users_delete',
    'roles_view',
    'roles_create',
    'roles_edit',
    'roles_delete',
    'system_settings'
);

-- Tipos de procedimento
CREATE TYPE public.procedure_type AS ENUM (
    'internacao',
    'ambulatorial',
    'eletiva',
    'urgencia'
);

-- Estados (UF)
CREATE TYPE public.uf AS ENUM (
    'RJ',
    'SP',
    'MG'
);

-- ================================================================
-- CRIAÇÃO DAS TABELAS PRINCIPAIS
-- ================================================================

-- Tabela: Estados Brasileiros
CREATE TABLE public.brazilian_states (
    id integer NOT NULL,
    state_code character(2) NOT NULL,
    name character varying(50) NOT NULL,
    ibge_code integer NOT NULL,
    region character varying(20) NOT NULL
);

CREATE SEQUENCE public.brazilian_states_id_seq
    AS integer START WITH 1 INCREMENT BY 1
    NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.brazilian_states_id_seq OWNED BY public.brazilian_states.id;

-- Tabela: Municípios
CREATE TABLE public.municipalities (
    id integer NOT NULL,
    name text NOT NULL,
    ibge_code integer NOT NULL,
    state_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.municipalities_id_seq
    AS integer START WITH 1 INCREMENT BY 1
    NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.municipalities_id_seq OWNED BY public.municipalities.id;

-- Tabela: Códigos CID-10
CREATE TABLE public.cid_codes (
    id integer NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    category public.cid_categories DEFAULT 'Outros'::public.cid_categories NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.cid_codes_id_seq
    AS integer START WITH 1 INCREMENT BY 1
    NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.cid_codes_id_seq OWNED BY public.cid_codes.id;

-- Tabela: Procedimentos CBHPM
CREATE TABLE public.procedures_cbhpm (
    id integer NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    unit text,
    value_ch decimal(10,2),
    value_us decimal(10,2),
    value_usp decimal(10,2),
    category text,
    subcategory text,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.procedures_cbhpm_id_seq
    AS integer START WITH 1 INCREMENT BY 1
    NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.procedures_cbhpm_id_seq OWNED BY public.procedures_cbhpm.id;

-- Tabela: Associações CID-CBHPM
CREATE TABLE public.cid_cbhpm_associations (
    id integer NOT NULL,
    cid_code_id integer NOT NULL,
    procedure_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.cid_cbhpm_associations_id_seq
    AS integer START WITH 1 INCREMENT BY 1
    NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.cid_cbhpm_associations_id_seq OWNED BY public.cid_cbhpm_associations.id;

-- Tabela: Hospitais
CREATE TABLE public.hospitals (
    id integer NOT NULL,
    name text NOT NULL,
    cnpj text NOT NULL,
    uf text NOT NULL,
    business_name text,
    cnes text,
    city public.cidades_rj,
    cep text,
    address text,
    number integer,
    logo_url text
);

CREATE SEQUENCE public.hospitals_id_seq
    AS integer START WITH 1 INCREMENT BY 1
    NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.hospitals_id_seq OWNED BY public.hospitals.id;

-- Tabela: Operadoras de Saúde
CREATE TABLE public.health_insurance_providers (
    id integer NOT NULL,
    name text NOT NULL,
    cnpj text NOT NULL,
    ans_code text NOT NULL,
    address text,
    city text,
    state text,
    zip_code text,
    phone text,
    email text,
    website text,
    contact_person text,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.health_insurance_providers_id_seq
    AS integer START WITH 1 INCREMENT BY 1
    NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.health_insurance_providers_id_seq OWNED BY public.health_insurance_providers.id;

-- Tabela: Planos de Saúde
CREATE TABLE public.health_insurance_plans (
    id integer NOT NULL,
    registro_ans text NOT NULL,
    cd_plano text NOT NULL,
    nm_plano text,
    modalidade text,
    segmentacao text,
    acomodacao text,
    tipo_contratacao text,
    abrangencia_geografica text,
    situacao text,
    dt_inicio_comercializacao text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.health_insurance_plans_id_seq
    AS integer START WITH 1 INCREMENT BY 1
    NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.health_insurance_plans_id_seq OWNED BY public.health_insurance_plans.id;

-- Tabela: Fornecedores
CREATE TABLE public.suppliers (
    id integer NOT NULL,
    name text NOT NULL,
    cnpj text,
    address text,
    city text,
    state text,
    zip_code text,
    phone text,
    email text,
    contact_person text,
    specialty text,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.suppliers_id_seq
    AS integer START WITH 1 INCREMENT BY 1
    NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;

-- Tabela: Itens OPME
CREATE TABLE public.opme_items (
    id integer NOT NULL,
    anvisa_registration_number text,
    process_number text,
    technical_name text NOT NULL,
    commercial_name text NOT NULL,
    risk_class text,
    company_name text,
    company_cnpj text,
    due_date text,
    product_status text,
    expiration_date text,
    is_valid boolean,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.opme_items_id_seq
    AS integer START WITH 1 INCREMENT BY 1
    NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.opme_items_id_seq OWNED BY public.opme_items.id;

-- Tabela: Roles/Funções
CREATE TABLE public.roles (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    permissions public.permission[] DEFAULT '{}'::public.permission[],
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.roles_id_seq
    AS integer START WITH 1 INCREMENT BY 1
    NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;

-- Tabela: Usuários
CREATE TABLE public.users (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    username text NOT NULL,
    password text NOT NULL,
    role_id integer NOT NULL,
    crm integer,
    specialty text,
    phone text,
    address text,
    city text,
    state text,
    zip_code text,
    profile_picture_url text,
    logo_url text
);

CREATE SEQUENCE public.users_id_seq
    AS integer START WITH 1 INCREMENT BY 1
    NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;

-- Tabela: Pacientes
CREATE TABLE public.patients (
    id integer NOT NULL,
    full_name text NOT NULL,
    cpf text NOT NULL,
    birth_date date NOT NULL,
    gender character(1) NOT NULL,
    email text,
    phone text,
    phone2 text,
    insurance text,
    insurance_number text,
    plan text,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.patients_id_seq
    AS integer START WITH 1 INCREMENT BY 1
    NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.patients_id_seq OWNED BY public.patients.id;

-- Tabela: Associações Médico-Hospital
CREATE TABLE public.doctor_hospitals (
    id integer NOT NULL,
    user_id integer NOT NULL,
    hospital_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.doctor_hospitals_id_seq
    AS integer START WITH 1 INCREMENT BY 1
    NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.doctor_hospitals_id_seq OWNED BY public.doctor_hospitals.id;

-- Tabela: Associações Médico-Paciente
CREATE TABLE public.doctor_patients (
    id integer NOT NULL,
    doctor_id integer NOT NULL,
    patient_id integer NOT NULL,
    associated_at timestamp without time zone DEFAULT now() NOT NULL,
    notes text,
    is_active boolean DEFAULT true
);

CREATE SEQUENCE public.doctor_patients_id_seq
    AS integer START WITH 1 INCREMENT BY 1
    NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.doctor_patients_id_seq OWNED BY public.doctor_patients.id;

-- Tabela: Pedidos Médicos (Principal)
CREATE TABLE public.medical_orders (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    user_id integer NOT NULL,
    hospital_id integer,
    procedure_id integer NOT NULL,
    procedure_date date,
    report_content text,
    clinical_indication text NOT NULL,
    cid_code_id integer,
    procedure_cbhpm_id integer,
    procedure_cbhpm_quantity integer DEFAULT 1,
    secondary_procedure_ids integer[],
    secondary_procedure_quantities integer[],
    opme_item_ids integer[],
    opme_item_quantities integer[],
    procedure_type text,
    medical_report_url text,
    additional_notes text,
    complexity text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    cid_laterality public.cid_laterality,
    procedure_laterality public.cid_laterality,
    secondary_procedure_lateralities text[],
    status_code text DEFAULT 'em_preenchimento'::text NOT NULL,
    exam_images_url text[],
    exam_image_count integer DEFAULT 0,
    clinical_justification text,
    multiple_cid_ids integer[] DEFAULT '{}'::integer[],
    supplier_ids integer[],
    order_pdf_url text,
    received_value integer
);

CREATE SEQUENCE public.medical_orders_id_seq
    AS integer START WITH 1 INCREMENT BY 1
    NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.medical_orders_id_seq OWNED BY public.medical_orders.id;

-- Comentários nas colunas importantes
COMMENT ON COLUMN public.medical_orders.clinical_justification IS 'Sugestão de justificativa clínica para o procedimento';
COMMENT ON COLUMN public.medical_orders.multiple_cid_ids IS 'Array de IDs de códigos CID-10 adicionais relacionados ao pedido';
COMMENT ON COLUMN public.medical_orders.received_value IS 'Valor recebido pela cirurgia em centavos';

-- Tabela: Notificações
CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type public.notification_type DEFAULT 'info'::public.notification_type,
    read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    read_at timestamp without time zone
);

CREATE SEQUENCE public.notifications_id_seq
    AS integer START WITH 1 INCREMENT BY 1
    NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;

-- Tabela: Mensagens de Contato
CREATE TABLE public.contact_messages (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    subject text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer,
    response_message text,
    response_date timestamp without time zone,
    responded_by_id integer
);

CREATE SEQUENCE public.contact_messages_id_seq
    AS integer START WITH 1 INCREMENT BY 1
    NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.contact_messages_id_seq OWNED BY public.contact_messages.id;

-- Tabela: Sessões
CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);

-- ================================================================
-- DEFINIÇÃO DAS CHAVES PRIMÁRIAS
-- ================================================================

ALTER TABLE ONLY public.brazilian_states ALTER COLUMN id SET DEFAULT nextval('public.brazilian_states_id_seq'::regclass);
ALTER TABLE ONLY public.cid_cbhpm_associations ALTER COLUMN id SET DEFAULT nextval('public.cid_cbhpm_associations_id_seq'::regclass);
ALTER TABLE ONLY public.cid_codes ALTER COLUMN id SET DEFAULT nextval('public.cid_codes_id_seq'::regclass);
ALTER TABLE ONLY public.contact_messages ALTER COLUMN id SET DEFAULT nextval('public.contact_messages_id_seq'::regclass);
ALTER TABLE ONLY public.doctor_hospitals ALTER COLUMN id SET DEFAULT nextval('public.doctor_hospitals_id_seq'::regclass);
ALTER TABLE ONLY public.doctor_patients ALTER COLUMN id SET DEFAULT nextval('public.doctor_patients_id_seq'::regclass);
ALTER TABLE ONLY public.health_insurance_plans ALTER COLUMN id SET DEFAULT nextval('public.health_insurance_plans_id_seq'::regclass);
ALTER TABLE ONLY public.health_insurance_providers ALTER COLUMN id SET DEFAULT nextval('public.health_insurance_providers_id_seq'::regclass);
ALTER TABLE ONLY public.hospitals ALTER COLUMN id SET DEFAULT nextval('public.hospitals_id_seq'::regclass);
ALTER TABLE ONLY public.medical_orders ALTER COLUMN id SET DEFAULT nextval('public.medical_orders_id_seq'::regclass);
ALTER TABLE ONLY public.municipalities ALTER COLUMN id SET DEFAULT nextval('public.municipalities_id_seq'::regclass);
ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);
ALTER TABLE ONLY public.opme_items ALTER COLUMN id SET DEFAULT nextval('public.opme_items_id_seq'::regclass);
ALTER TABLE ONLY public.patients ALTER COLUMN id SET DEFAULT nextval('public.patients_id_seq'::regclass);
ALTER TABLE ONLY public.procedures_cbhpm ALTER COLUMN id SET DEFAULT nextval('public.procedures_cbhpm_id_seq'::regclass);
ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);
ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);
ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);

-- ================================================================
-- CONSTRAINTS E CHAVES PRIMÁRIAS
-- ================================================================

ALTER TABLE ONLY public.brazilian_states ADD CONSTRAINT brazilian_states_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.cid_cbhpm_associations ADD CONSTRAINT cid_cbhpm_associations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.cid_codes ADD CONSTRAINT cid_codes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.contact_messages ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.doctor_hospitals ADD CONSTRAINT doctor_hospitals_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.doctor_patients ADD CONSTRAINT doctor_patients_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.health_insurance_plans ADD CONSTRAINT health_insurance_plans_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.health_insurance_providers ADD CONSTRAINT health_insurance_providers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.hospitals ADD CONSTRAINT hospitals_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.medical_orders ADD CONSTRAINT medical_orders_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.municipalities ADD CONSTRAINT municipalities_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.opme_items ADD CONSTRAINT opme_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.patients ADD CONSTRAINT patients_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.procedures_cbhpm ADD CONSTRAINT procedures_cbhpm_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.roles ADD CONSTRAINT roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.session ADD CONSTRAINT session_pkey PRIMARY KEY (sid);
ALTER TABLE ONLY public.suppliers ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);

-- ================================================================
-- CONSTRAINTS ÚNICOS
-- ================================================================

ALTER TABLE ONLY public.brazilian_states ADD CONSTRAINT brazilian_states_ibge_code_key UNIQUE (ibge_code);
ALTER TABLE ONLY public.brazilian_states ADD CONSTRAINT brazilian_states_state_code_key UNIQUE (state_code);
ALTER TABLE ONLY public.cid_codes ADD CONSTRAINT cid_codes_code_key UNIQUE (code);
ALTER TABLE ONLY public.health_insurance_providers ADD CONSTRAINT health_insurance_providers_ans_code_key UNIQUE (ans_code);
ALTER TABLE ONLY public.health_insurance_providers ADD CONSTRAINT health_insurance_providers_cnpj_key UNIQUE (cnpj);
ALTER TABLE ONLY public.hospitals ADD CONSTRAINT hospitals_cnpj_key UNIQUE (cnpj);
ALTER TABLE ONLY public.municipalities ADD CONSTRAINT municipalities_ibge_code_key UNIQUE (ibge_code);
ALTER TABLE ONLY public.patients ADD CONSTRAINT patients_cpf_key UNIQUE (cpf);
ALTER TABLE ONLY public.procedures_cbhpm ADD CONSTRAINT procedures_cbhpm_code_key UNIQUE (code);
ALTER TABLE ONLY public.roles ADD CONSTRAINT roles_name_key UNIQUE (name);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_username_key UNIQUE (username);

-- ================================================================
-- ÍNDICES PARA PERFORMANCE
-- ================================================================

CREATE INDEX idx_cid_cbhpm_associations_cid_code_id ON public.cid_cbhpm_associations USING btree (cid_code_id);
CREATE INDEX idx_cid_cbhpm_associations_procedure_id ON public.cid_cbhpm_associations USING btree (procedure_id);
CREATE INDEX idx_doctor_hospitals_hospital_id ON public.doctor_hospitals USING btree (hospital_id);
CREATE INDEX idx_doctor_hospitals_user_id ON public.doctor_hospitals USING btree (user_id);
CREATE INDEX idx_doctor_patients_doctor_id ON public.doctor_patients USING btree (doctor_id);
CREATE INDEX idx_doctor_patients_patient_id ON public.doctor_patients USING btree (patient_id);
CREATE INDEX idx_health_insurance_plans_registro_ans ON public.health_insurance_plans USING btree (registro_ans);
CREATE INDEX idx_medical_orders_hospital_id ON public.medical_orders USING btree (hospital_id);
CREATE INDEX idx_medical_orders_patient_id ON public.medical_orders USING btree (patient_id);
CREATE INDEX idx_medical_orders_procedure_id ON public.medical_orders USING btree (procedure_id);
CREATE INDEX idx_medical_orders_user_id ON public.medical_orders USING btree (user_id);
CREATE INDEX idx_municipalities_state_id ON public.municipalities USING btree (state_id);
CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);
CREATE INDEX idx_users_role_id ON public.users USING btree (role_id);
CREATE INDEX idx_session_expire ON public.session USING btree (expire);

-- ================================================================
-- CHAVES ESTRANGEIRAS (FOREIGN KEYS)
-- ================================================================

ALTER TABLE ONLY public.cid_cbhpm_associations ADD CONSTRAINT cid_cbhpm_associations_cid_code_id_fkey FOREIGN KEY (cid_code_id) REFERENCES public.cid_codes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.cid_cbhpm_associations ADD CONSTRAINT cid_cbhpm_associations_procedure_id_fkey FOREIGN KEY (procedure_id) REFERENCES public.procedures_cbhpm(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.contact_messages ADD CONSTRAINT contact_messages_responded_by_id_fkey FOREIGN KEY (responded_by_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.contact_messages ADD CONSTRAINT contact_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.doctor_hospitals ADD CONSTRAINT doctor_hospitals_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.doctor_hospitals ADD CONSTRAINT doctor_hospitals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.doctor_patients ADD CONSTRAINT doctor_patients_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.doctor_patients ADD CONSTRAINT doctor_patients_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.medical_orders ADD CONSTRAINT medical_orders_cid_code_id_fkey FOREIGN KEY (cid_code_id) REFERENCES public.cid_codes(id);
ALTER TABLE ONLY public.medical_orders ADD CONSTRAINT medical_orders_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id);
ALTER TABLE ONLY public.medical_orders ADD CONSTRAINT medical_orders_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);
ALTER TABLE ONLY public.medical_orders ADD CONSTRAINT medical_orders_procedure_cbhpm_id_fkey FOREIGN KEY (procedure_cbhpm_id) REFERENCES public.procedures_cbhpm(id);
ALTER TABLE ONLY public.medical_orders ADD CONSTRAINT medical_orders_procedure_id_fkey FOREIGN KEY (procedure_id) REFERENCES public.procedures_cbhpm(id);
ALTER TABLE ONLY public.medical_orders ADD CONSTRAINT medical_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.municipalities ADD CONSTRAINT municipalities_state_id_fkey FOREIGN KEY (state_id) REFERENCES public.brazilian_states(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.users ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);

-- ================================================================
-- FUNCTIONS/PROCEDURES
-- ================================================================

-- Função para criar pedidos médicos
CREATE OR REPLACE FUNCTION public.create_medical_order(
    p_patient_id integer, 
    p_user_id integer, 
    p_hospital_id integer, 
    p_procedure_id integer, 
    p_procedure_date date, 
    p_report_content text, 
    p_clinical_indication text, 
    p_cid_code_id integer, 
    p_cid_laterality text, 
    p_procedure_cbhpm_id integer, 
    p_procedure_cbhpm_quantity integer, 
    p_procedure_laterality text, 
    p_secondary_procedure_ids integer[], 
    p_secondary_procedure_quantities integer[], 
    p_secondary_procedure_lateralities text[], 
    p_opme_item_ids integer[], 
    p_opme_item_quantities integer[], 
    p_procedure_type text, 
    p_exam_images_url text[], 
    p_exam_image_count integer, 
    p_medical_report_url text, 
    p_additional_notes text, 
    p_status_code text, 
    p_complexity text
) RETURNS SETOF public.medical_orders
LANGUAGE plpgsql
AS $$
DECLARE
    new_order_id INTEGER;
    result medical_orders%ROWTYPE;
BEGIN
    INSERT INTO medical_orders (
        patient_id, user_id, hospital_id, procedure_id, procedure_date,
        report_content, clinical_indication, cid_code_id, cid_laterality,
        procedure_cbhpm_id, procedure_cbhpm_quantity, procedure_laterality,
        secondary_procedure_ids, secondary_procedure_quantities, secondary_procedure_lateralities,
        opme_item_ids, opme_item_quantities, procedure_type,
        exam_images_url, exam_image_count, medical_report_url, additional_notes,
        status_code, complexity
    ) VALUES (
        p_patient_id, p_user_id, p_hospital_id, p_procedure_id, p_procedure_date,
        p_report_content, p_clinical_indication, p_cid_code_id, p_cid_laterality,
        p_procedure_cbhpm_id, p_procedure_cbhpm_quantity, p_procedure_laterality,
        p_secondary_procedure_ids, p_secondary_procedure_quantities, p_secondary_procedure_lateralities,
        p_opme_item_ids, p_opme_item_quantities, p_procedure_type,
        p_exam_images_url, p_exam_image_count, p_medical_report_url, p_additional_notes,
        p_status_code, p_complexity
    ) RETURNING id INTO new_order_id;
    
    SELECT * INTO result FROM medical_orders WHERE id = new_order_id;
    RETURN NEXT result;
    RETURN;
END;
$$;

-- ================================================================
-- DADOS INICIAIS ESSENCIAIS
-- ================================================================

-- Inserir role de administrador
INSERT INTO public.roles (id, name, description, permissions) VALUES 
(1, 'Administrador', 'Acesso total ao sistema', 
 ARRAY['dashboard_view','patients_view','patients_create','patients_edit','patients_delete',
       'hospitals_view','hospitals_create','hospitals_edit','hospitals_delete',
       'orders_view','orders_create','orders_edit','orders_delete',
       'catalog_view','catalog_create','catalog_edit','catalog_delete',
       'reports_view','reports_create','reports_export',
       'users_view','users_create','users_edit','users_delete',
       'roles_view','roles_create','roles_edit','roles_delete',
       'system_settings']::public.permission[]);

-- Inserir role de médico
INSERT INTO public.roles (id, name, description, permissions) VALUES 
(2, 'Médico', 'Acesso a pacientes e pedidos médicos',
 ARRAY['dashboard_view','patients_view','patients_create','patients_edit',
       'hospitals_view','orders_view','orders_create','orders_edit',
       'catalog_view','reports_view']::public.permission[]);

-- Resetar sequences
SELECT setval('public.roles_id_seq', 2, true);

-- ================================================================
-- FIM DO SCRIPT
-- ================================================================

-- Mensagem de confirmação
DO $$
BEGIN
    RAISE NOTICE 'Base de dados MedSync criada com sucesso!';
    RAISE NOTICE 'Estrutura completa: % tabelas, % tipos enum, % funções', 
        (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'),
        (SELECT count(*) FROM pg_type WHERE typname IN ('cid_categories','cid_laterality','cidades_rj','notification_type','permission','procedure_type','uf')),
        (SELECT count(*) FROM information_schema.routines WHERE routine_schema = 'public');
END $$;