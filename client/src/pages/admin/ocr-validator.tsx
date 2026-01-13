import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Upload, FileText, Loader2, CheckCircle2, XCircle, Image as ImageIcon, Trash2, Scan, Settings, AlertCircle, Check, X } from "lucide-react";

interface PreprocessingInfo {
  appliedOperations: string[];
  isScreenPhoto: boolean;
  originalSize: { width: number; height: number };
  processedSize: { width: number; height: number };
}

interface PatientData {
  fullName?: string;
  cpf?: string;
  rg?: string;
  birthDate?: string;
  sex?: string;
  age?: string;
  mothersName?: string;
  fathersName?: string;
  phone?: string;
  email?: string;
  address?: {
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
  };
}

interface InsuranceData {
  provider?: string;
  plan?: string;
  subPlan?: string;
  cardNumber?: string;
  cns?: string;
  ansCode?: string;
}

interface ExtractionMetadata {
  documentType?: string;
  subtype?: string;
  confidence: number;
  extractorVersion?: string;
}

interface ExtractionResult {
  success: boolean;
  patient?: PatientData;
  insurance?: InsuranceData;
  metadata?: ExtractionMetadata;
  errors?: string[];
  preprocessing?: PreprocessingInfo;
  processedImageUrl?: string;
  rawText?: string;
  // Campos legacy para compatibilidade
  detectedType?: string;
  detectedTypeRaw?: string;
  detectedSubtype?: string;
  typeConfidence?: number;
  extractorVersion?: string;
  extractorConfidence?: number;
  qualityIssue?: boolean;
  userMessage?: string;
  suggestions?: string[];
  data?: Record<string, unknown>;
  confidence?: {
    overall: number;
    [key: string]: number;
  };
  method?: {
    type: string;
    details: string;
  };
  error?: string;
}

export default function OcrValidator() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [usePreprocessing, setUsePreprocessing] = useState(true);

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setResult(null);

    if (file.type === "application/pdf") {
      setPreviewUrl(null);
    } else {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const processDocument = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("document", selectedFile);
      formData.append("usePreprocessing", usePreprocessing ? "true" : "false");

      const response = await fetch("/api/process-document-auto", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAll = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
  };

  const formatOperationName = (operation: string): string => {
    const operationNames: Record<string, string> = {
      "upscale_to_2400px": "Aumento de Resolução (2400px)",
      "grayscale": "Escala de Cinza",
      "normalize_contrast": "Normalização de Contraste",
      "median_filter_3x3": "Filtro Mediano 3x3",
      "median_filter_5x5_moire_removal": "Remoção de Moiré (5x5)",
      "sharpen_text": "Nitidez de Texto",
      "sharpen_aggressive": "Nitidez Agressiva",
      "light_blur_denoise": "Redução de Ruído",
      "brightness_boost": "Aumento de Brilho",
    };
    
    if (operationNames[operation]) {
      return operationNames[operation];
    }
    
    if (operation.startsWith("upscale_to_")) {
      const width = operation.replace("upscale_to_", "").replace("px", "");
      return `Aumento de Resolução (${width}px)`;
    }
    
    return operation.replace(/_/g, " ");
  };

  const formatFieldName = (key: string): string => {
    const fieldNames: Record<string, string> = {
      fullName: "Nome Completo",
      nomeCompleto: "Nome Completo",
      idNumber: "Número do Documento",
      cpf: "CPF",
      rg: "RG",
      birthDate: "Data de Nascimento",
      dataNascimento: "Data de Nascimento",
      mothersName: "Nome da Mãe",
      nomeMae: "Nome da Mãe",
      fathersName: "Nome do Pai",
      nomePai: "Nome do Pai",
      birthPlace: "Naturalidade",
      naturalidade: "Naturalidade",
      issuedBy: "Órgão Expedidor",
      orgaoExpedidor: "Órgão Expedidor",
      documentType: "Tipo de Documento",
      tipoDocumento: "Tipo de Documento",
      subtype: "Subtipo",
      subtipoDocumento: "Subtipo",
      operadora: "Operadora",
      ansCode: "Código ANS",
      numeroCarteirinha: "Número da Carteirinha",
      nomeTitular: "Nome do Titular",
      plano: "Plano",
      cns: "CNS",
      validade: "Validade",
      sexo: "Sexo",
      gender: "Sexo",
      // Campos MV - Paciente
      "patient.fullName": "Nome do Paciente",
      "patient.cpf": "CPF",
      "patient.rg": "RG",
      "patient.birthDate": "Data de Nascimento",
      "patient.sex": "Sexo",
      "patient.age": "Idade",
      "patient.maritalStatus": "Estado Civil",
      "patient.mothersName": "Nome da Mãe",
      "patient.fathersName": "Nome do Pai",
      "patient.birthPlace": "Naturalidade",
      "patient.nationality": "Nacionalidade",
      "patient.profession": "Profissão",
      "patient.education": "Escolaridade",
      "patient.bloodType": "Tipo Sanguíneo",
      "patient.email": "Email",
      "patient.phone": "Telefone",
      "patient.patientCode": "Código do Paciente",
      "patient.attendanceCode": "Código de Atendimento",
      "patient.sameCode": "Matrícula SAME",
      // Campos MV - Endereço
      "patient.address.logradouro": "Logradouro",
      "patient.address.numero": "Número",
      "patient.address.complemento": "Complemento",
      "patient.address.bairro": "Bairro",
      "patient.address.cidade": "Cidade",
      "patient.address.estado": "Estado",
      "patient.address.cep": "CEP",
      // Campos MV - Plano de Saúde
      "insurance.operator": "Convênio/Operadora",
      "insurance.plan": "Plano",
      "insurance.subPlan": "Subplano",
      "insurance.cardNumber": "Número da Carteira",
      "insurance.cns": "CNS",
    };
    return fieldNames[key] || key.split(".").pop() || key;
  };

  const renderFieldValue = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") {
      const obj = value as Record<string, unknown>;
      const parts = Object.entries(obj)
        .filter(([_, v]) => v !== null && v !== undefined && v !== "")
        .map(([k, v]) => typeof v === "object" ? renderFieldValue(v) : String(v));
      return parts.join(", ");
    }
    return String(value);
  };

  const flattenObject = (obj: Record<string, unknown>, prefix = ""): Array<[string, string]> => {
    const result: Array<[string, string]> = [];
    
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined || value === "") continue;
      
      const fieldKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === "object" && !Array.isArray(value)) {
        const nested = flattenObject(value as Record<string, unknown>, fieldKey);
        result.push(...nested);
      } else {
        result.push([fieldKey, String(value)]);
      }
    }
    
    return result;
  };

  // Definição dos campos por tipo de documento
  const getMvAdvFields = () => {
    // Campos prioritários (obrigatórios) - devem aparecer em verde quando preenchidos
    const priorityFields = [
      { key: "patient.nome", label: "Nome", priority: true },
      { key: "patient.cpf", label: "CPF", priority: true },
      { key: "patient.rg", label: "RG", priority: true },
      { key: "patient.sexo", label: "Sexo", priority: true },
      { key: "patient.dataNascimento", label: "Data de Nascimento", priority: true },
      { key: "insurance.convenio", label: "Convênio/Seguradora", priority: true },
      { key: "insurance.plano", label: "Plano", priority: true },
      { key: "insurance.numeroCarteira", label: "Número da Carteirinha", priority: true },
    ];
    
    // Campos secundários (opcionais)
    const secondaryFields = [
      { key: "patient.nomeMae", label: "Nome da Mãe", priority: false },
      { key: "patient.telefone", label: "Telefone", priority: false },
      { key: "patient.email", label: "E-mail", priority: false },
      { key: "insurance.cns", label: "CNS", priority: false },
      { key: "patient.logradouro", label: "Logradouro", priority: false },
      { key: "patient.numero", label: "Número", priority: false },
      { key: "patient.complemento", label: "Complemento", priority: false },
      { key: "patient.bairro", label: "Bairro", priority: false },
      { key: "patient.cidade", label: "Cidade", priority: false },
      { key: "patient.estado", label: "Estado", priority: false },
      { key: "patient.cep", label: "CEP", priority: false },
    ];
    
    return [...priorityFields, ...secondaryFields];
  };

  // Função para obter o valor de um campo do resultado (nova estrutura UnifiedExtractionResult)
  const getFieldValue = (key: string): string | undefined => {
    if (!result) return undefined;
    
    // Campos que estão dentro de patient.address
    const addressFields = ["logradouro", "numero", "complemento", "bairro", "cidade", "estado", "cep"];
    
    // Mapear nomes alternativos
    const altKeys: Record<string, string[]> = {
      "nome": ["nome", "fullName", "nomeCompleto"],
      "cpf": ["cpf"],
      "rg": ["rg"],
      "sexo": ["sexo", "sex", "gender"],
      "dataNascimento": ["dataNascimento", "birthDate"],
      "nomeMae": ["nomeMae", "mothersName"],
      "telefone": ["telefone", "phone"],
      "email": ["email"],
      "convenio": ["convenio", "operator", "operadora", "provider"],
      "plano": ["plano", "plan"],
      "numeroCarteira": ["numeroCarteira", "cardNumber", "numeroCarteirinha"],
      "cns": ["cns"],
      "logradouro": ["logradouro"],
      "numero": ["numero"],
      "complemento": ["complemento"],
      "bairro": ["bairro"],
      "cidade": ["cidade"],
      "estado": ["estado"],
      "cep": ["cep"],
    };
    
    const parts = key.split(".");
    const lastPart = parts[parts.length - 1];
    const keysToTry = altKeys[lastPart] || [lastPart];
    
    // Se é um campo de endereço, buscar primeiro em patient.address
    const isAddressField = addressFields.includes(lastPart);
    
    // Buscar em patient (nova estrutura - direto na raiz)
    if (result.patient) {
      const patient = result.patient as Record<string, unknown>;
      
      // Para campos de endereço, buscar PRIMEIRO em address
      if (isAddressField) {
        // Buscar em address dentro de patient
        if (patient.address && typeof patient.address === "object") {
          const address = patient.address as Record<string, unknown>;
          for (const k of keysToTry) {
            if (address[k] !== undefined && address[k] !== null && address[k] !== "") {
              return String(address[k]);
            }
          }
        }
        // Buscar em endereco dentro de patient (fallback legado)
        if (patient.endereco && typeof patient.endereco === "object") {
          const endereco = patient.endereco as Record<string, unknown>;
          for (const k of keysToTry) {
            if (endereco[k] !== undefined && endereco[k] !== null && endereco[k] !== "") {
              return String(endereco[k]);
            }
          }
        }
      }
      
      // Buscar diretamente em patient
      for (const k of keysToTry) {
        if (patient[k] !== undefined && patient[k] !== null && patient[k] !== "") {
          return String(patient[k]);
        }
      }
      
      // Se não é campo de endereço, tentar também em address (fallback)
      if (!isAddressField) {
        if (patient.address && typeof patient.address === "object") {
          const address = patient.address as Record<string, unknown>;
          for (const k of keysToTry) {
            if (address[k] !== undefined && address[k] !== null && address[k] !== "") {
              return String(address[k]);
            }
          }
        }
      }
    }
    
    // Buscar em insurance (nova estrutura - direto na raiz)
    if (result.insurance) {
      const insurance = result.insurance as Record<string, unknown>;
      for (const k of keysToTry) {
        if (insurance[k] !== undefined && insurance[k] !== null && insurance[k] !== "") {
          return String(insurance[k]);
        }
      }
    }
    
    // Fallback: buscar em data (estrutura legacy)
    if (result.data) {
      const data = result.data as Record<string, unknown>;
      
      // Buscar em data.patient
      if (data.patient && typeof data.patient === "object") {
        const patient = data.patient as Record<string, unknown>;
        for (const k of keysToTry) {
          if (patient[k] !== undefined && patient[k] !== null && patient[k] !== "") {
            return String(patient[k]);
          }
        }
      }
      
      // Buscar em data.insurance
      if (data.insurance && typeof data.insurance === "object") {
        const insurance = data.insurance as Record<string, unknown>;
        for (const k of keysToTry) {
          if (insurance[k] !== undefined && insurance[k] !== null && insurance[k] !== "") {
            return String(insurance[k]);
          }
        }
      }
      
      // Buscar na raiz de data
      for (const k of keysToTry) {
        if (data[k] !== undefined && data[k] !== null && data[k] !== "") {
          return String(data[k]);
        }
      }
    }
    
    return undefined;
  };

  const renderExtractedFields = () => {
    // Nova estrutura: patient e insurance estão na raiz
    if (!result?.patient && !result?.insurance && !result?.data) return null;

    // Verificar se é MV_PATIENT_SCREEN usando metadata ou campos legacy
    const documentType = result.metadata?.documentType || result.detectedType || result.detectedTypeRaw;
    const subtype = result.metadata?.subtype || result.detectedSubtype;
    const isMvScreen = documentType === "MV_PATIENT_SCREEN";
    
    // Usar campos específicos para telas MV
    const fields = isMvScreen ? getMvAdvFields() : [];
    
    // Se não é tela MV, usar exibição dinâmica baseada em patient/insurance
    if (!isMvScreen || fields.length === 0) {
      // Construir objeto para flatten a partir da nova estrutura
      const dataToFlatten: Record<string, unknown> = {};
      if (result.patient) dataToFlatten.patient = result.patient;
      if (result.insurance) dataToFlatten.insurance = result.insurance;
      // Fallback para estrutura legacy
      if (Object.keys(dataToFlatten).length === 0 && result.data) {
        Object.assign(dataToFlatten, result.data);
      }
      
      const flatFields = flattenObject(dataToFlatten);
      if (flatFields.length === 0) {
        return (
          <div className="text-center text-muted-foreground py-4">
            Nenhum campo extraído
          </div>
        );
      }
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {flatFields.map(([key, value]) => (
            <div key={key} className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">
                {formatFieldName(key)}
              </div>
              <div className="font-medium text-sm">{value}</div>
            </div>
          ))}
        </div>
      );
    }

    // Para MV-ADV: mostrar todos os campos com indicação visual
    const priorityFields = fields.filter(f => f.priority);
    const secondaryFields = fields.filter(f => !f.priority);
    
    const filledPriorityCount = priorityFields.filter(f => getFieldValue(f.key)).length;
    const totalPriorityCount = priorityFields.length;

    return (
      <div className="space-y-4">
        {/* Resumo de campos prioritários */}
        <div className={`p-3 rounded-lg border ${
          filledPriorityCount === totalPriorityCount 
            ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" 
            : filledPriorityCount >= totalPriorityCount / 2
            ? "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800"
            : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
        }`}>
          <div className="flex items-center gap-2">
            {filledPriorityCount === totalPriorityCount ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600" />
            )}
            <span className="font-medium text-sm">
              Campos Prioritários: {filledPriorityCount}/{totalPriorityCount} preenchidos
            </span>
          </div>
        </div>

        {/* Campos Prioritários */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            Campos Prioritários
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {priorityFields.map((field) => {
              const value = getFieldValue(field.key);
              const isFilled = !!value;
              
              return (
                <div 
                  key={field.key} 
                  className={`rounded-lg p-3 border transition-all ${
                    isFilled 
                      ? "bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-700" 
                      : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {field.label}
                    </span>
                    {isFilled ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <X className="h-4 w-4 text-red-400" />
                    )}
                  </div>
                  <div className={`font-medium text-sm ${
                    isFilled 
                      ? "text-green-800 dark:text-green-200" 
                      : "text-red-400 dark:text-red-500 italic"
                  }`}>
                    {value || "Não encontrado"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Campos Secundários */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500"></span>
            Campos Secundários
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {secondaryFields.map((field) => {
              const value = getFieldValue(field.key);
              const isFilled = !!value;
              
              return (
                <div 
                  key={field.key} 
                  className={`rounded-lg p-3 border transition-all ${
                    isFilled 
                      ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" 
                      : "bg-muted/30 border-muted"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {field.label}
                    </span>
                    {isFilled ? (
                      <Check className="h-4 w-4 text-blue-600" />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                  <div className={`font-medium text-sm ${
                    isFilled 
                      ? "text-blue-800 dark:text-blue-200" 
                      : "text-muted-foreground/50 italic"
                  }`}>
                    {value || "Não encontrado"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">
          Teste do Sistema OCR
        </h1>
        <p className="text-muted-foreground">
          Faça upload de um documento - o sistema detecta automaticamente se é RG, CNH ou carteirinha
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-5 w-5" />
            Upload do Documento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`
              border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
              ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
              className="hidden"
              onChange={handleInputChange}
            />
            
            <Scan className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium mb-1">
              Arraste e solte ou clique para selecionar
            </p>
            <p className="text-sm text-muted-foreground mb-3">
              RG, CNH ou Carteirinha do Plano de Saúde
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="outline">PDF</Badge>
              <Badge variant="outline">PNG</Badge>
              <Badge variant="outline">JPG</Badge>
              <Badge variant="outline">WebP</Badge>
            </div>
          </div>

          {selectedFile && (
            <div className="mt-4 p-3 bg-muted rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedFile.type === "application/pdf" ? (
                  <FileText className="h-8 w-8 text-red-500" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-blue-500" />
                )}
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={clearAll}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Toggle para usar pré-processamento */}
          <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Usar pré-processamento de imagem</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUsePreprocessing(!usePreprocessing)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    usePreprocessing ? 'bg-primary' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      usePreprocessing ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-xs text-muted-foreground">
                  {usePreprocessing ? 'Ativado' : 'Desativado'}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {usePreprocessing 
                ? 'A imagem será otimizada (escala de cinza, remoção de Moiré, aumento de nitidez) antes do OCR.'
                : 'A imagem original será usada diretamente para extração OCR.'}
            </p>
          </div>

          <Button
            className="w-full mt-4"
            size="lg"
            onClick={processDocument}
            disabled={!selectedFile || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Detectando e Processando...
              </>
            ) : (
              <>
                <Scan className="h-4 w-4 mr-2" />
                Processar com Detecção Automática
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Image Comparison Section - Only show after processing */}
      {result?.processedImageUrl && previewUrl && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="h-5 w-5" />
              Comparação de Imagens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">Original</Badge>
                  {result?.preprocessing?.originalSize && (
                    <span className="text-xs text-muted-foreground">
                      {result.preprocessing.originalSize.width}x{result.preprocessing.originalSize.height}px
                    </span>
                  )}
                </div>
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Imagem Original"
                    className="w-full rounded-lg border"
                  />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default">Processada</Badge>
                  {result?.preprocessing?.processedSize && (
                    <span className="text-xs text-muted-foreground">
                      {result.preprocessing.processedSize.width}x{result.preprocessing.processedSize.height}px
                    </span>
                  )}
                  {result?.preprocessing?.isScreenPhoto && (
                    <Badge variant="secondary" className="text-xs">
                      Foto de Tela Detectada
                    </Badge>
                  )}
                </div>
                {result?.processedImageUrl ? (
                  <img
                    src={result.processedImageUrl}
                    alt="Imagem Processada"
                    className="w-full rounded-lg border"
                  />
                ) : (
                  <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
                    <Loader2 className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Aguardando processamento</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Preprocessing Operations */}
            {result?.preprocessing?.appliedOperations && result.preprocessing.appliedOperations.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">Operações de Pré-processamento Aplicadas:</p>
                <div className="flex flex-wrap gap-2">
                  {result.preprocessing.appliedOperations.map((op, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {formatOperationName(op)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="h-5 w-5" />
              Documento Enviado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!previewUrl && !selectedFile && (
              <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
                <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>Nenhum documento selecionado</p>
              </div>
            )}
            {selectedFile && selectedFile.type === "application/pdf" && (
              <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
                <FileText className="h-16 w-16 mx-auto mb-4 text-red-400" />
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm mt-1">Pré-visualização não disponível para PDF</p>
              </div>
            )}
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Documento"
                className="w-full rounded-lg border"
              />
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {result?.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : result?.error ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
              Resultado da Extração
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!result && (
              <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>Aguardando processamento</p>
              </div>
            )}

            {result?.error && !result?.success && (
              <div className="space-y-3">
                {result.detectedType && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      Detectado: {result.detectedType}
                    </Badge>
                    {result.typeConfidence && (
                      <Badge variant="outline">
                        {Math.round(result.typeConfidence * 100)}%
                      </Badge>
                    )}
                    {result.qualityIssue && (
                      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                        Qualidade Insuficiente
                      </Badge>
                    )}
                  </div>
                )}
                
                {result.qualityIssue ? (
                  <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <p className="text-amber-700 dark:text-amber-400 font-medium">
                      Imagem com qualidade insuficiente
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-300 mt-2">
                      {result.userMessage}
                    </p>
                    {result.suggestions && result.suggestions.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">
                          Dicas para uma foto melhor:
                        </p>
                        <ul className="text-xs text-amber-600 dark:text-amber-300 space-y-1">
                          {result.suggestions.map((suggestion, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-amber-500 mt-0.5">•</span>
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-red-600 dark:text-red-400 font-medium">
                      Erro na extração
                    </p>
                    <p className="text-sm text-red-500 dark:text-red-300 mt-1">
                      {result.error}
                    </p>
                    {result.errors && result.errors.length > 0 && (
                      <ul className="text-xs text-red-400 mt-2 list-disc list-inside">
                        {result.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            {result?.success && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default" className="bg-green-500">
                    Sucesso
                  </Badge>
                  {/* Nova estrutura: usar metadata */}
                  {(result.metadata?.documentType || result.detectedType) && (
                    <Badge variant="default" className="bg-blue-500">
                      {result.metadata?.documentType || result.detectedType}
                    </Badge>
                  )}
                  {(result.metadata?.subtype || result.detectedSubtype) && (
                    <Badge variant="default" className="bg-purple-500">
                      {result.metadata?.subtype || result.detectedSubtype}
                    </Badge>
                  )}
                  {(result.metadata?.extractorVersion || result.extractorVersion) && (
                    <Badge variant="default" className="bg-violet-400">
                      {result.metadata?.extractorVersion || result.extractorVersion}
                    </Badge>
                  )}
                  {(result.metadata?.confidence || result.typeConfidence) && (
                    <Badge variant="outline">
                      Confiança: {Math.round((result.metadata?.confidence || result.typeConfidence || 0) * 100)}%
                    </Badge>
                  )}
                  {result.confidence?.overall && (
                    <Badge variant="outline">
                      Extração: {Math.round(result.confidence.overall * 100)}%
                    </Badge>
                  )}
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3 text-sm">Campos Extraídos</h3>
                  {renderExtractedFields()}
                </div>

                {result.confidence && Object.keys(result.confidence).length > 1 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-3 text-sm">Níveis de Confiança</h3>
                      <div className="space-y-2">
                        {Object.entries(result.confidence)
                          .filter(([key]) => key !== "overall")
                          .map(([key, value]) => (
                            <div key={key} className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground w-28">
                                {formatFieldName(key)}
                              </span>
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all"
                                  style={{ width: `${value * 100}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium w-10 text-right">
                                {Math.round(value * 100)}%
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </>
                )}

                {result.method?.details && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2 text-sm">Detalhes do Método</h3>
                      <p className="text-xs text-muted-foreground">
                        {result.method.details}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {result?.rawText && (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Texto Bruto (OCR)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-96 whitespace-pre-wrap font-mono">
              {result.rawText}
            </pre>
            <p className="text-xs text-muted-foreground mt-2">
              Total: {result.rawText.length} caracteres
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
