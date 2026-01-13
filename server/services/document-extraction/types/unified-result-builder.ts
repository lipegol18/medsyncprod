/**
 * UnifiedResultBuilder - Construtor centralizado para resultados de extração
 * 
 * Este builder garante que TODOS os orquestradores retornem o mesmo formato,
 * com valores padrão consistentes e validação automática.
 */

import { 
  DocumentType, 
  DefaultSubtypes 
} from './document-constants';
import type { DocumentTypeValue } from './document-constants';

export interface UnifiedAddressData {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
}

export interface UnifiedPatientData {
  fullName?: string;
  cpf?: string;
  rg?: string;
  birthDate?: string;
  gender?: 'M' | 'F';
  phone?: string;
  email?: string;
  mothersName?: string;
  fathersName?: string;
  birthPlace?: string;
  nationality?: string;
  address?: UnifiedAddressData;
}

export interface UnifiedInsuranceData {
  provider?: string;
  providerRaw?: string;
  plan?: string;
  cardNumber?: string;
  cns?: string;
  holderName?: string;
  validity?: string;
}

export interface UnifiedExtractionMetadata {
  documentType: DocumentTypeValue;
  subtype: string;
  extractorVersion: string;
  confidence: number;
  method?: string;
}

export interface UnifiedExtractionResult {
  success: boolean;
  patient: UnifiedPatientData;
  insurance?: UnifiedInsuranceData;
  metadata: UnifiedExtractionMetadata;
  errors?: string[];
  processedImageUrl?: string;
  preprocessing?: {
    appliedOperations?: string[];
    originalSize?: { width: number; height: number };
    processedSize?: { width: number; height: number };
    isScreenPhoto?: boolean;
  };
  rawText?: string;
}

export interface BuilderOptions {
  subtype?: string;
  confidence?: number;
  method?: string;
  processedImageUrl?: string;
  preprocessing?: {
    appliedOperations?: string[];
    originalSize?: { width: number; height: number };
    processedSize?: { width: number; height: number };
    isScreenPhoto?: boolean;
  };
}

export class UnifiedResultBuilder {
  
  /**
   * Cria um resultado de sucesso
   */
  static success(
    documentType: DocumentTypeValue,
    patient: UnifiedPatientData,
    insurance?: UnifiedInsuranceData,
    options: BuilderOptions = {}
  ): UnifiedExtractionResult {
    const subtype = options.subtype || DefaultSubtypes[documentType] || 'UNKNOWN';
    const confidence = options.confidence ?? 0.8;
    
    return {
      success: true,
      patient: this.sanitizePatient(patient),
      insurance: insurance ? this.sanitizeInsurance(insurance) : undefined,
      metadata: {
        documentType: documentType as any,
        subtype,
        extractorVersion: `${documentType}_${subtype}_V1`,
        confidence,
        method: options.method
      },
      processedImageUrl: options.processedImageUrl,
      preprocessing: options.preprocessing
    };
  }
  
  /**
   * Cria um resultado de erro
   */
  static error(
    documentType: DocumentTypeValue,
    errors: string | string[],
    options: BuilderOptions = {}
  ): UnifiedExtractionResult {
    const errorArray = Array.isArray(errors) ? errors : [errors];
    const subtype = options.subtype || DefaultSubtypes[documentType] || 'ERROR';
    
    return {
      success: false,
      patient: {},
      metadata: {
        documentType: documentType as any,
        subtype,
        extractorVersion: `${documentType}_ERROR_V1`,
        confidence: options.confidence ?? 0,
        method: options.method
      },
      errors: errorArray,
      processedImageUrl: options.processedImageUrl,
      preprocessing: options.preprocessing
    };
  }
  
  /**
   * Cria um resultado para documento não identificado
   */
  static unknown(
    message: string = 'Tipo de documento não identificado',
    options: BuilderOptions = {}
  ): UnifiedExtractionResult {
    return this.error(DocumentType.UNKNOWN, message, {
      ...options,
      subtype: 'UNKNOWN'
    });
  }
  
  /**
   * Sanitiza dados do paciente, removendo valores vazios
   */
  private static sanitizePatient(patient: UnifiedPatientData): UnifiedPatientData {
    const sanitized: UnifiedPatientData = {};
    
    if (patient.fullName?.trim()) sanitized.fullName = patient.fullName.trim();
    if (patient.cpf?.trim()) sanitized.cpf = patient.cpf.trim();
    if (patient.rg?.trim()) sanitized.rg = patient.rg.trim();
    if (patient.birthDate?.trim()) sanitized.birthDate = patient.birthDate.trim();
    if (patient.gender) sanitized.gender = patient.gender;
    if (patient.phone?.trim()) sanitized.phone = patient.phone.trim();
    if (patient.email?.trim()) sanitized.email = patient.email.trim();
    if (patient.mothersName?.trim()) sanitized.mothersName = patient.mothersName.trim();
    if (patient.fathersName?.trim()) sanitized.fathersName = patient.fathersName.trim();
    if (patient.birthPlace?.trim()) sanitized.birthPlace = patient.birthPlace.trim();
    if (patient.nationality?.trim()) sanitized.nationality = patient.nationality.trim();
    
    // Sanitizar e incluir endereço se existir
    if (patient.address) {
      const sanitizedAddress: UnifiedAddressData = {};
      if (patient.address.logradouro?.trim()) sanitizedAddress.logradouro = patient.address.logradouro.trim();
      if (patient.address.numero?.trim()) sanitizedAddress.numero = patient.address.numero.trim();
      if (patient.address.complemento?.trim()) sanitizedAddress.complemento = patient.address.complemento.trim();
      if (patient.address.bairro?.trim()) sanitizedAddress.bairro = patient.address.bairro.trim();
      if (patient.address.cidade?.trim()) sanitizedAddress.cidade = patient.address.cidade.trim();
      if (patient.address.estado?.trim()) sanitizedAddress.estado = patient.address.estado.trim();
      if (patient.address.cep?.trim()) sanitizedAddress.cep = patient.address.cep.trim();
      
      // Só adiciona o endereço se tiver algum campo preenchido
      if (Object.keys(sanitizedAddress).length > 0) {
        sanitized.address = sanitizedAddress;
      }
    }
    
    return sanitized;
  }
  
  /**
   * Sanitiza dados do seguro, removendo valores vazios
   */
  private static sanitizeInsurance(insurance: UnifiedInsuranceData): UnifiedInsuranceData {
    const sanitized: UnifiedInsuranceData = {};
    
    if (insurance.provider?.trim()) sanitized.provider = insurance.provider.trim();
    if (insurance.providerRaw?.trim()) sanitized.providerRaw = insurance.providerRaw.trim();
    if (insurance.plan?.trim()) sanitized.plan = insurance.plan.trim();
    if (insurance.cardNumber?.trim()) sanitized.cardNumber = insurance.cardNumber.trim();
    if (insurance.cns?.trim()) sanitized.cns = insurance.cns.trim();
    if (insurance.holderName?.trim()) sanitized.holderName = insurance.holderName.trim();
    if (insurance.validity?.trim()) sanitized.validity = insurance.validity.trim();
    
    return sanitized;
  }
}

export { DocumentType, DocumentTypeValue };
