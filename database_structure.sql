--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.5

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
-- Name: cid_categories; Type: TYPE; Schema: public; Owner: -
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


--
-- Name: cid_laterality; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cid_laterality AS ENUM (
    'esquerdo',
    'direito',
    'bilateral',
    'indeterminado'
);


--
-- Name: cidades_rj; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cidades_rj AS ENUM (
    'Rio de Janeiro',
    'São Gonçalo',
    'Niterói'
);


--
-- Name: notification_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_type AS ENUM (
    'info',
    'warning',
    'success'
);


--
-- Name: permission; Type: TYPE; Schema: public; Owner: -
--

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


--
-- Name: procedure_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.procedure_type AS ENUM (
    'internacao',
    'ambulatorial',
    'eletiva',
    'urgencia'
);


--
-- Name: uf; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.uf AS ENUM (
    'RJ',
    'SP',
    'MG'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: medical_orders; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: COLUMN medical_orders.clinical_justification; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.medical_orders.clinical_justification IS 'Sugestão de justificativa clínica para o procedimento';


--
-- Name: COLUMN medical_orders.multiple_cid_ids; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.medical_orders.multiple_cid_ids IS 'Array de IDs de códigos CID-10 adicionais relacionados ao pedido';


--
-- Name: COLUMN medical_orders.received_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.medical_orders.received_value IS 'Valor recebido pela cirurgia em centavos';


--
-- Name: create_medical_order(integer, integer, integer, integer, date, text, text, integer, text, integer, integer, text, integer[], integer[], text[], integer[], integer[], text, text[], integer, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_medical_order(p_patient_id integer, p_user_id integer, p_hospital_id integer, p_procedure_id integer, p_procedure_date date, p_report_content text, p_clinical_indication text, p_cid_code_id integer, p_cid_laterality text, p_procedure_cbhpm_id integer, p_procedure_cbhpm_quantity integer, p_procedure_laterality text, p_secondary_procedure_ids integer[], p_secondary_procedure_quantities integer[], p_secondary_procedure_lateralities text[], p_opme_item_ids integer[], p_opme_item_quantities integer[], p_procedure_type text, p_exam_images_url text[], p_exam_image_count integer, p_medical_report_url text, p_additional_notes text, p_status_code text, p_complexity text) RETURNS SETOF public.medical_orders
    LANGUAGE plpgsql
    AS $$
DECLARE
    new_order_id INTEGER;
    result medical_orders%ROWTYPE;
BEGIN
    INSERT INTO medical_orders (
        patient_id, 
        user_id, 
        hospital_id, 
        procedure_id, 
        procedure_date,
        report_content, 
        clinical_indication, 
        cid_code_id, 
        cid_laterality,
        procedure_cbhpm_id, 
        procedure_cbhpm_quantity, 
        procedure_laterality,
        secondary_procedure_ids, 
        secondary_procedure_quantities, 
        secondary_procedure_lateralities,
        opme_item_ids, 
        opme_item_quantities, 
        procedure_type,
        exam_images_url, 
        exam_image_count, 
        medical_report_url, 
        additional_notes,
        status_code, 
        complexity
    ) VALUES (
        p_patient_id,
        p_user_id,
        p_hospital_id,
        p_procedure_id,
        p_procedure_date,
        p_report_content,
        p_clinical_indication,
        p_cid_code_id,
        p_cid_laterality,
        p_procedure_cbhpm_id,
        p_procedure_cbhpm_quantity,
        p_procedure_laterality,
        p_secondary_procedure_ids,
        p_secondary_procedure_quantities,
        p_secondary_procedure_lateralities,
        p_opme_item_ids,
        p_opme_item_quantities,
        p_procedure_type,
        p_exam_images_url,
        p_exam_image_count,
        p_medical_report_url,
        p_additional_notes,
        p_status_code,
        p_complexity
    ) RETURNING id INTO new_order_id;
    
    SELECT * INTO result FROM medical_orders WHERE id = new_order_id;
    RETURN NEXT result;
    RETURN;
END;
$$;


--
-- Name: brazilian_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brazilian_states (
    id integer NOT NULL,
    state_code character(2) NOT NULL,
    name character varying(50) NOT NULL,
    ibge_code integer NOT NULL,
    region character varying(20) NOT NULL
);


--
-- Name: brazilian_states_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.brazilian_states_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: brazilian_states_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.brazilian_states_id_seq OWNED BY public.brazilian_states.id;


--
-- Name: cid_cbhpm_associations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cid_cbhpm_associations (
    id integer NOT NULL,
    cid_code_id integer NOT NULL,
    procedure_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: cid_cbhpm_associations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cid_cbhpm_associations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cid_cbhpm_associations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cid_cbhpm_associations_id_seq OWNED BY public.cid_cbhpm_associations.id;


--
-- Name: cid_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cid_codes (
    id integer NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    category public.cid_categories DEFAULT 'Outros'::public.cid_categories NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: cid_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cid_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cid_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cid_codes_id_seq OWNED BY public.cid_codes.id;


--
-- Name: contact_messages; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: contact_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contact_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contact_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contact_messages_id_seq OWNED BY public.contact_messages.id;


--
-- Name: doctor_hospitals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doctor_hospitals (
    id integer NOT NULL,
    user_id integer NOT NULL,
    hospital_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: doctor_hospitals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.doctor_hospitals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: doctor_hospitals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.doctor_hospitals_id_seq OWNED BY public.doctor_hospitals.id;


--
-- Name: doctor_patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doctor_patients (
    id integer NOT NULL,
    doctor_id integer NOT NULL,
    patient_id integer NOT NULL,
    associated_at timestamp without time zone DEFAULT now() NOT NULL,
    notes text,
    is_active boolean DEFAULT true
);


--
-- Name: doctor_patients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.doctor_patients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: doctor_patients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.doctor_patients_id_seq OWNED BY public.doctor_patients.id;


--
-- Name: health_insurance_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_insurance_plans (
    id integer NOT NULL,
    registro_ans text NOT NULL,
    cd_plano text NOT NULL,
    modalidade text,
    segmentacao text,
    acomodacao text,
    tipo_contratacao text,
    abrangencia_geografica text,
    situacao text,
    dt_inicio_comercializacao text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    nm_plano text
);


--
-- Name: health_insurance_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.health_insurance_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: health_insurance_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.health_insurance_plans_id_seq OWNED BY public.health_insurance_plans.id;


--
-- Name: health_insurance_providers; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: health_insurance_providers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.health_insurance_providers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: health_insurance_providers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.health_insurance_providers_id_seq OWNED BY public.health_insurance_providers.id;


--
-- Name: hospitals; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: hospitals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hospitals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hospitals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hospitals_id_seq OWNED BY public.hospitals.id;


--
-- Name: medical_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.medical_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: medical_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.medical_orders_id_seq OWNED BY public.medical_orders.id;


--
-- Name: municipalities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.municipalities (
    id integer NOT NULL,
    name text NOT NULL,
    ibge_code integer NOT NULL,
    state_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: municipalities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.municipalities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: municipalities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.municipalities_id_seq OWNED BY public.municipalities.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer,
    message text NOT NULL,
    type public.notification_type DEFAULT 'info'::public.notification_type NOT NULL,
    read boolean DEFAULT false NOT NULL,
    link text,
    entity_type text,
    entity_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: opme_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opme_items (
    id integer NOT NULL,
    anvisa_registration_number character varying(255),
    process_number character varying(255),
    technical_name character varying(255) NOT NULL,
    commercial_name character varying(255) NOT NULL,
    risk_class character varying(255),
    holder_cnpj character varying(255),
    registration_holder character varying(255),
    manufacturer_name character varying(255),
    country_of_manufacture character varying(255),
    registration_date date,
    expiration_date date,
    is_valid boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: opme_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.opme_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: opme_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.opme_items_id_seq OWNED BY public.opme_items.id;


--
-- Name: opme_suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opme_suppliers (
    id integer NOT NULL,
    opme_item_id integer NOT NULL,
    supplier_id integer NOT NULL,
    registration_anvisa character varying(30),
    commercial_description text,
    is_preferred boolean DEFAULT false,
    active boolean DEFAULT true,
    unit_price numeric(10,2),
    last_price_update date,
    delivery_time_days integer,
    minimum_quantity integer DEFAULT 1,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: opme_suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.opme_suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: opme_suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.opme_suppliers_id_seq OWNED BY public.opme_suppliers.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    opme_item_id integer NOT NULL,
    quantity integer DEFAULT 1 NOT NULL
);


--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: order_statuses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_statuses (
    code text NOT NULL,
    name text NOT NULL,
    display_order integer NOT NULL,
    color text,
    icon text
);


--
-- Name: patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patients (
    id integer NOT NULL,
    full_name text NOT NULL,
    cpf text NOT NULL,
    birth_date date NOT NULL,
    gender text NOT NULL,
    email text,
    phone text,
    phone2 text,
    insurance text,
    insurance_number text,
    plan text,
    notes text,
    is_active boolean DEFAULT false,
    activated_by text
);


--
-- Name: patients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.patients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: patients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.patients_id_seq OWNED BY public.patients.id;


--
-- Name: procedures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.procedures (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    code text DEFAULT 'CBHPM-0000'::text NOT NULL,
    active boolean DEFAULT true,
    porte text,
    custo_operacional text,
    numero_auxiliares integer,
    porte_anestesista text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: procedures_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.procedures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: procedures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.procedures_id_seq OWNED BY public.procedures.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id integer NOT NULL,
    role_id integer NOT NULL,
    permission public.permission NOT NULL
);


--
-- Name: role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.role_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: scanned_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scanned_documents (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    document_type text NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: scanned_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.scanned_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: scanned_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.scanned_documents_id_seq OWNED BY public.scanned_documents.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    company_name character varying(255) NOT NULL,
    trade_name character varying(255),
    cnpj character varying(18) NOT NULL,
    municipality_id integer NOT NULL,
    address character varying(255),
    neighborhood character varying(100),
    postal_code character varying(9),
    phone character varying(20),
    email character varying(100),
    website character varying(150),
    anvisa_code character varying(30),
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_permissions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    permission public.permission NOT NULL,
    granted boolean NOT NULL
);


--
-- Name: user_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_permissions_id_seq OWNED BY public.user_permissions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    email text DEFAULT 'temp@example.com'::text NOT NULL,
    role_id integer,
    active boolean DEFAULT true,
    last_login timestamp without time zone,
    password_reset_token text,
    password_reset_expires timestamp without time zone,
    failed_login_attempts integer DEFAULT 0,
    lockout_until timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_doctor boolean DEFAULT false,
    crm integer,
    consent_accepted timestamp without time zone,
    signature_url text,
    logo_url text
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: brazilian_states id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brazilian_states ALTER COLUMN id SET DEFAULT nextval('public.brazilian_states_id_seq'::regclass);


--
-- Name: cid_cbhpm_associations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cid_cbhpm_associations ALTER COLUMN id SET DEFAULT nextval('public.cid_cbhpm_associations_id_seq'::regclass);


--
-- Name: cid_codes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cid_codes ALTER COLUMN id SET DEFAULT nextval('public.cid_codes_id_seq'::regclass);


--
-- Name: contact_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_messages ALTER COLUMN id SET DEFAULT nextval('public.contact_messages_id_seq'::regclass);


--
-- Name: doctor_hospitals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_hospitals ALTER COLUMN id SET DEFAULT nextval('public.doctor_hospitals_id_seq'::regclass);


--
-- Name: doctor_patients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_patients ALTER COLUMN id SET DEFAULT nextval('public.doctor_patients_id_seq'::regclass);


--
-- Name: health_insurance_plans id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_insurance_plans ALTER COLUMN id SET DEFAULT nextval('public.health_insurance_plans_id_seq'::regclass);


--
-- Name: health_insurance_providers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_insurance_providers ALTER COLUMN id SET DEFAULT nextval('public.health_insurance_providers_id_seq'::regclass);


--
-- Name: hospitals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hospitals ALTER COLUMN id SET DEFAULT nextval('public.hospitals_id_seq'::regclass);


--
-- Name: medical_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_orders ALTER COLUMN id SET DEFAULT nextval('public.medical_orders_id_seq'::regclass);


--
-- Name: municipalities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipalities ALTER COLUMN id SET DEFAULT nextval('public.municipalities_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: opme_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opme_items ALTER COLUMN id SET DEFAULT nextval('public.opme_items_id_seq'::regclass);


--
-- Name: opme_suppliers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opme_suppliers ALTER COLUMN id SET DEFAULT nextval('public.opme_suppliers_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: patients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients ALTER COLUMN id SET DEFAULT nextval('public.patients_id_seq'::regclass);


--
-- Name: procedures id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedures ALTER COLUMN id SET DEFAULT nextval('public.procedures_id_seq'::regclass);


--
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: scanned_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scanned_documents ALTER COLUMN id SET DEFAULT nextval('public.scanned_documents_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: user_permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions ALTER COLUMN id SET DEFAULT nextval('public.user_permissions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: brazilian_states brazilian_states_ibge_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brazilian_states
    ADD CONSTRAINT brazilian_states_ibge_code_key UNIQUE (ibge_code);


--
-- Name: brazilian_states brazilian_states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brazilian_states
    ADD CONSTRAINT brazilian_states_pkey PRIMARY KEY (id);


--
-- Name: brazilian_states brazilian_states_state_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brazilian_states
    ADD CONSTRAINT brazilian_states_state_code_key UNIQUE (state_code);


--
-- Name: cid_cbhpm_associations cid_cbhpm_associations_cid_code_id_procedure_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cid_cbhpm_associations
    ADD CONSTRAINT cid_cbhpm_associations_cid_code_id_procedure_id_key UNIQUE (cid_code_id, procedure_id);


--
-- Name: cid_cbhpm_associations cid_cbhpm_associations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cid_cbhpm_associations
    ADD CONSTRAINT cid_cbhpm_associations_pkey PRIMARY KEY (id);


--
-- Name: cid_codes cid_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cid_codes
    ADD CONSTRAINT cid_codes_code_key UNIQUE (code);


--
-- Name: cid_codes cid_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cid_codes
    ADD CONSTRAINT cid_codes_pkey PRIMARY KEY (id);


--
-- Name: contact_messages contact_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);


--
-- Name: doctor_hospitals doctor_hospitals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_hospitals
    ADD CONSTRAINT doctor_hospitals_pkey PRIMARY KEY (id);


--
-- Name: doctor_patients doctor_patients_doctor_id_patient_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_patients
    ADD CONSTRAINT doctor_patients_doctor_id_patient_id_key UNIQUE (doctor_id, patient_id);


--
-- Name: doctor_patients doctor_patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_patients
    ADD CONSTRAINT doctor_patients_pkey PRIMARY KEY (id);


--
-- Name: health_insurance_plans health_insurance_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_insurance_plans
    ADD CONSTRAINT health_insurance_plans_pkey PRIMARY KEY (id);


--
-- Name: health_insurance_providers health_insurance_providers_ans_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_insurance_providers
    ADD CONSTRAINT health_insurance_providers_ans_code_key UNIQUE (ans_code);


--
-- Name: health_insurance_providers health_insurance_providers_cnpj_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_insurance_providers
    ADD CONSTRAINT health_insurance_providers_cnpj_key UNIQUE (cnpj);


--
-- Name: health_insurance_providers health_insurance_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_insurance_providers
    ADD CONSTRAINT health_insurance_providers_pkey PRIMARY KEY (id);


--
-- Name: hospitals hospitals_cnpj_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hospitals
    ADD CONSTRAINT hospitals_cnpj_unique UNIQUE (cnpj);


--
-- Name: hospitals hospitals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hospitals
    ADD CONSTRAINT hospitals_pkey PRIMARY KEY (id);


--
-- Name: medical_orders medical_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_orders
    ADD CONSTRAINT medical_orders_pkey PRIMARY KEY (id);


--
-- Name: municipalities municipalities_ibge_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipalities
    ADD CONSTRAINT municipalities_ibge_code_key UNIQUE (ibge_code);


--
-- Name: municipalities municipalities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipalities
    ADD CONSTRAINT municipalities_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: opme_items opme_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opme_items
    ADD CONSTRAINT opme_items_pkey PRIMARY KEY (id);


--
-- Name: opme_suppliers opme_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opme_suppliers
    ADD CONSTRAINT opme_suppliers_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_statuses order_statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_statuses
    ADD CONSTRAINT order_statuses_pkey PRIMARY KEY (code);


--
-- Name: patients patients_cpf_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_cpf_unique UNIQUE (cpf);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: procedures procedures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedures
    ADD CONSTRAINT procedures_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: scanned_documents scanned_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scanned_documents
    ADD CONSTRAINT scanned_documents_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: suppliers suppliers_cnpj_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_cnpj_key UNIQUE (cnpj);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: procedures unique_procedure_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedures
    ADD CONSTRAINT unique_procedure_code UNIQUE (code);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: idx_doctor_patients_doctor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctor_patients_doctor_id ON public.doctor_patients USING btree (doctor_id);


--
-- Name: idx_doctor_patients_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctor_patients_patient_id ON public.doctor_patients USING btree (patient_id);


--
-- Name: idx_health_insurance_plans_cd_plano; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_health_insurance_plans_cd_plano ON public.health_insurance_plans USING btree (cd_plano);


--
-- Name: idx_health_insurance_plans_registro_ans; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_health_insurance_plans_registro_ans ON public.health_insurance_plans USING btree (registro_ans);


--
-- Name: idx_health_insurance_plans_segmentacao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_health_insurance_plans_segmentacao ON public.health_insurance_plans USING btree (segmentacao);


--
-- Name: idx_health_insurance_providers_ans_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_health_insurance_providers_ans_code ON public.health_insurance_providers USING btree (ans_code);


--
-- Name: idx_notifications_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_read ON public.notifications USING btree (read);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: cid_cbhpm_associations cid_cbhpm_associations_cid_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cid_cbhpm_associations
    ADD CONSTRAINT cid_cbhpm_associations_cid_code_id_fkey FOREIGN KEY (cid_code_id) REFERENCES public.cid_codes(id) ON DELETE CASCADE;


--
-- Name: cid_cbhpm_associations cid_cbhpm_associations_procedure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cid_cbhpm_associations
    ADD CONSTRAINT cid_cbhpm_associations_procedure_id_fkey FOREIGN KEY (procedure_id) REFERENCES public.procedures(id) ON DELETE CASCADE;


--
-- Name: contact_messages contact_messages_responded_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_responded_by_id_fkey FOREIGN KEY (responded_by_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: contact_messages contact_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: doctor_hospitals doctor_hospitals_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_hospitals
    ADD CONSTRAINT doctor_hospitals_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id) ON DELETE CASCADE;


--
-- Name: doctor_hospitals doctor_hospitals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_hospitals
    ADD CONSTRAINT doctor_hospitals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: doctor_patients doctor_patients_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_patients
    ADD CONSTRAINT doctor_patients_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: doctor_patients doctor_patients_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctor_patients
    ADD CONSTRAINT doctor_patients_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: medical_orders fk_medical_orders_status; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_orders
    ADD CONSTRAINT fk_medical_orders_status FOREIGN KEY (status_code) REFERENCES public.order_statuses(code);


--
-- Name: medical_orders medical_orders_cid_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_orders
    ADD CONSTRAINT medical_orders_cid_code_id_fkey FOREIGN KEY (cid_code_id) REFERENCES public.cid_codes(id);


--
-- Name: medical_orders medical_orders_hospital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_orders
    ADD CONSTRAINT medical_orders_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id);


--
-- Name: medical_orders medical_orders_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_orders
    ADD CONSTRAINT medical_orders_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: medical_orders medical_orders_procedure_cbhpm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_orders
    ADD CONSTRAINT medical_orders_procedure_cbhpm_id_fkey FOREIGN KEY (procedure_cbhpm_id) REFERENCES public.procedures(id);


--
-- Name: medical_orders medical_orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medical_orders
    ADD CONSTRAINT medical_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: municipalities municipalities_state_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.municipalities
    ADD CONSTRAINT municipalities_state_id_fkey FOREIGN KEY (state_id) REFERENCES public.brazilian_states(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: opme_suppliers opme_suppliers_opme_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opme_suppliers
    ADD CONSTRAINT opme_suppliers_opme_item_id_fkey FOREIGN KEY (opme_item_id) REFERENCES public.opme_items(id);


--
-- Name: opme_suppliers opme_suppliers_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opme_suppliers
    ADD CONSTRAINT opme_suppliers_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: suppliers suppliers_municipality_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_municipality_id_fkey FOREIGN KEY (municipality_id) REFERENCES public.municipalities(id) ON DELETE CASCADE;


--
-- Name: user_permissions user_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- PostgreSQL database dump complete
--

