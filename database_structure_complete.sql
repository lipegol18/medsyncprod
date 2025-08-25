--
-- MedSync - Complete Database Structure
-- PostgreSQL database structure for medical authorization platform
--

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
-- Custom Types
--

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

CREATE TYPE public.cid_laterality AS ENUM (
    'esquerdo',
    'direito',
    'bilateral',
    'indeterminado'
);

CREATE TYPE public.cidades_rj AS ENUM (
    'Rio de Janeiro',
    'São Gonçalo',
    'Niterói'
);

CREATE TYPE public.notification_type AS ENUM (
    'info',
    'warning',
    'success'
);

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

CREATE TYPE public.procedure_laterality AS ENUM (
    'esquerdo',
    'direito',
    'bilateral',
    'indeterminado'
);

CREATE TYPE public.procedure_type AS ENUM (
    'eletiva',
    'urgencia'
);

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
-- Tables
--

-- Roles table
CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    permissions public.permission[] DEFAULT '{}'::public.permission[],
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;

-- Users table
CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password character varying(255) NOT NULL,
    email character varying(100) NOT NULL,
    name character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    role_id integer NOT NULL,
    crm integer,
    active boolean DEFAULT true,
    phone character varying(20),
    specialty character varying(100),
    address text,
    city character varying(100),
    state character varying(2),
    zip_code character varying(10),
    birth_date date,
    logo_url text,
    signature_note text
);

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;

-- Municipalities table
CREATE TABLE public.municipalities (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    state_code character varying(2) NOT NULL,
    ibge_code character varying(7),
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE public.municipalities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.municipalities_id_seq OWNED BY public.municipalities.id;

-- Hospitals table
CREATE TABLE public.hospitals (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    business_name character varying(255),
    cnpj character varying(18),
    municipality_id integer,
    address text,
    phone character varying(20),
    email character varying(100),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    active boolean DEFAULT true
);

CREATE SEQUENCE public.hospitals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.hospitals_id_seq OWNED BY public.hospitals.id;

-- User Hospital Associations table
CREATE TABLE public.user_hospital_associations (
    id integer NOT NULL,
    user_id integer NOT NULL,
    hospital_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE public.user_hospital_associations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.user_hospital_associations_id_seq OWNED BY public.user_hospital_associations.id;

-- Health Insurance Operators table
CREATE TABLE public.health_insurance_operators (
    id integer NOT NULL,
    registro_ans character varying(10) NOT NULL,
    cd_plano character varying(10) NOT NULL,
    nm_plano character varying(255),
    modalidade character varying(100),
    segmentacao character varying(100),
    acomodacao character varying(100),
    tipo_contratacao character varying(100),
    abrangencia_geografica character varying(100),
    situacao character varying(50),
    dt_inicio_comercializacao character varying(50),
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE public.health_insurance_operators_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.health_insurance_operators_id_seq OWNED BY public.health_insurance_operators.id;

-- Patients table
CREATE TABLE public.patients (
    id integer NOT NULL,
    full_name character varying(255) NOT NULL,
    cpf character varying(14),
    birth_date date,
    phone character varying(20),
    email character varying(100),
    address text,
    municipality_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    gender character varying(10),
    emergency_contact character varying(255),
    emergency_phone character varying(20),
    insurance_number character varying(50),
    plan character varying(255)
);

CREATE SEQUENCE public.patients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.patients_id_seq OWNED BY public.patients.id;

-- CID Codes table
CREATE TABLE public.cid_codes (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    description text NOT NULL,
    category public.cid_categories DEFAULT 'Outros'::public.cid_categories,
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE public.cid_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.cid_codes_id_seq OWNED BY public.cid_codes.id;

-- Procedures table
CREATE TABLE public.procedures (
    id integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    active boolean DEFAULT true,
    porte character varying(10),
    custo_operacional character varying(20),
    porte_anestesista character varying(10),
    numero_auxiliares integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE public.procedures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.procedures_id_seq OWNED BY public.procedures.id;

-- CID CBHPM Associations table
CREATE TABLE public.cid_cbhpm_associations (
    id integer NOT NULL,
    cid_code_id integer NOT NULL,
    procedure_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE public.cid_cbhpm_associations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.cid_cbhpm_associations_id_seq OWNED BY public.cid_cbhpm_associations.id;

-- OPME Items table
CREATE TABLE public.opme_items (
    id integer NOT NULL,
    anvisa_registration_number character varying(50),
    process_number character varying(50),
    technical_name character varying(500) NOT NULL,
    commercial_name character varying(500) NOT NULL,
    risk_class character varying(10),
    registration_holder character varying(500),
    manufacturer_name character varying(500),
    model character varying(200),
    catalogue_number character varying(100),
    gtin_ean character varying(20),
    is_valid boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE public.opme_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.opme_items_id_seq OWNED BY public.opme_items.id;

-- Suppliers table
CREATE TABLE public.suppliers (
    id integer NOT NULL,
    company_name character varying(255) NOT NULL,
    trade_name character varying(255),
    cnpj character varying(18) NOT NULL,
    municipality_id integer NOT NULL,
    address text,
    phone character varying(20),
    email character varying(100),
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;

-- OPME Suppliers table
CREATE TABLE public.opme_suppliers (
    id integer NOT NULL,
    company_name character varying(255) NOT NULL,
    trade_name character varying(255),
    cnpj character varying(18) NOT NULL,
    municipality_id integer NOT NULL,
    address text,
    phone character varying(20),
    email character varying(100),
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE public.opme_suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.opme_suppliers_id_seq OWNED BY public.opme_suppliers.id;

-- Medical Orders table
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
    procedure_type public.procedure_type,
    medical_report_url text,
    additional_notes text,
    complexity text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    cid_laterality public.cid_laterality,
    procedure_laterality public.cid_laterality,
    secondary_procedure_lateralities text[],
    status_code public.status_code DEFAULT 'em_preenchimento'::public.status_code NOT NULL,
    exam_images_url text[],
    exam_image_count integer DEFAULT 0,
    clinical_justification text,
    multiple_cid_ids integer[] DEFAULT '{}'::integer[],
    supplier_ids integer[],
    order_pdf_url text,
    received_value integer
);

CREATE SEQUENCE public.medical_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.medical_orders_id_seq OWNED BY public.medical_orders.id;

-- Notifications table
CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    type public.notification_type DEFAULT 'info'::public.notification_type,
    read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;

--
-- Primary Keys
--

ALTER TABLE ONLY public.roles ADD CONSTRAINT roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.municipalities ADD CONSTRAINT municipalities_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.hospitals ADD CONSTRAINT hospitals_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_hospital_associations ADD CONSTRAINT user_hospital_associations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.health_insurance_operators ADD CONSTRAINT health_insurance_operators_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.patients ADD CONSTRAINT patients_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.cid_codes ADD CONSTRAINT cid_codes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.procedures ADD CONSTRAINT procedures_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.cid_cbhpm_associations ADD CONSTRAINT cid_cbhpm_associations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.opme_items ADD CONSTRAINT opme_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.suppliers ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.opme_suppliers ADD CONSTRAINT opme_suppliers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.medical_orders ADD CONSTRAINT medical_orders_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

--
-- Unique Constraints
--

ALTER TABLE ONLY public.roles ADD CONSTRAINT roles_name_key UNIQUE (name);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_username_key UNIQUE (username);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE ONLY public.municipalities ADD CONSTRAINT municipalities_ibge_code_key UNIQUE (ibge_code);
ALTER TABLE ONLY public.hospitals ADD CONSTRAINT hospitals_cnpj_key UNIQUE (cnpj);
ALTER TABLE ONLY public.user_hospital_associations ADD CONSTRAINT user_hospital_associations_user_id_hospital_id_key UNIQUE (user_id, hospital_id);
ALTER TABLE ONLY public.health_insurance_operators ADD CONSTRAINT health_insurance_operators_registro_ans_cd_plano_key UNIQUE (registro_ans, cd_plano);
ALTER TABLE ONLY public.patients ADD CONSTRAINT patients_cpf_key UNIQUE (cpf);
ALTER TABLE ONLY public.cid_codes ADD CONSTRAINT cid_codes_code_key UNIQUE (code);
ALTER TABLE ONLY public.procedures ADD CONSTRAINT procedures_code_key UNIQUE (code);
ALTER TABLE ONLY public.cid_cbhpm_associations ADD CONSTRAINT cid_cbhpm_associations_cid_code_id_procedure_id_key UNIQUE (cid_code_id, procedure_id);
ALTER TABLE ONLY public.suppliers ADD CONSTRAINT suppliers_cnpj_key UNIQUE (cnpj);
ALTER TABLE ONLY public.opme_suppliers ADD CONSTRAINT opme_suppliers_cnpj_key UNIQUE (cnpj);

--
-- Foreign Key Constraints
--

ALTER TABLE ONLY public.users ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);
ALTER TABLE ONLY public.hospitals ADD CONSTRAINT hospitals_municipality_id_fkey FOREIGN KEY (municipality_id) REFERENCES public.municipalities(id);
ALTER TABLE ONLY public.user_hospital_associations ADD CONSTRAINT user_hospital_associations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_hospital_associations ADD CONSTRAINT user_hospital_associations_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.patients ADD CONSTRAINT patients_municipality_id_fkey FOREIGN KEY (municipality_id) REFERENCES public.municipalities(id);
ALTER TABLE ONLY public.cid_cbhpm_associations ADD CONSTRAINT cid_cbhpm_associations_cid_code_id_fkey FOREIGN KEY (cid_code_id) REFERENCES public.cid_codes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.cid_cbhpm_associations ADD CONSTRAINT cid_cbhpm_associations_procedure_id_fkey FOREIGN KEY (procedure_id) REFERENCES public.procedures(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.suppliers ADD CONSTRAINT suppliers_municipality_id_fkey FOREIGN KEY (municipality_id) REFERENCES public.municipalities(id);
ALTER TABLE ONLY public.opme_suppliers ADD CONSTRAINT opme_suppliers_municipality_id_fkey FOREIGN KEY (municipality_id) REFERENCES public.municipalities(id);
ALTER TABLE ONLY public.medical_orders ADD CONSTRAINT medical_orders_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);
ALTER TABLE ONLY public.medical_orders ADD CONSTRAINT medical_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.medical_orders ADD CONSTRAINT medical_orders_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id);
ALTER TABLE ONLY public.medical_orders ADD CONSTRAINT medical_orders_procedure_id_fkey FOREIGN KEY (procedure_id) REFERENCES public.procedures(id);
ALTER TABLE ONLY public.medical_orders ADD CONSTRAINT medical_orders_cid_code_id_fkey FOREIGN KEY (cid_code_id) REFERENCES public.cid_codes(id);
ALTER TABLE ONLY public.medical_orders ADD CONSTRAINT medical_orders_procedure_cbhpm_id_fkey FOREIGN KEY (procedure_cbhpm_id) REFERENCES public.procedures(id);
ALTER TABLE ONLY public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Indexes
--

CREATE INDEX idx_users_role_id ON public.users USING btree (role_id);
CREATE INDEX idx_users_active ON public.users USING btree (active);
CREATE INDEX idx_hospitals_municipality_id ON public.hospitals USING btree (municipality_id);
CREATE INDEX idx_hospitals_active ON public.hospitals USING btree (active);
CREATE INDEX idx_patients_municipality_id ON public.patients USING btree (municipality_id);
CREATE INDEX idx_patients_cpf ON public.patients USING btree (cpf);
CREATE INDEX idx_cid_codes_code ON public.cid_codes USING btree (code);
CREATE INDEX idx_cid_codes_category ON public.cid_codes USING btree (category);
CREATE INDEX idx_procedures_code ON public.procedures USING btree (code);
CREATE INDEX idx_procedures_active ON public.procedures USING btree (active);
CREATE INDEX idx_medical_orders_patient_id ON public.medical_orders USING btree (patient_id);
CREATE INDEX idx_medical_orders_user_id ON public.medical_orders USING btree (user_id);
CREATE INDEX idx_medical_orders_hospital_id ON public.medical_orders USING btree (hospital_id);
CREATE INDEX idx_medical_orders_status_code ON public.medical_orders USING btree (status_code);
CREATE INDEX idx_medical_orders_created_at ON public.medical_orders USING btree (created_at);
CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);
CREATE INDEX idx_notifications_read ON public.notifications USING btree (read);

--
-- Set sequence owners and default values
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);
ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);
ALTER TABLE ONLY public.municipalities ALTER COLUMN id SET DEFAULT nextval('public.municipalities_id_seq'::regclass);
ALTER TABLE ONLY public.hospitals ALTER COLUMN id SET DEFAULT nextval('public.hospitals_id_seq'::regclass);
ALTER TABLE ONLY public.user_hospital_associations ALTER COLUMN id SET DEFAULT nextval('public.user_hospital_associations_id_seq'::regclass);
ALTER TABLE ONLY public.health_insurance_operators ALTER COLUMN id SET DEFAULT nextval('public.health_insurance_operators_id_seq'::regclass);
ALTER TABLE ONLY public.patients ALTER COLUMN id SET DEFAULT nextval('public.patients_id_seq'::regclass);
ALTER TABLE ONLY public.cid_codes ALTER COLUMN id SET DEFAULT nextval('public.cid_codes_id_seq'::regclass);
ALTER TABLE ONLY public.procedures ALTER COLUMN id SET DEFAULT nextval('public.procedures_id_seq'::regclass);
ALTER TABLE ONLY public.cid_cbhpm_associations ALTER COLUMN id SET DEFAULT nextval('public.cid_cbhpm_associations_id_seq'::regclass);
ALTER TABLE ONLY public.opme_items ALTER COLUMN id SET DEFAULT nextval('public.opme_items_id_seq'::regclass);
ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);
ALTER TABLE ONLY public.opme_suppliers ALTER COLUMN id SET DEFAULT nextval('public.opme_suppliers_id_seq'::regclass);
ALTER TABLE ONLY public.medical_orders ALTER COLUMN id SET DEFAULT nextval('public.medical_orders_id_seq'::regclass);
ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);

--
-- End of database structure
--