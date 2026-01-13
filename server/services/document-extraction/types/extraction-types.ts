/**
 * Tipos e interfaces para o sistema de extração de documentos
 * 
 * Este arquivo é o ÚNICO ponto de entrada para tipos públicos.
 * Consumidores devem importar daqui, não dos arquivos internos.
 */

export {
  UnifiedPatientData,
  UnifiedInsuranceData,
  UnifiedExtractionMetadata,
  UnifiedExtractionResult
} from './unified-result-builder';

export { 
  DocumentType, 
  DocumentTypeValue,
  DocumentSubtype,
  DocumentSubtypeValue,
  DefaultSubtypes
} from './document-constants';

export { UnifiedResultBuilder } from './unified-result-builder';
