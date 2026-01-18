/**
 * Constantes centralizadas para o sistema de extração de documentos
 * Este arquivo é a única fonte de verdade para tipos de documentos
 */

export const DocumentType = {
  RG: 'RG',
  CNH: 'CNH',
  CARTEIRINHA: 'CARTEIRINHA',
  MV_PATIENT_SCREEN: 'MV_PATIENT_SCREEN',
  EMERGENCY_LABEL: 'EMERGENCY_LABEL',
  UNKNOWN: 'UNKNOWN'
} as const;

export type DocumentTypeValue = typeof DocumentType[keyof typeof DocumentType];

export const DocumentSubtype = {
  RG_CLASSICO: 'RG_CLASSICO',
  RG_MODERNO: 'RG_MODERNO',
  RG_DIGITAL: 'RG_DIGITAL',
  RG_GENERICO: 'RG_GENERICO',
  
  CNH_CLASSICA: 'CNH_CLASSICA',
  CNH_MODERNA: 'CNH_MODERNA',
  CNH_DIGITAL: 'CNH_DIGITAL',
  CNH_GENERICA: 'CNH_GENERICA',
  
  CIN_NOVA: 'CIN_NOVA',
  
  MV_CHN: 'MV_CHN',
  MV_ADV: 'MV_ADV',
  MV_UNKNOWN: 'MV_UNKNOWN',
  
  EMERGENCY_LABEL_HOSPITAL: 'EMERGENCY_LABEL_HOSPITAL',
  
  SULAMERICA: 'SULAMERICA',
  BRADESCO: 'BRADESCO',
  UNIMED: 'UNIMED',
  PORTO_SEGURO: 'PORTO_SEGURO',
  AMIL: 'AMIL',
  GENERIC: 'GENERIC',
  
  ERROR: 'ERROR'
} as const;

export type DocumentSubtypeValue = typeof DocumentSubtype[keyof typeof DocumentSubtype];

export const DefaultSubtypes: Record<DocumentTypeValue, string> = {
  [DocumentType.RG]: DocumentSubtype.RG_GENERICO,
  [DocumentType.CNH]: DocumentSubtype.CNH_GENERICA,
  [DocumentType.CARTEIRINHA]: DocumentSubtype.GENERIC,
  [DocumentType.MV_PATIENT_SCREEN]: DocumentSubtype.MV_UNKNOWN,
  [DocumentType.EMERGENCY_LABEL]: DocumentSubtype.EMERGENCY_LABEL_HOSPITAL,
  [DocumentType.UNKNOWN]: DocumentSubtype.ERROR
};

export const DocumentTypeLabels: Record<DocumentTypeValue, string> = {
  [DocumentType.RG]: 'Documento de Identidade (RG)',
  [DocumentType.CNH]: 'Carteira de Habilitação (CNH)',
  [DocumentType.CARTEIRINHA]: 'Carteirinha de Plano de Saúde',
  [DocumentType.MV_PATIENT_SCREEN]: 'Tela do Sistema MV',
  [DocumentType.EMERGENCY_LABEL]: 'Etiqueta de Emergência',
  [DocumentType.UNKNOWN]: 'Documento não identificado'
};
