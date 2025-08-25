CREATE TYPE "public"."cid_categories" AS ENUM('Joelho', 'Coluna', 'Ombro', 'Quadril', 'Pé e tornozelo', 'Outros');--> statement-breakpoint
CREATE TYPE "public"."cidades_rj" AS ENUM('Rio de Janeiro', 'São Gonçalo', 'Niterói');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('em_preenchimento', 'em_avaliacao', 'aceito', 'recusado');--> statement-breakpoint
CREATE TYPE "public"."permission" AS ENUM('dashboard_view', 'patients_view', 'patients_create', 'patients_edit', 'patients_delete', 'hospitals_view', 'hospitals_create', 'hospitals_edit', 'hospitals_delete', 'orders_view', 'orders_create', 'orders_edit', 'orders_delete', 'catalog_view', 'catalog_create', 'catalog_edit', 'catalog_delete', 'reports_view', 'reports_create', 'reports_export', 'users_view', 'users_create', 'users_edit', 'users_delete', 'roles_view', 'roles_create', 'roles_edit', 'roles_delete', 'system_settings');--> statement-breakpoint
CREATE TYPE "public"."procedure_type" AS ENUM('eletiva', 'urgencia');--> statement-breakpoint
CREATE TYPE "public"."uf" AS ENUM('RJ', 'SP', 'MG');--> statement-breakpoint
CREATE TABLE "cid_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"description" text NOT NULL,
	"category" "cid_categories" DEFAULT 'Outros' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cid_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "hospitals" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"business_name" text,
	"cnpj" text NOT NULL,
	"cnes" text,
	"uf" text NOT NULL,
	"city" "cidades_rj",
	"cep" text,
	"address" text,
	"number" integer,
	CONSTRAINT "hospitals_cnpj_unique" UNIQUE("cnpj")
);
--> statement-breakpoint
CREATE TABLE "medical_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"hospital_id" integer,
	"procedure_id" integer NOT NULL,
	"procedure_date" date,
	"report_content" text,
	"clinical_indication" text NOT NULL,
	"cid_code_id" integer,
	"procedure_cbhpm_id" integer,
	"procedure_cbhpm_quantity" integer DEFAULT 1,
	"secondary_procedure_ids" integer[],
	"secondary_procedure_quantities" integer[],
	"opme_item_ids" integer[],
	"opme_item_quantities" integer[],
	"procedure_type" "procedure_type",
	"exam_image_url" text,
	"medical_report_url" text,
	"additional_image_urls" text[],
	"additional_images_count" integer DEFAULT 0,
	"additional_notes" text,
	"status" "order_status" DEFAULT 'em_preenchimento' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opme_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"manufacturer" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	CONSTRAINT "opme_items_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"opme_item_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"cpf" text NOT NULL,
	"birth_date" date NOT NULL,
	"gender" text NOT NULL,
	"email" text,
	"phone" text,
	"phone2" text,
	"insurance" text,
	"insurance_number" text,
	"plan" text,
	"notes" text,
	CONSTRAINT "patients_cpf_unique" UNIQUE("cpf")
);
--> statement-breakpoint
CREATE TABLE "procedures" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"porte" text,
	"custo_operacional" text,
	"porte_anestesista" text,
	"description" text,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "procedures_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" integer NOT NULL,
	"permission" "permission" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "scanned_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"document_type" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"cnpj" text NOT NULL,
	"contact_name" text,
	"email" text,
	"phone" text,
	"address" text,
	"city" text,
	"state" text,
	"zip_code" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"permission" "permission" NOT NULL,
	"granted" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role_id" integer NOT NULL,
	"crm" integer,
	"active" boolean DEFAULT false,
	"last_login" timestamp,
	"password_reset_token" text,
	"password_reset_expires" timestamp,
	"failed_login_attempts" integer DEFAULT 0,
	"lockout_until" timestamp,
	"consent_accepted" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "medical_orders" ADD CONSTRAINT "medical_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_orders" ADD CONSTRAINT "medical_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_orders" ADD CONSTRAINT "medical_orders_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_orders" ADD CONSTRAINT "medical_orders_cid_code_id_cid_codes_id_fk" FOREIGN KEY ("cid_code_id") REFERENCES "public"."cid_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_orders" ADD CONSTRAINT "medical_orders_procedure_cbhpm_id_procedures_id_fk" FOREIGN KEY ("procedure_cbhpm_id") REFERENCES "public"."procedures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;