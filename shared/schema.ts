import { pgTable, text, serial, integer, boolean, date, timestamp, pgEnum, numeric, varchar, jsonb, unique, check, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql } from "drizzle-orm";

// Especialidades Médicas
export const medicalSpecialties = pgTable("medical_specialties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // Ex: "Ortopedista", "Neurocirurgião", "Dermatologista"
  description: text("description"), // Descrição detalhada da especialidade
  code: text("code").unique(), // Código interno da especialidade (ex: "ORTO", "NEURO")
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMedicalSpecialtySchema = createInsertSchema(medicalSpecialties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type MedicalSpecialty = typeof medicalSpecialties.$inferSelect;
export type InsertMedicalSpecialty = z.infer<typeof insertMedicalSpecialtySchema>;



// Regiões Anatômicas do Corpo Humano
export const anatomicalRegions = pgTable("anatomical_regions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // Ex: "Ombro", "Joelho", "Coluna", etc.
  title: text("title"), // Título associado à região do corpo
  description: text("description"), // Breve descrição sobre a região
});

export const insertAnatomicalRegionSchema = createInsertSchema(anatomicalRegions).omit({
  id: true,
});

export type AnatomicalRegion = typeof anatomicalRegions.$inferSelect;
export type InsertAnatomicalRegion = z.infer<typeof insertAnatomicalRegionSchema>;

// Procedimentos Cirúrgicos Médicos
export const surgicalProcedures = pgTable("surgical_procedures", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Ex: "Reparo do manguito rotador"
  description: text("description"), // Descrição opcional
  isActive: boolean("is_active").default(true),
});

export const insertSurgicalProcedureSchema = createInsertSchema(surgicalProcedures).omit({
  id: true,
});

export type SurgicalProcedure = typeof surgicalProcedures.$inferSelect;
export type InsertSurgicalProcedure = z.infer<typeof insertSurgicalProcedureSchema>;

// Tabela de Associação: Regiões Anatômicas ↔ Procedimentos Cirúrgicos (N:N)
export const anatomicalRegionProcedures = pgTable("anatomical_region_procedures", {
  id: serial("id").primaryKey(),
  anatomicalRegionId: integer("anatomical_region_id").notNull().references(() => anatomicalRegions.id, { onDelete: 'cascade' }),
  surgicalProcedureId: integer("surgical_procedure_id").notNull().references(() => surgicalProcedures.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Evita associações duplicadas
  unq: unique().on(table.anatomicalRegionId, table.surgicalProcedureId),
}));

// Relações para a tabela de associação
export const anatomicalRegionProceduresRelations = relations(anatomicalRegionProcedures, ({ one }) => ({
  anatomicalRegion: one(anatomicalRegions, {
    fields: [anatomicalRegionProcedures.anatomicalRegionId],
    references: [anatomicalRegions.id],
  }),
  surgicalProcedure: one(surgicalProcedures, {
    fields: [anatomicalRegionProcedures.surgicalProcedureId],
    references: [surgicalProcedures.id],
  }),
}));

export const insertAnatomicalRegionProcedureSchema = createInsertSchema(anatomicalRegionProcedures).omit({
  id: true,
  createdAt: true,
});

export type AnatomicalRegionProcedure = typeof anatomicalRegionProcedures.$inferSelect;
export type InsertAnatomicalRegionProcedure = z.infer<typeof insertAnatomicalRegionProcedureSchema>;

// Estados brasileiros já definidos posteriormente no arquivo

// Operadoras de Saúde (Health Insurance Providers)
export const healthInsuranceProviders = pgTable("health_insurance_providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  cnpj: text("cnpj").notNull().unique(),
  ansCode: text("ans_code").notNull().unique(), // Código ANS (Agência Nacional de Saúde)
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  contactPerson: text("contact_person"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertHealthInsuranceProviderSchema = createInsertSchema(healthInsuranceProviders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type HealthInsuranceProvider = typeof healthInsuranceProviders.$inferSelect;
export type InsertHealthInsuranceProvider = z.infer<typeof insertHealthInsuranceProviderSchema>;

// Planos de Saúde (dados oficiais ANS)
export const healthInsurancePlans = pgTable("health_insurance_plans", {
  id: serial("id").primaryKey(),
  registroAns: text("registro_ans").notNull(), // Código ANS da operadora (relaciona com health_insurance_providers.ans_code)
  cdPlano: text("cd_plano").notNull(), // Código único do plano
  nmPlano: text("nm_plano"), // Nome do plano
  modalidade: text("modalidade"), // Medicina de Grupo, Cooperativa Médica, etc.
  segmentacao: text("segmentacao"), // Ambulatorial, Hospitalar, Odontológica, Referência
  acomodacao: text("acomodacao"), // Apartamento, Enfermaria
  tipoContratacao: text("tipo_contratacao"), // Individual/Familiar, Coletivo Empresarial, etc.
  abrangenciaGeografica: text("abrangencia_geografica"), // Municipal, Estadual, Regional, Nacional
  situacao: text("situacao"), // Status do plano
  dtInicioComercializacao: text("dt_inicio_comercializacao"), // Data de início
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertHealthInsurancePlanSchema = createInsertSchema(healthInsurancePlans).omit({
  id: true,
  createdAt: true,
});

export type HealthInsurancePlan = typeof healthInsurancePlans.$inferSelect;
export type InsertHealthInsurancePlan = z.infer<typeof insertHealthInsurancePlanSchema>;

// Patient schema
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  cpf: text("cpf").notNull().unique(),
  birthDate: date("birth_date").notNull(),
  gender: text("gender").notNull(),
  email: text("email"),
  phone: text("phone"),
  phone2: text("phone2"),
  insuranceProviderId: integer("insurance_provider_id").references(() => healthInsuranceProviders.id), // Operadora de saúde
  insuranceNumber: text("insurance_number"),
  plan: text("plan"), // Plano (texto livre)
  notes: text("notes"),
  isActive: boolean("is_active").default(false), // Paciente ativo
  createdAt: timestamp("created_at").defaultNow().notNull(), // Data/hora da criação
  createdBy: integer("created_by").references(() => users.id), // Usuário que criou
  isDeleted: boolean("is_deleted").default(false).notNull(), // Soft delete: paciente foi excluído?
  deletedAt: timestamp("deleted_at"), // Data/hora da exclusão
  deletedBy: integer("deleted_by").references(() => users.id), // Usuário que excluiu
  updatedAt: timestamp("updated_at"), // Data/hora da última edição
  updatedBy: integer("updated_by").references(() => users.id), // Usuário que editou por último
});

export const insertPatientSchema = createInsertSchema(patients).pick({
  fullName: true,
  cpf: true,
  birthDate: true,
  gender: true,
  email: true,
  phone: true,
  phone2: true,
  insuranceProviderId: true,
  insuranceNumber: true,
  plan: true,
  notes: true,
  isActive: true,
});

// Patient Addresses table - separating address management from patients
export const patientAddresses = pgTable("patient_addresses", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id, { onDelete: 'cascade' }),
  isPrimary: boolean("is_primary").notNull().default(true),
  
  // Address fields
  cep: varchar("cep", { length: 9 }).notNull(), // 00000-000
  logradouro: text("logradouro").notNull(), // Street name
  numero: text("numero"), // House/building number (accepts "S/N", "123A")
  complemento: text("complemento"), // Apartment, block, etc.
  bairro: text("bairro"), // Neighborhood
  cidade: text("cidade").notNull(), // City
  uf: varchar("uf", { length: 2 }).notNull(), // State code (SP, RJ, etc.)
  country: varchar("country", { length: 2 }).notNull().default('BR'), // Country code
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations for patient addresses
export const patientAddressesRelations = relations(patientAddresses, ({ one }) => ({
  patient: one(patients, {
    fields: [patientAddresses.patientId],
    references: [patients.id],
    relationName: "patientAddresses",
  }),
}));

// Add relation from patients to addresses
export const patientsRelations = relations(patients, ({ many }) => ({
  addresses: many(patientAddresses, {
    relationName: "patientAddresses",
  }),
}));

export const insertPatientAddressSchema = createInsertSchema(patientAddresses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PatientAddress = typeof patientAddresses.$inferSelect;
export type InsertPatientAddress = z.infer<typeof insertPatientAddressSchema>;

// OPME items schema
export const opmeItems = pgTable("opme_items", {
  id: serial("id").primaryKey(),
  anvisaRegistrationNumber: text("anvisa_registration_number"),      // Número de registro ANVISA
  processNumber: text("process_number"),                            // Número do processo ANVISA
  technicalName: text("technical_name").notNull(),                  // Nome técnico (ex: "Placa bloqueada")
  commercialName: text("commercial_name").notNull(),                // Nome comercial (ex: "TARGON - Sistema de haste")
  riskClass: text("risk_class"),                                    // Classe de risco I, II, III ou IV
  holderCnpj: text("holder_cnpj"),                                  // CNPJ do detentor do registro
  registrationHolder: text("registration_holder"),                  // Nome do detentor do registro
  manufacturerName: text("manufacturer_name"),                      // Fabricante real
  countryOfManufacture: text("country_of_manufacture"),             // País de origem
  registrationDate: date("registration_date"),                      // Data de publicação do registro
  expirationDate: date("expiration_date"),                          // Validade do registro
  isValid: boolean("is_valid").default(true),                       // Se o material ainda está vigente
  createdAt: timestamp("created_at").defaultNow().notNull(),        // Data de criação do registro
  updatedAt: timestamp("updated_at").defaultNow().notNull(),        // Data de atualização do registro
});

export const insertOpmeItemSchema = createInsertSchema(opmeItems).pick({
  anvisaRegistrationNumber: true,
  processNumber: true,
  technicalName: true,
  commercialName: true,
  riskClass: true,
  holderCnpj: true,
  registrationHolder: true,
  manufacturerName: true,
  countryOfManufacture: true,
  registrationDate: true,
  expirationDate: true,
  isValid: true,
});

// Surgical procedures - CBHPM codes
export const procedures = pgTable("procedures", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // Código CBHPM (ex: 3.07.24.08-4)
  name: text("name").notNull(), // Nome do procedimento
  porte: text("porte"), // Porte do procedimento
  custoOperacional: text("custo_operacional"), // Custo operacional
  porteAnestesista: text("porte_anestesista"), // Porte anestesista
  numeroAuxiliares: integer("numero_auxiliares"), // Número de auxiliares
  description: text("description"), // Descrição adicional se necessário
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProcedureSchema = createInsertSchema(procedures).pick({
  code: true,
  name: true,
  porte: true,
  custoOperacional: true,
  porteAnestesista: true,
  numeroAuxiliares: true,
  description: true,
  active: true,
});

// Surgical approaches (tipos de conduta cirúrgica)
export const surgicalApproaches = pgTable("surgical_approaches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Ex: 'Videoartroscopia', 'Cirurgia aberta'
  description: text("description"), // Descrição adicional do tipo de conduta
});

export const insertSurgicalApproachSchema = createInsertSchema(surgicalApproaches).pick({
  name: true,
  description: true,
});

export type SurgicalApproach = typeof surgicalApproaches.$inferSelect;
export type InsertSurgicalApproach = z.infer<typeof insertSurgicalApproachSchema>;

// Tabela de associação entre procedimentos cirúrgicos e condutas cirúrgicas (N:M)
export const surgicalProcedureApproaches = pgTable("surgical_procedure_approaches", {
  id: serial("id").primaryKey(),
  surgicalProcedureId: integer("surgical_procedure_id").notNull().references(() => surgicalProcedures.id, { onDelete: 'cascade' }),
  surgicalApproachId: integer("surgical_approach_id").notNull().references(() => surgicalApproaches.id, { onDelete: 'cascade' }),
  isPreferred: boolean("is_preferred").default(false), // Indica se esta é a conduta preferencial para este procedimento
  complexity: text("complexity"), // Complexidade específica para esta associação (Baixa, Média, Alta)
  estimatedDuration: integer("estimated_duration"), // Duração estimada em minutos
  notes: text("notes"), // Observações específicas para esta associação
  defaultLaterality: text("default_laterality"), // Lateralidade padrão: "esquerdo", "direito", "bilateral", "indeterminado" ou null
  defaultCharacter: text("default_character"), // Caráter padrão: "eletiva", "urgencia" ou null
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Evita associações duplicadas
  unq: unique().on(table.surgicalProcedureId, table.surgicalApproachId),
}));

// Relações para a tabela de associação surgical_procedure_approaches
export const surgicalProcedureApproachesRelations = relations(surgicalProcedureApproaches, ({ one }) => ({
  surgicalProcedure: one(surgicalProcedures, {
    fields: [surgicalProcedureApproaches.surgicalProcedureId],
    references: [surgicalProcedures.id],
    relationName: "procedureApproachProcedure",
  }),
  surgicalApproach: one(surgicalApproaches, {
    fields: [surgicalProcedureApproaches.surgicalApproachId],
    references: [surgicalApproaches.id],
    relationName: "procedureApproachSurgical",
  }),
}));

export const insertSurgicalProcedureApproachSchema = createInsertSchema(surgicalProcedureApproaches).pick({
  surgicalProcedureId: true,
  surgicalApproachId: true,
  isPreferred: true,
  complexity: true,
  estimatedDuration: true,
  notes: true,
  defaultLaterality: true,
  defaultCharacter: true,
});

export type SurgicalProcedureApproach = typeof surgicalProcedureApproaches.$inferSelect;
export type InsertSurgicalProcedureApproach = z.infer<typeof insertSurgicalProcedureApproachSchema>;





// Tabela de associação: Procedimento Médico → Conduta → Procedimentos CBHPM (N:M:M)
export const surgicalApproachProcedures = pgTable("surgical_approach_procedures", {
  id: serial("id").primaryKey(),
  surgicalProcedureId: integer("surgical_procedure_id").notNull().references(() => surgicalProcedures.id, { onDelete: 'cascade' }), // Procedimento médico (ex: Reparo do Manguito Rotador)
  surgicalApproachId: integer("surgical_approach_id").notNull().references(() => surgicalApproaches.id, { onDelete: 'cascade' }), // Conduta (ex: Artroscopia)
  procedureId: integer("procedure_id").notNull().references(() => procedures.id, { onDelete: 'cascade' }), // Procedimento CBHPM (ex: 3.07.35.06-8)
  quantity: integer("quantity").default(1).notNull(), // Quantidade específica do código CBHPM para esta associação
  isPreferred: boolean("is_preferred").default(false), // Indica se este é o procedimento preferencial para esta combinação
  complexity: text("complexity"), // Complexidade específica para esta associação
  estimatedDuration: integer("estimated_duration"), // Duração estimada em minutos
  notes: text("notes"), // Observações específicas para esta associação
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Evita associações duplicadas para a mesma combinação
  unq: unique().on(table.surgicalProcedureId, table.surgicalApproachId, table.procedureId),
}));

// Relações para a tabela de associação surgical_approach_procedures
export const surgicalApproachProceduresRelations = relations(surgicalApproachProcedures, ({ one }) => ({
  surgicalProcedure: one(surgicalProcedures, {
    fields: [surgicalApproachProcedures.surgicalProcedureId],
    references: [surgicalProcedures.id],
    relationName: "approachProcedureMedical",
  }),
  surgicalApproach: one(surgicalApproaches, {
    fields: [surgicalApproachProcedures.surgicalApproachId],
    references: [surgicalApproaches.id],
    relationName: "approachProcedureSurgical",
  }),
  procedure: one(procedures, {
    fields: [surgicalApproachProcedures.procedureId],
    references: [procedures.id],
    relationName: "approachProcedureProcedure",
  }),
}));

export const insertSurgicalApproachProcedureSchema = createInsertSchema(surgicalApproachProcedures).pick({
  surgicalProcedureId: true,
  surgicalApproachId: true,
  procedureId: true,
  quantity: true,
  isPreferred: true,
  complexity: true,
  estimatedDuration: true,
  notes: true,
});

export type SurgicalApproachProcedure = typeof surgicalApproachProcedures.$inferSelect;
export type InsertSurgicalApproachProcedure = z.infer<typeof insertSurgicalApproachProcedureSchema>;

// Tabela de associação entre condutas cirúrgicas e itens OPME (N:M)
export const surgicalApproachOpmeItems = pgTable("surgical_approach_opme_items", {
  id: serial("id").primaryKey(),
  surgicalApproachId: integer("surgical_approach_id").notNull().references(() => surgicalApproaches.id, { onDelete: 'cascade' }),
  opmeItemId: integer("opme_item_id").notNull().references(() => opmeItems.id, { onDelete: 'cascade' }),
  surgicalProcedureId: integer("surgical_procedure_id").references(() => surgicalProcedures.id, { onDelete: 'cascade' }), // Procedimento cirúrgico associado
  isRequired: boolean("is_required").default(false), // Indica se este item é obrigatório para esta conduta
  quantity: integer("quantity").default(1), // Quantidade padrão do item para esta conduta
  displayOrder: integer("display_order").default(0), // Ordem de apresentação do item (números menores aparecem primeiro)
  alternativeItems: text("alternative_items"), // IDs de itens alternativos separados por vírgula
  notes: text("notes"), // Observações específicas para esta associação
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relações para a tabela de associação surgical_approach_opme_items
export const surgicalApproachOpmeItemsRelations = relations(surgicalApproachOpmeItems, ({ one }) => ({
  surgicalApproach: one(surgicalApproaches, {
    fields: [surgicalApproachOpmeItems.surgicalApproachId],
    references: [surgicalApproaches.id],
    relationName: "approachOpmeSurgical",
  }),
  opmeItem: one(opmeItems, {
    fields: [surgicalApproachOpmeItems.opmeItemId],
    references: [opmeItems.id],
    relationName: "approachOpmeItem",
  }),
}));

export const insertSurgicalApproachOpmeItemSchema = createInsertSchema(surgicalApproachOpmeItems).pick({
  surgicalApproachId: true,
  opmeItemId: true,
  isRequired: true,
  quantity: true,
  displayOrder: true,
  alternativeItems: true,
  notes: true,
});

export type SurgicalApproachOpmeItem = typeof surgicalApproachOpmeItems.$inferSelect;
export type InsertSurgicalApproachOpmeItem = z.infer<typeof insertSurgicalApproachOpmeItemSchema>;

// Tabela de associação entre condutas cirúrgicas e fornecedores (N:M com múltiplos fornecedores por combinação)
export const surgicalApproachSuppliers = pgTable("surgical_approach_suppliers", {
  id: serial("id").primaryKey(),
  surgicalApproachId: integer("surgical_approach_id").notNull().references(() => surgicalApproaches.id, { onDelete: 'cascade' }),
  supplierId: integer("supplier_id").notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
  surgicalProcedureId: integer("surgical_procedure_id").references(() => surgicalProcedures.id, { onDelete: 'cascade' }), // Procedimento cirúrgico associado
  priority: integer("priority").default(1), // Prioridade do fornecedor (números maiores = maior prioridade)
  isPreferred: boolean("is_preferred").default(false), // Indica se é o fornecedor preferencial
  contractNumber: text("contract_number"), // Número do contrato com o fornecedor
  priceRange: text("price_range"), // Faixa de preços (ex: "R$ 1000-2000")
  notes: text("notes"), // Observações específicas para esta associação
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Evita associações duplicadas: mesma conduta + mesmo fornecedor + mesmo procedimento
  uniqueCombination: unique().on(table.surgicalApproachId, table.supplierId, table.surgicalProcedureId),
}));

// Relações para a tabela de associação surgical_approach_suppliers
export const surgicalApproachSuppliersRelations = relations(surgicalApproachSuppliers, ({ one }) => ({
  surgicalApproach: one(surgicalApproaches, {
    fields: [surgicalApproachSuppliers.surgicalApproachId],
    references: [surgicalApproaches.id],
    relationName: "approachSupplierSurgical",
  }),
  supplier: one(suppliers, {
    fields: [surgicalApproachSuppliers.supplierId],
    references: [suppliers.id],
    relationName: "approachSupplierSupplier",
  }),
  surgicalProcedure: one(surgicalProcedures, {
    fields: [surgicalApproachSuppliers.surgicalProcedureId],
    references: [surgicalProcedures.id],
    relationName: "approachSupplierProcedure",
  }),
}));

export const insertSurgicalApproachSupplierSchema = createInsertSchema(surgicalApproachSuppliers).pick({
  surgicalApproachId: true,
  supplierId: true,
  surgicalProcedureId: true,
  priority: true,
  isPreferred: true,
  contractNumber: true,
  priceRange: true,
  notes: true,
});

export type SurgicalApproachSupplier = typeof surgicalApproachSuppliers.$inferSelect;
export type InsertSurgicalApproachSupplier = z.infer<typeof insertSurgicalApproachSupplierSchema>;

// Tabela para justificativas clínicas pré-definidas
export const clinicalJustifications = pgTable("clinical_justifications", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(), // Texto completo da justificativa
  isActive: boolean("is_active").default(true), // Se está ativa para uso
  createdBy: integer("created_by").references(() => users.id), // Usuário que criou
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relações para justificativas clínicas
export const clinicalJustificationsRelations = relations(clinicalJustifications, ({ one }) => ({
  creator: one(users, {
    fields: [clinicalJustifications.createdBy],
    references: [users.id],
    relationName: "justificationCreator",
  }),
}));

export const insertClinicalJustificationSchema = createInsertSchema(clinicalJustifications).pick({
  content: true,
  isActive: true,
  createdBy: true,
});

export type ClinicalJustification = typeof clinicalJustifications.$inferSelect;
export type InsertClinicalJustification = z.infer<typeof insertClinicalJustificationSchema>;

// Tabela de associação entre condutas cirúrgicas e justificativas clínicas (N:M)
export const surgicalApproachJustifications = pgTable("surgical_approach_justifications", {
  id: serial("id").primaryKey(),
  surgicalApproachId: integer("surgical_approach_id").notNull().references(() => surgicalApproaches.id, { onDelete: 'cascade' }),
  justificationId: integer("justification_id").notNull().references(() => clinicalJustifications.id, { onDelete: 'cascade' }),
  surgicalProcedureId: integer("surgical_procedure_id").references(() => surgicalProcedures.id, { onDelete: 'cascade' }), // Procedimento cirúrgico associado
  isPreferred: boolean("is_preferred").default(false), // Indica se é a justificativa preferencial para esta conduta
  customNotes: text("custom_notes"), // Observações específicas para esta associação
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relações para a tabela de associação surgical_approach_justifications
export const surgicalApproachJustificationsRelations = relations(surgicalApproachJustifications, ({ one }) => ({
  surgicalApproach: one(surgicalApproaches, {
    fields: [surgicalApproachJustifications.surgicalApproachId],
    references: [surgicalApproaches.id],
    relationName: "approachJustificationSurgical",
  }),
  justification: one(clinicalJustifications, {
    fields: [surgicalApproachJustifications.justificationId],
    references: [clinicalJustifications.id],
    relationName: "approachJustificationClinical",
  }),
}));

export const insertSurgicalApproachJustificationSchema = createInsertSchema(surgicalApproachJustifications).pick({
  surgicalApproachId: true,
  justificationId: true,
  isPreferred: true,
  customNotes: true,
});

export type SurgicalApproachJustification = typeof surgicalApproachJustifications.$inferSelect;
export type InsertSurgicalApproachJustification = z.infer<typeof insertSurgicalApproachJustificationSchema>;

// Tabela de associação entre pedidos médicos e condutas cirúrgicas (N:M)
export const medicalOrderSurgicalApproaches = pgTable("medical_order_surgical_approaches", {
  id: serial("id").primaryKey(),
  medicalOrderId: integer("medical_order_id").notNull().references(() => medicalOrders.id, { onDelete: 'cascade' }),
  surgicalApproachId: integer("surgical_approach_id").notNull().references(() => surgicalApproaches.id, { onDelete: 'cascade' }),
  surgicalProcedureId: integer("surgical_procedure_id").references(() => surgicalProcedures.id, { onDelete: 'cascade' }), // Associação com o procedimento cirúrgico específico
  isPrimary: boolean("is_primary").default(false), // Indica se é a conduta cirúrgica principal do pedido
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relações para a tabela de associação medical_order_surgical_approaches
export const medicalOrderSurgicalApproachesRelations = relations(medicalOrderSurgicalApproaches, ({ one }) => ({
  medicalOrder: one(medicalOrders, {
    fields: [medicalOrderSurgicalApproaches.medicalOrderId],
    references: [medicalOrders.id],
    relationName: "orderApproachMedical",
  }),
  surgicalApproach: one(surgicalApproaches, {
    fields: [medicalOrderSurgicalApproaches.surgicalApproachId],
    references: [surgicalApproaches.id],
    relationName: "orderApproachSurgical",
  }),
  surgicalProcedure: one(surgicalProcedures, {
    fields: [medicalOrderSurgicalApproaches.surgicalProcedureId],
    references: [surgicalProcedures.id],
    relationName: "orderApproachProcedure",
  }),
}));

export const insertMedicalOrderSurgicalApproachSchema = createInsertSchema(medicalOrderSurgicalApproaches).pick({
  medicalOrderId: true,
  surgicalApproachId: true,
  surgicalProcedureId: true,
  isPrimary: true,
});

export type MedicalOrderSurgicalApproach = typeof medicalOrderSurgicalApproaches.$inferSelect;
export type InsertMedicalOrderSurgicalApproach = z.infer<typeof insertMedicalOrderSurgicalApproachSchema>;

// Status de pedidos cirúrgicos na tabela de referência
export const orderStatuses = pgTable("order_statuses", {
  id: serial("id").primaryKey(),
  code: text("code").unique().notNull(),
  name: text("name").notNull(),
  displayOrder: integer("display_order").notNull(),
  color: text("color"),
  icon: text("icon"),
});

export const insertOrderStatusSchema = createInsertSchema(orderStatuses);
export type OrderStatus = typeof orderStatuses.$inferSelect;
export type InsertOrderStatus = z.infer<typeof insertOrderStatusSchema>;


// Enum para tipo de procedimento
export const procedureTypeEnum = pgEnum("procedure_type", ["eletiva", "urgencia"]);

// Enum para lateralidade do CID
export const cidLateralityEnum = pgEnum("cid_laterality", ["esquerdo", "direito", "bilateral", "indeterminado"]);

// Enum para status de pagamento
export const paymentStatusEnum = pgEnum("payment_status", ["pendente", "pago", "glosa", "recusado"]);

// Medical orders schema - normalizado
export const medicalOrders = pgTable("medical_orders", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id), // Usuário que criou o pedido
  hospitalId: integer("hospital_id").references(() => hospitals.id),
  procedureDate: date("procedure_date"), // Data planejada
  clinicalIndication: text("clinical_indication").notNull(),
  clinicalJustification: text("clinical_justification"), // Sugestão de justificativa clínica para o procedimento
  procedureLaterality: cidLateralityEnum("procedure_laterality"), // Lateralidade do procedimento principal: esquerdo, direito ou bilateral
  procedureType: procedureTypeEnum("procedure_type"), // Tipo de procedimento: eletiva ou urgência
  anatomicalRegionId: integer("anatomical_region_id").references(() => anatomicalRegions.id), // Região anatômica selecionada
  // CIDs, OPME Items e Suppliers agora são gerenciados via tabelas relacionais
  // Campo unificado de anexos (substitui exam_images_url, medical_report_url e order_pdf_url)
  attachments: jsonb("attachments").default('[]'), // Array de objetos JSON com todos os anexos
  additionalNotes: text("additional_notes"),
  cbhpmAdditionalNotes: text("cbhpm_additional_notes"), // Observações adicionais após procedimentos CBHPM
  opmeAdditionalNotes: text("opme_additional_notes"), // Observações adicionais após itens OPME
  supplierAdditionalNotes: text("supplier_additional_notes"), // Observações adicionais após fornecedores
  statusId: integer("status_id").notNull().default(1).references(() => orderStatuses.id), // Status do pedido (FK para order_statuses)
  previousStatusId: integer("previous_status_id").references(() => orderStatuses.id), // Status anterior para função desfazer
  complexity: text("complexity"), // Complexidade/porte cirúrgico
  receivedValue: integer("received_value"), // Valor recebido pela cirurgia em centavos
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMedicalOrderSchema = createInsertSchema(medicalOrders).pick({
  patientId: true,
  userId: true,
  hospitalId: true,
  procedureDate: true,
  attachments: true,
  clinicalIndication: true,
  procedureLaterality: true,
  procedureType: true,
  anatomicalRegionId: true,
  additionalNotes: true,
  cbhpmAdditionalNotes: true, // Observações adicionais após procedimentos CBHPM
  opmeAdditionalNotes: true, // Observações adicionais após itens OPME
  supplierAdditionalNotes: true, // Observações adicionais após fornecedores
  statusId: true, // Status do pedido (FK para order_statuses)
  complexity: true,
  receivedValue: true,
  clinicalJustification: true,
});

// Tabela de Associação: Pedidos Médicos ↔ Procedimentos Cirúrgicos (N:N)
export const medicalOrderSurgicalProcedures = pgTable("medical_order_surgical_procedures", {
  id: serial("id").primaryKey(),
  medicalOrderId: integer("medical_order_id").notNull().references(() => medicalOrders.id, { onDelete: 'cascade' }),
  surgicalProcedureId: integer("surgical_procedure_id").notNull().references(() => surgicalProcedures.id, { onDelete: 'cascade' }),
  isMain: boolean("is_main").default(false), // Indica se é o procedimento principal
  additionalNotes: text("additional_notes"), // Observações específicas do procedimento no pedido
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Evita associações duplicadas entre mesmo pedido e mesmo procedimento
  unq: unique().on(table.medicalOrderId, table.surgicalProcedureId),
}));

// Relações para a tabela de associação
export const medicalOrderSurgicalProceduresRelations = relations(medicalOrderSurgicalProcedures, ({ one }) => ({
  medicalOrder: one(medicalOrders, {
    fields: [medicalOrderSurgicalProcedures.medicalOrderId],
    references: [medicalOrders.id],
  }),
  surgicalProcedure: one(surgicalProcedures, {
    fields: [medicalOrderSurgicalProcedures.surgicalProcedureId],
    references: [surgicalProcedures.id],
  }),
}));

export const insertMedicalOrderSurgicalProcedureSchema = createInsertSchema(medicalOrderSurgicalProcedures).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type MedicalOrderSurgicalProcedure = typeof medicalOrderSurgicalProcedures.$inferSelect;
export type InsertMedicalOrderSurgicalProcedure = z.infer<typeof insertMedicalOrderSurgicalProcedureSchema>;

// Order items schema
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  opmeItemId: integer("opme_item_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).pick({
  orderId: true,
  opmeItemId: true,
  quantity: true,
});

// Scanned documents schema
export const scannedDocuments = pgTable("scanned_documents", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  documentType: text("document_type").notNull(), // "identification" or "medical_report"
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertScannedDocumentSchema = createInsertSchema(scannedDocuments).pick({
  patientId: true,
  documentType: true,
  content: true,
});

// Permissions enum
export const permissionEnum = pgEnum("permission", [
  // Módulos principais
  "dashboard_view",
  "patients_view", "patients_create", "patients_edit", "patients_delete",
  "hospitals_view", "hospitals_create", "hospitals_edit", "hospitals_delete",
  "orders_view", "orders_create", "orders_edit", "orders_delete", 
  "catalog_view", "catalog_create", "catalog_edit", "catalog_delete",
  "reports_view", "reports_create", "reports_export",
  // Módulos administrativos
  "users_view", "users_create", "users_edit", "users_delete",
  "roles_view", "roles_create", "roles_edit", "roles_delete",
  "system_settings"
]);

// Roles table (Papéis)
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRoleSchema = createInsertSchema(roles).pick({
  name: true,
  description: true,
  isDefault: true,
});

// Role Permissions join table
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permission: permissionEnum("permission").notNull(),
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).pick({
  roleId: true,
  permission: true,
});

// Users table with enhanced security features
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(), // Será armazenado como hash bcrypt
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone").unique(), // Telefone celular no formato +5521999999999
  cpf: text("cpf").unique(), // CPF do usuário
  roleId: integer("role_id").notNull().references(() => roles.id),
  crm: integer("crm"), // Número CRM para médicos
  crmUf: varchar("crm_uf", { length: 2 }).references(() => brazilianStates.stateCode), // UF do CRM registrado
  medicalSpecialtyId: integer("medical_specialty_id").references(() => medicalSpecialties.id), // Especialidade médica do usuário
  active: boolean("active").default(false),
  lastLogin: timestamp("last_login"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockoutUntil: timestamp("lockout_until"),
  consentAccepted: timestamp("consent_accepted"), // Data/hora em que o usuário aceitou o termo de consentimento
  signatureUrl: text("signature_url"), // URL da assinatura do médico
  signatureNote: text("signature_note"), // Nota de texto para aparecer embaixo da assinatura
  logoUrl: text("logo_url"), // URL do logotipo do médico
  crmUrl: text("crm_url"), // URL do cartão CRM do médico
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  name: true,
  phone: true,
  cpf: true,
  roleId: true,
  crm: true,
  crmUf: true,
  medicalSpecialtyId: true,
  active: true,
  signatureNote: true,
});

// User individual permissions (override role permissions)
export const userPermissions = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  permission: permissionEnum("permission").notNull(),
  granted: boolean("granted").notNull(), // true = conceder, false = negar explicitamente
});

export const insertUserPermissionSchema = createInsertSchema(userPermissions).pick({
  userId: true,
  permission: true,
  granted: true,
});

// User Addresses table - separating address management from users
export const userAddresses = pgTable("user_addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  isPrimary: boolean("is_primary").notNull().default(true),
  
  // Address fields
  cep: varchar("cep", { length: 9 }).notNull(), // 00000-000
  logradouro: text("logradouro").notNull(), // Street name
  numero: text("numero").notNull(), // House/building number (accepts "S/N", "123A")
  complemento: text("complemento"), // Apartment, block, etc.
  bairro: text("bairro"), // Neighborhood
  cidade: text("cidade").notNull(), // City
  uf: varchar("uf", { length: 2 }).notNull().references(() => brazilianStates.stateCode), // State code (FK to brazilian_states)
  country: varchar("country", { length: 2 }).notNull().default('BR'), // Country code
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations for user addresses
export const userAddressesRelations = relations(userAddresses, ({ one }) => ({
  user: one(users, {
    fields: [userAddresses.userId],
    references: [users.id],
    relationName: "userAddresses",
  }),
  state: one(brazilianStates, {
    fields: [userAddresses.uf],
    references: [brazilianStates.stateCode],
    relationName: "addressState",
  }),
}));

// Add relation from users to addresses and other entities
export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
    relationName: "userRole",
  }),
  medicalSpecialty: one(medicalSpecialties, {
    fields: [users.medicalSpecialtyId],
    references: [medicalSpecialties.id],
    relationName: "userMedicalSpecialty",
  }),
  addresses: many(userAddresses, {
    relationName: "userAddresses",
  }),
  userSubscription: one(userSubscriptions, {
    fields: [users.id],
    references: [userSubscriptions.userId],
    relationName: "userSubscription",
  }),
}));

export const insertUserAddressSchema = createInsertSchema(userAddresses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserAddress = typeof userAddresses.$inferSelect;
export type InsertUserAddress = z.infer<typeof insertUserAddressSchema>;

// Subscription Plans table
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // "Trial", "Individual", "Team"
  description: text("description").notNull(),
  priceMonthly: integer("price_monthly").default(0), // Preço em centavos (R$ 199,90 = 19990)
  priceYearly: integer("price_yearly").default(0), // Preço anual em centavos
  maxUsers: integer("max_users").default(1), // Número máximo de usuários
  features: text("features").array().default([]), // Array de funcionalidades
  trialDays: integer("trial_days").default(0), // Dias de trial gratuito
  productId: text("product_id").unique(), // ID do produto na plataforma de pagamento
  priceIdMonthly: text("price_id_monthly").unique(), // ID do preço mensal na plataforma de pagamento
  priceIdYearly: text("price_id_yearly").unique(), // ID do preço anual na plataforma de pagamento
  isPopular: boolean("is_popular").default(false), // Destacar como popular
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).pick({
  name: true,
  description: true,
  priceMonthly: true,
  priceYearly: true,
  maxUsers: true,
  features: true,
  trialDays: true,
  productId: true,
  priceIdMonthly: true,
  priceIdYearly: true,
  isPopular: true,
  isActive: true,
});

// User Subscriptions table
export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  planId: integer("plan_id").notNull().references(() => subscriptionPlans.id),
  status: text("status").notNull().default("trial"), // trial, active, expired, cancelled, past_due, lifetime
  startedAt: timestamp("started_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Data de expiração da assinatura paga (NULL para vitalício)
  trialEndsAt: timestamp("trial_ends_at"), // Data de término do trial
  // Campos de desconto e preço personalizado
  originalPrice: integer("original_price"), // Preço original em centavos
  discountPercent: integer("discount_percent").default(0), // Porcentagem de desconto (0-100)
  discountAmount: integer("discount_amount").default(0), // Valor fixo de desconto em centavos
  finalPrice: integer("final_price"), // Preço final após desconto em centavos
  discountCode: text("discount_code"), // Código do cupom de desconto utilizado
  discountDescription: text("discount_description"), // Descrição do desconto aplicado
  // Campos para desconto promocional temporal
  promotionalPrice: integer("promotional_price"), // Preço promocional em centavos
  promotionalEndsAt: timestamp("promotional_ends_at"), // Data de fim da promoção
  promotionalDescription: text("promotional_description"), // Descrição da promoção
  // Campos genéricos para qualquer plataforma de pagamento
  paymentProviderCustomerId: text("payment_provider_customer_id"), // ID do cliente na plataforma de pagamento
  paymentProviderSubscriptionId: text("payment_provider_subscription_id"), // ID da assinatura na plataforma
  paymentProvider: text("payment_provider").default("none"), // "stripe", "pagar_me", "mercado_pago", etc.
  
  // Campo para rastrear início do status past_due (dunning)
  pastDueStartedAt: timestamp("past_due_started_at"), // Data de início do status past_due
  
  // Campos de timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).pick({
  userId: true,
  planId: true,
  status: true,
  startedAt: true,
  expiresAt: true,
  trialEndsAt: true,
  originalPrice: true,
  discountPercent: true,
  discountAmount: true,
  finalPrice: true,
  discountCode: true,
  discountDescription: true,
  promotionalPrice: true,
  promotionalEndsAt: true,
  promotionalDescription: true,
  paymentProviderCustomerId: true,
  paymentProviderSubscriptionId: true,
  paymentProvider: true,
  pastDueStartedAt: true,
  createdAt: true,
  updatedAt: true,
});

// Enum para status do lead
export const leadStatusEnum = pgEnum('lead_status', [
  'draft',           // Rascunho inicial
  'form_completed',  // Formulário preenchido
  'plan_selected',   // Plano selecionado  
  'checkout_created',// Checkout Session criado
  'paid',           // Pagamento confirmado
  'abandoned'       // Processo abandonado
]);

// Incomplete Registrations table (store temporário completo para registro)
export const incompleteRegistrations = pgTable("incomplete_registrations", {
  id: serial("id").primaryKey(),
  
  // === Dados básicos do lead (preservados) ===
  email: text("email").notNull(), // Email para identificar lead
  firstName: text("first_name"),
  lastName: text("last_name"), 
  cpf: text("cpf"),
  phone: text("phone"),
  username: text("username"),
  
  // === Novos dados pessoais completos ===
  password: text("password"), // Hash da senha (nunca claro)
  roleId: integer("role_id").references(() => roles.id),
  crm: text("crm"), // CRM como texto (aceita formatos variados)
  crmUf: varchar("crm_uf", { length: 2 }).references(() => brazilianStates.stateCode),
  medicalSpecialtyId: integer("medical_specialty_id").references(() => medicalSpecialties.id),
  
  // === Dados de endereço completos ===  
  cep: varchar("cep", { length: 9 }), // 00000-000
  address: text("address"), // Logradouro (nome da rua)
  number: text("number"), // Número da casa/prédio
  complement: text("complement"), // Complemento (apto, bloco, etc.)
  neighborhood: text("neighborhood"), // Bairro
  city: text("city"), // Cidade
  state: varchar("state", { length: 2 }).references(() => brazilianStates.stateCode), // UF
  country: varchar("country", { length: 2 }).default('BR'), // País
  
  // === Dados de plano e pagamento ===
  selectedPlanId: integer("selected_plan_id").references(() => subscriptionPlans.id),
  billingInterval: text("billing_interval"), // 'monthly' ou 'yearly'
  discountCode: text("discount_code"), // Cupom aplicado
  
  // === IDs do Stripe para correlação ===
  stripeCustomerId: text("stripe_customer_id"), // Customer ID no Stripe
  stripeCheckoutSessionId: text("stripe_checkout_session_id"), // Session ID
  stripePaymentIntentId: text("stripe_payment_intent_id"), // Payment Intent ID
  stripePriceId: text("stripe_price_id"), // Price ID usado
  
  // === Token de autorização para edições sem login ===
  regToken: varchar("reg_token", { length: 255 }).unique(), // Token UUID para autorizar edições
  regTokenHash: text("reg_token_hash"), // Hash do token para validação
  
  // === Status e tracking (melhorados) ===
  leadStatus: leadStatusEnum("lead_status").default('draft').notNull(), // Status estruturado
  currentStep: text("current_step").notNull(), // Retrocompatibilidade analytics
  
  // === Dados técnicos (preservados) ===
  userAgent: text("user_agent"), // Browser info
  ipAddress: text("ip_address"), // IP para analytics  
  source: text("source").default("direct"), // Como chegou: 'direct', 'google', etc.
  
  // === Timestamps (preservados + melhorados) ===
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"), // Quando finalizou (se finalizou)
  abandonedAt: timestamp("abandoned_at"), // Quando foi considerado abandonado
  lastActivityAt: timestamp("last_activity_at").defaultNow(), // Última atividade
  
  // === JSONB para flexibilidade futura ===
  userDataJson: jsonb("user_data_json"), // Dados extras do formulário
  addressJson: jsonb("address_json"), // Dados extras de endereço  
  paymentJson: jsonb("payment_json"), // Metadados do pagamento
  metadataJson: jsonb("metadata_json"), // Outros metadados
  
}, (table) => ({
  // === Índices existentes (preservados) ===
  emailIdx: index("incomplete_registrations_email_idx").on(table.email),
  createdAtIdx: index("incomplete_registrations_created_at_idx").on(table.createdAt),
  
  // === Novos índices para performance ===
  regTokenIdx: index("incomplete_registrations_reg_token_idx").on(table.regToken),
  leadStatusIdx: index("incomplete_registrations_lead_status_idx").on(table.leadStatus),
  lastActivityIdx: index("incomplete_registrations_last_activity_idx").on(table.lastActivityAt),
  stripeSessionIdx: index("incomplete_registrations_stripe_session_idx").on(table.stripeCheckoutSessionId),
  
  // === Constraints de unicidade simples (implementaremos lógica condicional na aplicação) ===
  // NOTA: Unique constraints condicionais serão implementadas via lógica de negócio
  // Para evitar conflitos durante migração temporária
}));

export const insertIncompleteRegistrationSchema = createInsertSchema(incompleteRegistrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastActivityAt: true,
  regTokenHash: true, // Gerado automaticamente
});

// Schema RESTRITO para atualização (PATCH) - APENAS campos seguros permitidos
export const updateIncompleteRegistrationSchema = z.object({
  // Dados pessoais básicos (step 1)
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(200).optional(), 
  cpf: z.string().length(11).regex(/^\d{11}$/).optional(),
  phone: z.string().min(10).max(15).optional(),
  username: z.string().min(3).max(50).optional(),
  
  // Dados médicos (step 1)  
  roleId: z.number().positive().optional(),
  crm: z.string().max(20).optional(),
  crmUf: z.string().length(2).optional(),
  medicalSpecialtyId: z.number().positive().optional(),
  
  // Endereço (step 1)
  cep: z.string().length(9).optional(),
  address: z.string().max(200).optional(),
  number: z.string().max(20).optional(), 
  complement: z.string().max(100).optional(),
  neighborhood: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  state: z.string().length(2).optional(),
  
  // Senha (step 1) - será hasheada automaticamente
  password: z.string().min(6).max(100).optional(),
  
  // Dados JSONB opcionais
  userDataJson: z.record(z.any()).optional(),
  addressJson: z.record(z.any()).optional(),
  metadataJson: z.record(z.any()).optional(),
  
  // CAMPOS PROIBIDOS (excluídos por segurança):
  // regToken, regTokenHash, completedAt, leadStatus, stripe_*, createdAt, updatedAt, email
});


export type UpdateIncompleteRegistration = z.infer<typeof updateIncompleteRegistrationSchema>;

// Subscription Payments table
export const subscriptionPayments = pgTable("subscription_payments", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").notNull().references(() => userSubscriptions.id, { onDelete: 'cascade' }),
  amount: integer("amount").notNull(), // Valor em centavos
  currency: text("currency").default("BRL"),
  status: text("status").notNull(), // pending, succeeded, failed, refunded
  paymentProviderIntentId: text("payment_provider_intent_id"), // ID da transação na plataforma
  paymentProvider: text("payment_provider").notNull(), // "stripe", "pagar_me", etc.
  paidAt: timestamp("paid_at"),
  failedAt: timestamp("failed_at"),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSubscriptionPaymentSchema = createInsertSchema(subscriptionPayments).pick({
  subscriptionId: true,
  amount: true,
  currency: true,
  status: true,
  paymentProviderIntentId: true,
  paymentProvider: true,
  paidAt: true,
  failedAt: true,
  failureReason: true,
});

// Discount Codes table - Integrado com Stripe e outros provedores
export const discountCodes = pgTable("discount_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  discountType: text("discount_type").notNull(), // 'percentage' ou 'fixed_amount'
  discountValue: integer("discount_value").notNull(), // Porcentagem (0-100) ou valor fixo em centavos
  maxUses: integer("max_uses"), // NULL = ilimitado
  currentUses: integer("current_uses").default(0),
  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until"),
  applicablePlans: integer("applicable_plans").array(), // Array de IDs de planos aplicáveis, NULL = todos
  isActive: boolean("is_active").default(true),
  isAutomatic: boolean("is_automatic"), // Apenas um desconto pode ser automático por vez
  
  // === Campos genéricos para integração com provedores de pagamento ===
  paymentProvider: text("payment_provider").default("internal"), // "stripe", "mercado_pago", "internal", etc.
  
  // Campos genéricos de referência externa
  externalCouponId: text("external_coupon_id").unique(), // ID do cupom no provedor externo
  externalPromotionCodeId: text("external_promotion_code_id").unique(), // ID do promotion code no provedor
  customerRestrictions: text("customer_restrictions").array(), // IDs de clientes permitidos
  firstTimeTransaction: boolean("first_time_transaction").default(false), // Apenas primeira transação
  minimumAmount: integer("minimum_amount"), // Valor mínimo em centavos
  maxRedemptions: integer("max_redemptions"), // Máximo de redenções
  redeemBy: timestamp("redeem_by"), // Data limite para uso
  
  // Campos de duração do cupom (para assinaturas)
  duration: text("duration").default("once"), // "once", "repeating", "forever"
  durationInMonths: integer("duration_in_months"), // Duração em meses (se duration = 'repeating')
  providerName: text("provider_name"), // Nome do cupom no provedor
  
  // Campos de metadata flexíveis
  metadata: text("metadata"), // JSON string para dados adicionais
  restrictions: text("restrictions"), // JSON string para restrições customizadas
  
  // Campos de auditoria
  createdBy: integer("created_by").references(() => users.id), // Usuário que criou
  lastSyncAt: timestamp("last_sync_at"), // Última sincronização com provedor
  syncStatus: text("sync_status").default("pending"), // "pending", "synced", "error"
  syncErrorMessage: text("sync_error_message"), // Mensagem de erro de sincronização
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Garante que apenas um desconto pode ser automático por vez
  // Permite múltiplos NULL/FALSE, mas apenas um TRUE
  automaticTrueOnly: uniqueIndex("discount_codes_is_automatic_true")
    .on(table.isAutomatic)
    .where(sql`is_automatic IS TRUE`),
}));

export const insertDiscountCodeSchema = createInsertSchema(discountCodes).pick({
  code: true,
  description: true,
  discountType: true,
  discountValue: true,
  maxUses: true,
  validFrom: true,
  validUntil: true,
  applicablePlans: true,
  isActive: true,
  isAutomatic: true,
  paymentProvider: true,
  externalCouponId: true,
  externalPromotionCodeId: true,
  customerRestrictions: true,
  firstTimeTransaction: true,
  minimumAmount: true,
  maxRedemptions: true,
  redeemBy: true,
  duration: true,
  durationInMonths: true,
  providerName: true,
  metadata: true,
  restrictions: true,
  createdBy: true,
});

export type DiscountCode = typeof discountCodes.$inferSelect;
export type InsertDiscountCode = z.infer<typeof insertDiscountCodeSchema>;

// =================== STRIPE COUPONS STRUCTURE ===================
// Nova estrutura normalizada para integração completa com Stripe
// Substitui discount_codes para permitir múltiplos promotion codes por cupom

// Tabela 1: Stripe Coupons (definição do desconto)
export const stripeCoupons = pgTable("stripe_coupons", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Nome interno: "Black Friday 2025 - 50% OFF"
  description: text("description"),
  stripeCouponId: text("stripe_coupon_id").unique().notNull(), // coupon id do Stripe (ex: "o5kvEMCE")
  discountType: text("discount_type").notNull(), // 'percent' | 'amount' | 'trial_days'
  percentOff: numeric("percent_off", { precision: 5, scale: 2 }), // ex: 10.00 (%)
  amountOffCents: integer("amount_off_cents"), // em centavos (1000 = R$10)
  currency: text("currency"), // 'brl', 'usd', etc.
  duration: text("duration").notNull(), // 'once' | 'repeating' | 'forever'
  durationInMonths: integer("duration_in_months"), // para 'repeating', ex: 3 meses
  
  maxRedemptions: integer("max_redemptions"), // limite global (somando todos os códigos ligados)
  redeemedCount: integer("redeemed_count").notNull().default(0),
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  
  metadata: jsonb("metadata"), // Metadata do Stripe
  applicablePlans: integer("applicable_plans").array(), // Array de IDs de planos aplicáveis, NULL = todos
  
  isActive: boolean("is_active").notNull().default(true),
  createdByUserId: integer("created_by_user_id").references(() => users.id),
  updatedByUserId: integer("updated_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastSyncAt: timestamp("last_sync_at"), // Última sincronização com Stripe
  syncStatus: text("sync_status").default("synced"), // 'synced' | 'pending' | 'error'
});

export const insertStripeCouponSchema = createInsertSchema(stripeCoupons).pick({
  name: true,
  description: true,
  stripeCouponId: true,
  discountType: true,
  percentOff: true,
  amountOffCents: true,
  currency: true,
  duration: true,
  durationInMonths: true,
  maxRedemptions: true,
  validFrom: true,
  validUntil: true,
  metadata: true,
  applicablePlans: true,
  isActive: true,
  createdByUserId: true,
});

export type StripeCoupon = typeof stripeCoupons.$inferSelect;
export type InsertStripeCoupon = z.infer<typeof insertStripeCouponSchema>;

// Tabela 2: Stripe Promotion Codes (códigos digitáveis)
export const stripePromotionCodes = pgTable("stripe_promotion_codes", {
  id: serial("id").primaryKey(),
  stripeCouponId: text("stripe_coupon_id").notNull().references(() => stripeCoupons.stripeCouponId, { onDelete: 'cascade' }),
  
  code: text("code").notNull(), // Ex.: 'DRCARLOS10', 'BLACKFRIDAY', 'WELCOME10'
  stripePromotionCodeId: text("stripe_promotion_code_id").unique().notNull(), // promotion_code_id do Stripe
  
  maxRedemptions: integer("max_redemptions"), // limite só desse código
  redeemedCount: integer("redeemed_count").notNull().default(0),
  oneTimePerCustomer: boolean("one_time_per_customer").default(true),
  expiresAt: timestamp("expires_at"), // Data de expiração específica deste código
  
  metadata: jsonb("metadata"), // Metadata do Stripe
  notes: text("notes"), // Notas internas (ex: "Código para parceria com Dr. Carlos")
  
  isActive: boolean("is_active").notNull().default(true),
  createdByUserId: integer("created_by_user_id").references(() => users.id),
  updatedByUserId: integer("updated_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastSyncAt: timestamp("last_sync_at"), // Última sincronização com Stripe
  syncStatus: text("sync_status").default("synced"), // 'synced' | 'pending' | 'error'
}, (table) => ({
  // Índice composto para buscar códigos por cupom
  couponCodeIdx: index("stripe_promotion_codes_coupon_code_idx").on(table.stripeCouponId, table.code),
}));

export const insertStripePromotionCodeSchema = createInsertSchema(stripePromotionCodes).pick({
  stripeCouponId: true,
  code: true,
  stripePromotionCodeId: true,
  maxRedemptions: true,
  oneTimePerCustomer: true,
  expiresAt: true,
  metadata: true,
  notes: true,
  isActive: true,
  createdByUserId: true,
});

export type StripePromotionCode = typeof stripePromotionCodes.$inferSelect;
export type InsertStripePromotionCode = z.infer<typeof insertStripePromotionCodeSchema>;

// Relações entre cupons e códigos promocionais
export const stripeCouponsRelations = relations(stripeCoupons, ({ many }) => ({
  promotionCodes: many(stripePromotionCodes),
  redemptions: many(stripeDiscountRedemptions),
}));

export const stripePromotionCodesRelations = relations(stripePromotionCodes, ({ one, many }) => ({
  coupon: one(stripeCoupons, {
    fields: [stripePromotionCodes.stripeCouponId],
    references: [stripeCoupons.stripeCouponId],
  }),
  redemptions: many(stripeDiscountRedemptions),
}));

// Tabela 3: Stripe Discount Redemptions (histórico de uso)
export const stripeDiscountRedemptions = pgTable("stripe_discount_redemptions", {
  id: serial("id").primaryKey(),
  
  userId: integer("user_id").notNull().references(() => users.id), // médico que usou o código
  stripePromotionCodeId: text("stripe_promotion_code_id").notNull().references(() => stripePromotionCodes.stripePromotionCodeId),
  stripeCouponId: text("stripe_coupon_id").notNull().references(() => stripeCoupons.stripeCouponId),
  
  // Stripe references
  stripeCustomerId: text("stripe_customer_id").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id"), // se for recorrente
  stripeInvoiceId: text("stripe_invoice_id"), // fatura onde o desconto foi aplicado
  stripeDiscountId: text("stripe_discount_id"), // discount_id aplicado na subscription/invoice
  
  // Snapshot da condição no momento do resgate
  discountType: text("discount_type").notNull(), // 'percent' | 'amount' | 'trial_days'
  percentOff: numeric("percent_off", { precision: 5, scale: 2 }),
  amountOffCents: integer("amount_off_cents"),
  currency: text("currency"),
  duration: text("duration"), // 'once' | 'repeating' | 'forever'
  durationInMonths: integer("duration_in_months"),
  
  // Valores efetivamente aplicados
  subtotalCents: integer("subtotal_cents"), // antes do desconto
  discountValueCents: integer("discount_value_cents"), // valor descontado
  totalAfterDiscountCents: integer("total_after_discount_cents"), // depois do desconto
  
  redeemedAt: timestamp("redeemed_at").notNull().defaultNow(),
  metadata: jsonb("metadata"), // Dados adicionais do resgate
}, (table) => ({
  // Índices para queries comuns
  userIdx: index("stripe_discount_redemptions_user_idx").on(table.userId),
  promotionCodeIdx: index("stripe_discount_redemptions_promo_code_idx").on(table.stripePromotionCodeId),
  subscriptionIdx: index("stripe_discount_redemptions_subscription_idx").on(table.stripeSubscriptionId),
}));

export const insertStripeDiscountRedemptionSchema = createInsertSchema(stripeDiscountRedemptions).pick({
  userId: true,
  stripePromotionCodeId: true,
  stripeCouponId: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  stripeInvoiceId: true,
  stripeDiscountId: true,
  discountType: true,
  percentOff: true,
  amountOffCents: true,
  currency: true,
  duration: true,
  durationInMonths: true,
  subtotalCents: true,
  discountValueCents: true,
  totalAfterDiscountCents: true,
  metadata: true,
});

export type StripeDiscountRedemption = typeof stripeDiscountRedemptions.$inferSelect;
export type InsertStripeDiscountRedemption = z.infer<typeof insertStripeDiscountRedemptionSchema>;

// Relações de redemptions
export const stripeDiscountRedemptionsRelations = relations(stripeDiscountRedemptions, ({ one }) => ({
  user: one(users, {
    fields: [stripeDiscountRedemptions.userId],
    references: [users.id],
  }),
  promotionCode: one(stripePromotionCodes, {
    fields: [stripeDiscountRedemptions.stripePromotionCodeId],
    references: [stripePromotionCodes.stripePromotionCodeId],
  }),
  coupon: one(stripeCoupons, {
    fields: [stripeDiscountRedemptions.stripeCouponId],
    references: [stripeCoupons.stripeCouponId],
  }),
}));

// Export types
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type OpmeItem = typeof opmeItems.$inferSelect;
export type InsertOpmeItem = z.infer<typeof insertOpmeItemSchema>;

export type Procedure = typeof procedures.$inferSelect;
export type InsertProcedure = z.infer<typeof insertProcedureSchema>;

export type MedicalOrder = typeof medicalOrders.$inferSelect;
export type InsertMedicalOrder = z.infer<typeof insertMedicalOrderSchema>;

// Nova tabela para gestão individual de procedimentos e aprovações
export const medicalOrderProcedures = pgTable("medical_order_procedures", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => medicalOrders.id, { onDelete: 'cascade' }),
  procedureId: integer("procedure_id").notNull(),
  quantityRequested: integer("quantity_requested").notNull().default(1),
  quantityApproved: integer("quantity_approved"),
  receivedValue: numeric("received_value", { precision: 10, scale: 2 }), // Valor recebido pelo médico por este procedimento específico
  status: text("status").notNull().default("em_analise"), // 'em_analise', 'aprovado', 'negado', 'parcial'
  isMain: boolean("is_main").notNull().default(false),
  surgicalApproachId: integer("surgical_approach_id").references(() => surgicalApproaches.id, { onDelete: 'set null' }), // Conduta cirúrgica associada
  surgicalProcedureId: integer("surgical_procedure_id").references(() => surgicalProcedures.id, { onDelete: 'set null' }), // Procedimento cirúrgico associado
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const medicalOrderProceduresRelations = relations(medicalOrderProcedures, ({ one }) => ({
  medicalOrder: one(medicalOrders, {
    fields: [medicalOrderProcedures.orderId],
    references: [medicalOrders.id],
    relationName: "orderProcedures",
  }),
  procedure: one(procedures, {
    fields: [medicalOrderProcedures.procedureId],
    references: [procedures.id],
    relationName: "procedureDetails",
  }),
  surgicalApproach: one(surgicalApproaches, {
    fields: [medicalOrderProcedures.surgicalApproachId],
    references: [surgicalApproaches.id],
    relationName: "orderProcedureSurgicalApproach",
  }),
  surgicalProcedure: one(surgicalProcedures, {
    fields: [medicalOrderProcedures.surgicalProcedureId],
    references: [surgicalProcedures.id],
    relationName: "orderProcedureSurgicalProcedure",
  }),
}));

export const insertMedicalOrderProcedureSchema = createInsertSchema(medicalOrderProcedures).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type MedicalOrderProcedure = typeof medicalOrderProcedures.$inferSelect;
export type InsertMedicalOrderProcedure = z.infer<typeof insertMedicalOrderProcedureSchema>;

// Medical Order CIDs - Relacionamento N:N entre pedidos e códigos CID-10
export const medicalOrderCids = pgTable("medical_order_cids", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => medicalOrders.id, { onDelete: 'cascade' }),
  cidCodeId: integer("cid_code_id").notNull().references(() => cidCodes.id),
  surgicalApproachId: integer("surgical_approach_id").references(() => surgicalApproaches.id, { onDelete: 'set null' }), // Conduta cirúrgica associada
  surgicalProcedureId: integer("surgical_procedure_id").references(() => surgicalProcedures.id, { onDelete: 'set null' }), // Procedimento cirúrgico associado
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const medicalOrderCidsRelations = relations(medicalOrderCids, ({ one }) => ({
  medicalOrder: one(medicalOrders, {
    fields: [medicalOrderCids.orderId],
    references: [medicalOrders.id],
  }),
  cidCode: one(cidCodes, {
    fields: [medicalOrderCids.cidCodeId],
    references: [cidCodes.id],
  }),
  surgicalApproach: one(surgicalApproaches, {
    fields: [medicalOrderCids.surgicalApproachId],
    references: [surgicalApproaches.id],
    relationName: "orderCidSurgicalApproach",
  }),
  surgicalProcedure: one(surgicalProcedures, {
    fields: [medicalOrderCids.surgicalProcedureId],
    references: [surgicalProcedures.id],
    relationName: "orderCidSurgicalProcedure",
  }),
}));

export const insertMedicalOrderCidSchema = createInsertSchema(medicalOrderCids).pick({
  orderId: true,
  cidCodeId: true,
  surgicalApproachId: true,
  surgicalProcedureId: true,
}).partial({ surgicalApproachId: true, surgicalProcedureId: true });

export type MedicalOrderCid = typeof medicalOrderCids.$inferSelect;
export type InsertMedicalOrderCid = z.infer<typeof insertMedicalOrderCidSchema>;

// Medical Order OPME Items - Relacionamento N:N entre pedidos, procedimentos e itens OPME
export const medicalOrderOpmeItems = pgTable("medical_order_opme_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => medicalOrders.id, { onDelete: 'cascade' }),
  procedureId: integer("procedure_id").references(() => procedures.id), // Tornar procedureId opcional
  opmeItemId: integer("opme_item_id").notNull().references(() => opmeItems.id),
  quantity: integer("quantity").notNull().default(1),
  surgicalApproachId: integer("surgical_approach_id").references(() => surgicalApproaches.id, { onDelete: 'set null' }), // Conduta cirúrgica associada
  surgicalProcedureId: integer("surgical_procedure_id").references(() => surgicalProcedures.id, { onDelete: 'set null' }), // Procedimento cirúrgico associado
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relações para medical_order_opme_items
export const medicalOrderOpmeItemsRelations = relations(medicalOrderOpmeItems, ({ one }) => ({
  medicalOrder: one(medicalOrders, {
    fields: [medicalOrderOpmeItems.orderId],
    references: [medicalOrders.id],
  }),
  procedure: one(procedures, {
    fields: [medicalOrderOpmeItems.procedureId],
    references: [procedures.id],
  }),
  opmeItem: one(opmeItems, {
    fields: [medicalOrderOpmeItems.opmeItemId],
    references: [opmeItems.id],
  }),
  surgicalApproach: one(surgicalApproaches, {
    fields: [medicalOrderOpmeItems.surgicalApproachId],
    references: [surgicalApproaches.id],
    relationName: "orderOpmeSurgicalApproach",
  }),
  surgicalProcedure: one(surgicalProcedures, {
    fields: [medicalOrderOpmeItems.surgicalProcedureId],
    references: [surgicalProcedures.id],
    relationName: "orderOpmeSurgicalProcedure",
  }),
}));

export const insertMedicalOrderOpmeItemSchema = createInsertSchema(medicalOrderOpmeItems).pick({
  orderId: true,
  procedureId: true,
  opmeItemId: true,
  quantity: true,
  surgicalApproachId: true,
  surgicalProcedureId: true,
}).partial({ procedureId: true, surgicalApproachId: true, surgicalProcedureId: true }); // Tornar campos opcionais

export type MedicalOrderOpmeItem = typeof medicalOrderOpmeItems.$inferSelect;
export type InsertMedicalOrderOpmeItem = z.infer<typeof insertMedicalOrderOpmeItemSchema>;

// Medical Order Suppliers - Relacionamento N:N entre pedidos e fornecedores
export const medicalOrderSuppliers = pgTable("medical_order_suppliers", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => medicalOrders.id, { onDelete: 'cascade' }),
  supplierId: integer("supplier_id").notNull().references(() => suppliers.id),
  surgicalApproachId: integer("surgical_approach_id").references(() => surgicalApproaches.id, { onDelete: 'set null' }),
  surgicalProcedureId: integer("surgical_procedure_id").references(() => surgicalProcedures.id, { onDelete: 'set null' }),
  isApproved: boolean("is_approved").default(false), // Indica se este fornecedor foi aprovado pela seguradora
  approvedBy: integer("approved_by").references(() => users.id), // Usuário que aprovou o fornecedor
  approvedAt: timestamp("approved_at"), // Data e hora da aprovação
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMedicalOrderSupplierSchema = createInsertSchema(medicalOrderSuppliers).pick({
  orderId: true,
  supplierId: true,
  surgicalApproachId: true,
  surgicalProcedureId: true,
  isApproved: true,
  approvedBy: true,
  approvedAt: true,
}).partial({ surgicalApproachId: true, surgicalProcedureId: true });

// Relações para a tabela medical_order_suppliers
export const medicalOrderSuppliersRelations = relations(medicalOrderSuppliers, ({ one }) => ({
  medicalOrder: one(medicalOrders, {
    fields: [medicalOrderSuppliers.orderId],
    references: [medicalOrders.id],
    relationName: "orderSupplierMedicalOrder",
  }),
  supplier: one(suppliers, {
    fields: [medicalOrderSuppliers.supplierId],
    references: [suppliers.id],
    relationName: "orderSupplierSupplier",
  }),
  surgicalApproach: one(surgicalApproaches, {
    fields: [medicalOrderSuppliers.surgicalApproachId],
    references: [surgicalApproaches.id],
    relationName: "orderSupplierSurgicalApproach",
  }),
  surgicalProcedure: one(surgicalProcedures, {
    fields: [medicalOrderSuppliers.surgicalProcedureId],
    references: [surgicalProcedures.id],
    relationName: "orderSupplierSurgicalProcedure",
  }),
  approvedByUser: one(users, {
    fields: [medicalOrderSuppliers.approvedBy],
    references: [users.id],
    relationName: "orderSupplierApprovedBy",
  }),
}));

export type MedicalOrderSupplier = typeof medicalOrderSuppliers.$inferSelect;
export type InsertMedicalOrderSupplier = z.infer<typeof insertMedicalOrderSupplierSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type ScannedDocument = typeof scannedDocuments.$inferSelect;
export type InsertScannedDocument = z.infer<typeof insertScannedDocumentSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;

// Tabela para idempotência de webhooks
export const webhookEvents = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull().unique(), // ID único do evento do Stripe
  eventType: text("event_type").notNull(), // checkout.session.completed, customer.subscription.updated, etc.
  processed: boolean("processed").default(false).notNull(),
  processedAt: timestamp("processed_at"),
  data: jsonb("data"), // Dados do evento para auditoria
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;

export type SubscriptionPayment = typeof subscriptionPayments.$inferSelect;
export type InsertSubscriptionPayment = z.infer<typeof insertSubscriptionPaymentSchema>;

export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;

export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = z.infer<typeof insertUserPermissionSchema>;

// Hospital schema
export const hospitals = pgTable("hospitals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  businessName: text("business_name"), // Nome Empresarial (opcional temporariamente)
  cnpj: text("cnpj").notNull().unique(),
  cnes: text("cnes"), // CNES (máximo 7 dígitos) (opcional temporariamente)
  ibgeStateCode: integer("ibge_state_code").notNull().references(() => brazilianStates.ibgeCode), // Código IBGE do estado
  ibgeCityCode: integer("ibge_city_code").references(() => municipalities.ibgeCode), // Código IBGE da cidade
  cep: text("cep"), // CEP no formato brasileiro (opcional temporariamente)
  address: text("address"), // Endereço (opcional temporariamente)
  number: integer("number"), // Número (opcional temporariamente)
  logoUrl: text("logo_url"), // URL do logo do hospital
});

export const insertHospitalSchema = createInsertSchema(hospitals).pick({
  name: true,
  businessName: true,
  cnpj: true,
  cnes: true,
  ibgeStateCode: true,
  ibgeCityCode: true,
  cep: true,
  address: true,
  number: true,
  logoUrl: true,
});

export type Hospital = typeof hospitals.$inferSelect;
export type InsertHospital = z.infer<typeof insertHospitalSchema>;

// CID-10 codes schema
export const cidCategories = pgEnum("cid_categories", [
  // Categorias ortopédicas específicas (mantidas para compatibilidade)
  "Joelho", 
  "Coluna", 
  "Ombro", 
  "Quadril", 
  "Pé e tornozelo",
  
  // Categorias CID-10 oficiais completas
  "Doenças Infecciosas e Parasitárias",
  "Neoplasias",
  "Doenças do Sangue e Órgãos Hematopoéticos",
  "Doenças Endócrinas e Metabólicas",
  "Transtornos Mentais e Comportamentais",
  "Doenças do Sistema Nervoso",
  "Doenças do Olho e Anexos",
  "Doenças do Ouvido",
  "Doenças do Aparelho Circulatório",
  "Doenças do Aparelho Respiratório",
  "Doenças do Aparelho Digestivo",
  "Doenças da Pele e Tecido Subcutâneo",
  "Doenças do Sistema Osteomuscular",
  "Doenças do Aparelho Geniturinário",
  "Gravidez, Parto e Puerpério",
  "Afecções Período Perinatal",
  "Malformações Congênitas",
  "Sintomas e Sinais Anormais",
  "Lesões e Envenenamentos",
  "Causas Externas",
  "Fatores que Influenciam o Estado de Saúde",
  "Outros"
]);

export const cidCodes = pgTable("cid_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // Código CID-10 (ex: M17.0)
  description: text("description").notNull(), // Descrição do código
  category: cidCategories("category").notNull().default("Outros"), // Categoria ortopédica
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCidCodeSchema = createInsertSchema(cidCodes).pick({
  code: true,
  description: true,
  category: true,
});

export type CidCode = typeof cidCodes.$inferSelect;
export type InsertCidCode = z.infer<typeof insertCidCodeSchema>;



// Fornecedores (Suppliers)
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  tradeName: text("trade_name"),
  cnpj: text("cnpj").notNull().unique(),
  municipalityId: integer("municipality_id").notNull().references(() => municipalities.id),
  address: text("address"),
  neighborhood: text("neighborhood"),
  postalCode: text("postal_code"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  anvisaCode: text("anvisa_code"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Definir relação entre fornecedores e municípios
export const suppliersRelations = relations(suppliers, ({ one }) => ({
  municipality: one(municipalities, {
    fields: [suppliers.municipalityId],
    references: [municipalities.id],
    relationName: "supplierMunicipality",
  }),
}));

export const insertSupplierSchema = createInsertSchema(suppliers).pick({
  companyName: true,
  tradeName: true,
  cnpj: true,
  municipalityId: true,
  address: true,
  neighborhood: true,
  postalCode: true,
  phone: true,
  email: true,
  website: true,
  anvisaCode: true,
  active: true,
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

// Enum para tipos de notificações
export const notificationTypeEnum = pgEnum("notification_type", ["info", "warning", "success"]);

// Tabela de notificações
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }),
  message: text("message").notNull(),
  type: notificationTypeEnum("type").default("info").notNull(),
  read: boolean("read").default(false).notNull(),
  link: text("link"), // Link opcional para direcionar quando clicar na notificação
  entityType: text("entity_type"), // Tipo de entidade relacionada (ex: "medicalOrder", "patient")
  entityId: integer("entity_id"), // ID da entidade relacionada
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  message: true,
  type: true,
  read: true,
  link: true,
  entityType: true,
  entityId: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Tabela para mensagens de "Fale Conosco"
export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  responseMessage: text("response_message"),
  responseDate: timestamp("response_date"),
  respondedById: integer("responded_by_id").references(() => users.id, { onDelete: "set null" }),
});

export const contactMessagesRelations = relations(contactMessages, ({ one }) => ({
  user: one(users, {
    fields: [contactMessages.userId],
    references: [users.id],
    relationName: "contactMessageUser",
  }),
  respondedBy: one(users, {
    fields: [contactMessages.respondedById],
    references: [users.id],
    relationName: "contactMessageRespondedBy",
  }),
}));

export const insertContactMessageSchema = createInsertSchema(contactMessages)
  .omit({ 
    id: true, 
    createdAt: true, 
    updatedAt: true, 
    status: true, 
    responseMessage: true, 
    responseDate: true, 
    respondedById: true 
  })
  .extend({
    email: z.string().email("E-mail inválido"),
    message: z.string().min(10, "A mensagem deve ter pelo menos 10 caracteres"),
  });

export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;

// Relação entre médicos (usuários com CRM) e hospitais
export const doctorHospitals = pgTable("doctor_hospitals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  hospitalId: integer("hospital_id").notNull().references(() => hospitals.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDoctorHospitalSchema = createInsertSchema(doctorHospitals).pick({
  userId: true,
  hospitalId: true,
});

export type DoctorHospital = typeof doctorHospitals.$inferSelect;
export type InsertDoctorHospital = z.infer<typeof insertDoctorHospitalSchema>;

// Brazilian States with IBGE codes
export const brazilianStates = pgTable("brazilian_states", {
  id: serial("id").primaryKey(),
  stateCode: text("state_code").notNull().unique(), // State abbreviation (e.g., SP, RJ)
  name: text("name").notNull(), // State name (e.g., São Paulo, Rio de Janeiro)
  ibgeCode: integer("ibge_code").notNull().unique(), // IBGE code for the state
  region: text("region").notNull(), // Region (e.g., Southeast, Northeast)
});

export const insertBrazilianStateSchema = createInsertSchema(brazilianStates).pick({
  stateCode: true,
  name: true,
  ibgeCode: true,
  region: true,
});

export type BrazilianState = typeof brazilianStates.$inferSelect;
export type InsertBrazilianState = z.infer<typeof insertBrazilianStateSchema>;

// Brazilian Municipalities with IBGE codes and state relationship
export const municipalities = pgTable("municipalities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ibgeCode: integer("ibge_code").notNull().unique(),
  stateId: integer("state_id")
    .notNull()
    .references(() => brazilianStates.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relationship between municipalities and states
export const municipalitiesRelations = relations(municipalities, ({ one }) => ({
  state: one(brazilianStates, {
    fields: [municipalities.stateId],
    references: [brazilianStates.id],
    relationName: "municipalityState",
  })
}));

export const insertMunicipalitySchema = createInsertSchema(municipalities).pick({
  name: true,
  ibgeCode: true,
  stateId: true,
});

export type Municipality = typeof municipalities.$inferSelect;
export type InsertMunicipality = z.infer<typeof insertMunicipalitySchema>;

// Tabela de relacionamento entre OPMEs e Fornecedores
export const opmeSuppliers = pgTable("opme_suppliers", {
  id: serial("id").primaryKey(),
  opmeItemId: integer("opme_item_id").notNull().references(() => opmeItems.id, { onDelete: 'cascade' }),
  supplierId: integer("supplier_id").notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
  registrationAnvisa: text("registration_anvisa"),                // Número de registro ANVISA específico do fornecedor
  commercialDescription: text("commercial_description"),          // Descrição comercial específica do fornecedor
  isPreferred: boolean("is_preferred").default(false),           // Indica se este é o fornecedor preferencial
  active: boolean("active").default(true),                       // Status do relacionamento
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }),  // Preço unitário
  lastPriceUpdate: date("last_price_update"),                    // Data da última atualização de preço
  deliveryTimeDays: integer("delivery_time_days"),               // Prazo de entrega em dias
  minimumQuantity: integer("minimum_quantity").default(1),       // Quantidade mínima para pedido
  notes: text("notes"),                                          // Observações adicionais
  createdAt: timestamp("created_at").defaultNow().notNull(),     // Data de criação
  updatedAt: timestamp("updated_at").defaultNow().notNull(),     // Data de atualização
});

// Definindo relações
export const opmeSupplierRelations = relations(opmeSuppliers, ({ one }) => ({
  opmeItem: one(opmeItems, {
    fields: [opmeSuppliers.opmeItemId],
    references: [opmeItems.id],
  }),
  supplier: one(suppliers, {
    fields: [opmeSuppliers.supplierId],
    references: [suppliers.id],
  }),
}));

export const insertOpmeSupplierSchema = createInsertSchema(opmeSuppliers).pick({
  opmeItemId: true,
  supplierId: true,
  registrationAnvisa: true,
  commercialDescription: true,
  isPreferred: true,
  active: true,
  unitPrice: true,
  lastPriceUpdate: true,
  deliveryTimeDays: true,
  minimumQuantity: true,
  notes: true,
});

export type OpmeSupplier = typeof opmeSuppliers.$inferSelect;
export type InsertOpmeSupplier = z.infer<typeof insertOpmeSupplierSchema>;

// Tabela de associação entre médicos e pacientes
export const doctorPatients = pgTable("doctor_patients", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  patientId: integer("patient_id").notNull().references(() => patients.id, { onDelete: 'cascade' }),
  associatedAt: timestamp("associated_at").defaultNow().notNull(),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
});

// Relações entre médicos (usuários) e pacientes
export const doctorPatientsRelations = relations(doctorPatients, ({ one }) => ({
  doctor: one(users, {
    fields: [doctorPatients.doctorId],
    references: [users.id],
    relationName: "doctorPatientUser",
  }),
  patient: one(patients, {
    fields: [doctorPatients.patientId],
    references: [patients.id],
    relationName: "doctorPatientPatient",
  })
}));

export const insertDoctorPatientSchema = createInsertSchema(doctorPatients).pick({
  doctorId: true,
  patientId: true,
  notes: true,
  isActive: true,
});

export type DoctorPatient = typeof doctorPatients.$inferSelect;
export type InsertDoctorPatient = z.infer<typeof insertDoctorPatientSchema>;

// Enum para status de recursos
export const appealStatusEnum = pgEnum("appeal_status", [
  "em_analise",     // Em análise
  "aprovado",       // Recurso aprovado
  "negado",         // Recurso negado
  "cancelado"       // Recurso cancelado
]);

// Tabela de recursos para pedidos recusados
export const appeals = pgTable("appeals", {
  id: serial("id").primaryKey(),
  medicalOrderId: integer("medical_order_id").notNull().references(() => medicalOrders.id, { onDelete: 'cascade' }),
  justification: text("justification").notNull(), // Justificativa médica do recurso
  rejectionReason: text("rejection_reason"), // Motivo da recusa enviado pela operadora
  additionalDocuments: text("additional_documents"), // URLs de documentos adicionais (JSON array)
  status: appealStatusEnum("status").notNull().default("em_analise"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"), // Data da análise do recurso
  reviewerNotes: text("reviewer_notes"), // Observações do revisor da seguradora
  createdBy: integer("created_by").notNull().references(() => users.id), // Médico que criou o recurso
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relações da tabela de recursos
export const appealsRelations = relations(appeals, ({ one }) => ({
  medicalOrder: one(medicalOrders, {
    fields: [appeals.medicalOrderId],
    references: [medicalOrders.id],
    relationName: "appealMedicalOrder",
  }),
  creator: one(users, {
    fields: [appeals.createdBy],
    references: [users.id],
    relationName: "appealCreator",
  })
}));

export const insertAppealSchema = createInsertSchema(appeals).omit({
  id: true,
  submittedAt: true,
  updatedAt: true,
});

export type Appeal = typeof appeals.$inferSelect;
export type InsertAppeal = z.infer<typeof insertAppealSchema>;

// Tabela de histórico de mudanças de status dos pedidos médicos
export const medicalOrderStatusHistory = pgTable("medical_order_status_history", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => medicalOrders.id, { onDelete: 'cascade' }),
  statusId: integer("status_id").notNull().references(() => orderStatuses.id),
  changedBy: integer("changed_by").references(() => users.id), // Usuário que fez a mudança (opcional para mudanças automáticas)
  changedAt: timestamp("changed_at").notNull().defaultNow(),
  notes: text("notes"), // Motivos de cancelamento, comentários da operadora, observações gerais
  deadlineDate: timestamp("deadline_date"), // Para contagens regressivas (21 dias análise, 90 dias pós-cirurgia)
  nextNotificationAt: timestamp("next_notification_at"), // Próxima notificação agendada (ex: adiar por 1 hora)
});

// Relações da tabela de histórico de status
export const medicalOrderStatusHistoryRelations = relations(medicalOrderStatusHistory, ({ one }) => ({
  medicalOrder: one(medicalOrders, {
    fields: [medicalOrderStatusHistory.orderId],
    references: [medicalOrders.id],
    relationName: "statusHistoryMedicalOrder",
  }),
  status: one(orderStatuses, {
    fields: [medicalOrderStatusHistory.statusId],
    references: [orderStatuses.id],
    relationName: "statusHistoryStatus",
  }),
  changedByUser: one(users, {
    fields: [medicalOrderStatusHistory.changedBy],
    references: [users.id],
    relationName: "statusHistoryUser",
  })
}));

export const insertMedicalOrderStatusHistorySchema = createInsertSchema(medicalOrderStatusHistory).omit({
  id: true,
  changedAt: true,
});

export type MedicalOrderStatusHistory = typeof medicalOrderStatusHistory.$inferSelect;
export type InsertMedicalOrderStatusHistory = z.infer<typeof insertMedicalOrderStatusHistorySchema>;

// Enum para status de agendamento cirúrgico
export const surgeryAppointmentStatusEnum = pgEnum("surgery_appointment_status", [
  "agendado",
  "confirmado", 
  "em_andamento",
  "concluido",
  "cancelado",
  "reagendado"
]);

// Enum para tipo de cirurgia
export const surgeryAppointmentTypeEnum = pgEnum("surgery_appointment_type", [
  "eletiva",
  "urgencia",
  "emergencia"
]);

// Tabela de agendamentos cirúrgicos
export const surgeryAppointments = pgTable("surgery_appointments", {
  id: serial("id").primaryKey(),
  medicalOrderId: integer("medical_order_id").notNull().references(() => medicalOrders.id, { onDelete: 'cascade' }),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  doctorId: integer("doctor_id").notNull().references(() => users.id),
  hospitalId: integer("hospital_id").references(() => hospitals.id),
  
  // Informações do agendamento
  scheduledDate: timestamp("scheduled_date").notNull(),
  scheduledTime: text("scheduled_time").notNull(), // HH:MM format
  estimatedDuration: integer("estimated_duration").notNull(), // Duration in minutes
  surgeryType: surgeryAppointmentTypeEnum("surgery_type").notNull().default("eletiva"),
  status: surgeryAppointmentStatusEnum("status").notNull().default("agendado"),
  
  // Informações da cirurgia
  surgeryRoom: text("surgery_room"), // Sala cirúrgica
  surgicalTeam: jsonb("surgical_team"), // Array de membros da equipe cirúrgica
  preOperativeNotes: text("pre_operative_notes"), // Observações pré-operatórias
  postOperativeNotes: text("post_operative_notes"), // Observações pós-operatórias
  
  // Controle de tempo
  actualStartTime: timestamp("actual_start_time"), // Hora real de início
  actualEndTime: timestamp("actual_end_time"), // Hora real de término
  actualDuration: integer("actual_duration"), // Duração real em minutos
  
  // Informações administrativas
  priority: integer("priority").default(1), // 1=baixa, 2=média, 3=alta, 4=crítica
  notes: text("notes"), // Observações gerais
  cancellationReason: text("cancellation_reason"), // Motivo do cancelamento
  
  // Auditoria
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  
  // Campos para reagendamento
  originalDate: timestamp("original_date"), // Data original antes do reagendamento
  rescheduledBy: integer("rescheduled_by").references(() => users.id), // Usuário que reagendou
  rescheduledAt: timestamp("rescheduled_at"), // Data do reagendamento
  rescheduledReason: text("rescheduled_reason"), // Motivo do reagendamento
});

// Relações da tabela de agendamentos cirúrgicos
export const surgeryAppointmentsRelations = relations(surgeryAppointments, ({ one }) => ({
  medicalOrder: one(medicalOrders, {
    fields: [surgeryAppointments.medicalOrderId],
    references: [medicalOrders.id],
    relationName: "appointmentMedicalOrder",
  }),
  patient: one(patients, {
    fields: [surgeryAppointments.patientId],
    references: [patients.id],
    relationName: "appointmentPatient",
  }),
  doctor: one(users, {
    fields: [surgeryAppointments.doctorId],
    references: [users.id],
    relationName: "appointmentDoctor",
  }),
  hospital: one(hospitals, {
    fields: [surgeryAppointments.hospitalId],
    references: [hospitals.id],
    relationName: "appointmentHospital",
  }),
  createdByUser: one(users, {
    fields: [surgeryAppointments.createdBy],
    references: [users.id],
    relationName: "appointmentCreator",
  }),
  rescheduledByUser: one(users, {
    fields: [surgeryAppointments.rescheduledBy],
    references: [users.id],
    relationName: "appointmentRescheduler",
  })
}));

export const insertSurgeryAppointmentSchema = createInsertSchema(surgeryAppointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  scheduledDate: z.union([z.date(), z.string().transform((str) => new Date(str))]),
});

export type SurgeryAppointment = typeof surgeryAppointments.$inferSelect;
export type InsertSurgeryAppointment = z.infer<typeof insertSurgeryAppointmentSchema>;

// ========================================
// SURGICAL PROCEDURE + CONDUCT → CID ASSOCIATIONS
// ========================================

export const surgicalProcedureConductCids = pgTable("surgical_procedure_conduct_cids", {
  id: serial("id").primaryKey(),
  surgicalProcedureId: integer("surgical_procedure_id").notNull().references(() => surgicalProcedures.id, { onDelete: "cascade" }),
  surgicalApproachId: integer("surgical_approach_id").notNull().references(() => surgicalApproaches.id, { onDelete: "cascade" }),
  cidCodeId: integer("cid_code_id").notNull().references(() => cidCodes.id, { onDelete: "cascade" }),
  isPrimaryCid: boolean("is_primary_cid").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueAssociation: unique().on(table.surgicalProcedureId, table.surgicalApproachId, table.cidCodeId),
}));

// Relações da tabela de associações procedimento + conduta → CID
export const surgicalProcedureConductCidsRelations = relations(surgicalProcedureConductCids, ({ one }) => ({
  surgicalProcedure: one(surgicalProcedures, {
    fields: [surgicalProcedureConductCids.surgicalProcedureId],
    references: [surgicalProcedures.id],
    relationName: "procedureConductCidProcedure",
  }),
  surgicalApproach: one(surgicalApproaches, {
    fields: [surgicalProcedureConductCids.surgicalApproachId],
    references: [surgicalApproaches.id],
    relationName: "procedureConductCidApproach",
  }),
  cidCode: one(cidCodes, {
    fields: [surgicalProcedureConductCids.cidCodeId],
    references: [cidCodes.id],
    relationName: "procedureConductCidCode",
  }),
}));

export const insertSurgicalProcedureConductCidSchema = createInsertSchema(surgicalProcedureConductCids).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SurgicalProcedureConductCid = typeof surgicalProcedureConductCids.$inferSelect;
export type InsertSurgicalProcedureConductCid = z.infer<typeof insertSurgicalProcedureConductCidSchema>;

// ========================================
// MEDICAL ORDER SUPPLIER MANUFACTURERS
// ========================================

export const medicalOrderSupplierManufacturers = pgTable("medical_order_supplier_manufacturers", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => medicalOrders.id, { onDelete: 'cascade' }),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: 'cascade' }),
  surgicalApproachId: integer("surgical_approach_id").references(() => surgicalApproaches.id, { onDelete: 'set null' }),
  surgicalProcedureId: integer("surgical_procedure_id").references(() => surgicalProcedures.id, { onDelete: 'set null' }),
  priority: integer("priority").notNull(), // 1, 2, ou 3 para posição na interface
  manufacturerName: text("manufacturer_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Previne duplicatas da mesma posição no mesmo pedido POR CONDUTA (1 fabricante por posição por pedido por conduta)
  uniquePriorityPerOrderPerConduta: unique().on(table.orderId, table.priority, table.surgicalApproachId, table.surgicalProcedureId),
}));

// Relações da tabela de fabricantes por pedido médico
export const medicalOrderSupplierManufacturersRelations = relations(medicalOrderSupplierManufacturers, ({ one }) => ({
  medicalOrder: one(medicalOrders, {
    fields: [medicalOrderSupplierManufacturers.orderId],
    references: [medicalOrders.id],
    relationName: "orderManufacturers",
  }),
  supplier: one(suppliers, {
    fields: [medicalOrderSupplierManufacturers.supplierId],
    references: [suppliers.id],
    relationName: "supplierManufacturer",
  }),
  surgicalApproach: one(surgicalApproaches, {
    fields: [medicalOrderSupplierManufacturers.surgicalApproachId],
    references: [surgicalApproaches.id],
    relationName: "manufacturerSurgicalApproach",
  }),
  surgicalProcedure: one(surgicalProcedures, {
    fields: [medicalOrderSupplierManufacturers.surgicalProcedureId],
    references: [surgicalProcedures.id],
    relationName: "manufacturerSurgicalProcedure",
  }),
}));

export const insertMedicalOrderSupplierManufacturerSchema = createInsertSchema(medicalOrderSupplierManufacturers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type MedicalOrderSupplierManufacturer = typeof medicalOrderSupplierManufacturers.$inferSelect;
export type InsertMedicalOrderSupplierManufacturer = z.infer<typeof insertMedicalOrderSupplierManufacturerSchema>;

// Relações para especialidades médicas
export const medicalSpecialtiesRelations = relations(medicalSpecialties, ({ many }) => ({
  users: many(users),
}));

// Users relations now handled above with addresses relationship

// Relações para planos de assinatura
export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  userSubscriptions: many(userSubscriptions),
}));

// Relações para assinaturas de usuários
export const userSubscriptionsRelations = relations(userSubscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [userSubscriptions.userId],
    references: [users.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [userSubscriptions.planId],
    references: [subscriptionPlans.id],
  }),
  payments: many(subscriptionPayments),
}));

// Relações para pagamentos de assinatura
export const subscriptionPaymentsRelations = relations(subscriptionPayments, ({ one }) => ({
  subscription: one(userSubscriptions, {
    fields: [subscriptionPayments.subscriptionId],
    references: [userSubscriptions.id],
  }),
}));

// ============================================================================
// INTERFACES PADRONIZADAS PARA ITENS COM ASSOCIAÇÃO CIRÚRGICA
// ============================================================================
// Usadas para garantir consistência na leitura/gravação de CIDs, CBHPM e OPME
// que possuem associação com condutas cirúrgicas (surgical_approach) e 
// procedimentos cirúrgicos (surgical_procedure)
// ============================================================================

// Interface base para referência de conduta cirúrgica
export interface SurgicalApproachRef {
  id: number;
  name: string;
}

// Interface base para referência de procedimento cirúrgico
export interface SurgicalProcedureRef {
  id: number;
  name: string;
}

// Interface base para associação cirúrgica (usada em CIDs, CBHPM e OPME)
export interface SurgicalAssociation {
  surgicalApproach: SurgicalApproachRef | null;
  surgicalProcedure: SurgicalProcedureRef | null;
}

// Interface para referência de CID
export interface CidRef {
  id: number;
  code: string;
  description: string;
  category?: string;
}

// Interface para referência de Procedimento CBHPM
export interface CbhpmProcedureRef {
  id: number;
  code: string;
  name: string;
  description?: string;
  porte?: string;
  porteAnestesista?: string;
  numeroAuxiliares?: number;
}

// Interface para referência de Item OPME
export interface OpmeItemRef {
  id: number;
  technicalName: string;
  commercialName?: string;
  anvisaCode?: string;
}

// ============================================================================
// INTERFACES PADRONIZADAS PARA USO NO FRONTEND
// ============================================================================

// CID com associação cirúrgica (formato padronizado)
export interface OrderCidItem extends SurgicalAssociation {
  cid: CidRef;
}

// Procedimento CBHPM com associação cirúrgica (formato padronizado)
export interface OrderCbhpmItem extends SurgicalAssociation {
  procedure: CbhpmProcedureRef;
  quantity: number;
}

// Item OPME com associação cirúrgica (formato padronizado)
export interface OrderOpmeItem extends SurgicalAssociation {
  item: OpmeItemRef;
  quantity: number;
}

// ============================================================================
// SCHEMAS ZOD PARA VALIDAÇÃO DE ENTRADA (PUT/POST)
// ============================================================================

// Schema para salvar CID com associação cirúrgica
export const orderCidInputSchema = z.object({
  cidId: z.number(),
  surgicalApproachId: z.number().nullable().optional(),
  surgicalProcedureId: z.number().nullable().optional(),
});
export type OrderCidInput = z.infer<typeof orderCidInputSchema>;

// Schema para salvar Procedimento CBHPM com associação cirúrgica
export const orderCbhpmInputSchema = z.object({
  procedureId: z.number(),
  quantity: z.number().default(1),
  surgicalApproachId: z.number().nullable().optional(),
  surgicalProcedureId: z.number().nullable().optional(),
});
export type OrderCbhpmInput = z.infer<typeof orderCbhpmInputSchema>;

// Schema para salvar Item OPME com associação cirúrgica
export const orderOpmeInputSchema = z.object({
  opmeItemId: z.number(),
  quantity: z.number().default(1),
  surgicalApproachId: z.number().nullable().optional(),
  surgicalProcedureId: z.number().nullable().optional(),
});
export type OrderOpmeInput = z.infer<typeof orderOpmeInputSchema>;

