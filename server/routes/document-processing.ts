import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { convertPDFToImage } from "../services/document-extraction/utils/pdf-converter";
import { documentExtractionService, documentExtractionManager } from "../services/document-extraction";
import { DocumentTypeDetector } from "../services/document-extraction/detectors/document-type-detector";
import { GoogleVisionOCREngine } from "../services/document-extraction/core/ocr-engine";
import { TextPreprocessor } from "../services/document-extraction/core/text-preprocessor";
import { ImagePreprocessor } from "../services/document-extraction/core/image-preprocessor";
import { MVOrchestrator, MVExtractionResult, MVScreenType } from "../services/document-extraction/orchestrators/mv-orchestrator";
import { IdentityOrchestrator } from "../services/document-extraction/orchestrators/identity-orchestrator";
import { InsuranceOrchestrator } from "../services/document-extraction/orchestrators/insurance-orchestrator";
import type { UnifiedExtractionResult } from "../services/document-extraction/types/extraction-types";

type MVExtractResult = MVExtractionResult & { subtype: MVScreenType };

/**
 * Conta quantos campos foram extraídos com sucesso
 */
function countExtractedFields(result: MVExtractionResult): number {
  let count = 0;
  
  // Contar campos do paciente
  const patient = result.patient;
  if (patient.nome) count++;
  if (patient.cpf) count++;
  if (patient.rg) count++;
  if (patient.dataNascimento) count++;
  if (patient.sexo) count++;
  if (patient.nomeMae) count++;
  if (patient.telefone) count++;
  if (patient.endereco) count++;
  
  // Contar campos do convênio
  const insurance = result.insurance;
  if (insurance.convenio) count++;
  if (insurance.numeroCarteira) count++;
  if (insurance.plano) count++;
  if (insurance.cns) count++;
  
  return count;
}

/**
 * Mescla dois resultados de extração, pegando o melhor de cada um
 * O primeiro resultado (primary) é usado como base, preenchendo campos vazios do secundário
 */
function mergeExtractionResults(primary: MVExtractResult, secondary: MVExtractResult): MVExtractResult {
  const merged: MVExtractResult = {
    success: primary.success || secondary.success,
    confidence: Math.max(primary.confidence || 0, secondary.confidence || 0),
    errors: [...(primary.errors || []), ...(secondary.errors || [])],
    patient: { ...primary.patient },
    insurance: { ...primary.insurance },
    subtype: primary.subtype,
  };
  
  // Preencher campos vazios do paciente com valores do secundário
  const patientKeys = Object.keys(secondary.patient) as (keyof typeof secondary.patient)[];
  for (const key of patientKeys) {
    if (!merged.patient[key] && secondary.patient[key]) {
      (merged.patient as any)[key] = secondary.patient[key];
      console.log(`🔀 [Merge] Campo patient.${key} preenchido do resultado secundário`);
    }
  }
  
  // Preencher campos vazios do convênio com valores do secundário
  const insuranceKeys = Object.keys(secondary.insurance) as (keyof typeof secondary.insurance)[];
  for (const key of insuranceKeys) {
    if (!merged.insurance[key] && secondary.insurance[key]) {
      (merged.insurance as any)[key] = secondary.insurance[key];
      console.log(`🔀 [Merge] Campo insurance.${key} preenchido do resultado secundário`);
    }
  }
  
  return merged;
}

/**
 * Rotas de processamento de documentos via OCR
 * Inclui processamento de RG/CNH e carteirinhas de plano de saúde
 */
const router = Router();

// Configurar armazenamento de upload específico para OCR
const ocrUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/ocr-temp/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname);
    cb(null, `ocr-${uniqueSuffix}${extension}`);
  },
});

const ocrUpload = multer({ 
  storage: ocrUploadStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não suportado. Use imagens (JPEG, PNG, GIF, WebP) ou PDF.'));
    }
  }
});

/**
 * POST /api/process-document-auto
 * Processa documentos com DETECÇÃO AUTOMÁTICA do tipo
 * Usa o DocumentExtractionManager para detectar e extrair automaticamente
 * 
 * @param document - Arquivo de imagem ou PDF
 */
router.post('/process-document-auto', ocrUpload.single('document'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }

    const usePreprocessing = req.body.usePreprocessing !== 'false';
    
    console.log(`🔄 [OCR-Auto] Processando documento com DocumentExtractionManager...`);
    console.log(`📄 [OCR-Auto] Arquivo: ${req.file.originalname} (${req.file.mimetype})`);
    console.log(`🔧 [OCR-Auto] Pré-processamento: ${usePreprocessing ? 'ATIVADO' : 'DESATIVADO'}`);
    
    let imageBuffer: Buffer;
    
    if (req.file.mimetype === 'application/pdf') {
      console.log('📄 [OCR-Auto] Detectado PDF - convertendo para imagem...');
      imageBuffer = await convertPDFToImage(req.file.path);
    } else {
      imageBuffer = fs.readFileSync(req.file.path);
    }
    
    const result = await documentExtractionManager.extractUnified(imageBuffer, {
      usePreprocessing,
      returnProcessedImage: true,
    });
    
    cleanupTempFile(req.file.path);
    
    console.log(`✅ [OCR-Auto] Processamento concluído: ${result.success ? 'SUCESSO' : 'FALHA'}`);
    console.log(`📊 [OCR-Auto] Tipo: ${result.metadata.documentType}, Subtipo: ${result.metadata.subtype}`);
    
    return res.json(result);
    
  } catch (error) {
    console.error('❌ [OCR-Auto] Erro ao processar documento:', error);
    
    if (req.file?.path) {
      cleanupTempFile(req.file.path);
    }
    
    return res.status(500).json({ 
      success: false,
      error: 'Erro ao processar documento',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * POST /api/process-document
 * Processa documentos de identidade (RG/CNH) ou carteirinhas de plano de saúde
 * (Rota legada - mantida para compatibilidade)
 * 
 * @param documentType - 'identity' para RG/CNH ou 'insurance' para carteirinha
 * @param document - Arquivo de imagem ou PDF
 */
router.post('/process-document', ocrUpload.single('document'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }

    const { documentType } = req.body; // 'identity' ou 'insurance'
    
    console.log(`🔄 [OCR-Routes] Processando documento tipo: ${documentType}`);
    console.log(`📄 [OCR-Routes] Arquivo: ${req.file.originalname} (${req.file.mimetype})`);
    
    let imageBuffer: Buffer;
    
    // Verificar se é PDF e converter para imagem
    if (req.file.mimetype === 'application/pdf') {
      console.log('📄 [OCR-Routes] Detectado PDF - convertendo para imagem...');
      imageBuffer = await convertPDFToImage(req.file.path);
    } else {
      // Ler arquivo de imagem diretamente
      imageBuffer = fs.readFileSync(req.file.path);
    }
    
    if (documentType === 'identity') {
      console.log('🆕 [OCR-Routes] Processando documento de identidade...');
      
      try {
        // Importar e usar o InsuranceOrchestrator
        const { InsuranceOrchestrator } = await import('../services/document-extraction/orchestrators/insurance-orchestrator');
        
        const orchestrator = new InsuranceOrchestrator();
        console.log('🔄 [OCR-Routes] Iniciando processamento com arquitetura unificada...');
        console.log('📄 [OCR-Routes] Tamanho do buffer:', imageBuffer.length, 'bytes');
        
        const result = await orchestrator.processDocument(imageBuffer);
        
        console.log('📋 [OCR-Routes] Resultado:', result.success ? '✅ SUCESSO' : '❌ FALHA');
        
        if (result.success) {
          console.log('✅ [OCR-Routes] Documento de identidade processado');
          
          // Converter resultado para formato compatível
          const compatibleData = {
            fullName: result.data.nomeCompleto,
            idNumber: result.data.rg || result.data.cpf,
            cpf: result.data.cpf,
            birthDate: result.data.dataNascimento,
            mothersName: result.data.nomeMae,
            fathersName: result.data.nomePai,
            birthPlace: result.data.naturalidade,
            issuedBy: result.data.orgaoExpedidor,
            documentType: result.data.tipoDocumento,
            subtype: result.data.subtipoDocumento,
            confidence: result.confidence,
            method: result.method,
            newArchitecture: true
          };
          
          // Limpar arquivo temporário
          cleanupTempFile(req.file.path);
          
          return res.json({
            success: true,
            extractedText: 'Processado pela arquitetura unificada',
            data: compatibleData,
            metadata: {
              architecture: 'unified',
              confidence: result.confidence,
              detectionMethod: result.method,
              version: '2.0'
            }
          });
          
        } else {
          console.log('❌ [OCR-Routes] Falha na extração:', result.errors?.join(', ') || 'Erro desconhecido');
          
          cleanupTempFile(req.file.path);
          
          return res.status(500).json({
            success: false,
            error: 'Falha no processamento do documento de identidade',
            errors: result.errors,
            metadata: {
              architecture: 'unified',
              version: '2.0'
            }
          });
        }
        
      } catch (error) {
        console.error('❌ [OCR-Routes] Erro na extração de documento:', error);
        
        cleanupTempFile(req.file.path);
        
        return res.status(500).json({
          success: false,
          error: 'Erro interno na extração do documento',
          details: error instanceof Error ? error.message : 'Erro desconhecido',
          metadata: {
            architecture: 'unified',
            version: '2.0'
          }
        });
      }
      
    } else if (documentType === 'insurance') {
      console.log('📋 [OCR-Routes] Processando carteirinha de plano de saúde...');
      
      try {
        const result = await documentExtractionService.processInsuranceCard(imageBuffer);
        
        console.log('📋 [OCR-Routes] Resultado:', result.success ? '✅ SUCESSO' : '❌ FALHA');
        
        if (result.errors) {
          console.log('🔍 [OCR-Routes] Erros encontrados:', result.errors);
        }
      
        if (result.success) {
          console.log('✅ [OCR-Routes] Carteirinha processada');
          
          // Converter resultado para formato compatível
          const compatibleData = {
            operadora: result.data.operadora,
            normalizedOperadora: result.data.normalizedOperadora,
            nomeTitular: result.data.nomeTitular,
            numeroCarteirinha: result.data.numeroCarteirinha,
            plano: result.data.plano,
            dataNascimento: result.data.dataNascimento,
            cns: result.data.cns,
            ansCode: result.data.ansCode,
            confidence: result.confidence,
            method: result.method,
            newArchitecture: true
          };
          
          cleanupTempFile(req.file.path);
          
          return res.json({
            success: true,
            extractedText: 'Processado pela arquitetura modular',
            data: compatibleData,
            metadata: {
              architecture: 'modular',
              confidence: result.confidence,
              detectionMethod: result.method,
              version: '2.0'
            }
          });
          
        } else {
          console.log('❌ [OCR-Routes] Falha na extração:', result.errors?.join(', ') || 'Erro desconhecido');
          
          cleanupTempFile(req.file.path);
          
          return res.status(500).json({
            success: false,
            error: 'Falha no processamento da carteirinha',
            errors: result.errors,
            metadata: {
              architecture: 'modular',
              version: '2.0'
            }
          });
        }
      } catch (error) {
        console.error('❌ [OCR-Routes] Erro na extração da carteirinha:', error);
        
        cleanupTempFile(req.file.path);
        
        return res.status(500).json({
          success: false,
          error: 'Erro interno na extração da carteirinha',
          details: error instanceof Error ? error.message : 'Erro desconhecido',
          metadata: {
            architecture: 'modular',
            version: '2.0'
          }
        });
      }
      
    } else {
      cleanupTempFile(req.file.path);
      return res.status(400).json({ error: 'Tipo de documento inválido. Use "identity" ou "insurance".' });
    }
    
  } catch (error) {
    console.error('❌ [OCR-Routes] Erro ao processar documento:', error);
    
    // Remover arquivo temporário em caso de erro
    if (req.file?.path) {
      cleanupTempFile(req.file.path);
    }
    
    return res.status(500).json({ 
      error: 'Erro ao processar documento',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * GET /api/ocr/status
 * Retorna o status do serviço de OCR (útil para health checks)
 */
router.get('/ocr/status', (req: Request, res: Response) => {
  res.json({
    status: 'operational',
    version: '2.0',
    supportedTypes: ['identity', 'insurance'],
    supportedFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
    maxFileSize: '10MB'
  });
});

/**
 * POST /api/process-document-unified
 * Processa documentos e retorna resultado no FORMATO UNIFICADO
 * Todos os tipos de documento retornam a mesma estrutura de dados
 * 
 * @param document - Arquivo de imagem ou PDF
 * @returns UnifiedExtractionResult
 */
router.post('/process-document-unified', ocrUpload.single('document'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        patient: {},
        metadata: {
          documentType: 'UNKNOWN',
          extractorVersion: 'ERROR',
          confidence: 0
        },
        errors: ['Nenhum arquivo foi enviado']
      } as UnifiedExtractionResult);
    }

    const usePreprocessing = req.body.usePreprocessing !== 'false';
    
    console.log(`🔄 [OCR-Unified] Processando documento...`);
    console.log(`📄 [OCR-Unified] Arquivo: ${req.file.originalname} (${req.file.mimetype})`);
    
    let imageBuffer: Buffer;
    
    if (req.file.mimetype === 'application/pdf') {
      console.log('📄 [OCR-Unified] Convertendo PDF para imagem...');
      imageBuffer = await convertPDFToImage(req.file.path);
    } else {
      imageBuffer = fs.readFileSync(req.file.path);
    }
    
    let processedBuffer: Buffer;
    let processedImageUrl: string | null = null;
    let preprocessingInfo: any = null;
    
    if (usePreprocessing) {
      console.log('🖼️ [OCR-Unified] Aplicando pré-processamento...');
      const isScreenPhoto = await ImagePreprocessor.detectIfScreenPhoto(imageBuffer);
      
      if (isScreenPhoto) {
        const preprocessResult = await ImagePreprocessor.preprocessForScreenPhoto(imageBuffer);
        processedBuffer = preprocessResult.buffer;
        preprocessingInfo = { 
          appliedOperations: preprocessResult.appliedOperations,
          isScreenPhoto,
          originalSize: preprocessResult.originalSize,
          processedSize: preprocessResult.processedSize
        };
      } else {
        const preprocessResult = await ImagePreprocessor.preprocess(imageBuffer);
        processedBuffer = preprocessResult.buffer;
        preprocessingInfo = { 
          appliedOperations: preprocessResult.appliedOperations,
          isScreenPhoto,
          originalSize: preprocessResult.originalSize,
          processedSize: preprocessResult.processedSize
        };
      }
      
      const processedImageFilename = `processed-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`;
      const processedImagePath = path.join('uploads/ocr-temp/', processedImageFilename);
      fs.writeFileSync(processedImagePath, processedBuffer);
      processedImageUrl = `/uploads/ocr-temp/${processedImageFilename}`;
    } else {
      processedBuffer = imageBuffer;
    }
    
    const ocrEngine = new GoogleVisionOCREngine();
    console.log('🔍 [OCR-Unified] Extraindo texto...');
    const rawText = await ocrEngine.extractText(processedBuffer);
    const cleanedText = TextPreprocessor.cleanText(rawText);
    
    console.log('🔍 [OCR-Unified] Detectando tipo de documento...');
    const detectionResult = DocumentTypeDetector.detectDocumentType(cleanedText);
    
    console.log(`📋 [OCR-Unified] Tipo: ${detectionResult.type} (${Math.round(detectionResult.confidence * 100)}%)`);
    
    let result: UnifiedExtractionResult;
    
    if (detectionResult.type === 'MV_PATIENT_SCREEN') {
      console.log('🏨 [OCR-Unified] Usando MV Orchestrator...');
      result = MVOrchestrator.extractUnified(cleanedText);
      
    } else if (detectionResult.type === 'RG_IDENTITY' || detectionResult.type === 'CNH_LICENSE') {
      console.log('🪪 [OCR-Unified] Usando Identity Orchestrator...');
      const identityOrchestrator = new IdentityOrchestrator();
      result = await identityOrchestrator.extractUnified(cleanedText);
      
    } else if (detectionResult.type === 'INSURANCE_CARD') {
      console.log('🏥 [OCR-Unified] Usando Insurance Orchestrator...');
      const insuranceOrchestrator = new InsuranceOrchestrator();
      result = await insuranceOrchestrator.processDocumentUnified(imageBuffer);
      
    } else {
      result = {
        success: false,
        patient: {},
        metadata: {
          documentType: 'UNKNOWN',
          subtype: 'UNKNOWN',
          extractorVersion: 'DETECTION_V1',
          confidence: detectionResult.confidence
        },
        errors: ['Tipo de documento não reconhecido. Envie um RG, CNH, carteirinha de plano de saúde ou tela do sistema MV.']
      };
    }
    
    // Adicionar informações extras ao resultado
    result.processedImageUrl = processedImageUrl || undefined;
    result.preprocessing = preprocessingInfo || undefined;
    result.rawText = cleanedText;
    
    cleanupTempFile(req.file.path);
    
    console.log(`✅ [OCR-Unified] Processamento concluído: ${result.success ? 'SUCESSO' : 'FALHA'}`);
    console.log(`📊 [OCR-Unified] Tipo: ${result.metadata.documentType}, Subtipo: ${result.metadata.subtype}`);
    
    return res.json(result);
    
  } catch (error) {
    console.error('❌ [OCR-Unified] Erro:', error);
    
    if (req.file?.path) {
      cleanupTempFile(req.file.path);
    }
    
    return res.status(500).json({ 
      success: false,
      patient: {},
      metadata: {
        documentType: 'UNKNOWN',
        subtype: 'ERROR',
        extractorVersion: 'ERROR',
        confidence: 0
      },
      errors: [error instanceof Error ? error.message : 'Erro desconhecido']
    } as UnifiedExtractionResult);
  }
});

/**
 * Limpa arquivo temporário de upload
 */
function cleanupTempFile(filePath: string): void {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('🧹 [OCR-Routes] Arquivo temporário removido:', filePath);
    }
  } catch (error) {
    console.warn('⚠️ [OCR-Routes] Falha ao remover arquivo temporário:', error);
  }
}

export default router;
