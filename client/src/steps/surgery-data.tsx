import * as React from "react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import RoboMedSyncIcon from "@/assets/icons/MedSync_Icones_Robo Medsync_Sem_Borda.svg";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  FileText,
  Loader2,
  Package,
  AlertTriangle,
  Check,
  X,
  ChevronsUpDown,
  ChevronUp,
  Plus,
  Trash2,
  Building2,
  ClipboardList,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  PROCEDURE_TYPE_VALUES,
  PROCEDURE_TYPES,
  API_ENDPOINTS,
} from "@shared/constants";
import { apiRequest } from "@/lib/queryClient";
import type { AnatomicalRegion, SurgicalProcedure } from "@shared/schema";
import { ManufacturerManager } from "@/components/ManufacturerManager";
import { LoadingLogo } from "@/components/loading-logo";
import { getAnatomicalRegionIcon } from "@/components/AnatomicalRegionIcons";
import { RichTextEditor } from "@/components/rich-text-editor";

interface CidCode {
  id: number;
  code: string;
  description: string;
  category: string;
}

interface Procedure {
  id: number;
  code: string;
  name: string;
  description: string | null;
  active: boolean | null;
  porte?: string;
  custoOperacional?: string;
  porteAnestesista?: string;
  numeroAuxiliares?: number;
}

// Categorias de CID-10 em ortopedia
const CATEGORIES = [
  "Joelho",
  "Coluna",
  "Ombro",
  "Quadril",
  "Pé e tornozelo",
  "Outros",
];

// Função para calcular valor numérico do porte CBHPM para ordenação
const getPorteValue = (porte: string | undefined | null): number => {
  if (!porte) return 0;
  
  // Normalizar o porte (remover espaços e converter para maiúscula)
  const normalizedPorte = porte.toString().trim().toUpperCase();
  
  // Mapear portes para valores numéricos para ordenação
  const porteMap: { [key: string]: number } = {
    'AMBULATORIAL': 1.0,
    '01A': 1.1, '01B': 1.2, '01C': 1.3,
    '02A': 2.1, '02B': 2.2, '02C': 2.3,
    '03A': 3.1, '03B': 3.2, '03C': 3.3,
    '04A': 4.1, '04B': 4.2, '04C': 4.3,
    '05A': 5.1, '05B': 5.2, '05C': 5.3,
    '06A': 6.1, '06B': 6.2, '06C': 6.3,
    '07A': 7.1, '07B': 7.2, '07C': 7.3,
    '08A': 8.1, '08B': 8.2, '08C': 8.3,
    '09A': 9.1, '09B': 9.2, '09C': 9.3,
    '10A': 10.1, '10B': 10.2, '10C': 10.3,
    '11A': 11.1, '11B': 11.2, '11C': 11.3,
    '12A': 12.1, '12B': 12.2, '12C': 12.3,
    'BAIXA': 2.0,
    'MÉDIA': 5.0,
    'ALTA': 8.0,
    'ESPECIAL': 10.0
  };
  
  // Verificar mapeamento direto
  if (porteMap[normalizedPorte]) {
    return porteMap[normalizedPorte];
  }
  
  // Tentar extrair número do porte (ex: "10B" -> 10.2)
  const match = normalizedPorte.match(/^(\d+)([ABC]?)$/);
  if (match) {
    const baseValue = parseInt(match[1]);
    const suffix = match[2] || '';
    const suffixValue = suffix === 'A' ? 0.1 : suffix === 'B' ? 0.2 : suffix === 'C' ? 0.3 : 0;
    return baseValue + suffixValue;
  }
  
  // Fallback: tentar converter diretamente para número
  const numericValue = parseFloat(normalizedPorte);
  return isNaN(numericValue) ? 0 : numericValue;
};

// Função para reorganizar procedimentos por porte (maior para menor)
const reorganizeProceduresByPorte = (
  selectedProcedure: Procedure | null,
  secondaryProcedures: Array<{ procedure: Procedure; quantity: number; }>
): {
  newSelectedProcedure: Procedure | null;
  newSecondaryProcedures: Array<{ procedure: Procedure; quantity: number; }>;
} => {
  // Coletar todos os procedimentos
  const allProcedures: Array<{ procedure: Procedure; quantity: number; }> = [];
  
  if (selectedProcedure) {
    allProcedures.push({ procedure: selectedProcedure, quantity: 1 });
  }
  
  allProcedures.push(...secondaryProcedures);
  
  // Se não há procedimentos, retornar valores padrão
  if (allProcedures.length === 0) {
    return { newSelectedProcedure: null, newSecondaryProcedures: [] };
  }
  
  // Ordenar por porte (maior para menor)
  const sortedProcedures = [...allProcedures].sort((a, b) => {
    const porteA = getPorteValue(a.procedure.porte);
    const porteB = getPorteValue(b.procedure.porte);
    return porteB - porteA; // Ordem decrescente
  });
  
  // O primeiro (maior porte) se torna o procedimento principal
  const newSelectedProcedure = sortedProcedures[0]?.procedure || null;
  
  // Os demais se tornam secundários
  const newSecondaryProcedures = sortedProcedures.slice(1);
  
  console.log(`🔄 REORGANIZAÇÃO POR PORTE:`);
  console.log(`   Principal: ${newSelectedProcedure?.code} - ${newSelectedProcedure?.name} (Porte: ${newSelectedProcedure?.porte || 'N/A'})`);
  console.log(`   Secundários: ${newSecondaryProcedures.length}`);
  newSecondaryProcedures.forEach((proc, index) => {
    console.log(`      ${index + 1}. ${proc.procedure.code} - ${proc.procedure.name} (Porte: ${proc.procedure.porte || 'N/A'})`);
  });
  
  return { newSelectedProcedure, newSecondaryProcedures };
};

// Interface para itens OPME
interface OpmeItem {
  id: number;
  anvisaRegistrationNumber?: string;
  technicalName: string;
  commercialName: string;
  manufacturerName: string;
  riskClass?: string;
  registrationHolder?: string;
}

// Interface para materiais OPME selecionados
interface SelectedOpmeItem {
  item: OpmeItem;
  quantity: number;
}

// Interface para regiões anatômicas
interface AnatomicalRegion {
  id: number;
  name: string;
  iconUrl: string | null;
  title: string | null;
  description: string | null;
}

// 📝 Função utilitária para remover seções de observações quando uma combinação procedimento+conduta é removida
// Remove seções que começam com ### ProcedureName → ApproachName até o próximo subtítulo ou fim do texto
// Também suporta formato legado com IDs: ### ProcedureName → ApproachName [PID:x][AID:y]
const removeSubtitleSection = (
  notes: string,
  procedureName: string,
  approachName: string
): string => {
  if (!notes || !procedureName || !approachName) return notes;
  
  const lines = notes.split('\n');
  const result: string[] = [];
  let skipUntilNextSubtitle = false;
  
  // Padrão do subtítulo a remover (escapar caracteres especiais)
  const escapedProcedure = procedureName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedApproach = approachName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Regex para detectar o subtítulo específico (com ou sem IDs)
  const targetSubtitleRegex = new RegExp(
    `^###\\s*${escapedProcedure}\\s*→\\s*${escapedApproach}(\\s*\\[PID:\\d+\\]\\[AID:\\d+\\])?\\s*$`
  );
  
  // Regex para detectar qualquer subtítulo (indica nova seção)
  const anySubtitleRegex = /^###\s*.+\s*→\s*.+/;
  
  for (const line of lines) {
    // Se encontrar o subtítulo alvo, começar a pular linhas
    if (targetSubtitleRegex.test(line)) {
      skipUntilNextSubtitle = true;
      console.log(`🗑️ [REMOVE-SECTION] Removendo seção: ${line}`);
      continue;
    }
    
    // Se estiver pulando e encontrar outro subtítulo, parar de pular
    if (skipUntilNextSubtitle && anySubtitleRegex.test(line)) {
      skipUntilNextSubtitle = false;
    }
    
    // Adicionar linha ao resultado se não estiver pulando
    if (!skipUntilNextSubtitle) {
      result.push(line);
    }
  }
  
  // Limpar linhas vazias extras no início e fim
  const cleanedResult = result.join('\n').trim();
  
  // Remover múltiplas quebras de linha consecutivas (mais de 2)
  return cleanedResult.replace(/\n{3,}/g, '\n\n');
};

// Função helper para remover seções de todas as 3 caixas de observações
const removeObservationSectionsForApproach = (
  procedureName: string,
  approachName: string,
  cbhpmNotes: string,
  setCbhpmNotes: ((notes: string) => void) | undefined,
  opmeNotes: string,
  setOpmeNotes: ((notes: string) => void) | undefined,
  supplierNotes: string,
  setSupplierNotes: ((notes: string) => void) | undefined
) => {
  console.log(`🧹 [CLEANUP] Removendo observações para: ${procedureName} → ${approachName}`);
  
  if (setCbhpmNotes) {
    const newCbhpmNotes = removeSubtitleSection(cbhpmNotes, procedureName, approachName);
    setCbhpmNotes(newCbhpmNotes);
  }
  
  if (setOpmeNotes) {
    const newOpmeNotes = removeSubtitleSection(opmeNotes, procedureName, approachName);
    setOpmeNotes(newOpmeNotes);
  }
  
  if (setSupplierNotes) {
    const newSupplierNotes = removeSubtitleSection(supplierNotes, procedureName, approachName);
    setSupplierNotes(newSupplierNotes);
  }
};

interface SurgeryDataProps {
  // Estados para o CID principal (mantidos para compatibilidade)
  cidCode: string;
  setCidCode: (code: string) => void;
  cidDescription: string;
  setCidDescription: (description: string) => void;
  selectedCidId: number | null;
  setSelectedCidId: (id: number | null) => void;
  // cidLaterality removido conforme solicitado, mas mantemos na interface para compatibilidade
  cidLaterality: string | null;
  setCidLaterality: (laterality: string | null) => void;
  // Dados do paciente para IA
  selectedPatient?: {
    id: number;
    fullName: string;
    gender: string;
    birthDate: string;
    cpf: string;
    phone: string | null;
    insurance: string | null;
    insuranceNumber: string | null;
    notes: string | null;
  } | null;
  // Indicação clínica e observações adicionais
  clinicalIndication?: string;
  additionalNotes?: string;
  // Anexos do pedido
  attachments?: Array<{
    id: string;
    url: string;
    filename: string;
    size: number;
    type: string;
    uploadedAt: string;
  }> | null;
  // Novos campos para suportar múltiplos CIDs
  multipleCids?: Array<{
    cid: {
      id: number;
      code: string;
      description: string;
      category?: string;
    };
    surgicalApproach?: {
      id: number;
      name: string;
      description?: string;
      isPrimary?: boolean;
    };
  }>;
  setMultipleCids?: (
    cids: Array<{
      cid: {
        id: number;
        code: string;
        description: string;
        category?: string;
      };
      surgicalApproach?: {
        id: number;
        name: string;
        description?: string;
        isPrimary?: boolean;
      };
    }>,
  ) => void;
  // Campo para lateralidade da cirurgia
  procedureLaterality: string | null;
  emsetProcedureLaterality: (laterality: string | null) => void;
  procedureType: string;
  setProcedureType: (type: string) => void;
  selectedProcedure: Procedure | null;
  setSelectedProcedure: (procedure: Procedure | null) => void;
  procedureQuantity: number;
  setProcedureQuantity: (quantity: number) => void;
  secondaryProcedures: Array<{
    procedure: Procedure;
    quantity: number;
  }>;
  setSecondaryProcedures: (
    procedures: Array<{
      procedure: Procedure;
      quantity: number;
    }>,
  ) => void;
  // Suporte para fornecedores OPME
  suppliers?: {
    supplier1: number | null;
    supplier2: number | null;
    supplier3: number | null;
  };
  setSuppliers?: (suppliers: {
    supplier1: number | null;
    supplier2: number | null;
    supplier3: number | null;
  }) => void;
  // Dados completos dos fornecedores com associações de conduta (lista dinâmica)
  supplierDetails?: Array<{
    id: number;
    companyName: string;
    tradeName: string | null;
    cnpj: string;
    municipalityId?: number;
    address: string | null;
    phone: string | null;
    email: string | null;
    active?: boolean;
    // Campos de associação com conduta cirúrgica
    sourceApproachId?: number | null;
    sourceApproachName?: string | null;
    sourceProcedureId?: number | null;
    sourceProcedureName?: string | null;
    manufacturerName?: string | null;
    isApproved?: boolean;
  }>;
  setSupplierDetails?: (suppliers: Array<{
    id: number;
    companyName: string;
    tradeName: string | null;
    cnpj: string;
    municipalityId?: number;
    address: string | null;
    phone: string | null;
    email: string | null;
    active?: boolean;
    // Campos de associação com conduta cirúrgica
    sourceApproachId?: number | null;
    sourceApproachName?: string | null;
    sourceProcedureId?: number | null;
    sourceProcedureName?: string | null;
    manufacturerName?: string | null;
    isApproved?: boolean;
  }>) => void;
  // Campo para sugestão de justificativa clínica
  clinicalJustification?: string;
  setClinicalJustification?: (justification: string) => void;
  // Props para itens OPME
  selectedOpmeItems?: Array<{ item: any; quantity: number }>;
  setSelectedOpmeItems?: (
    items: Array<{ item: any; quantity: number }>,
  ) => void;
  // Props para salvar CIDs no banco
  orderId?: number | null;
  updateOrderField?: (fieldName: string, value: any) => Promise<boolean>;
  // Props para procedimentos cirúrgicos por região
  selectedSurgicalProcedures?: SurgicalProcedure[];
  setSelectedSurgicalProcedures?: (procedures: SurgicalProcedure[]) => void;
  availableProceduresFromRegion?: SurgicalProcedure[];
  setAvailableProceduresFromRegion?: (procedures: SurgicalProcedure[]) => void;
  // Props para condutas cirúrgicas selecionadas (novo padrão de salvamento em lote)
  selectedSurgicalApproaches?: Array<{
    surgicalProcedureId: number;
    surgicalApproachId: number;
    approachName: string;
    procedureName: string;
    isPrimary: boolean;
  }>;
  setSelectedSurgicalApproaches?: (approaches: Array<{
    surgicalProcedureId: number;
    surgicalApproachId: number;
    approachName: string;
    procedureName: string;
    isPrimary: boolean;
  }>) => void;
  // Callback para carregar fabricantes existentes
  onManufacturersReady?: () => void;
  // Flag para detectar modo de edição e desabilitar auto-preenchimento
  isEditMode?: boolean;
  // Região anatômica selecionada para o webhook de IA
  selectedAnatomicalRegion?: AnatomicalRegion | null;
  // Campos de texto livre após procedimentos CBHPM, itens OPME e fornecedores
  cbhpmAdditionalNotes?: string;
  setCbhpmAdditionalNotes?: (notes: string) => void;
  opmeAdditionalNotes?: string;
  setOpmeAdditionalNotes?: (notes: string) => void;
  supplierAdditionalNotes?: string;
  setSupplierAdditionalNotes?: (notes: string) => void;
}

// Componente para selecionar conduta clínica para um procedimento
interface ConductSelectorProps {
  procedureId: number;
  procedureName: string;
  orderId?: number | null;
  autoOpenModal?: boolean;
  onModalClose?: () => void;
  setMultipleCids?: (value: any) => void;
  // Props para auto-preenchimento de procedimentos CBHPM
  setSelectedProcedure?: (procedure: Procedure | null) => void;
  selectedProcedure?: Procedure | null;
  setProcedureQuantity?: (quantity: number | ((prev: number) => number)) => void;
  setSecondaryProcedures?: (procedures: Array<{
    procedure: Procedure;
    quantity: number;
  }>) => void;
  // Props para auto-preenchimento de itens OPME
  setSelectedOpmeItems?: (items: Array<{ item: any; quantity: number }>) => void;
  // Props para fornecedores (novo sistema dinâmico)
  setSupplierDetails?: (suppliers: Array<any>) => void;
  supplierDetails?: Array<any>;
  // Props para justificativa clínica
  setClinicalJustification?: (justification: string | ((prev: string) => string)) => void;
  // Props para condutas cirúrgicas selecionadas (padrão de salvamento em lote)
  setSelectedSurgicalApproaches?: (approaches: Array<{
    surgicalProcedureId: number;
    surgicalApproachId: number;
    approachName: string;
    procedureName: string;
    isPrimary: boolean;
  }>) => void;
  // Valor atual do estado para sincronização
  selectedSurgicalApproaches?: Array<{
    surgicalProcedureId: number;
    surgicalApproachId: number;
    approachName: string;
    procedureName: string;
    isPrimary: boolean;
  }>;
  // Flag para detectar modo de edição e desabilitar auto-preenchimento
  isEditMode?: boolean;
  // Props para auto-preenchimento de lateralidade e caráter
  setProcedureLaterality?: (laterality: string) => void;
  setProcedureType?: (type: string) => void;
  // Props para inserir subtítulos automáticos nas caixas de texto de observações
  cbhpmAdditionalNotes?: string;
  setCbhpmAdditionalNotes?: (notes: string) => void;
  opmeAdditionalNotes?: string;
  setOpmeAdditionalNotes?: (notes: string) => void;
  supplierAdditionalNotes?: string;
  setSupplierAdditionalNotes?: (notes: string) => void;
}

const ConductSelector: React.FC<ConductSelectorProps> = ({
  procedureId,
  procedureName,
  orderId,
  autoOpenModal = false,
  onModalClose,
  setMultipleCids,
  setSelectedProcedure,
  selectedProcedure,
  setProcedureQuantity,
  setSecondaryProcedures,
  setSelectedOpmeItems,
  setSupplierDetails,
  supplierDetails = [],
  setClinicalJustification,
  setSelectedSurgicalApproaches,
  selectedSurgicalApproaches = [],
  isEditMode = false,
  setProcedureLaterality,
  setProcedureType,
  cbhpmAdditionalNotes = "",
  setCbhpmAdditionalNotes,
  opmeAdditionalNotes = "",
  setOpmeAdditionalNotes,
  supplierAdditionalNotes = "",
  setSupplierAdditionalNotes
}) => {
  // Debug: verificar se recebemos a prop setSelectedSurgicalApproaches
  console.log("🔧 ConductSelector - Props recebidas:", {
    procedureId,
    procedureName,
    setSelectedSurgicalApproaches: typeof setSelectedSurgicalApproaches,
    setSelectedSurgicalApproachesValue: setSelectedSurgicalApproaches
  });
  const [availableConducts, setAvailableConducts] = useState<any[]>([]);
  const [selectedConduct, setSelectedConduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(autoOpenModal);
  const [searchTerm, setSearchTerm] = useState("");

  // Controlar abertura automática do modal
  useEffect(() => {
    setModalOpen(autoOpenModal);
  }, [autoOpenModal]);

  // Carregar condutas associadas ao procedimento
  useEffect(() => {
    const loadConducts = async () => {
      if (!procedureId) return;

      console.log(`🔍 [DEBUG-CONDUTAS] === CARREGANDO CONDUTAS PARA PROCEDIMENTO ${procedureId} ===`);
      setLoading(true);
      try {
        console.log(`🔍 [DEBUG-CONDUTAS] Fazendo requisição: /api/surgical-procedure-approaches/procedure/${procedureId}`);
        const response = await fetch(`/api/surgical-procedure-approaches/procedure/${procedureId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        console.log(`🔍 [DEBUG-CONDUTAS] Response status: ${response.status}`);
        if (response.ok) {
          const data = await response.json();
          console.log(`🔍 [DEBUG-CONDUTAS] Dados brutos recebidos da API:`, data);
          console.log(`🔍 [DEBUG-CONDUTAS] Total de condutas encontradas: ${data?.length || 0}`);
          
          // Log detalhado de cada conduta
          if (data && data.length > 0) {
            data.forEach((conduta: any, index: number) => {
              console.log(`🔍 [DEBUG-CONDUTAS] Conduta ${index + 1}:`, {
                id: conduta.id,
                surgicalApproachId: conduta.surgicalApproachId,
                approachName: conduta.approachName,
                description: conduta.description,
                surgicalProcedureId: conduta.surgicalProcedureId,
                procedureName: conduta.procedureName
              });
            });
          }
          
          setAvailableConducts(data || []);
          console.log(`🔍 [DEBUG-CONDUTAS] Estado availableConducts atualizado com ${data?.length || 0} condutas`);
          
          // Se há apenas uma conduta, selecionar automaticamente APENAS no modo criação
          if (data && data.length === 1) {
            if (!isEditMode) {
              console.log(`✨ [DEBUG-CONDUTAS] Conduta única encontrada: ${data[0].approachName} - iniciando auto-preenchimento automático`);
              console.log(`✨ [DEBUG-CONDUTAS] Dados da conduta única:`, data[0]);
              setSelectedConduct(data[0]);
              // ✅ CORREÇÃO: Chama a função de auto-preenchimento para condutas únicas
              handleConductSelect(data[0]);
            } else {
              console.log(`🛡️ [DEBUG-CONDUTAS] MODO EDIÇÃO: Conduta única encontrada: ${data[0].approachName} - auto-preenchimento DESABILITADO`);
              // No modo edição, apenas mostrar como opção disponível, SEM seleção automática
            }
          }
          
          console.log(`🔍 [DEBUG-CONDUTAS] Condutas carregadas para procedimento ${procedureId}:`, data);
        } else {
          console.error(`❌ [DEBUG-CONDUTAS] Erro na resposta da API: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error('❌ [DEBUG-CONDUTAS] Erro ao carregar condutas:', error);
        toast({
          title: "Erro ao carregar condutas",
          description: "Não foi possível carregar as condutas clínicas disponíveis.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        console.log(`🔍 [DEBUG-CONDUTAS] === FIM DO CARREGAMENTO DE CONDUTAS ===`);
      }
    };

    loadConducts();
  }, [procedureId]);

  // Sincronizar com estado global de condutas cirúrgicas (para modo edição)
  useEffect(() => {
    console.log("🔧 ConductSelector - Verificando sincronização com selectedSurgicalApproaches");
    console.log("🔧 ConductSelector - Estado atual recebido:", selectedSurgicalApproaches);
    console.log("🔧 ConductSelector - Procedimento ID:", procedureId);
    
    // Verificar se há uma conduta para este procedimento no estado global
    const existingApproach = selectedSurgicalApproaches.find((approach: any) => 
      approach.surgicalProcedureId === procedureId
    );
    
    if (existingApproach && !selectedConduct) {
      console.log("🔧 ConductSelector - Conduta encontrada no estado global:", existingApproach);
      // Criar objeto compatível com selectedConduct
      const conductData = {
        surgicalApproachId: existingApproach.surgicalApproachId,
        approachName: existingApproach.approachName,
        isPreferred: existingApproach.isPrimary
      };
      setSelectedConduct(conductData);
      console.log("✅ ConductSelector - selectedConduct sincronizado com estado global");
    }
  }, [procedureId, selectedSurgicalApproaches, selectedConduct]);

  const handleConductSelect = async (conduct: any) => {
    console.log(`🔍 [DEBUG-SELECAO] === CONDUTA SELECIONADA ===`);
    console.log(`🔍 [DEBUG-SELECAO] Conduta selecionada:`, conduct);
    console.log(`🔍 [DEBUG-SELECAO] Procedimento ID: ${procedureId}`);
    console.log(`🔍 [DEBUG-SELECAO] Procedimento Nome: ${procedureName}`);
    
    setSelectedConduct(conduct);
    setModalOpen(false);

    // Chamar callback de fechamento se fornecido
    if (onModalClose) {
      onModalClose();
    }

    // 🔄 SISTEMA DE ASSOCIAÇÃO LIVRE
    // O médico pode associar/desassociar procedimentos livremente em qualquer modo
    // O sistema sempre faz MERGE inteligente (soma quantidades, evita duplicatas)
    console.log(`🔄 [ASSOCIACAO-LIVRE] Merge inteligente para: ${conduct.approachName}`);

    // ⚡ AUTO-PREENCHIMENTO OTIMIZADO: Executar todas as 3 chamadas API em PARALELO
    if (procedureId && conduct.surgicalApproachId) {
      console.log(`⚡ [PARALELO] Iniciando 3 chamadas API em paralelo para conduta ${conduct.surgicalApproachId}`);
      
      const [cidResult, cbhpmResult, completeDataResult] = await Promise.allSettled([
        // 1. Buscar CIDs associados
        fetch(`/api/surgical-procedure-conduct-cids/procedure/${procedureId}/approach/${conduct.surgicalApproachId}`, {
          credentials: 'include'
        }).then(res => res.ok ? res.json() : []),
        
        // 2. Buscar procedimentos CBHPM associados
        fetch(`/api/cbhpm-procedures-by-combination?medicalProcedureId=${procedureId}&approachId=${conduct.surgicalApproachId}`, {
          credentials: 'include'
        }).then(res => res.ok ? res.json() : []),
        
        // 3. Buscar dados completos (OPME, fornecedores, justificativas)
        fetch(`/api/surgical-approaches/${conduct.surgicalApproachId}/complete?surgicalProcedureId=${procedureId}`, {
          credentials: 'include'
        }).then(res => res.ok ? res.json() : null)
      ]);
      
      console.log(`✅ [PARALELO] 3 chamadas API concluídas!`);
      
      // Extrair dados com tratamento de erros individual
      const associatedCids = cidResult.status === 'fulfilled' ? cidResult.value : [];
      const cbhpmProcedures = cbhpmResult.status === 'fulfilled' ? cbhpmResult.value : [];
      const completeData = completeDataResult.status === 'fulfilled' ? completeDataResult.value : null;
      
      // Log de erros individuais
      if (cidResult.status === 'rejected') console.error('❌ Erro ao buscar CIDs:', cidResult.reason);
      if (cbhpmResult.status === 'rejected') console.error('❌ Erro ao buscar CBHPM:', cbhpmResult.reason);
      if (completeDataResult.status === 'rejected') console.error('❌ Erro ao buscar dados completos:', completeDataResult.reason);
      
      console.log(`📊 [PARALELO] Resultados: CIDs=${associatedCids?.length || 0}, CBHPM=${cbhpmProcedures?.length || 0}, CompleteData=${completeData ? 'OK' : 'NULL'}`);
      
      // ========== PROCESSAR CIDs ==========
      if (associatedCids && associatedCids.length > 0 && setMultipleCids) {
        console.log('📋 [DEBUG-SELECAO] CIDs encontrados para a conduta:', associatedCids);
        
        setMultipleCids((prevCids: any) => {
          const updatedList = [...(prevCids || [])];
          let addedCount = 0;
          
          associatedCids.forEach((cidData: any) => {
            const exists = updatedList.some((existing: any) => 
              (existing.cid?.id || existing.id) === cidData.cidId
            );
            
            if (!exists) {
              const newCidItem = {
                cid: {
                  id: cidData.cidId,
                  code: cidData.cidCode,
                  description: cidData.cidDescription,
                  category: cidData.cidCategory || 'Geral'
                },
                isAutoAdded: true,
                isPrimary: cidData.isPrimaryCid,
                notes: cidData.notes,
                addedByConductSelect: true,
                sourceApproachId: conduct.surgicalApproachId,
                sourceApproachName: conduct.approachName,
                sourceProcedureId: procedureId,
                sourceProcedureName: procedureName
              };
              
              updatedList.push(newCidItem);
              addedCount++;
              console.log(`✅ CID merged: ${cidData.cidCode} - ${cidData.cidDescription} (origem: ${conduct.approachName})`);
            }
          });
          
          if (addedCount > 0) {
            toast({
              title: "CIDs combinados",
              description: `${addedCount} novo(s) CID(s) adicionado(s)`,
              duration: 3000,
            });
          }
          
          return updatedList;
        });
      }
      
      // ========== PROCESSAR CBHPM ==========
      if (cbhpmProcedures && cbhpmProcedures.length > 0 && setSecondaryProcedures) {
        console.log('🏥 Procedimentos CBHPM encontrados:', cbhpmProcedures);
        
        const formattedProcedures = cbhpmProcedures.map((proc: any) => ({
          procedure: {
            id: proc.procedureId,
            code: proc.procedureCode,
            name: proc.procedureName,
            description: proc.notes,
            active: true,
            porte: proc.porte,
            custoOperacional: null,
            porteAnestesista: proc.porteAnestesista,
            numeroAuxiliares: proc.numeroAuxiliares,
            addedByConductSelect: true,
            sourceApproachId: conduct.surgicalApproachId,
            sourceApproachName: conduct.approachName,
            sourceProcedureId: procedureId,
            sourceProcedureName: procedureName
          },
          quantity: proc.quantity || 1
        }));
        
        // Adicionar/merge procedimentos
        formattedProcedures.forEach((newProc: any) => {
          setSecondaryProcedures((prevSecondaryProcedures: any) => {
            const currentSecondaryList = [...(prevSecondaryProcedures || [])];
            const existingSecondaryIndex = currentSecondaryList.findIndex((existing: any) => 
              existing.procedure.id === newProc.procedure.id
            );
            
            if (existingSecondaryIndex !== -1) {
              currentSecondaryList[existingSecondaryIndex].quantity += newProc.quantity;
              console.log(`🏥 MERGE: ${newProc.procedure.code} - qtd: ${currentSecondaryList[existingSecondaryIndex].quantity}`);
            } else {
              const isMainProcedure = selectedProcedure?.id === newProc.procedure.id;
              
              if (isMainProcedure && setProcedureQuantity) {
                setProcedureQuantity((prev: number) => prev + newProc.quantity);
                console.log(`🏥 MERGE PRINCIPAL: ${newProc.procedure.code}`);
              } else {
                currentSecondaryList.push(newProc);
                console.log(`🏥 NOVO: ${newProc.procedure.code}`);
              }
            }
            
            return currentSecondaryList;
          });
        });
        
        // Definir procedimento principal se não houver
        if (!selectedProcedure && formattedProcedures.length > 0 && setSelectedProcedure) {
          const sortedByPorte = formattedProcedures.sort((a: any, b: any) => (b.procedure.porte || 0) - (a.procedure.porte || 0));
          const newMainProcedure = sortedByPorte[0];
          
          setSelectedProcedure(newMainProcedure.procedure);
          if (setProcedureQuantity) {
            setProcedureQuantity(newMainProcedure.quantity);
          }
          console.log(`🏥 PRINCIPAL: ${newMainProcedure.procedure.code}`);
          
          // Remover dos secundários
          setSecondaryProcedures((prevSecondaryProcedures: any) => {
            return prevSecondaryProcedures.filter((proc: any) => 
              proc.procedure.id !== newMainProcedure.procedure.id
            );
          });
        }
        
        toast({
          title: "Procedimentos CBHPM combinados",
          description: `Procedimentos da conduta ${conduct.approachName} combinados`,
          duration: 3000,
        });
      }
      
      // ========== PROCESSAR DADOS COMPLETOS (OPME, Fornecedores, Justificativas) ==========
      if (completeData) {
        console.log('📋 Dados completos da conduta cirúrgica:', completeData);
        
        // 🎯 AUTO-PREENCHIMENTO: Lateralidade e Caráter baseado nos valores padrão da API /complete
        if (completeData.defaultLaterality && setProcedureLaterality) {
          const normalizedLaterality = completeData.defaultLaterality.toLowerCase().trim();
          console.log(`🎯 [handleConductSelect] Auto-preenchendo lateralidade: ${normalizedLaterality}`);
          const lateralityMap: Record<string, string> = {
            'esquerdo': 'esquerdo',
            'direito': 'direito',
            'bilateral': 'bilateral',
            'indeterminado': 'nao_se_aplica',
            'nao_se_aplica': 'nao_se_aplica'
          };
          const mappedLaterality = lateralityMap[normalizedLaterality] || normalizedLaterality;
          setProcedureLaterality(mappedLaterality);
        }
        
        if (completeData.defaultCharacter && setProcedureType) {
          const normalizedCharacter = completeData.defaultCharacter.toLowerCase().trim();
          console.log(`🎯 [handleConductSelect] Auto-preenchendo caráter: ${normalizedCharacter}`);
          const characterMap: Record<string, string> = {
            'eletiva': 'eletiva',
            'urgencia': 'urgencia',
            'emergencia': 'urgencia'
          };
          const mappedCharacter = characterMap[normalizedCharacter] || normalizedCharacter;
          setProcedureType(mappedCharacter);
        }
        
        // 🔄 MERGE INTELIGENTE: Sempre combinar itens OPME (soma quantidades)
        if (completeData.opmeItems && completeData.opmeItems.length > 0 && setSelectedOpmeItems) {
          setSelectedOpmeItems((prevOpmeItems: any) => {
            const currentItems = [...(prevOpmeItems || [])];
            let addedCount = 0;
            let mergedCount = 0;
            
            completeData.opmeItems.forEach((newOpme: any) => {
              const existingIndex = currentItems.findIndex((existing: any) => 
                existing.item.id === newOpme.id
              );
              
              if (existingIndex !== -1) {
                currentItems[existingIndex].quantity += (newOpme.quantity || 1);
                mergedCount++;
                console.log(`📦 MERGE: ${newOpme.technicalName} - qtd: ${currentItems[existingIndex].quantity}`);
              } else {
                currentItems.push({
                  item: {
                    id: newOpme.id,
                    technicalName: newOpme.technicalName,
                    commercialName: newOpme.commercialName,
                    manufacturerName: newOpme.manufacturerName || '',
                    anvisaRegistrationNumber: newOpme.anvisaRegistrationNumber,
                    riskClass: newOpme.riskClass,
                    registrationHolder: newOpme.registrationHolder,
                    sourceApproachId: conduct.surgicalApproachId,
                    sourceApproachName: conduct.approachName,
                    sourceProcedureId: procedureId,
                    sourceProcedureName: procedureName
                  },
                  quantity: newOpme.quantity || 1
                });
                addedCount++;
                console.log(`📦 NOVO: ${newOpme.technicalName} (origem: ${conduct.approachName})`);
              }
            });
            
            if (addedCount > 0 || mergedCount > 0) {
              toast({
                title: "Itens OPME combinados",
                description: `${addedCount} novos + ${mergedCount} atualizados`,
                duration: 3000,
              });
            }
            
            return currentItems;
          });
        }
        
        // 🔄 MERGE INTELIGENTE: Sempre combinar fornecedores (evita duplicatas por CNPJ)
        if (completeData.suppliers && completeData.suppliers.length > 0 && setSupplierDetails) {
          const newSuppliers = completeData.suppliers;
          const currentSuppliers = [...(supplierDetails || [])];
          let addedCount = 0;
          
          newSuppliers.forEach((newSupplier: any) => {
            const exists = currentSuppliers.some((existing: any) => existing.cnpj === newSupplier.cnpj);
            
            if (!exists) {
              currentSuppliers.push({
                id: newSupplier.id,
                companyName: newSupplier.companyName,
                tradeName: newSupplier.tradeName,
                cnpj: newSupplier.cnpj,
                municipalityId: newSupplier.municipalityId,
                address: newSupplier.address,
                phone: newSupplier.phone,
                email: newSupplier.email,
                active: newSupplier.active,
                sourceApproachId: conduct.surgicalApproachId,
                sourceApproachName: conduct.approachName,
                sourceProcedureId: procedureId,
                sourceProcedureName: procedureName
              });
              addedCount++;
              console.log(`🏢 NOVO: ${newSupplier.tradeName || newSupplier.companyName} (conduta: ${conduct.approachName})`);
            }
          });
          
          if (addedCount > 0) {
            setSupplierDetails(currentSuppliers);
            console.log(`🏢 ${addedCount} fornecedor(es) adicionado(s)`);
          }
        }
        
        // 🔄 MERGE INTELIGENTE: Sempre combinar justificativas (concatena se diferente)
        if (completeData.justifications && completeData.justifications.length > 0 && setClinicalJustification) {
          const preferredJustification = completeData.justifications.find((j: any) => j.isPreferred) || completeData.justifications[0];
          
          setClinicalJustification((prevJustification: string) => {
            if (prevJustification && prevJustification.trim()) {
              if (!prevJustification.includes(preferredJustification.content)) {
                const combined = `${prevJustification}\n\n${preferredJustification.content}`;
                console.log(`📝 MERGE: Justificativa concatenada`);
                toast({
                  title: "Justificativa combinada",
                  description: preferredJustification.title,
                  duration: 3000,
                });
                return combined;
              }
              console.log(`📝 Justificativa já inclusa`);
              return prevJustification;
            }
            console.log(`📝 NOVA: ${preferredJustification.title}`);
            return preferredJustification.content;
          });
        }
      }
    }

    // ATUALIZAR ESTADO selectedSurgicalApproaches para o padrão de salvamento em lote
    console.log("🔧 [DEBUG-ESTADO] === ATUALIZANDO selectedSurgicalApproaches ===");
    console.log("🔧 [DEBUG-ESTADO] Checando setSelectedSurgicalApproaches:", typeof setSelectedSurgicalApproaches);
    console.log("🔧 [DEBUG-ESTADO] Procedimento ID:", procedureId);
    console.log("🔧 [DEBUG-ESTADO] Conduta selecionada:", conduct);
    
    if (setSelectedSurgicalApproaches && typeof setSelectedSurgicalApproaches === 'function') {
      console.log("✅ [DEBUG-ESTADO] setSelectedSurgicalApproaches DISPONÍVEL - Iniciando atualização");
      setSelectedSurgicalApproaches((prev: any) => {
        console.log("📊 [DEBUG-ESTADO] Estado anterior selectedSurgicalApproaches:", prev);
        console.log("📊 [DEBUG-ESTADO] Tipo do estado anterior:", Array.isArray(prev) ? 'Array' : typeof prev);
        console.log("📊 [DEBUG-ESTADO] Tamanho do estado anterior:", prev?.length || 0);
        
        const newApproach = {
          surgicalProcedureId: procedureId,
          surgicalApproachId: conduct.surgicalApproachId,
          approachName: conduct.approachName,
          procedureName: procedureName,
          isPrimary: conduct.isPreferred || false
        };
        console.log("📝 [DEBUG-ESTADO] Nova conduta a ser adicionada:", newApproach);
        
        // Evitar duplicatas baseadas em procedureId + approachId
        const filtered = prev.filter((existing: any) => {
          const isDuplicate = existing.surgicalProcedureId === procedureId && existing.surgicalApproachId === conduct.surgicalApproachId;
          if (isDuplicate) {
            console.log("🗑️ [DEBUG-ESTADO] Removendo conduta duplicada:", existing);
          }
          return !isDuplicate;
        });
        console.log("🔍 [DEBUG-ESTADO] Estado após filtrar duplicatas:", filtered);
        
        const newState = [...filtered, newApproach];
        console.log("✅ [DEBUG-ESTADO] NOVO ESTADO FINAL selectedSurgicalApproaches:", newState);
        console.log("📊 [DEBUG-ESTADO] Total de condutas no novo estado:", newState.length);
        
        // Log detalhado de cada conduta no estado final
        newState.forEach((approach: any, index: number) => {
          console.log(`📋 [DEBUG-ESTADO] Conduta ${index + 1}:`, {
            surgicalProcedureId: approach.surgicalProcedureId,
            surgicalApproachId: approach.surgicalApproachId,
            approachName: approach.approachName,
            procedureName: approach.procedureName,
            isPrimary: approach.isPrimary
          });
        });
        
        return newState;
      });
      console.log("✅ [DEBUG-ESTADO] Estado selectedSurgicalApproaches atualizado com sucesso");
    } else {
      console.error("❌ [DEBUG-ESTADO] setSelectedSurgicalApproaches NÃO DISPONÍVEL:", setSelectedSurgicalApproaches);
      console.error("❌ [DEBUG-ESTADO] Tipo recebido:", typeof setSelectedSurgicalApproaches);
    }

    // NOTA: A conduta cirúrgica será salva no banco apenas quando o usuário clicar em "Salvar" ou "Próximo"
    // seguindo o mesmo padrão dos outros campos do formulário
    
    // 📝 INSERIR SUBTÍTULOS AUTOMÁTICOS NAS CAIXAS DE TEXTO
    // Formato: ### [Procedimento] → [Conduta]
    const subtitleText = `### ${procedureName} → ${conduct.approachName}`;
    
    // Função auxiliar para inserir subtítulo se não existir
    const insertSubtitleIfNotExists = (currentNotes: string, setNotes?: (notes: string) => void) => {
      if (!setNotes) return;
      
      // Verificar se o subtítulo já existe (evitar duplicatas)
      // Busca pelo padrão exato do subtítulo
      if (currentNotes.includes(subtitleText)) {
        console.log(`📝 [SUBTITULO] Subtítulo já existe: ${subtitleText}`);
        return;
      }
      
      // Adicionar subtítulo no final com quebras de linha
      const newNotes = currentNotes.trim() 
        ? `${currentNotes.trim()}\n\n${subtitleText}\n\n`
        : `${subtitleText}\n\n`;
      
      console.log(`📝 [SUBTITULO] Inserindo subtítulo: ${subtitleText}`);
      setNotes(newNotes);
    };
    
    // Inserir em todas as 3 caixas de texto
    insertSubtitleIfNotExists(cbhpmAdditionalNotes, setCbhpmAdditionalNotes);
    insertSubtitleIfNotExists(opmeAdditionalNotes, setOpmeAdditionalNotes);
    insertSubtitleIfNotExists(supplierAdditionalNotes, setSupplierAdditionalNotes);
    
    toast({
      title: "Conduta selecionada",
      description: `${conduct.approachName} será salva quando avançar ou salvar o pedido`,
      duration: 3000,
    });
  };

  const filteredConducts = availableConducts.filter(conduct =>
    conduct.approachName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conduct.approachDescription?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin mr-2 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Carregando condutas...</span>
      </div>
    );
  }

  if (availableConducts.length === 0) {
    return (
      <div className="p-3 text-center bg-muted/30 rounded-lg border border-border/50">
        <span className="text-sm text-muted-foreground">
          Nenhuma conduta clínica configurada para este procedimento
        </span>
      </div>
    );
  }

  return (
    <div className="mt-2">      
      {/* Conduta selecionada - apenas para visualização */}
      {selectedConduct && (
        <div className="mb-2">
          <span className="inline-flex items-center px-2 py-1 bg-medsync-dark-blue text-white text-xs rounded-full border border-medsync-blue">
            {selectedConduct.approachName}
            {selectedConduct.isPreferred && " (Preferencial)"}
          </span>
        </div>
      )}

      {/* Modal para selecionar conduta quando nenhuma está selecionada */}
      {!selectedConduct && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-[600px] bg-popover border-border shadow-md">
            <DialogHeader>
              <DialogTitle className="text-muted-foreground">
                Selecionar Conduta Cirúrgica - {procedureName}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Escolha a abordagem cirúrgica apropriada para este procedimento.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Campo de pesquisa */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar condutas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-background border-border text-foreground"
                />
              </div>

              {/* Lista de condutas */}
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {filteredConducts.map((conduct) => (
                  <button
                    key={conduct.id}
                    onClick={() => handleConductSelect(conduct)}
                    className="w-full text-left p-3 rounded-md border border-border bg-accent/20 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-muted-foreground text-sm">
                          {conduct.approachName}
                        </div>
                        {conduct.approachDescription && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {conduct.approachDescription}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {conduct.complexity && (
                            <span className="text-xs px-2 py-1 bg-accent/50 text-muted-foreground rounded">
                              {conduct.complexity}
                            </span>
                          )}
                          {conduct.estimatedDuration && (
                            <span className="text-xs px-2 py-1 bg-muted/50 text-muted-foreground rounded">
                              {conduct.estimatedDuration} min
                            </span>
                          )}
                        </div>
                      </div>
                      {conduct.isPreferred && (
                        <span className="px-2 py-1 bg-accent-light text-accent text-xs rounded-full ml-3">
                          Preferencial
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {filteredConducts.length === 0 && searchTerm && (
                <div className="p-4 text-center text-muted-foreground">
                  Nenhuma conduta encontrada para "{searchTerm}"
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export function SurgeryData({
  cidCode,
  setCidCode,
  cidDescription,
  setCidDescription,
  selectedCidId,
  setSelectedCidId,
  cidLaterality,
  setCidLaterality,
  multipleCids = [],
  setMultipleCids = () => {},
  procedureLaterality,
  setProcedureLaterality,
  procedureType,
  setProcedureType,
  selectedProcedure,
  setSelectedProcedure,
  procedureQuantity,
  setProcedureQuantity,
  secondaryProcedures,
  setSecondaryProcedures,
  suppliers = { supplier1: null, supplier2: null, supplier3: null },
  setSuppliers = () => {},
  supplierDetails = [],
  setSupplierDetails = () => {},
  // Campo para sugestão de justificativa clínica
  clinicalJustification = "",
  setClinicalJustification = () => {},
  // Props para itens OPME
  selectedOpmeItems = [],
  setSelectedOpmeItems = () => {},
  // Props para salvar CIDs no banco
  orderId = null,
  updateOrderField,
  // Props para procedimentos cirúrgicos por região
  selectedSurgicalProcedures = [],
  setSelectedSurgicalProcedures = () => {},
  availableProceduresFromRegion = [],
  setAvailableProceduresFromRegion = () => {},
  // Props para condutas cirúrgicas selecionadas (novo padrão de salvamento em lote)
  selectedSurgicalApproaches = [],
  setSelectedSurgicalApproaches = () => {},
  // Callback para carregar fabricantes existentes
  onManufacturersReady = () => {},
  // Flag para detectar modo de edição e desabilitar auto-preenchimento
  isEditMode = false,
  // Dados do paciente para IA
  selectedPatient = null,
  // Indicação clínica e observações adicionais
  clinicalIndication = "",
  additionalNotes = "",
  // Anexos do pedido
  attachments = null,
  // Região anatômica selecionada para o webhook de IA
  selectedAnatomicalRegion = null,
  // Campos de texto livre após procedimentos CBHPM, itens OPME e fornecedores
  cbhpmAdditionalNotes = "",
  setCbhpmAdditionalNotes = () => {},
  opmeAdditionalNotes = "",
  setOpmeAdditionalNotes = () => {},
  supplierAdditionalNotes = "",
  setSupplierAdditionalNotes = () => {},
}: SurgeryDataProps) {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [originalClinicalJustification, setOriginalClinicalJustification] = useState<string>("");
  
  // Estados para a adição de múltiplos CIDs
  const [currentCid, setCurrentCid] = useState<CidCode | null>(null);
  
  // Estados para região anatômica removidos - agora gerenciados pelo AnatomicalRegionSelector

  // Estados para busca de procedimentos cirúrgicos
  const [surgicalProcedureSearchOpen, setSurgicalProcedureSearchOpen] = useState(false);
  const [surgicalProcedureSearchTerm, setSurgicalProcedureSearchTerm] = useState("");
  const [allSurgicalProcedures, setAllSurgicalProcedures] = useState<SurgicalProcedure[]>([]);
  const [surgicalProcedureLoading, setSurgicalProcedureLoading] = useState(false);
  
  // Estado para controlar qual procedimento deve abrir o modal de conduta automaticamente
  const [autoOpenConductModalForProcedureId, setAutoOpenConductModalForProcedureId] = useState<number | null>(null);

  // Outros estados necessários para o funcionamento do componente
  const [procedureSearchOpen, setProcedureSearchOpen] = useState(false);
  const [procedureSearchTerm, setProcedureSearchTerm] = useState("");
  const [procedureResults, setProcedureResults] = useState<Procedure[]>([]);
  const [procedureLoading, setProcedureLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Estados para seleção de condutas cirúrgicas
  const [showSurgicalApproachDialog, setShowSurgicalApproachDialog] = useState(false);
  const [availableSurgicalApproaches, setAvailableSurgicalApproaches] = useState<any[]>([]);
  const [selectedCidForApproach, setSelectedCidForApproach] = useState<CidCode | null>(null);
  const [localSelectedSurgicalApproaches, setLocalSelectedSurgicalApproaches] = useState<any[]>([]);
  
  // Estado para associação manual de itens à conduta
  const [manualAssociationApproachId, setManualAssociationApproachId] = useState<string>("none");
  
  // Estados para mostrar/esconder campos de observações adicionais
  const [showCbhpmNotes, setShowCbhpmNotes] = useState(false);
  const [showOpmeNotes, setShowOpmeNotes] = useState(false);
  const [showSupplierNotes, setShowSupplierNotes] = useState(false);
  
  // Função para verificar se há conteúdo útil além de títulos automáticos
  const hasUsefulContent = (html: string): boolean => {
    if (!html || html.trim() === '' || html === '<p></p>') return false;
    
    // Remover tags HTML para obter texto puro
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    
    // Remover títulos automáticos no formato "### Procedimento → Conduta" 
    const withoutTitles = textContent
      .split('\n')
      .filter(line => !line.trim().match(/^###\s+.+\s*→\s*.+$/))
      .join('\n')
      .trim();
    
    return withoutTitles.length > 0;
  };
  
  // Mostrar campo de observações automaticamente se já houver conteúdo útil
  useEffect(() => {
    if (hasUsefulContent(cbhpmAdditionalNotes)) {
      setShowCbhpmNotes(true);
    }
  }, [cbhpmAdditionalNotes]);
  
  useEffect(() => {
    if (hasUsefulContent(opmeAdditionalNotes)) {
      setShowOpmeNotes(true);
    }
  }, [opmeAdditionalNotes]);
  
  useEffect(() => {
    if (hasUsefulContent(supplierAdditionalNotes)) {
      setShowSupplierNotes(true);
    }
  }, [supplierAdditionalNotes]);
  
  // Auto-selecionar conduta quando há apenas uma no pedido
  useEffect(() => {
    if (selectedSurgicalApproaches.length === 1 && (!manualAssociationApproachId || manualAssociationApproachId === "none")) {
      const singleApproach = selectedSurgicalApproaches[0];
      console.log("🎯 Auto-selecionando única conduta disponível:", singleApproach.approachName);
      // Usar chave composta: surgicalProcedureId-surgicalApproachId
      setManualAssociationApproachId(`${singleApproach.surgicalProcedureId}-${singleApproach.surgicalApproachId}`);
    } else if (selectedSurgicalApproaches.length === 0 && manualAssociationApproachId !== "none") {
      // Resetar se não há mais condutas
      setManualAssociationApproachId("none");
    }
  }, [selectedSurgicalApproaches, manualAssociationApproachId]);

  // Estados para procedimentos secundários
  const [secondaryProcedureSearchOpen, setSecondaryProcedureSearchOpen] =
    useState(false);
  const [currentSecondaryProcedure, setCurrentSecondaryProcedure] =
    useState<Procedure | null>(null);
  const [currentSecondaryQuantity, setCurrentSecondaryQuantity] = useState(1);
  // Estado de lateralidade do procedimento secundário removido, conforme solicitado

  // Estado local para controlar a lateralidade da cirurgia
  const [cirurgiaLateralidade, setCirurgiaLateralidade] = useState<
    string | null
  >(procedureLaterality);

  // Efeito para sincronizar o estado local com o valor do componente pai
  useEffect(() => {
    setCirurgiaLateralidade(procedureLaterality);
  }, [procedureLaterality]);

  // Função para calcular idade a partir da data de nascimento
  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Função para restaurar justificativa clínica original
  const handleRestoreOriginal = () => {
    if (setClinicalJustification && originalClinicalJustification) {
      setClinicalJustification(originalClinicalJustification);
      setOriginalClinicalJustification(""); // Limpar texto original após restaurar
      toast({
        title: "Texto original restaurado",
        description: "A justificativa clínica foi restaurada para o texto anterior.",
      });
    }
  };

  // Função para gerar justificativa clínica com IA
  const handleGenerateAIJustification = async () => {
    // Salvar texto original antes de gerar com IA (se ainda não foi salvo)
    if (!originalClinicalJustification && clinicalJustification) {
      setOriginalClinicalJustification(clinicalJustification);
    }
    
    setIsGeneratingAI(true);
    
    try {
      // Preparar dados para o webhook
      const webhookData = {
        // Campos obrigatórios
        sexo_paciente: selectedPatient?.gender || "",
        idade: selectedPatient?.birthDate ? calculateAge(selectedPatient.birthDate) : 0,
        indicacao_clinica: clinicalIndication || "",
        regiao_anatomica: selectedAnatomicalRegion?.name || "",
        procedimento_cirurgico: selectedSurgicalProcedures?.map(proc => proc.name).join(", ") || "",
        
        // Campos opcionais
        observacoes_adicionais: additionalNotes || "",
        conduta_cirurgica: selectedSurgicalApproaches?.map(approach => approach.approachName).join(", ") || "",
        codigos_cid: multipleCids?.map(cid => cid.cid.code) || [],
        lateralidade: procedureLaterality || "",
        carater_procedimento: procedureType || "",
        codigos_cbhpm: [
          ...(selectedProcedure ? [selectedProcedure.code] : []),
          ...secondaryProcedures.map(sp => sp.procedure.code)
        ],
        itens_opme: selectedOpmeItems?.map(item => item.item.technicalName || item.item.commercialName) || [],
        fornecedores: supplierDetails?.map(supplier => supplier.companyName || supplier.tradeName) || [],
        justificativa_proposta: clinicalJustification || "", // Justificativa clínica proposta pelo médico
        anexos: attachments?.map(attachment => ({
          nome: attachment.filename,
          url: `${window.location.origin}${attachment.url}`
        })) || []
      };

      // Validar campos obrigatórios
      if (!webhookData.sexo_paciente || !webhookData.idade || !webhookData.indicacao_clinica || 
          !webhookData.regiao_anatomica || !webhookData.procedimento_cirurgico) {
        toast({
          title: "Dados insuficientes",
          description: "Para gerar a justificativa clínica, é necessário ter: dados do paciente, indicação clínica, região anatômica e procedimento cirúrgico preenchidos.",
          variant: "destructive",
        });
        return;
      }

      // Log dos dados sendo enviados para debug
      console.log('📤 Enviando dados para IA:', webhookData);

      // Chamar o webhook
      const response = await fetch('https://hook-prod.iotninja.com.br/webhook/medsync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer f9a2b8e3-c1d5-4e7f-a6b0-9c8d7e6f5a4b',
        },
        body: JSON.stringify(webhookData)
      });

      console.log('📥 Status da resposta:', response.status);
      console.log('📥 Headers da resposta:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro na resposta:', errorText);
        throw new Error(`Erro HTTP ${response.status}: ${errorText || 'Resposta vazia'}`);
      }

      // Verificar se o conteúdo é JSON válido
      const responseText = await response.text();
      // Note: Removido log da resposta completa para evitar exposição de dados médicos em produção
      console.log('📄 Resposta da IA recebida com sucesso (', responseText.length, 'caracteres)');

      if (!responseText.trim()) {
        throw new Error('Resposta vazia do servidor de IA');
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('❌ Erro ao parsear JSON:', jsonError);
        throw new Error(`Resposta inválida da IA: ${responseText.substring(0, 100)}...`);
      }
      
      // Verificar se a função de atualização está disponível
      if (!setClinicalJustification) {
        throw new Error('Função de atualização da justificativa não está disponível');
      }
      
      if (result.output) {
        // Atualizar o campo de justificativa clínica com o texto gerado
        setClinicalJustification(result.output);
        
        toast({
          title: "Justificativa gerada com sucesso!",
          description: "A IA gerou uma sugestão de justificativa clínica baseada nos dados do procedimento.",
        });
      } else if (result.analise) {
        // Compatibilidade com formato antigo
        setClinicalJustification(result.analise);
        
        toast({
          title: "Justificativa gerada com sucesso!",
          description: "A IA gerou uma sugestão de justificativa clínica baseada nos dados do procedimento.",
        });
      } else {
        throw new Error("Resposta da IA não contém justificativa (campos 'output' ou 'analise' não encontrados)");
      }
      
    } catch (error) {
      console.error('Erro ao gerar justificativa com IA:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro ao gerar justificativa",
        description: `Não foi possível gerar a justificativa clínica: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Função para buscar todos os procedimentos cirúrgicos
  const fetchAllSurgicalProcedures = async () => {
    if (allSurgicalProcedures.length > 0) return; // Já carregados
    
    setSurgicalProcedureLoading(true);
    try {
      const response = await fetch('/api/surgical-procedures', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
        }
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      if (data && Array.isArray(data)) {
        setAllSurgicalProcedures(data);
        console.log(`Carregados ${data.length} procedimentos cirúrgicos`);
      }
    } catch (error) {
      console.error('Erro ao buscar procedimentos cirúrgicos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro ao carregar procedimentos",
        description: errorMessage.includes('autenticado') ? 
          "Sessão expirada. Recarregue a página e tente novamente." : 
          "Não foi possível carregar os procedimentos cirúrgicos.",
        variant: "destructive",
      });
    } finally {
      setSurgicalProcedureLoading(false);
    }
  };

  // Função para selecionar procedimento cirúrgico
  const handleSelectSurgicalProcedure = (procedure: SurgicalProcedure) => {
    // Verificar se procedimento já existe
    const exists = selectedSurgicalProcedures.some(p => p.id === procedure.id);
    if (exists) {
      toast({
        title: "Procedimento já selecionado",
        description: `${procedure.name} já está na lista`,
        variant: "destructive",
      });
      return;
    }
    
    // Adicionar à lista de procedimentos selecionados
    const updated = [...selectedSurgicalProcedures, procedure];
    setSelectedSurgicalProcedures(updated);
    
    toast({
      title: "Procedimento adicionado",
      description: `${procedure.name} foi adicionado`,
    });
    
    // Abrir automaticamente o modal de conduta para este procedimento
    setTimeout(() => {
      setAutoOpenConductModalForProcedureId(procedure.id);
    }, 100);
    
    setSurgicalProcedureSearchOpen(false);
    setSurgicalProcedureSearchTerm("");
  };



  // Vamos mover esse efeito para depois das declarações de estados dos fornecedores

  // Estados para a nova implementação de materiais OPME
  const [opmeSearchOpen, setOpmeSearchOpen] = useState<boolean>(false);
  const [opmeSearchTerm, setOpmeSearchTerm] = useState<string>("");
  const [opmeResults, setOpmeResults] = useState<OpmeItem[]>([]);
  const [opmeLoading, setOpmeLoading] = useState<boolean>(false);
  const [opmeQuantity, setOpmeQuantity] = useState<number>(1);
  const [currentOpmeItem, setCurrentOpmeItem] = useState<OpmeItem | null>(null);
  const [opmeSelectedName, setOpmeSelectedName] = useState<string>("");
  // Usar o estado propagado do componente pai em vez do estado local
  const opmeItems = selectedOpmeItems;
  const setOpmeItems = setSelectedOpmeItems;

  // Interface para fornecedor com associação de conduta
  interface SupplierWithAssociation {
    id: number;
    companyName: string;
    tradeName: string | null;
    cnpj: string;
    municipalityId?: number;
    address: string | null;
    phone: string | null;
    email: string | null;
    active?: boolean;
    // Campos de associação com conduta cirúrgica
    sourceApproachId?: number | null;
    sourceApproachName?: string | null;
    sourceProcedureId?: number | null;
    sourceProcedureName?: string | null;
    manufacturerName?: string | null;
    isApproved?: boolean;
  }

  // Interface para fornecedor base (resultado de busca)
  interface Supplier {
    id: number;
    companyName: string;
    tradeName: string | null;
    cnpj: string;
    municipalityId: number;
    address: string | null;
    phone: string | null;
    email: string | null;
    active: boolean;
  }

  // Estados para busca de fornecedores (popover único)
  const [supplierSearchOpen, setSupplierSearchOpen] = useState<boolean>(false);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState<string>("");
  const [supplierResults, setSupplierResults] = useState<Supplier[]>([]);
  const [supplierLoading, setSupplierLoading] = useState<boolean>(false);
  const [currentSupplier, setCurrentSupplier] = useState<Supplier | null>(null);
  
  // Lista dinâmica de fornecedores selecionados (usa supplierDetails do pai)
  const selectedSuppliers = supplierDetails || [];
  const setSelectedSuppliers = setSupplierDetails || (() => {});

  // Limpar fornecedores quando não houver itens OPME
  useEffect(() => {
    const hasOpmeItems = selectedOpmeItems && selectedOpmeItems.length > 0;
    
    if (!hasOpmeItems && selectedSuppliers.length > 0) {
      setSelectedSuppliers([]);
      console.log("🗑️ Fornecedores limpos - sem itens OPME");
    }
  }, [selectedOpmeItems]);

  // Sincronizar com o estado legado de IDs (para compatibilidade)
  useEffect(() => {
    if (setSuppliers) {
      const uniqueSupplierIds = [...new Set(selectedSuppliers.map(s => s.id))].slice(0, 3);
      setSuppliers({
        supplier1: uniqueSupplierIds[0] || null,
        supplier2: uniqueSupplierIds[1] || null,
        supplier3: uniqueSupplierIds[2] || null,
      });
    }
  }, [selectedSuppliers, setSuppliers]);

  // Estado para armazenar os resultados da busca de CID-10
  const [cidCodes, setCidCodes] = useState<CidCode[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Função para formatar automaticamente o código CID-10
  const formatCidCode = (value: string): string => {
    // Remove todos os caracteres que não são letras ou números
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Se tem pelo menos 3 caracteres (1 letra + 2 números), adiciona o ponto
    if (cleaned.length >= 4) {
      // Formato: L12.3 (1 letra + 2 números + ponto + 1 número)
      return `${cleaned.substring(0, 3)}.${cleaned.substring(3, 4)}`;
    }
    
    return cleaned;
  };

  // Função para normalizar CID-10 para busca (garante que tenha ponto)
  const normalizeCidForSearch = (value: string): string => {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Se tem exatamente 4 caracteres sem ponto, adiciona o ponto
    if (cleaned.length === 4 && /^[A-Z][0-9]{3}$/.test(cleaned)) {
      return `${cleaned.substring(0, 3)}.${cleaned.substring(3)}`;
    }
    
    // Se já tem o formato correto, retorna como está
    if (/^[A-Z][0-9]{2}\.[0-9]$/.test(value.toUpperCase())) {
      return value.toUpperCase();
    }
    
    return cleaned;
  };

  // Função para formatar automaticamente o código CBHPM
  const formatCbhpmCode = (value: string): string => {
    // Remove todos os caracteres que não são números
    const cleaned = value.replace(/[^0-9]/g, '');
    
    // Aplica formatação progressiva baseada no comprimento
    if (cleaned.length >= 9) {
      // Formato completo: X.XX.XX.XX-X
      return `${cleaned.substring(0, 1)}.${cleaned.substring(1, 3)}.${cleaned.substring(3, 5)}.${cleaned.substring(5, 7)}-${cleaned.substring(7, 8)}`;
    } else if (cleaned.length >= 7) {
      // Formato: X.XX.XX.XX
      return `${cleaned.substring(0, 1)}.${cleaned.substring(1, 3)}.${cleaned.substring(3, 5)}.${cleaned.substring(5)}`;
    } else if (cleaned.length >= 5) {
      // Formato: X.XX.XX
      return `${cleaned.substring(0, 1)}.${cleaned.substring(1, 3)}.${cleaned.substring(3)}`;
    } else if (cleaned.length >= 3) {
      // Formato: X.XX
      return `${cleaned.substring(0, 1)}.${cleaned.substring(1)}`;
    }
    
    return cleaned;
  };

  // Função para normalizar CBHPM para busca (garante formato correto)
  const normalizeCbhpmForSearch = (value: string): string => {
    const cleaned = value.replace(/[^0-9]/g, '');
    
    // Se tem exatamente 8 números, formata como CBHPM completo
    if (cleaned.length === 8) {
      return `${cleaned.substring(0, 1)}.${cleaned.substring(1, 3)}.${cleaned.substring(3, 5)}.${cleaned.substring(5, 7)}-${cleaned.substring(7, 8)}`;
    }
    
    // Se já tem o formato correto, retorna como está
    if (/^[0-9]\.[0-9]{2}\.[0-9]{2}\.[0-9]{2}-[0-9]$/.test(value)) {
      return value;
    }
    
    return value;
  };

  // Efeito para buscar códigos CID-10 quando o termo de busca mudar
  useEffect(() => {
    const fetchCidCodes = async () => {
      // Não fazer busca se o termo for muito curto
      if (searchTerm.length < 2) {
        setCidCodes([]);
        return;
      }

      try {
        setIsLoading(true);
        // Normalizar o termo de busca para garantir formato correto
        const normalizedTerm = normalizeCidForSearch(searchTerm);
        console.log(`Termo original: "${searchTerm}" -> Normalizado: "${normalizedTerm}"`);
        
        // Usar fetch diretamente como nos outros componentes
        const response = await fetch(
          `/api/cid-codes/search?q=${encodeURIComponent(normalizedTerm)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            credentials: "include",
          },
        );

        if (!response.ok) {
          throw new Error(`Erro ao buscar códigos CID-10: ${response.status}`);
        }

        const data = await response.json();
        console.log(
          `Encontrados ${data.length} códigos CID-10 para a consulta "${searchTerm}":`,
          data,
        );
        setCidCodes(data);
      } catch (error) {
        console.error("Erro ao buscar códigos CID-10:", error);
        toast({
          title: "Erro na busca",
          description:
            "Não foi possível buscar códigos CID-10 da tabela cid_codes",
          variant: "destructive",
        });
        setCidCodes([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce para evitar muitas requisições
    const debounceTimer = setTimeout(() => {
      if (searchTerm.length >= 2) {
        fetchCidCodes();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Efeito para buscar procedimentos quando o termo de busca mudar
  React.useEffect(() => {
    const fetchProcedures = async () => {
      if (procedureSearchTerm.length < 3) {
        setProcedureResults([]);
        return;
      }

      try {
        setProcedureLoading(true);
        // Normalizar o termo de busca para garantir formato correto CBHPM
        const normalizedTerm = normalizeCbhpmForSearch(procedureSearchTerm);
        console.log(`Termo CBHPM original: "${procedureSearchTerm}" -> Normalizado: "${normalizedTerm}"`);
        
        const response = await fetch(
          `/api/procedures/search?q=${encodeURIComponent(normalizedTerm)}&cbhpmOnly=true`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            credentials: "include",
          },
        );

        if (!response.ok) {
          throw new Error(`Erro ao buscar procedimentos: ${response.status}`);
        }

        const data = await response.json();
        console.log(
          `Encontrados ${data.length} procedimentos para a consulta "${procedureSearchTerm}"`,
        );
        setProcedureResults(data);
      } catch (error) {
        console.error("Erro ao buscar procedimentos:", error);
        toast({
          title: "Erro ao buscar procedimentos",
          description: "Tente novamente ou verifique sua conexão",
          variant: "destructive",
        });
        setProcedureResults([]);
      } finally {
        setProcedureLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchProcedures();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [procedureSearchTerm]);

  // Função para buscar materiais OPME
  const handleOpmeSearch = async () => {
    if (opmeSearchTerm.length < 3) {
      toast({
        title: "Termo muito curto",
        description:
          "Digite pelo menos 3 caracteres para buscar materiais OPME",
        variant: "destructive",
      });
      return;
    }

    try {
      setOpmeLoading(true);

      const response = await fetch(
        `/api/opme-items/search?q=${encodeURIComponent(opmeSearchTerm)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Erro ao buscar materiais OPME: ${response.status}`);
      }

      const data = await response.json();
      console.log(
        `Encontrados ${data.length} materiais OPME para a consulta "${opmeSearchTerm}"`,
      );
      setOpmeResults(data);
    } catch (error) {
      console.error("Erro ao buscar materiais OPME:", error);
      toast({
        title: "Erro na busca",
        description: "Ocorreu um erro ao buscar materiais OPME",
        variant: "destructive",
      });
      setOpmeResults([]);
    } finally {
      setOpmeLoading(false);
    }
  };

  // Função para selecionar um material OPME e adicionar automaticamente
  const handleSelectOpmeItem = async (item: OpmeItem) => {
    // Verificar se há uma conduta selecionada para associação manual
    let manualApproachInfo: any = null;
    if (manualAssociationApproachId && manualAssociationApproachId !== "none" && selectedSurgicalApproaches.length > 0) {
      // Formato da chave: "procedureId-surgicalApproachId"
      const [procedureIdStr, approachIdStr] = manualAssociationApproachId.split('-');
      const procedureId = parseInt(procedureIdStr);
      const approachId = parseInt(approachIdStr);
      
      const selectedApproach = selectedSurgicalApproaches.find(
        (a: any) => a.surgicalProcedureId === procedureId && a.surgicalApproachId === approachId
      );
      if (selectedApproach) {
        manualApproachInfo = {
          sourceApproachId: selectedApproach.surgicalApproachId,
          sourceApproachName: selectedApproach.approachName,
          sourceProcedureId: selectedApproach.surgicalProcedureId,
          sourceProcedureName: selectedApproach.procedureName
        };
      }
    }

    // Verificar se o mesmo OPME já existe NO MESMO BLOCO (mesma conduta)
    // Permitir o mesmo OPME em blocos diferentes (igual ao CBHPM e CID10)
    const existsInSameBlock = opmeItems?.some((opmeItem: any) => {
      if (opmeItem.item.id !== item.id) return false;
      
      // Se ambos são manuais (sem conduta), são duplicatas
      if (!opmeItem.item.sourceApproachId && !manualApproachInfo) return true;
      
      // Se um tem conduta e outro não, são blocos diferentes
      if (!opmeItem.item.sourceApproachId || !manualApproachInfo) return false;
      
      // Verificar se são do mesmo bloco (mesmo approach + procedure)
      return opmeItem.item.sourceApproachId === manualApproachInfo.sourceApproachId &&
             opmeItem.item.sourceProcedureId === manualApproachInfo.sourceProcedureId;
    });

    if (existsInSameBlock) {
      toast({
        title: "Material já adicionado neste bloco",
        description: "Este material OPME já foi adicionado a esta conduta. Você pode adicioná-lo a uma conduta diferente.",
        variant: "destructive",
        duration: 4000,
      });
      setOpmeSearchOpen(false);
      return;
    }

    // Adicionar automaticamente à lista com a quantidade atual e metadados de bloco
    const newOpmeItem = {
      item: {
        ...item,
        ...(manualApproachInfo || {})
      },
      quantity: opmeQuantity,
    };

    const updatedItems = [...(opmeItems || []), newOpmeItem];
    if (setOpmeItems) {
      setOpmeItems(updatedItems);
    }

    // ❌ SALVAMENTO LEGADO COMENTADO - Persistência agora é feita via saveProgress no passo 3
    // const saveSuccess = await saveOpmeItemsToDatabase(updatedItems);
    // if (saveSuccess) {
    //   console.log(`Item OPME ${item.technicalName} salvo no banco com sucesso`);
    // } else {
    //   console.error(`Erro ao salvar item OPME ${item.technicalName} no banco`);
    // }
    console.log(`Item OPME ${item.technicalName} adicionado ao estado (será salvo no passo 3)`);

    // Limpar seleção e fechar popup
    setCurrentOpmeItem(null);
    setOpmeSelectedName("");
    setOpmeQuantity(1);
    setOpmeSearchTerm("");
    setOpmeSearchOpen(false);

    const toastDescription = manualApproachInfo 
      ? `${item.technicalName} adicionado e associado a "${manualApproachInfo.sourceApproachName}"!`
      : `${item.technicalName} adicionado com sucesso!`;

    toast({
      title: "Material OPME adicionado",
      description: toastDescription,
      duration: 2000,
    });
  };

  // ❌ FUNÇÃO LEGADA COMENTADA - Salvamento unificado agora é feito via saveProgress em create-order.tsx
  // A persistência de itens OPME com associações cirúrgicas agora acontece APENAS no passo 3 do saveProgress
  // Isso evita conflitos e sobrescrita de dados
  /*
  const saveOpmeItemsToDatabase = async (items: Array<{ item: any; quantity: number }>) => {
    if (!orderId) {
      console.warn("Não há orderId para salvar itens OPME");
      return false;
    }

    try {
      console.log(`Salvando ${items.length} itens OPME para o pedido ${orderId}`);
      const opmeData = items.map(item => ({
        opmeItemId: item.item.id,
        quantity: item.quantity
      }));
      
      const response = await fetch(`/api/orders/${orderId}/opme-items`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ opmeItems: opmeData })
      });

      if (!response.ok) {
        throw new Error(`Erro ao salvar itens OPME: ${response.status}`);
      }

      console.log(`Itens OPME salvos com sucesso no banco`);
      return true;
    } catch (error) {
      console.error("Erro ao salvar itens OPME no banco:", error);
      return false;
    }
  };
  */

  // Função para adicionar material OPME à lista
  const handleAddOpmeItem = async () => {
    if (!currentOpmeItem) {
      toast({
        title: "Nenhum material selecionado",
        description: "Selecione um material OPME primeiro",
        variant: "destructive",
      });
      return;
    }

    // VALIDAÇÃO OBRIGATÓRIA: Se há condutas no pedido, DEVE selecionar uma
    if (selectedSurgicalApproaches.length > 0 && (!manualAssociationApproachId || manualAssociationApproachId === "none")) {
      toast({
        title: "Selecione uma conduta",
        description: "É obrigatório associar o material OPME a uma conduta cirúrgica existente no pedido.",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    // Verificar se há uma conduta selecionada para associação manual
    let manualApproachInfo: any = null;
    let targetProcedureId: number | null = null;
    let targetApproachId: number | null = null;
    
    if (manualAssociationApproachId && manualAssociationApproachId !== "none" && selectedSurgicalApproaches.length > 0) {
      // Formato da chave: "procedureId-surgicalApproachId"
      const [procedureIdStr, approachIdStr] = manualAssociationApproachId.split('-');
      targetProcedureId = parseInt(procedureIdStr);
      targetApproachId = parseInt(approachIdStr);
      
      const selectedApproach = selectedSurgicalApproaches.find(
        (a: any) => a.surgicalProcedureId === targetProcedureId && a.surgicalApproachId === targetApproachId
      );
      if (selectedApproach) {
        manualApproachInfo = {
          sourceApproachId: selectedApproach.surgicalApproachId,
          sourceApproachName: selectedApproach.approachName,
          sourceProcedureId: selectedApproach.surgicalProcedureId,
          sourceProcedureName: selectedApproach.procedureName
        };
        console.log(`Item OPME ${currentOpmeItem.technicalName} será associado manualmente à conduta: ${selectedApproach.approachName}`);
      }
    }

    // Verificar se o item já existe NA MESMA CONDUTA
    // O mesmo item OPME pode existir em condutas diferentes
    const existingItemIndex = opmeItems.findIndex(
      (item) => item.item.id === currentOpmeItem.id && 
                item.item.sourceProcedureId === targetProcedureId &&
                item.item.sourceApproachId === targetApproachId
    );

    let updatedItems;

    if (existingItemIndex >= 0) {
      // Atualizar a quantidade do item existente NA MESMA CONDUTA
      const existingItem = opmeItems[existingItemIndex];
      const newQuantity = existingItem.quantity + opmeQuantity;

      updatedItems = [...opmeItems];
      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
      };

      setOpmeItems(updatedItems);

      const condutaInfo = manualApproachInfo 
        ? ` na conduta "${manualApproachInfo.sourceProcedureName} → ${manualApproachInfo.sourceApproachName}"`
        : "";
      toast({
        title: "Quantidade atualizada",
        description: `Quantidade de ${currentOpmeItem.technicalName}${condutaInfo} atualizada para ${newQuantity}`,
      });
    } else {
      // Adicionar novo item à lista (com informações de associação manual se houver)
      const itemToAdd = {
        ...currentOpmeItem,
        ...(manualApproachInfo || {})
      };
      
      updatedItems = [
        ...opmeItems,
        {
          item: itemToAdd,
          quantity: opmeQuantity,
        },
      ];

      setOpmeItems(updatedItems);

      const toastDescription = manualApproachInfo 
        ? `${currentOpmeItem.technicalName} adicionado e associado a "${manualApproachInfo.sourceApproachName}"!`
        : `${currentOpmeItem.technicalName} adicionado à lista de materiais`;

      toast({
        title: "Material adicionado",
        description: toastDescription,
      });
    }

    // ❌ SALVAMENTO LEGADO COMENTADO - Persistência agora é feita via saveProgress no passo 3
    // const saveSuccess = await saveOpmeItemsToDatabase(updatedItems);
    // if (saveSuccess) {
    //   console.log(`Item OPME ${currentOpmeItem.technicalName} salvo no banco com sucesso`);
    // } else {
    //   console.error(`Erro ao salvar item OPME ${currentOpmeItem.technicalName} no banco`);
    // }
    console.log(`Item OPME ${currentOpmeItem.technicalName} adicionado ao estado (será salvo no passo 3)`);

    // Limpar o campo de busca e o item selecionado
    setOpmeSearchTerm("");
    setOpmeSelectedName("");
    setCurrentOpmeItem(null);
    setOpmeQuantity(1);
  };

  // Função para remover um material OPME da lista
  const handleRemoveOpmeItem = async (index: number) => {
    const newItems = [...opmeItems];
    const removedItem = newItems[index];
    newItems.splice(index, 1);

    setOpmeItems(newItems);

    // ❌ SALVAMENTO LEGADO COMENTADO - Persistência agora é feita via saveProgress no passo 3
    // const saveSuccess = await saveOpmeItemsToDatabase(newItems);
    // if (saveSuccess) {
    //   console.log(`Item OPME ${removedItem.item.technicalName} removido do banco com sucesso`);
    // } else {
    //   console.error(`Erro ao remover item OPME ${removedItem.item.technicalName} do banco`);
    // }
    console.log(`Item OPME ${removedItem.item.technicalName} removido do estado (será salvo no passo 3)`);

    toast({
      title: "Material removido",
      description: `${removedItem.item.technicalName} removido da lista`,
    });
  };

  // Função para atualizar a quantidade de um material OPME específico
  const handleUpdateOpmeQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return; // Não permitir quantidades menores que 1
    
    console.log(`🔍 DEBUG - handleUpdateOpmeQuantity chamada:`, {
      index,
      newQuantity,
      currentOpmeItems: opmeItems,
      currentItem: opmeItems[index]
    });
    
    const updatedItems = [...opmeItems];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: newQuantity
    };
    
    console.log(`🔍 DEBUG - updatedItems após alteração:`, updatedItems);
    
    setOpmeItems(updatedItems);
    
    console.log(`🔍 DEBUG - setOpmeItems chamado com:`, updatedItems);
    
    toast({
      title: "Quantidade atualizada",
      description: `Quantidade alterada para ${newQuantity}`,
      duration: 1000,
    });
  };

  // Efeito para buscar materiais OPME quando o termo de busca mudar
  useEffect(() => {
    if (opmeSearchTerm.length >= 3) {
      const debounceTimer = setTimeout(() => {
        handleOpmeSearch();
      }, 500);

      return () => clearTimeout(debounceTimer);
    }
  }, [opmeSearchTerm]);

  // Função para buscar fornecedores
  const handleSupplierSearch = async () => {
    if (supplierSearchTerm.length < 3) {
      toast({
        title: "Termo muito curto",
        description: "Digite pelo menos 3 caracteres para buscar fornecedores",
        variant: "destructive",
      });
      return;
    }

    try {
      setSupplierLoading(true);

      // Usar a API real de fornecedores - usando parâmetro correto "q"
      const response = await fetch(
        `/api/suppliers/search?q=${encodeURIComponent(supplierSearchTerm)}`,
      );

      if (!response.ok) {
        throw new Error(`Erro ao buscar fornecedores: ${response.status}`);
      }

      const data = await response.json();
      console.log(
        `Encontrados ${data.length} fornecedores para a consulta "${supplierSearchTerm}"`,
      );
      setSupplierResults(data);
    } catch (error) {
      console.error("Erro ao buscar fornecedores:", error);
      toast({
        title: "Erro na busca",
        description: "Ocorreu um erro ao buscar fornecedores",
        variant: "destructive",
      });

      // Em caso de falha na API, vamos fornecer alguns dados simulados para não bloquear a interface
      const fallbackSuppliers = [
        {
          id: 1,
          companyName: "MedicalSupply LTDA",
          tradeName: "MedSupply",
          cnpj: "12.345.678/0001-90",
          municipalityId: 1,
          phone: "(21) 3333-4444",
          email: "contato@medsupply.com",
          address: null,
          active: true,
        },
        {
          id: 2,
          companyName: "OrthoTech Brasil",
          tradeName: "OrthoTech",
          cnpj: "23.456.789/0001-01",
          municipalityId: 2,
          phone: "(21) 4444-5555",
          email: "vendas@orthotech.com.br",
          address: null,
          active: true,
        },
      ];

      const filteredFallback = fallbackSuppliers.filter(
        (supplier) =>
          supplier.companyName
            .toLowerCase()
            .includes(supplierSearchTerm.toLowerCase()) ||
          (supplier.tradeName &&
            supplier.tradeName
              .toLowerCase()
              .includes(supplierSearchTerm.toLowerCase())) ||
          supplier.cnpj.includes(supplierSearchTerm),
      );

      setSupplierResults(filteredFallback);

      toast({
        title: "Usando dados locais",
        description: "Conectando a dados locais para manter a funcionalidade",
        variant: "warning",
      });
    } finally {
      setSupplierLoading(false);
    }
  };

  // Função para salvar fornecedores no banco de dados
  const saveSuppliersToDatabase = async (suppliers: Array<{ id: number }>) => {
    if (!orderId) {
      console.warn("Não há orderId para salvar fornecedores");
      return false;
    }

    try {
      console.log(`Salvando ${suppliers.length} fornecedores para o pedido ${orderId}`);
      const supplierIds = suppliers.map(supplier => supplier.id);
      
      const response = await fetch(`/api/orders/${orderId}/suppliers`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ supplierIds })
      });

      if (!response.ok) {
        throw new Error(`Erro ao salvar fornecedores: ${response.status}`);
      }

      console.log(`Fornecedores salvos com sucesso no banco: ${supplierIds.join(', ')}`);
      return true;
    } catch (error) {
      console.error("Erro ao salvar fornecedores no banco:", error);
      return false;
    }
  };

  // Função para adicionar fornecedor à lista dinâmica (similar aos itens OPME)
  const handleAddSupplier = async () => {
    if (!currentSupplier) {
      toast({
        title: "Nenhum fornecedor selecionado",
        description: "Selecione um fornecedor primeiro",
        variant: "destructive",
      });
      return;
    }

    // VALIDAÇÃO OBRIGATÓRIA: Se há condutas no pedido, DEVE selecionar uma
    if (selectedSurgicalApproaches.length > 0 && (!manualAssociationApproachId || manualAssociationApproachId === "none")) {
      toast({
        title: "Selecione uma conduta",
        description: "É obrigatório associar o fornecedor a uma conduta cirúrgica existente no pedido.",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    // Verificar se há uma conduta selecionada para associação manual
    let manualApproachInfo: any = {};
    console.log(`🔍 DEBUG handleAddSupplier: manualAssociationApproachId=${manualAssociationApproachId}`);
    console.log(`🔍 DEBUG handleAddSupplier: selectedSurgicalApproaches=`, selectedSurgicalApproaches);
    
    if (manualAssociationApproachId && manualAssociationApproachId !== "none" && selectedSurgicalApproaches.length > 0) {
      // Formato da chave: "procedureId-surgicalApproachId"
      const [procedureIdStr, approachIdStr] = manualAssociationApproachId.split('-');
      const procedureId = parseInt(procedureIdStr);
      const approachId = parseInt(approachIdStr);
      
      const selectedApproach = selectedSurgicalApproaches.find(
        (a: any) => a.surgicalProcedureId === procedureId && a.surgicalApproachId === approachId
      );
      console.log(`🔍 DEBUG handleAddSupplier: selectedApproach=`, selectedApproach);
      
      if (selectedApproach) {
        manualApproachInfo = {
          sourceApproachId: selectedApproach.surgicalApproachId,
          sourceApproachName: selectedApproach.approachName,
          sourceProcedureId: selectedApproach.surgicalProcedureId,
          sourceProcedureName: selectedApproach.procedureName
        };
        console.log(`✅ Fornecedor ${currentSupplier.companyName} será associado à conduta: ${selectedApproach.approachName} (approachId=${selectedApproach.surgicalApproachId}, procedureId=${selectedApproach.surgicalProcedureId})`);
      } else {
        console.log(`❌ DEBUG handleAddSupplier: Nenhuma conduta encontrada com surgicalProcedureId=${procedureId}, surgicalApproachId=${approachId}`);
      }
    }
    
    console.log(`🔍 DEBUG handleAddSupplier: manualApproachInfo=`, manualApproachInfo);

    // Criar objeto de fornecedor com associação de conduta
    const supplierWithApproach: SupplierWithAssociation = {
      id: currentSupplier.id,
      companyName: currentSupplier.companyName,
      tradeName: currentSupplier.tradeName,
      cnpj: currentSupplier.cnpj,
      municipalityId: currentSupplier.municipalityId,
      address: currentSupplier.address,
      phone: currentSupplier.phone,
      email: currentSupplier.email,
      active: currentSupplier.active,
      ...manualApproachInfo
    };

    // Adicionar à lista dinâmica
    const updatedSuppliers = [...selectedSuppliers, supplierWithApproach];
    setSelectedSuppliers(updatedSuppliers);

    // Limpar seleção atual
    setCurrentSupplier(null);
    setSupplierSearchOpen(false);
    setSupplierSearchTerm("");

    const toastDescription = manualApproachInfo.sourceApproachName
      ? `${currentSupplier.companyName} associado a "${manualApproachInfo.sourceApproachName}"!`
      : `${currentSupplier.companyName} adicionado`;

    toast({
      title: "Fornecedor adicionado",
      description: toastDescription,
    });

    console.log(`Fornecedor ${currentSupplier.companyName} adicionado (salvamento via saveProgress no passo 3)`);
  };

  // Função para remover fornecedor da lista dinâmica
  const handleRemoveSupplier = (index: number) => {
    const supplierToRemove = selectedSuppliers[index];
    const updatedSuppliers = selectedSuppliers.filter((_, i) => i !== index);
    setSelectedSuppliers(updatedSuppliers);

    toast({
      title: "Fornecedor removido",
      description: `${supplierToRemove?.companyName || 'Fornecedor'} foi removido da lista`,
    });

    console.log(`Fornecedor removido do índice ${index}`);
  };

  // Função para selecionar e adicionar fornecedor diretamente da busca
  const handleSelectSupplierFromSearch = (supplier: Supplier) => {
    // Verificar se há uma conduta selecionada para associação manual
    let manualApproachInfo: any = {};
    let targetProcedureId: number | null = null;
    let targetApproachId: number | null = null;
    
    if (manualAssociationApproachId && manualAssociationApproachId !== "none" && selectedSurgicalApproaches.length > 0) {
      // Formato da chave: "surgicalProcedureId-surgicalApproachId"
      const [procedureIdStr, approachIdStr] = manualAssociationApproachId.split('-');
      targetProcedureId = parseInt(procedureIdStr);
      targetApproachId = parseInt(approachIdStr);
      
      const selectedApproach = selectedSurgicalApproaches.find(
        (a: any) => a.surgicalProcedureId === targetProcedureId && a.surgicalApproachId === targetApproachId
      );
      
      if (selectedApproach) {
        manualApproachInfo = {
          sourceApproachId: selectedApproach.surgicalApproachId,
          sourceApproachName: selectedApproach.approachName,
          sourceProcedureId: selectedApproach.surgicalProcedureId,
          sourceProcedureName: selectedApproach.procedureName
        };
      }
    }

    // Verificar se o fornecedor já existe NA MESMA CONDUTA
    // O mesmo fornecedor pode existir em condutas diferentes
    const exists = selectedSuppliers.some((s: any) => 
      s.id === supplier.id && 
      s.sourceProcedureId === targetProcedureId && 
      s.sourceApproachId === targetApproachId
    );
    
    if (exists) {
      const condutaInfo = manualApproachInfo.sourceApproachName 
        ? ` na conduta "${manualApproachInfo.sourceProcedureName} → ${manualApproachInfo.sourceApproachName}"`
        : "";
      toast({
        title: "Fornecedor já adicionado",
        description: `${supplier.companyName} já está${condutaInfo}.`,
        variant: "destructive",
      });
      setSupplierSearchOpen(false);
      setSupplierSearchTerm("");
      return;
    }

    // Criar objeto de fornecedor com associação de conduta
    const supplierWithApproach: SupplierWithAssociation = {
      id: supplier.id,
      companyName: supplier.companyName,
      tradeName: supplier.tradeName,
      cnpj: supplier.cnpj,
      municipalityId: supplier.municipalityId,
      address: supplier.address,
      phone: supplier.phone,
      email: supplier.email,
      active: supplier.active,
      ...manualApproachInfo
    };

    // Adicionar à lista dinâmica
    const updatedSuppliers = [...selectedSuppliers, supplierWithApproach];
    setSelectedSuppliers(updatedSuppliers);

    // Limpar e fechar
    setCurrentSupplier(null);
    setSupplierSearchOpen(false);
    setSupplierSearchTerm("");
    setSupplierResults([]);

    const toastDescription = manualApproachInfo.sourceApproachName
      ? `${supplier.companyName} associado a "${manualApproachInfo.sourceApproachName}"!`
      : `${supplier.companyName} adicionado`;

    toast({
      title: "Fornecedor adicionado",
      description: toastDescription,
    });

    console.log(`Fornecedor ${supplier.companyName} adicionado diretamente da busca`);
  };

  // ========================================================================
  // CÓDIGO DE FABRICANTES DESATIVADO - Sistema de fornecedores dinâmicos
  // Campos manufacturer1/2/3 não são mais necessários com o novo sistema
  // ========================================================================
  
  // Função vazia para manter compatibilidade com callbacks existentes
  const loadExistingManufacturers = async () => {
    console.log("🏭 Sistema de fabricantes desativado - usando fornecedores dinâmicos");
    return;
  };

  // Chamar callback onManufacturersReady imediatamente (para compatibilidade)
  useEffect(() => {
    if (orderId && onManufacturersReady) {
      onManufacturersReady();
    }
  }, [orderId, onManufacturersReady]);

  // Função para carregar todos os fornecedores ativos
  const loadAllSuppliers = async () => {
    try {
      setSupplierLoading(true);
      // Buscar fornecedores com termo genérico em vez de string vazia
      const response = await fetch("/api/suppliers/search?q=a");

      if (!response.ok) {
        // Se falhar carregar todos os fornecedores, tentar buscar alguns com outro termo comum
        const fallbackResponse = await fetch("/api/suppliers/search?q=e");
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          setSupplierResults(data);
          return;
        }
        throw new Error(`Erro ao carregar fornecedores: ${response.status}`);
      }

      const data = await response.json();
      setSupplierResults(data);
    } catch (error) {
      console.error("Erro ao carregar lista de fornecedores:", error);
      // Usar dados locais de fallback
      const fallbackSuppliers = [
        {
          id: 1,
          company_name: "MedicalSupply LTDA",
          trade_name: "MedSupply",
          cnpj: "12.345.678/0001-90",
          municipality_id: 1,
          phone: "(21) 3333-4444",
          email: "contato@medsupply.com",
          active: true,
        },
        {
          id: 2,
          company_name: "OrthoTech Brasil",
          trade_name: "OrthoTech",
          cnpj: "23.456.789/0001-01",
          municipality_id: 2,
          phone: "(21) 4444-5555",
          email: "vendas@orthotech.com.br",
          active: true,
        },
      ];
      setSupplierResults(fallbackSuppliers);

      toast({
        title: "Usando dados locais",
        description:
          "Exibindo dados locais enquanto a conexão é reestabelecida",
        variant: "default",
      });
    } finally {
      setSupplierLoading(false);
    }
  };

  // Efeito para buscar fornecedores quando o termo de busca mudar
  useEffect(() => {
    if (supplierSearchTerm.length >= 3) {
      const debounceTimer = setTimeout(() => {
        handleSupplierSearch();
      }, 500);

      return () => clearTimeout(debounceTimer);
    }
  }, [supplierSearchTerm]);

  // Agrupar códigos CID por categoria
  const cidCodesByCategory = React.useMemo<Record<string, CidCode[]>>(() => {
    if (!cidCodes || !Array.isArray(cidCodes)) return {};

    const result: Record<string, CidCode[]> = {};

    for (const cid of cidCodes) {
      if (!result[cid.category]) {
        result[cid.category] = [];
      }
      result[cid.category].push(cid);
    }

    return result;
  }, [cidCodes]);

  // Não precisamos mais do filtro local, pois a busca já é feita diretamente no banco de dados
  // através do endpoint /api/cid-codes/search

  // REMOVIDO: Função legacy para buscar associações diretas CID-CBHPM
  // Agora usamos o sistema: Procedimento Médico → Conduta → Procedimentos CBHPM
  // através da tabela surgical_approach_procedures

  // Função para buscar condutas cirúrgicas associadas ao CID
  const fetchAssociatedSurgicalApproaches = async (cidId: number) => {
    try {
      console.log(`Buscando condutas cirúrgicas para CID ID: ${cidId}`);
      const response = await fetch(`/api/cid-surgical-approaches/cid/${cidId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        console.warn(`Erro ao buscar condutas cirúrgicas para CID ${cidId}: ${response.status}`);
        return [];
      }

      const associations = await response.json();
      console.log(`Encontradas ${associations.length} condutas cirúrgicas para CID ${cidId}:`, associations);
      
      return associations;
    } catch (error) {
      console.warn("Erro ao buscar condutas cirúrgicas:", error);
      return [];
    }
  };

  // ❌ FUNÇÃO LEGADA COMENTADA - Salvamento unificado agora é feito via saveProgress em create-order.tsx
  // A persistência de CIDs com associações cirúrgicas agora acontece APENAS no passo 3 do saveProgress
  // Isso evita conflitos e sobrescrita de dados
  /*
  const saveCidsToDatabase = async (cids: Array<{ cid: { id: number; sourceApproachId?: number; sourceProcedureId?: number }; surgicalApproach?: { id: number }; surgicalProcedure?: { id: number } }>) => {
    if (!orderId) {
      console.warn("Não há orderId para salvar CIDs");
      return false;
    }

    try {
      console.log(`Salvando ${cids.length} CIDs para o pedido ${orderId}`);
      
      // Mapear CIDs com associações cirúrgicas
      const cidsWithAssociations = cids.map(item => ({
        cidId: item.cid.id,
        surgicalApproachId: item.surgicalApproach?.id || item.cid?.sourceApproachId || null,
        surgicalProcedureId: item.surgicalProcedure?.id || item.cid?.sourceProcedureId || null
      }));
      
      console.log(`CIDs com associações cirúrgicas:`, cidsWithAssociations);
      
      const response = await fetch(`/api/orders/${orderId}/cids`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ cids: cidsWithAssociations })
      });

      if (!response.ok) {
        throw new Error(`Erro ao salvar CIDs: ${response.status}`);
      }

      console.log(`CIDs salvos com sucesso no banco com associações cirúrgicas`);
      return true;
    } catch (error) {
      console.error("Erro ao salvar CIDs no banco:", error);
      return false;
    }
  };
  */

  // Função para salvar condutas cirúrgicas selecionadas
  const saveSurgicalApproachesToDatabase = async (approaches: any[]) => {
    if (!orderId) {
      console.warn("Não há orderId para salvar condutas cirúrgicas");
      return false;
    }

    try {
      console.log(`Salvando ${approaches.length} condutas cirúrgicas para o pedido ${orderId}`);
      
      // Salvar cada conduta individualmente
      for (const approach of approaches) {
        const response = await fetch('/api/medical-order-surgical-approaches', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            medicalOrderId: orderId,
            surgicalApproachId: approach.surgicalApproachId,
            isPrimary: approach.isPrimary || false
          })
        });

        if (!response.ok) {
          throw new Error(`Erro ao salvar conduta cirúrgica: ${response.status}`);
        }

        console.log(`Conduta cirúrgica ${approach.surgicalApproachName} salva com sucesso`);
      }

      return true;
    } catch (error) {
      console.error("Erro ao salvar condutas cirúrgicas no banco:", error);
      return false;
    }
  };



  // Função para selecionar um CID e adicioná-lo automaticamente à lista
  const selectCid = async (cidCodeItem: CidCode) => {
    // Primeiro, buscar condutas cirúrgicas associadas
    try {
      const associatedApproaches = await fetchAssociatedSurgicalApproaches(cidCodeItem.id);
      console.log(`Frontend - Condutas cirúrgicas associadas recebidas:`, associatedApproaches);
      
      if (associatedApproaches.length > 0) {
        // Se tem condutas associadas, mostrar dialog para seleção
        // NÃO adicionar o CID ainda - só após escolher a conduta
        setAvailableSurgicalApproaches(associatedApproaches);
        setSelectedCidForApproach(cidCodeItem);
        setShowSurgicalApproachDialog(true);
        
        toast({
          title: "Condutas cirúrgicas encontradas",
          description: `Selecione uma conduta cirúrgica para ${cidCodeItem.code}`,
          duration: 3000,
        });
        
        return; // Não continuar - aguardar seleção da conduta
      } else {
        // Se NÃO tem condutas associadas, adicionar CID diretamente
        console.log(`CID ${cidCodeItem.code} não possui condutas associadas. Adicionando diretamente.`);
        
        // VALIDAÇÃO OBRIGATÓRIA: Se há condutas no pedido, DEVE selecionar uma
        if (selectedSurgicalApproaches.length > 0 && (!manualAssociationApproachId || manualAssociationApproachId === "none")) {
          toast({
            title: "Selecione uma conduta",
            description: "É obrigatório associar o CID a uma conduta cirúrgica existente no pedido.",
            variant: "destructive",
            duration: 4000,
          });
          return;
        }

        // Verificar se há uma conduta selecionada para associação manual
        let manualApproachInfo: any = null;
        let targetProcedureId: number | null = null;
        let targetApproachId: number | null = null;
        
        if (manualAssociationApproachId && manualAssociationApproachId !== "none" && selectedSurgicalApproaches.length > 0) {
          // Formato da chave: "procedureId-surgicalApproachId"
          const [procedureIdStr, approachIdStr] = manualAssociationApproachId.split('-');
          targetProcedureId = parseInt(procedureIdStr);
          targetApproachId = parseInt(approachIdStr);
          
          const selectedApproach = selectedSurgicalApproaches.find(
            (a: any) => a.surgicalProcedureId === targetProcedureId && a.surgicalApproachId === targetApproachId
          );
          if (selectedApproach) {
            manualApproachInfo = {
              sourceApproachId: selectedApproach.surgicalApproachId,
              sourceApproachName: selectedApproach.approachName,
              sourceProcedureId: selectedApproach.surgicalProcedureId,
              sourceProcedureName: selectedApproach.procedureName
            };
            console.log(`CID ${cidCodeItem.code} será associado manualmente à conduta: ${selectedApproach.approachName}`);
          }
        }
        
        // Verificar se o CID já existe NA MESMA CONDUTA
        // O mesmo CID pode existir em condutas diferentes
        // Dados já normalizados - usar apenas formato frontend (sourceApproachId/sourceProcedureId)
        const exists = multipleCids.some((item: any) => {
          if (item.cid.id !== cidCodeItem.id) return false;
          return item.sourceProcedureId === targetProcedureId && item.sourceApproachId === targetApproachId;
        });

        if (exists) {
          const condutaInfo = manualApproachInfo 
            ? ` na conduta "${manualApproachInfo.sourceProcedureName} → ${manualApproachInfo.sourceApproachName}"`
            : "";
          toast({
            title: "CID já adicionado",
            description: `${cidCodeItem.code} já foi adicionado${condutaInfo}.`,
            variant: "destructive",
          });
          return;
        }

        // Adicionar o CID (com ou sem conduta cirúrgica manual)
        const newCidItem = {
          cid: {
            id: cidCodeItem.id,
            code: cidCodeItem.code,
            description: cidCodeItem.description,
            category: cidCodeItem.category,
          },
          // Incluir informações de associação manual se houver
          ...(manualApproachInfo || {})
        };

        const updatedCids = [...multipleCids, newCidItem];
        setMultipleCids(updatedCids);

        console.log(`CID ${cidCodeItem.code} adicionado à interface. Será salvo ao finalizar o pedido.`);

        // Manter compatibilidade com CID único (usar o primeiro da lista)
        if (updatedCids.length === 1) {
          setCidCode(cidCodeItem.code);
          setCidDescription(cidCodeItem.description);
          setSelectedCidId(cidCodeItem.id);
        }

        const toastDescription = manualApproachInfo 
          ? `${cidCodeItem.code} adicionado e associado a "${manualApproachInfo.sourceApproachName}"!`
          : `${cidCodeItem.code} adicionado com sucesso!`;

        toast({
          title: "CID-10 adicionado",
          description: toastDescription,
          duration: 2000,
        });
      }
    } catch (error) {
      console.warn("Erro ao buscar condutas cirúrgicas associadas:", error);
      
      // Em caso de erro, adicionar o CID diretamente
      const newCidItem = {
        cid: {
          id: cidCodeItem.id,
          code: cidCodeItem.code,
          description: cidCodeItem.description,
          category: cidCodeItem.category,
        },
      };

      const updatedCids = [...multipleCids, newCidItem];
      setMultipleCids(updatedCids);

      toast({
        title: "CID-10 adicionado",
        description: `${cidCodeItem.code} adicionado (não foi possível verificar condutas cirúrgicas).`,
        duration: 2000,
      });
    }

    // Buscar procedimentos CBHPM associados e adicioná-los automaticamente
    try {
      const associatedProcedures = await fetchAssociatedProcedures(cidCodeItem.id);
      console.log(`Frontend - Procedimentos associados recebidos:`, associatedProcedures);
      
      if (associatedProcedures.length > 0) {
        // Adicionar procedimentos que não existem na lista atual
        const newProcedures: Array<{ procedure: Procedure; quantity: number }> = [];
        let isFirstProcedure = true;
        
        associatedProcedures.forEach((procedure: Procedure) => {
          console.log(`Frontend - Processando procedimento:`, procedure);
          // Verificar se o procedimento já existe na lista principal ou secundária
          const existsInMain = selectedProcedure?.id === procedure.id;
          const existsInSecondary = secondaryProcedures.some(
            sp => sp.procedure.id === procedure.id
          );
          
          console.log(`Frontend - Verificações para ${procedure.name}:`, {
            existsInMain,
            existsInSecondary,
            selectedProcedureId: selectedProcedure?.id,
            secondaryProceduresCount: secondaryProcedures.length,
            isFirstProcedure
          });
          
          if (!existsInMain && !existsInSecondary) {
            // Se não há procedimento principal selecionado, definir o primeiro como principal
            if (!selectedProcedure && isFirstProcedure) {
              console.log(`Frontend - Definindo como procedimento principal:`, procedure);
              
              // Reorganizar por porte para garantir que o procedimento de maior porte seja o principal
              const { newSelectedProcedure, newSecondaryProcedures } = reorganizeProceduresByPorte(
                procedure, // Primeiro procedimento como candidato
                secondaryProcedures
              );
              
              setSelectedProcedure(newSelectedProcedure);
              setSecondaryProcedures(newSecondaryProcedures);
              setProcedureQuantity(1);
              isFirstProcedure = false;
              
              // Salvar todos os procedimentos no banco
              setTimeout(() => {
                saveAllProceduresToDatabase().then(saveSuccess => {
                  if (saveSuccess) {
                    console.log(`Procedimento principal ${procedure.code} salvo no banco`);
                  } else {
                    console.error(`Erro ao salvar procedimento principal ${procedure.code}`);
                  }
                });
              }, 100); // Pequeno delay para garantir que o estado foi atualizado
            } else {
              // Adicionar aos procedimentos secundários
              console.log(`Frontend - Adicionando como procedimento secundário:`, procedure);
              newProcedures.push({
                procedure,
                quantity: 1
              });
            }
          } else {
            console.log(`Frontend - Procedimento já existe, pulando:`, procedure.name);
          }
        });
        
        console.log(`Frontend - Novos procedimentos a serem adicionados:`, newProcedures);
        
        // Adicionar novos procedimentos secundários à lista existente
        if (newProcedures.length > 0) {
          const updatedSecondaryProcedures = [...secondaryProcedures, ...newProcedures];
          console.log(`Frontend - Atualizando procedimentos secundários:`, updatedSecondaryProcedures);
          setSecondaryProcedures(updatedSecondaryProcedures);
        }

        toast({
          title: "CID-10 e procedimentos adicionados",
          description: `${cidCodeItem.code} adicionado com ${associatedProcedures.length} procedimento(s) CBHPM associado(s)!`,
          duration: 3000,
        });
        console.log(`CID-10 e procedimentos adicionados: ${cidCodeItem.code} com ${associatedProcedures.length} procedimento(s)`);
      } else {
        toast({
          title: "CID-10 adicionado",
          description: `${cidCodeItem.code} adicionado com sucesso!`,
          duration: 2000,
        });
        console.log(`CID-10 adicionado: ${cidCodeItem.code}`);
      }
    } catch (error) {
      console.warn("Erro ao buscar procedimentos associados:", error);
      toast({
        title: "CID-10 adicionado",
        description: `${cidCodeItem.code} adicionado, mas não foi possível carregar procedimentos associados.`,
        duration: 2000,
      });
      console.log(`CID-10 adicionado com erro: ${cidCodeItem.code}`);
    }

    // Limpar seleção atual e campo de busca para permitir nova seleção
    setCurrentCid(null);
    setSearchTerm("");
    setOpen(false);
  };

  // Função para adicionar o CID atual à lista de múltiplos CIDs
  const handleAddCid = () => {
    if (currentCid) {
      // Verificar se há uma conduta selecionada para associação manual
      let manualApproachInfo: any = null;
      let targetProcedureId: number | null = null;
      let targetApproachId: number | null = null;
      
      if (manualAssociationApproachId && manualAssociationApproachId !== "none" && selectedSurgicalApproaches.length > 0) {
        const [procedureIdStr, approachIdStr] = manualAssociationApproachId.split('-');
        targetProcedureId = parseInt(procedureIdStr);
        targetApproachId = parseInt(approachIdStr);
        
        const selectedApproach = selectedSurgicalApproaches.find(
          (a: any) => a.surgicalProcedureId === targetProcedureId && a.surgicalApproachId === targetApproachId
        );
        if (selectedApproach) {
          manualApproachInfo = {
            sourceApproachId: selectedApproach.surgicalApproachId,
            sourceApproachName: selectedApproach.approachName,
            sourceProcedureId: selectedApproach.surgicalProcedureId,
            sourceProcedureName: selectedApproach.procedureName
          };
        }
      }
      
      // Verificar se o CID já existe NA MESMA CONDUTA
      // O mesmo CID pode existir em condutas diferentes
      // Dados já normalizados - usar apenas formato frontend (sourceApproachId/sourceProcedureId)
      const exists = multipleCids.some((item: any) => {
        if (item.cid.id !== currentCid.id) return false;
        return item.sourceProcedureId === targetProcedureId && item.sourceApproachId === targetApproachId;
      });

      if (exists) {
        const condutaInfo = manualApproachInfo 
          ? ` na conduta "${manualApproachInfo.sourceProcedureName} → ${manualApproachInfo.sourceApproachName}"`
          : "";
        toast({
          title: "CID já adicionado",
          description: `Este código CID-10 já foi adicionado${condutaInfo}.`,
          variant: "destructive",
        });
        return;
      }

      // Adicionar o CID à lista (com informações de associação manual se houver)
      setMultipleCids([
        ...multipleCids,
        {
          cid: currentCid,
          ...(manualApproachInfo || {})
        },
      ]);

      // Feedback para o usuário
      const toastDescription = manualApproachInfo 
        ? `${currentCid.code} adicionado e associado a "${manualApproachInfo.sourceApproachName}"!`
        : `${currentCid.code} - ${currentCid.description} adicionado à lista.`;
      toast({
        title: "CID adicionado",
        description: toastDescription,
      });
    }
  };

  // Função para remover um CID da lista e sua conduta cirúrgica associada
  const handleRemoveCid = async (index: number) => {
    const newCids = [...multipleCids];
    const removedCid = newCids[index];
    newCids.splice(index, 1);
    setMultipleCids(newCids);

    console.log(`CID ${removedCid.cid.code} removido da interface. Será persistido ao salvar o pedido.`);

    // Se este CID tem uma conduta cirúrgica associada, removê-la do banco
    // Formato normalizado: usar sourceApproachId em vez de surgicalApproach.id
    const approachId = removedCid.sourceApproachId;
    const approachName = removedCid.sourceApproachName;
    
    if (approachId && orderId) {
      // IMPORTANTE: Capturar o approach ANTES de qualquer mutação de estado
      const approachToRemove = selectedSurgicalApproaches.find(
        a => a.surgicalApproachId === approachId
      );
      const procedureNameForCleanup = approachToRemove?.procedureName;
      const approachNameForCleanup = approachToRemove?.approachName || approachName;
      
      try {
        const response = await fetch(`/api/medical-order-surgical-approaches`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            medicalOrderId: orderId,
            surgicalApproachId: approachId
          })
        });

        if (response.ok) {
          console.log(`Conduta cirúrgica ${approachName} removida do banco`);
          
          // Remover observações da conduta que está sendo removida (usando dados capturados antes)
          if (procedureNameForCleanup && approachNameForCleanup) {
            removeObservationSectionsForApproach(
              procedureNameForCleanup,
              approachNameForCleanup,
              cbhpmAdditionalNotes,
              setCbhpmAdditionalNotes,
              opmeAdditionalNotes,
              setOpmeAdditionalNotes,
              supplierAdditionalNotes,
              setSupplierAdditionalNotes
            );
          }
          
          // Remover também do estado local de condutas cirúrgicas do componente pai
          setSelectedSurgicalApproaches(prev => 
            prev.filter(approach => approach.surgicalApproachId !== approachId)
          );
        }
      } catch (error) {
        console.error("Erro ao remover conduta cirúrgica do banco:", error);
      }
    }

    // Buscar procedimentos associados ao CID removido para removê-los também
    try {
      const associatedProcedures = await fetchAssociatedProcedures(removedCid.cid.id);
      
      if (associatedProcedures.length > 0) {
        // Remover procedimentos associados da lista principal e secundária
        let removedMainProcedure = false;
        let removedSecondaryCount = 0;
        
        // Verificar se o procedimento principal está associado ao CID removido
        if (selectedProcedure && associatedProcedures.some(proc => proc.id === selectedProcedure.id)) {
          setSelectedProcedure(null);
          setProcedureQuantity(1);
          removedMainProcedure = true;
        }
        
        // Remover procedimentos secundários associados
        const filteredSecondaryProcedures = secondaryProcedures.filter(sp => {
          const shouldKeep = !associatedProcedures.some(proc => proc.id === sp.procedure.id);
          if (!shouldKeep) removedSecondaryCount++;
          return shouldKeep;
        });
        
        setSecondaryProcedures(filteredSecondaryProcedures);
        
        // Feedback detalhado para o usuário
        const proceduresRemovedMessage = [];
        if (removedMainProcedure) proceduresRemovedMessage.push("1 procedimento principal");
        if (removedSecondaryCount > 0) proceduresRemovedMessage.push(`${removedSecondaryCount} procedimento(s) secundário(s)`);
        
        if (proceduresRemovedMessage.length > 0) {
          toast({
            title: "CID e procedimentos removidos",
            description: `${removedCid.cid.code} removido junto com ${proceduresRemovedMessage.join(" e ")}.`,
            duration: 3000,
          });
        } else {
          toast({
            title: "CID removido",
            description: `${removedCid.cid.code} - ${removedCid.cid.description} removido da lista.`,
          });
        }
      } else {
        toast({
          title: "CID removido",
          description: `${removedCid.cid.code} - ${removedCid.cid.description} removido da lista.`,
        });
      }
    } catch (error) {
      console.warn("Erro ao buscar procedimentos para remoção:", error);
      toast({
        title: "CID removido",
        description: `${removedCid.cid.code} - ${removedCid.cid.description} removido da lista.`,
      });
    }

    // Atualizar compatibilidade com CID único se a lista ficar vazia
    if (newCids.length === 0) {
      setCidCode("");
      setCidDescription("");
      setSelectedCidId(null);
    } else {
      // Manter compatibilidade com CID único (usar o primeiro da lista)
      const firstCid = newCids[0];
      setCidCode(firstCid.cid.code);
      setCidDescription(firstCid.cid.description);
      setSelectedCidId(firstCid.cid.id);
    }
  };

  // Função para salvar todos os procedimentos no banco (preservando ordem de adição)
  const saveAllProceduresToDatabase = async () => {
    if (!orderId) {
      console.warn("Não há orderId para salvar procedimentos");
      return false;
    }

    try {
      // Combinar todos os procedimentos (principal + secundários) em uma lista única
      // IMPORTANTE: Preservar ordem de adição para manter ordem dos blocos na visualização
      const allProcedures = [];
      
      // Adicionar procedimento principal se existir
      if (selectedProcedure) {
        allProcedures.push({
          procedure: selectedProcedure,
          quantity: procedureQuantity
        });
      }
      
      // Adicionar procedimentos secundários (na ordem em que foram adicionados)
      secondaryProcedures.forEach(item => {
        allProcedures.push({
          procedure: item.procedure,
          quantity: item.quantity
        });
      });

      // Encontrar o índice do procedimento de maior porte para marcar como principal
      // SEM reordenar o array (preservar ordem de adição)
      let mainProcedureIndex = 0;
      let maxPorteValue = 0;
      allProcedures.forEach((item, index) => {
        const porteValue = parsePorteValue(item.procedure.porte);
        if (porteValue > maxPorteValue) {
          maxPorteValue = porteValue;
          mainProcedureIndex = index;
        }
      });

      // Marcar o de maior porte como principal, mantendo ordem de adição
      const proceduresToSave = allProcedures.map((item, index) => ({
        procedureId: item.procedure.id,
        quantityRequested: item.quantity,
        isMain: index === mainProcedureIndex // Maior porte é o principal, mas ordem preservada
      }));

      console.log(`Salvando ${proceduresToSave.length} procedimentos para o pedido ${orderId}:`, proceduresToSave);
      
      const response = await fetch(`/api/orders/${orderId}/procedures`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ procedures: proceduresToSave })
      });

      if (!response.ok) {
        throw new Error(`Erro ao salvar procedimentos: ${response.status}`);
      }

      console.log(`Todos os procedimentos salvos com sucesso no banco`);
      return true;
    } catch (error) {
      console.error("Erro ao salvar procedimentos no banco:", error);
      return false;
    }
  };

  // Handlers para procedimentos secundários
  const handleAddSecondaryProcedure = async () => {
    if (currentSecondaryProcedure) {
      // VALIDAÇÃO OBRIGATÓRIA: Se há condutas no pedido, DEVE selecionar uma
      if (selectedSurgicalApproaches.length > 0 && (!manualAssociationApproachId || manualAssociationApproachId === "none")) {
        toast({
          title: "Selecione uma conduta",
          description: "É obrigatório associar o procedimento CBHPM a uma conduta cirúrgica existente no pedido.",
          variant: "destructive",
          duration: 4000,
        });
        return;
      }

      // Verificar se há uma conduta selecionada para associação manual
      let manualApproachInfo: any = null;
      let targetProcedureId: number | null = null;
      let targetApproachId: number | null = null;
      
      if (manualAssociationApproachId && manualAssociationApproachId !== "none" && selectedSurgicalApproaches.length > 0) {
        // Formato da chave: "procedureId-surgicalApproachId"
        const [procedureIdStr, approachIdStr] = manualAssociationApproachId.split('-');
        targetProcedureId = parseInt(procedureIdStr);
        targetApproachId = parseInt(approachIdStr);
        
        const selectedApproach = selectedSurgicalApproaches.find(
          (a: any) => a.surgicalProcedureId === targetProcedureId && a.surgicalApproachId === targetApproachId
        );
        if (selectedApproach) {
          manualApproachInfo = {
            sourceApproachId: selectedApproach.surgicalApproachId,
            sourceApproachName: selectedApproach.approachName,
            sourceProcedureId: selectedApproach.surgicalProcedureId,
            sourceProcedureName: selectedApproach.procedureName
          };
          console.log(`Procedimento ${currentSecondaryProcedure.name} será associado manualmente à conduta: ${selectedApproach.approachName}`);
        }
      }
      
      // Verificar se o procedimento já existe NA MESMA CONDUTA
      // O mesmo procedimento CBHPM pode existir em condutas diferentes
      const exists = secondaryProcedures.some(
        (item) => item.procedure.id === currentSecondaryProcedure.id &&
                  item.procedure.sourceProcedureId === targetProcedureId &&
                  item.procedure.sourceApproachId === targetApproachId
      );

      if (exists) {
        const condutaInfo = manualApproachInfo 
          ? ` na conduta "${manualApproachInfo.sourceProcedureName} → ${manualApproachInfo.sourceApproachName}"`
          : "";
        toast({
          title: "Procedimento já adicionado",
          description: `Este procedimento CBHPM já foi adicionado${condutaInfo}.`,
          variant: "destructive",
        });
        return;
      }

      // Adicionar o procedimento à lista (com informações de associação manual se houver)
      const procedureToAdd = {
        procedure: {
          ...currentSecondaryProcedure,
          ...(manualApproachInfo || {})
        },
        quantity: currentSecondaryQuantity,
      };
      
      const updatedProcedures = [
        ...secondaryProcedures,
        procedureToAdd,
      ];
      
      setSecondaryProcedures(updatedProcedures);

      // Salvar todos os procedimentos no banco de dados imediatamente
      const saveSuccess = await saveAllProceduresToDatabase();
      if (saveSuccess) {
        console.log(`Procedimento secundário ${currentSecondaryProcedure.name} salvo no banco com sucesso`);
      } else {
        console.error(`Erro ao salvar procedimento secundário ${currentSecondaryProcedure.name} no banco`);
      }

      // Resetar os campos (lateralidade removida)
      setCurrentSecondaryProcedure(null);
      setCurrentSecondaryQuantity(1);
    }
  };

  // Função para calcular o valor numérico do porte para ordenação
  const parsePorteValue = (porte: string | null | undefined): number => {
    if (!porte) return 0;
    
    // Extrair número e letra do porte (ex: "10C" -> número: 10, letra: "C")
    const match = porte.match(/^(\d+)([A-Za-z]?)$/);
    if (!match) return 0;
    
    const numero = parseInt(match[1], 10);
    const letra = match[2]?.toUpperCase() || 'A';
    
    // Converter letra para valor numérico (A=1, B=2, C=3, etc.)
    const valorLetra = letra.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
    
    // Retornar valor combinado: (número * 100) + valor da letra
    // Isso garante que 11D > 10C > 10B > 9A
    return (numero * 100) + valorLetra;
  };

  const handleRemoveSecondaryProcedure = async (index: number) => {
    const newProcedures = [...secondaryProcedures];
    const removedProcedure = newProcedures[index];
    newProcedures.splice(index, 1);
    setSecondaryProcedures(newProcedures);

    // Salvar todos os procedimentos no banco de dados imediatamente
    const saveSuccess = await saveAllProceduresToDatabase();
    if (saveSuccess) {
      console.log(`Procedimento secundário ${removedProcedure.procedure.name} removido do banco com sucesso`);
    } else {
      console.error(`Erro ao remover procedimento secundário ${removedProcedure.procedure.name} do banco`);
    }

    toast({
      title: "Procedimento removido",
      description: `${removedProcedure.procedure.name} removido da lista`,
    });
  };

  // Função para atualizar a quantidade de um procedimento específico
  const handleUpdateProcedureQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return; // Não permitir quantidades menores que 1
    
    const updatedProcedures = [...secondaryProcedures];
    updatedProcedures[index] = {
      ...updatedProcedures[index],
      quantity: newQuantity
    };
    setSecondaryProcedures(updatedProcedures);
  };

  return (
    <>
      <Card className="mb-6 bg-popover border-border shadow-md text-foreground">
      <CardContent className="pt-6">
        <div className="space-y-6">

          {/* Seção para Seleção de Procedimentos Cirúrgicos */}
          <div className="mb-6 text-foreground mt-6" data-testid="surgery-procedure-selection">
            <div className="bg-card/70 border border-border rounded-md shadow-md overflow-hidden">
              {/* Cabeçalho com fundo azul claro */}
              <div className="bg-medsync-blue px-4 py-3">
                <div className="flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-white" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Procedimentos Cirúrgicos
                      <span className="text-red-300 ml-1">*</span>
                    </h3>
                  </div>
                </div>
              </div>
              
              {/* Conteúdo com fundo card */}
              <div className="p-5">
                <div className="space-y-4">
            
            {/* Campo de busca filtrada para procedimentos cirúrgicos */}
            <div className="mb-4">
              <Popover open={surgicalProcedureSearchOpen} onOpenChange={setSurgicalProcedureSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={surgicalProcedureSearchOpen}
                    className="combobox-medsync"
                    onClick={fetchAllSurgicalProcedures}
                  >
                    <span className={surgicalProcedureSearchTerm ? "combobox-value" : "combobox-placeholder"}>
                      {surgicalProcedureSearchTerm ? surgicalProcedureSearchTerm : "Selecione os procedimentos cirúrgicos apropriados baseados na região anatômica e no diagnóstico"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 bg-popover border-border shadow-md" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                  <Command className="bg-popover text-popover-foreground">
                    <CommandInput
                      placeholder="Digite para filtrar procedimentos..."
                      value={surgicalProcedureSearchTerm}
                      onValueChange={setSurgicalProcedureSearchTerm}
                      className="bg-background text-foreground border-input placeholder:text-muted-foreground"
                    />
                    <CommandList className="text-popover-foreground bg-popover max-h-[300px]">
                      <CommandEmpty>
                        {surgicalProcedureLoading ? (
                          <div className="py-6 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <p className="py-3 px-4 text-sm text-center text-muted-foreground">
                            Nenhum procedimento encontrado
                          </p>
                        )}
                      </CommandEmpty>

                      {/* Mostrar procedimentos disponíveis da região selecionada primeiro */}
                      {availableProceduresFromRegion.length > 0 && (
                        <CommandGroup
                          heading="Procedimentos da Região Selecionada"
                          className="text-accent"
                        >
                          {availableProceduresFromRegion
                            .filter(procedure => 
                              procedure.name.toLowerCase().includes(surgicalProcedureSearchTerm.toLowerCase()) ||
                              (procedure.description && procedure.description.toLowerCase().includes(surgicalProcedureSearchTerm.toLowerCase()))
                            )
                            .map((procedure) => (
                            <CommandItem
                              key={`region-${procedure.id}`}
                              value={procedure.name}
                              onSelect={() => handleSelectSurgicalProcedure(procedure)}
                              className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent-light border-l-2 border-accent"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-foreground">
                                  {procedure.name}
                                </div>
                                {procedure.description && (
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {procedure.description}
                                  </div>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}

                      {/* Mostrar todos os procedimentos disponíveis */}
                      {allSurgicalProcedures.length > 0 && (
                        <CommandGroup
                          heading="Todos os Procedimentos"
                          className="text-muted-foreground"
                        >
                          {allSurgicalProcedures
                            .filter(procedure => 
                              procedure.name.toLowerCase().includes(surgicalProcedureSearchTerm.toLowerCase()) ||
                              (procedure.description && procedure.description.toLowerCase().includes(surgicalProcedureSearchTerm.toLowerCase()))
                            )
                            .map((procedure) => (
                            <CommandItem
                              key={`all-${procedure.id}`}
                              value={procedure.name}
                              onSelect={() => handleSelectSurgicalProcedure(procedure)}
                              className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent-light"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-foreground">
                                  {procedure.name}
                                </div>
                                {procedure.description && (
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {procedure.description}
                                  </div>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Lista de procedimentos selecionados com suas condutas clínicas */}
            {selectedSurgicalProcedures && selectedSurgicalProcedures.length > 0 && (
              <div className="space-y-3" data-testid="surgery-procedures-list">
                <p className="text-sm text-muted-foreground mb-3">
                  Procedimentos selecionados:
                </p>
                
                <div className="space-y-4">
                  {selectedSurgicalProcedures.map((procedure) => (
                    <div
                      key={procedure.id}
                      className="p-4 bg-accent/30 rounded-lg border border-border/50"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="font-medium text-foreground">
                            {procedure.name}
                          </div>
                          {procedure.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {procedure.description}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive-foreground hover:bg-destructive/20"
                          onClick={async () => {
                            // 🎯 REMOÇÃO SELETIVA: Remover apenas associações específicas do procedimento
                            const procedureToRemove = procedure;
                            const remainingProcedures = selectedSurgicalProcedures.filter(p => p.id !== procedure.id);
                            
                            console.log(`🎯 Iniciando remoção seletiva do procedimento ${procedureToRemove.name} (ID: ${procedureToRemove.id})`);
                            console.log(`📊 Procedimentos restantes:`, remainingProcedures.map(p => p.name));
                            
                            // 1. Remover o procedimento da lista
                            setSelectedSurgicalProcedures(remainingProcedures);
                            
                            // 2. Remover condutas cirúrgicas associadas apenas a este procedimento
                            // e também remover as observações correspondentes
                            const approachesToRemove = selectedSurgicalApproaches.filter(
                              approach => approach.surgicalProcedureId === procedureToRemove.id
                            );
                            
                            // Remover observações de cada conduta que será removida
                            approachesToRemove.forEach(approach => {
                              removeObservationSectionsForApproach(
                                approach.procedureName || procedureToRemove.name,
                                approach.approachName,
                                cbhpmAdditionalNotes,
                                setCbhpmAdditionalNotes,
                                opmeAdditionalNotes,
                                setOpmeAdditionalNotes,
                                supplierAdditionalNotes,
                                setSupplierAdditionalNotes
                              );
                            });
                            
                            setSelectedSurgicalApproaches(prev => {
                              const filteredApproaches = prev.filter(approach => 
                                approach.surgicalProcedureId !== procedureToRemove.id
                              );
                              console.log(`🗑️ Condutas removidas do procedimento ${procedureToRemove.id}:`, 
                                prev.filter(a => a.surgicalProcedureId === procedureToRemove.id).map(a => a.approachName)
                              );
                              return filteredApproaches;
                            });
                            
                            // 3. Buscar associações específicas do procedimento via API para remoção seletiva
                            try {
                              // Buscar CIDs, CBHPM, OPME e fornecedores específicos do procedimento removido
                              const [cidsResponse, cbhpmResponse, opmeResponse, suppliersResponse] = await Promise.all([
                                fetch(`/api/surgical-procedures/${procedureToRemove.id}/cids`),
                                fetch(`/api/surgical-procedures/${procedureToRemove.id}/cbhpm`),
                                fetch(`/api/surgical-procedures/${procedureToRemove.id}/opme`),
                                fetch(`/api/surgical-procedures/${procedureToRemove.id}/suppliers`)
                              ]);
                              
                              const procedureCids = cidsResponse.ok ? await cidsResponse.json() : [];
                              const procedureCbhpm = cbhpmResponse.ok ? await cbhpmResponse.json() : [];
                              const procedureOpme = opmeResponse.ok ? await opmeResponse.json() : [];
                              const procedureSuppliers = suppliersResponse.ok ? await suppliersResponse.json() : [];
                              
                              console.log(`🔍 Dados específicos do procedimento ${procedureToRemove.name}:`, {
                                cids: procedureCids.length,
                                cbhpm: procedureCbhpm.length,
                                opme: procedureOpme.length,
                                suppliers: procedureSuppliers.length
                              });
                              
                              console.log(`📊 CIDs do procedimento ${procedureToRemove.name}:`, 
                                procedureCids.map(c => c.cid?.code || c.code)
                              );
                              
                              console.log(`📊 Estado atual dos CIDs antes da remoção:`, 
                                multipleCids.map(c => c.cid?.code || c.code)
                              );
                              console.log(`📊 Total de CIDs no estado:`, multipleCids.length);
                              console.log(`📊 Detalhes completos dos CIDs atuais:`, multipleCids);
                              
                              // 4. Remover CIDs específicos do procedimento removido (verificando sobreposição)
                              if (remainingProcedures.length > 0) {
                                // Buscar CIDs de todos os procedimentos restantes para evitar remoção indevida
                                const remainingCidsPromises = remainingProcedures.map(proc => 
                                  fetch(`/api/surgical-procedures/${proc.id}/cids`).then(res => res.ok ? res.json() : [])
                                );
                                
                                const allRemainingCids = await Promise.all(remainingCidsPromises);
                                const remainingCidCodes = new Set();
                                
                                allRemainingCids.flat().forEach((item: any) => {
                                  remainingCidCodes.add(item.cid?.code || item.code);
                                });
                                
                                console.log(`🔍 CIDs que devem ser preservados (outros procedimentos):`, Array.from(remainingCidCodes));
                                
                                setMultipleCids(prev => {
                                  const procedureCidCodes = procedureCids.map((item: any) => item.cid?.code || item.code);
                                  
                                  // Remover apenas os CIDs que são exclusivos do procedimento removido
                                  const exclusiveCidsToRemove = procedureCidCodes.filter(code => 
                                    !remainingCidCodes.has(code)
                                  );
                                  
                                  const filteredCids = prev.filter(cidItem => {
                                    const cidCode = cidItem.cid?.code || cidItem.code;
                                    return !exclusiveCidsToRemove.includes(cidCode);
                                  });
                                  
                                  console.log(`🗑️ CIDs exclusivos removidos:`, exclusiveCidsToRemove);
                                  console.log(`✅ CIDs preservados (compartilhados):`, 
                                    procedureCidCodes.filter(code => remainingCidCodes.has(code))
                                  );
                                  
                                  return filteredCids;
                                });
                              } else {
                                // Se não há procedimentos restantes, remover todos os CIDs
                                setMultipleCids([]);
                                console.log(`🗑️ Todos os CIDs removidos - nenhum procedimento restante`);
                              }
                              
                              // 5. Remover CBHPM específicos do procedimento (verificando sobreposição)
                              if (remainingProcedures.length > 0) {
                                // Buscar CBHPMs de todos os procedimentos restantes
                                const remainingCbhpmPromises = remainingProcedures.map(proc => 
                                  fetch(`/api/surgical-procedures/${proc.id}/cbhpm`).then(res => res.ok ? res.json() : [])
                                );
                                
                                const allRemainingCbhpm = await Promise.all(remainingCbhpmPromises);
                                const remainingCbhpmCodes = new Set();
                                
                                allRemainingCbhpm.flat().forEach((item: any) => {
                                  remainingCbhpmCodes.add(item.cbhpm?.code || item.code);
                                });
                                
                                console.log(`🔍 CBHPMs que devem ser preservados (outros procedimentos):`, Array.from(remainingCbhpmCodes));
                                
                                const procedureCbhpmCodes = procedureCbhpm.map((item: any) => item.cbhpm?.code || item.code);
                                const exclusiveCbhpmToRemove = procedureCbhpmCodes.filter(code => 
                                  !remainingCbhpmCodes.has(code)
                                );
                                
                                // Verificar se o procedimento principal deve ser removido (apenas se exclusivo)
                                if (selectedProcedure && exclusiveCbhpmToRemove.includes(selectedProcedure.code)) {
                                  if (setSelectedProcedure) setSelectedProcedure(null);
                                  if (setProcedureQuantity) setProcedureQuantity(1);
                                  console.log(`🗑️ Procedimento principal removido (exclusivo): ${selectedProcedure.code}`);
                                } else if (selectedProcedure && procedureCbhpmCodes.includes(selectedProcedure.code)) {
                                  console.log(`✅ Procedimento principal preservado (compartilhado): ${selectedProcedure.code}`);
                                }
                                
                                // Remover procedimentos secundários específicos (apenas exclusivos)
                                setSecondaryProcedures(prev => {
                                  const filteredSecondary = prev.filter(secProc => {
                                    const code = secProc.procedure?.code || secProc.code;
                                    return !exclusiveCbhpmToRemove.includes(code);
                                  });
                                  
                                  const removedSecondary = prev.filter(sp => {
                                    const code = sp.procedure?.code || sp.code;
                                    return exclusiveCbhpmToRemove.includes(code);
                                  });
                                  
                                  console.log(`🗑️ Procedimentos secundários exclusivos removidos:`, 
                                    removedSecondary.map(sp => sp.procedure?.code || sp.code)
                                  );
                                  
                                  return filteredSecondary;
                                });
                                
                                console.log(`✅ CBHPMs preservados (compartilhados):`, 
                                  procedureCbhpmCodes.filter(code => remainingCbhpmCodes.has(code))
                                );
                              } else {
                                // Se não há procedimentos restantes, remover todos os CBHPMs
                                if (setSelectedProcedure) setSelectedProcedure(null);
                                if (setProcedureQuantity) setProcedureQuantity(1);
                                if (setSecondaryProcedures) setSecondaryProcedures([]);
                                console.log(`🗑️ Todos os CBHPMs removidos - nenhum procedimento restante`);
                              }
                              
                              // 6. Remover itens OPME específicos do procedimento usando sourceProcedureId
                              // (Usa o mesmo padrão da inserção - filtra por sourceProcedureId diretamente)
                              if (setSelectedOpmeItems) {
                                setSelectedOpmeItems(prev => {
                                  const filteredOpme = prev.filter(opmeItem => {
                                    // Preservar itens que NÃO são do procedimento removido
                                    const itemSourceProcedureId = opmeItem.item?.sourceProcedureId || opmeItem.sourceProcedureId;
                                    return itemSourceProcedureId !== procedureToRemove.id;
                                  });
                                  
                                  const removedOpme = prev.filter(opmeItem => {
                                    const itemSourceProcedureId = opmeItem.item?.sourceProcedureId || opmeItem.sourceProcedureId;
                                    return itemSourceProcedureId === procedureToRemove.id;
                                  });
                                  
                                  console.log(`🗑️ Itens OPME removidos (sourceProcedureId=${procedureToRemove.id}):`, 
                                    removedOpme.map(o => o.item?.technicalName || o.technicalName)
                                  );
                                  console.log(`✅ Itens OPME preservados (outros procedimentos):`, 
                                    filteredOpme.map(o => o.item?.technicalName || o.technicalName)
                                  );
                                  
                                  return filteredOpme;
                                });
                              }
                              
                              // 7. Remover fornecedores específicos do procedimento usando sourceProcedureId
                              // (Usa o mesmo padrão da inserção - filtra por sourceProcedureId diretamente)
                              if (setSupplierDetails) {
                                const currentSuppliers = supplierDetails || [];
                                const filteredSuppliers = currentSuppliers.filter((supplier: any) => {
                                  // Preservar fornecedores que NÃO são do procedimento removido
                                  return supplier.sourceProcedureId !== procedureToRemove.id;
                                });
                                
                                const removedSuppliers = currentSuppliers.filter((supplier: any) => 
                                  supplier.sourceProcedureId === procedureToRemove.id
                                );
                                
                                console.log(`🗑️ Fornecedores removidos (sourceProcedureId=${procedureToRemove.id}):`, 
                                  removedSuppliers.map((s: any) => s.tradeName || s.companyName)
                                );
                                console.log(`✅ Fornecedores preservados (outros procedimentos):`, 
                                  filteredSuppliers.map((s: any) => s.tradeName || s.companyName)
                                );
                                
                                setSupplierDetails(filteredSuppliers);
                              }
                              
                              // 8. Se não há mais procedimentos, limpar justificativa
                              if (remainingProcedures.length === 0) {
                                if (setClinicalJustification) setClinicalJustification("");
                                console.log(`🗑️ Justificativa clínica limpa - nenhum procedimento restante`);
                              }
                              
                              console.log(`✅ Remoção seletiva concluída para ${procedureToRemove.name}`);
                              
                              toast({
                                title: "Procedimento removido",
                                description: `${procedureToRemove.name} e suas associações específicas foram removidas`,
                              });
                              
                            } catch (error) {
                              console.error('❌ Erro ao buscar dados específicos do procedimento:', error);
                              
                              // Fallback: remoção básica das condutas cirúrgicas
                              console.log(`🔄 Aplicando remoção básica para ${procedureToRemove.name}`);
                              
                              toast({
                                title: "Procedimento removido",
                                description: `${procedureToRemove.name} foi removido (condutas cirúrgicas)`,
                              });
                            }
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Seleção de Conduta Clínica para o procedimento */}
                      <div className="mt-3">
                        <ConductSelector 
                          procedureId={procedure.id}
                          procedureName={procedure.name}
                          orderId={orderId}
                          autoOpenModal={autoOpenConductModalForProcedureId === procedure.id}
                          onModalClose={() => setAutoOpenConductModalForProcedureId(null)}
                          setMultipleCids={setMultipleCids}
                          setSelectedProcedure={setSelectedProcedure}
                          selectedProcedure={selectedProcedure}
                          setProcedureQuantity={setProcedureQuantity}
                          setSecondaryProcedures={setSecondaryProcedures}
                          setSelectedOpmeItems={setSelectedOpmeItems}
                          setSupplierDetails={setSupplierDetails}
                          supplierDetails={selectedSuppliers}
                          setClinicalJustification={setClinicalJustification}
                          setSelectedSurgicalApproaches={setSelectedSurgicalApproaches}
                          selectedSurgicalApproaches={selectedSurgicalApproaches}
                          isEditMode={isEditMode}
                          setProcedureLaterality={setProcedureLaterality}
                          setProcedureType={setProcedureType}
                          cbhpmAdditionalNotes={cbhpmAdditionalNotes}
                          setCbhpmAdditionalNotes={setCbhpmAdditionalNotes}
                          opmeAdditionalNotes={opmeAdditionalNotes}
                          setOpmeAdditionalNotes={setOpmeAdditionalNotes}
                          supplierAdditionalNotes={supplierAdditionalNotes}
                          setSupplierAdditionalNotes={setSupplierAdditionalNotes}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

                  <p className="text-xs text-muted-foreground mt-2">
                    Adicione os procedimentos necessários para a cirurgia.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Seção para Códigos CID-10 */}
          <div className="mb-6 text-foreground mt-6">
            <div className="bg-card/70 border border-border rounded-md shadow-md overflow-hidden">
              {/* Cabeçalho com fundo azul claro */}
              <div className="bg-medsync-blue px-4 py-3">
                <div className="flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-white" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Selecionar Códigos CID-10{" "}
                      <span className="text-red-300 ml-1">*</span>
                    </h3>
                  </div>
                </div>
              </div>
              
              {/* Conteúdo com fundo card */}
              <div className="p-5">
                <div className="space-y-4">
              
              {/* Dropdown para associação OBRIGATÓRIA à conduta - aparece quando há condutas selecionadas */}
              {selectedSurgicalApproaches.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex-shrink-0">
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                      Associar à conduta: <span className="text-red-500">*</span>
                    </span>
                  </div>
                  <Select
                    value={manualAssociationApproachId}
                    onValueChange={setManualAssociationApproachId}
                  >
                    <SelectTrigger className={`flex-1 h-9 text-sm ${!manualAssociationApproachId || manualAssociationApproachId === "none" ? 'border-amber-400' : 'border-green-500'}`}>
                      <SelectValue placeholder="Selecione uma conduta (obrigatório)" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedSurgicalApproaches.map((approach: any, index: number) => (
                        <SelectItem 
                          key={`cid-approach-${approach.surgicalProcedureId}-${approach.surgicalApproachId}-${index}`} 
                          value={`${approach.surgicalProcedureId}-${approach.surgicalApproachId}`}
                        >
                          {approach.procedureName} → {approach.approachName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(!manualAssociationApproachId || manualAssociationApproachId === "none") && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      Obrigatório
                    </span>
                  )}
                </div>
              )}

              <div className="w-full">
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="combobox-medsync"
                      disabled={isLoading}
                    >
                      <span className={isLoading ? "combobox-value" : "combobox-placeholder"}>
                        {isLoading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Carregando códigos CID-10...
                          </span>
                        ) : (
                          "Pesquise e selecione códigos CID-10"
                        )}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                    <PopoverContent
                      className="w-[400px] p-0 max-h-[400px] overflow-auto bg-popover border-border shadow-md"
                      align="start"
                    >
                      <Command className="bg-popover text-popover-foreground" shouldFilter={false}>
                        <CommandInput
                          placeholder="Pesquise por código ou descrição CID-10 na base de dados..."
                          value={searchTerm}
                          onValueChange={(value) => {
                            // Aplicar formatação automática se parecer ser um código CID-10
                            if (/^[A-Za-z][0-9]{3}$/.test(value.replace(/[^A-Za-z0-9]/g, ''))) {
                              const formatted = formatCidCode(value);
                              setSearchTerm(formatted);
                            } else {
                              setSearchTerm(value);
                            }
                          }}
                          className="bg-background text-foreground border-input placeholder:text-muted-foreground"
                        />
                        <CommandList className="text-popover-foreground bg-popover">
                          {isLoading ? (
                            <div className="py-6 flex justify-center items-center text-muted-foreground">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                              <span className="ml-2">
                                Consultando códigos CID-10 na tabela
                                cid_codes...
                              </span>
                            </div>
                          ) : (
                            <>
                              {cidCodes.length === 0 &&
                              searchTerm.length >= 2 ? (
                                <CommandEmpty className="text-muted-foreground">
                                  Nenhum CID-10 encontrado para "{searchTerm}".
                                </CommandEmpty>
                              ) : null}
                              {searchTerm && cidCodes.length > 0 ? (
                                <CommandGroup className="text-muted-foreground">
                                  {cidCodes.map((cid: CidCode) => (
                                    <CommandItem
                                      key={cid.code}
                                      value={`${cid.code} ${cid.description}`}
                                      onSelect={() => selectCid(cid)}
                                      className="cursor-pointer hover:bg-accent-light"
                                    >
                                      <strong className="text-muted-foreground">
                                        {cid.code}
                                      </strong>
                                      <span className="ml-2 text-foreground">
                                        {cid.description}
                                      </span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              ) : (
                                <>
                                  {CATEGORIES.map((category) => {
                                    const categoryCids =
                                      cidCodesByCategory[category] || [];

                                    if (categoryCids.length === 0) return null;

                                    return (
                                      <CommandGroup
                                        key={category}
                                        heading={category}
                                        className="text-muted-foreground"
                                      >
                                        {categoryCids.map((cid) => (
                                          <CommandItem
                                            key={cid.code}
                                            value={`${cid.code} ${cid.description}`}
                                            onSelect={() => selectCid(cid)}
                                            className="cursor-pointer hover:bg-accent-light"
                                          >
                                            <strong className="text-muted-foreground">
                                              {cid.code}
                                            </strong>
                                            <span className="ml-2 text-foreground">
                                              {cid.description}
                                            </span>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    );
                                  })}
                                </>
                              )}
                            </>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
              </div>

              {/* Lista de CIDs selecionados - Agrupados por Conduta Cirúrgica (Procedimento + Via de Acesso) */}
              <div className="mt-4">
                {multipleCids.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Códigos CID-10 Selecionados:
                    </h4>
                    <div className="space-y-4">
                      {(() => {
                        // Agrupar CIDs por conduta cirúrgica (Procedimento + Via de Acesso)
                        // Prioriza dados do backend (surgicalProcedure, surgicalApproach), com fallback para dados manuais (source*)
                        const groupedCids = multipleCids.reduce((acc: any, item: any, index: number) => {
                          // Buscar dados de associação do backend ou fallback para dados manuais
                          const procedureName = item.surgicalProcedure?.name || item.sourceProcedureName || null;
                          const approachName = item.surgicalApproach?.name || item.sourceApproachName || null;
                          const approachId = item.surgicalApproach?.id || item.sourceApproachId || null;
                          const procedureId = item.surgicalProcedure?.id || item.sourceProcedureId || null;
                          
                          // Criar chave de agrupamento baseada no procedimento e via de acesso
                          let groupKey: string;
                          let isManual = false;
                          
                          if (procedureId && approachId) {
                            // Tem associação completa: Procedimento + Via de Acesso
                            groupKey = `${procedureName} → ${approachName}`;
                          } else if (procedureId) {
                            // Só tem procedimento
                            groupKey = procedureName || 'Procedimento não especificado';
                          } else if (approachId) {
                            // Só tem via de acesso
                            groupKey = `Via: ${approachName}`;
                          } else {
                            // Adicionado manualmente ou sem associação
                            groupKey = 'Itens Gerais';
                            isManual = true;
                          }
                          
                          if (!acc[groupKey]) {
                            acc[groupKey] = {
                              items: [],
                              procedureId,
                              approachId,
                              isManual
                            };
                          }
                          acc[groupKey].items.push({ ...item, originalIndex: index });
                          return acc;
                        }, {});

                        const groupKeys = Object.keys(groupedCids);
                        
                        // Se só houver um grupo "Itens Gerais", mostrar sem agrupamento visual
                        if (groupKeys.length === 1 && groupKeys[0] === 'Itens Gerais') {
                          return multipleCids.map((item, index) => (
                            <div
                              key={index}
                              className="flex justify-between items-center rounded-md border border-border bg-accent/20 p-3"
                            >
                              <div>
                                <div className="font-medium text-muted-foreground">
                                  <span className="font-bold">{item.cid?.code || item.code}</span>{" "}
                                  - {item.cid?.description || item.description}
                                </div>
                                {(item.cid?.category || item.category) && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Categoria: {item.cid?.category || item.category}
                                  </div>
                                )}
                              </div>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRemoveCid(index)}
                              >
                                Remover
                              </Button>
                            </div>
                          ));
                        }

                        // Mostrar agrupado por conduta
                        return groupKeys.map((groupKey) => (
                          <div key={groupKey} className="border border-border rounded-lg overflow-hidden">
                            {/* Cabeçalho do grupo */}
                            <div className={`px-3 py-2 text-sm font-medium flex items-center ${
                              groupedCids[groupKey].isManual 
                                ? 'bg-muted/50 text-muted-foreground' 
                                : 'bg-medsync-blue/10 text-medsync-blue'
                            }`}>
                              {groupedCids[groupKey].isManual ? (
                                <span>📝 {groupKey}</span>
                              ) : (
                                <span>🔗 {groupKey}</span>
                              )}
                              <span className="ml-2 text-xs px-2 py-0.5 bg-background rounded-full">
                                {groupedCids[groupKey].items.length} CID{groupedCids[groupKey].items.length > 1 ? 's' : ''}
                              </span>
                            </div>
                            {/* Itens do grupo */}
                            <div className="divide-y divide-border">
                              {groupedCids[groupKey].items.map((item: any) => (
                                <div
                                  key={item.originalIndex}
                                  className="flex justify-between items-center bg-accent/10 p-3"
                                >
                                  <div>
                                    <div className="font-medium text-muted-foreground">
                                      <span className="font-bold">{item.cid?.code || item.code}</span>{" "}
                                      - {item.cid?.description || item.description}
                                      {(item.isAutoAdded || item.cid?.isAutoAdded) && (
                                        <span className="ml-2 px-2 py-1 bg-accent-light text-accent text-xs rounded-full">
                                          Automático
                                        </span>
                                      )}
                                    </div>
                                    {(item.cid?.category || item.category) && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Categoria: {item.cid?.category || item.category}
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleRemoveCid(item.originalIndex)}
                                  >
                                    Remover
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                ) : null}
              </div>

              <p className="text-xs text-muted-foreground mt-2">
                Adicione os códigos CID-10 correspondentes às condições médicas do paciente
              </p>
              {searchTerm &&
              searchTerm.length >= 2 &&
              cidCodes.length === 0 &&
              !isLoading ? (
                <p className="text-xs text-orange-300 mt-1">
                  Nenhum código CID-10 encontrado para "{searchTerm}". Tente
                  outros termos como "ombro", "joelho", etc.
                </p>
              ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Campo de Lateralidade da Cirurgia */}
          <div className="mb-6 text-foreground mt-6" data-testid="surgery-laterality">
            <div className="bg-card/70 border border-border rounded-md shadow-md overflow-hidden">
              {/* Cabeçalho com fundo azul claro */}
              <div className="bg-medsync-blue px-4 py-3">
                <div className="flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-white" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Lateralidade da Cirurgia{" "}
                      <span className="text-red-300 ml-1">*</span>
                    </h3>
                  </div>
                </div>
              </div>
              
              {/* Conteúdo com fundo card */}
              <div className="p-5">
            
            {/* Botões de lateralidade alinhados horizontalmente */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => {
                  setCirurgiaLateralidade("bilateral");
                  setProcedureLaterality("bilateral");
                }}
                className={`
                  px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 border-2
                  ${cirurgiaLateralidade === "bilateral"
                    ? "bg-medsync-blue border-medsync-light-gray text-white shadow-lg shadow-primary/30 scale-[1.02]"
                    : "bg-accent/30 border-medsync-light-gray text-muted-foreground hover:bg-accent-light hover:border-border"
                  }
                `}
              >
                Bilateral
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setCirurgiaLateralidade("direito");
                  setProcedureLaterality("direito");
                }}
                className={`
                  px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 border-2
                  ${cirurgiaLateralidade === "direito"
                    ? "bg-medsync-blue border-medsync-light-gray text-white shadow-lg shadow-primary/30 scale-[1.02]"
                    : "bg-accent/30 border-medsync-light-gray text-muted-foreground hover:bg-accent-light hover:border-border"
                  }
                `}
              >
                Direito
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setCirurgiaLateralidade("esquerdo");
                  setProcedureLaterality("esquerdo");
                }}
                className={`
                  px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 border-2
                  ${cirurgiaLateralidade === "esquerdo"
                    ? "bg-medsync-blue border-medsync-light-gray text-white shadow-lg shadow-primary/30 scale-[1.02]"
                    : "bg-accent/30 border-medsync-light-gray text-muted-foreground hover:bg-accent-light hover:border-border"
                  }
                `}
              >
                Esquerdo
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setCirurgiaLateralidade("nao_se_aplica");
                  setProcedureLaterality("nao_se_aplica");
                }}
                className={`
                  px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 border-2
                  ${cirurgiaLateralidade === "nao_se_aplica"
                    ? "bg-medsync-blue border-medsync-light-gray text-white shadow-lg shadow-primary/30 scale-[1.02]"
                    : "bg-accent/30 border-medsync-light-gray text-muted-foreground hover:bg-accent-light hover:border-border"
                  }
                `}
              >
                Não se aplica
              </button>
            </div>
            
                <p className="text-xs text-muted-foreground mt-2">
                  Selecione a lateralidade correspondente ao procedimento cirúrgico
                </p>
              </div>
            </div>
          </div>

          {/* Campo de Caráter do Procedimento */}
          <div className="mb-6 text-foreground mt-6" data-testid="surgery-character">
            <div className="bg-card/70 border border-border rounded-md shadow-md overflow-hidden">
              {/* Cabeçalho com fundo azul claro */}
              <div className="bg-medsync-blue px-4 py-3">
                <div className="flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-white" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Caráter do Procedimento{" "}
                      <span className="text-red-300 ml-1">*</span>
                    </h3>
                  </div>
                </div>
              </div>
              
              {/* Conteúdo com fundo card */}
              <div className="p-5">
            
            {/* Botões de caráter alinhados horizontalmente */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProcedureType(PROCEDURE_TYPE_VALUES.ELETIVA)}
                className={`
                  px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 border-2
                  ${procedureType === PROCEDURE_TYPE_VALUES.ELETIVA
                    ? "bg-medsync-blue border-medsync-light-gray text-white shadow-lg shadow-primary/30 scale-[1.02]"
                    : "bg-accent/30 border-medsync-light-gray text-muted-foreground hover:bg-accent-light hover:border-border"
                  }
                `}
              >
                {PROCEDURE_TYPES.ELETIVA}
              </button>
              
              <button
                type="button"
                onClick={() => setProcedureType(PROCEDURE_TYPE_VALUES.URGENCIA)}
                className={`
                  px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 border-2
                  ${procedureType === PROCEDURE_TYPE_VALUES.URGENCIA
                    ? "bg-medsync-blue border-medsync-light-gray text-white shadow-lg shadow-primary/30 scale-[1.02]"
                    : "bg-accent/30 border-medsync-light-gray text-muted-foreground hover:bg-accent-light hover:border-border"
                  }
                `}
              >
                {PROCEDURE_TYPES.URGENCIA}
              </button>
            </div>
            
                <p className="text-xs text-muted-foreground mt-2">
                  Selecione o caráter do procedimento cirúrgico
                </p>
              </div>
            </div>
          </div>

          {/* Procedimentos Cirúrgicos Necessários */}
          <div className="mb-6 text-foreground mt-6">
            <div className="bg-card/70 border border-border rounded-md shadow-md overflow-hidden">
              {/* Cabeçalho com fundo azul claro */}
              <div className="bg-medsync-blue px-4 py-3">
                <div className="flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-white" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Procedimentos Cirúrgicos Necessários
                    </h3>
                  </div>
                </div>
              </div>
              
              {/* Conteúdo com fundo card */}
              <div className="p-5">

              {/* Dropdown para associação OBRIGATÓRIA à conduta - aparece quando há condutas selecionadas */}
              {selectedSurgicalApproaches.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 mb-4">
                  <div className="flex-shrink-0">
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                      Associar à conduta: <span className="text-red-500">*</span>
                    </span>
                  </div>
                  <Select
                    value={manualAssociationApproachId}
                    onValueChange={setManualAssociationApproachId}
                  >
                    <SelectTrigger className={`flex-1 h-9 text-sm ${!manualAssociationApproachId || manualAssociationApproachId === "none" ? 'border-amber-400' : 'border-green-500'}`}>
                      <SelectValue placeholder="Selecione uma conduta (obrigatório)" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedSurgicalApproaches.map((approach: any, index: number) => (
                        <SelectItem 
                          key={`cbhpm-approach-${approach.surgicalProcedureId}-${approach.surgicalApproachId}-${index}`} 
                          value={`${approach.surgicalProcedureId}-${approach.surgicalApproachId}`}
                        >
                          {approach.procedureName} → {approach.approachName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(!manualAssociationApproachId || manualAssociationApproachId === "none") && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      Obrigatório
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-end md:space-x-3 space-y-3 md:space-y-0">
                  <div className="flex-grow">
                    <Label
                      htmlFor="secondaryProcedure"
                      className="mb-2 block text-sm text-foreground"
                    >
                      Procedimento CBHPM
                    </Label>
                    <Popover
                      open={secondaryProcedureSearchOpen}
                      onOpenChange={setSecondaryProcedureSearchOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          id="secondaryProcedure"
                          variant="outline"
                          role="combobox"
                          aria-expanded={secondaryProcedureSearchOpen}
                          className="combobox-medsync"
                        >
                          <span className="combobox-placeholder">
                            Pesquise e selecione procedimentos CBHPM
                          </span>
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[500px] p-0 bg-popover border-border shadow-md" align="start" side="bottom" sideOffset={4}>
                        <Command className="bg-popover text-popover-foreground" shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar procedimento por código ou descrição..."
                            value={procedureSearchTerm}
                            onValueChange={(value) => {
                              // Aplicar formatação automática se parecer ser um código CBHPM
                              const cleaned = value.replace(/[^0-9]/g, '');
                              // Se o valor digitado contém apenas números, aplicar formatação
                              if (cleaned.length >= 3 && value.replace(/[.\-]/g, '') === cleaned) {
                                const formatted = formatCbhpmCode(cleaned);
                                setProcedureSearchTerm(formatted);
                              } else {
                                setProcedureSearchTerm(value);
                              }
                            }}
                            className="bg-background text-foreground border-input placeholder:text-muted-foreground"
                          />
                          <CommandList className="text-popover-foreground bg-popover">
                            <CommandEmpty>
                              {procedureSearchTerm.length < 3 ? (
                                <p className="py-3 px-4 text-sm text-center text-muted-foreground">
                                  Digite pelo menos 3 caracteres para buscar
                                </p>
                              ) : procedureLoading ? (
                                <div className="py-6 flex items-center justify-center">
                                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                              ) : (
                                <p className="py-3 px-4 text-sm text-center text-muted-foreground">
                                  Nenhum procedimento encontrado
                                </p>
                              )}
                            </CommandEmpty>



                            {procedureResults.length > 0 && (
                              <CommandGroup
                                heading="Códigos CBHPM Encontrados"
                                className="text-muted-foreground"
                              >
                                {procedureResults.map((procedure) => (
                                  <CommandItem
                                    key={procedure.id}
                                    value={procedure.code + procedure.name}
                                    onSelect={() => {
                                      // Verificar se há uma conduta selecionada para associação manual
                                      let manualApproachInfo: any = null;
                                      if (manualAssociationApproachId && manualAssociationApproachId !== "none" && selectedSurgicalApproaches.length > 0) {
                                        // Formato da chave: "procedureId-surgicalApproachId"
                                        const [procedureIdStr, approachIdStr] = manualAssociationApproachId.split('-');
                                        const procedureId = parseInt(procedureIdStr);
                                        const approachId = parseInt(approachIdStr);
                                        
                                        const selectedApproach = selectedSurgicalApproaches.find(
                                          (a: any) => a.surgicalProcedureId === procedureId && a.surgicalApproachId === approachId
                                        );
                                        if (selectedApproach) {
                                          manualApproachInfo = {
                                            sourceApproachId: selectedApproach.surgicalApproachId,
                                            sourceApproachName: selectedApproach.approachName,
                                            sourceProcedureId: selectedApproach.surgicalProcedureId,
                                            sourceProcedureName: selectedApproach.procedureName
                                          };
                                        }
                                      }

                                      // Verificar se o mesmo CBHPM já existe NO MESMO BLOCO (mesma conduta)
                                      // Permitir o mesmo CBHPM em blocos diferentes (igual ao CID10)
                                      const existsInSameBlock = secondaryProcedures.some((item: any) => {
                                        if (item.procedure.id !== procedure.id) return false;
                                        
                                        // Se ambos são manuais (sem conduta), são duplicatas
                                        if (!item.procedure.sourceApproachId && !manualApproachInfo) return true;
                                        
                                        // Se um tem conduta e outro não, são blocos diferentes
                                        if (!item.procedure.sourceApproachId || !manualApproachInfo) return false;
                                        
                                        // Verificar se são do mesmo bloco (mesmo approach + procedure)
                                        return item.procedure.sourceApproachId === manualApproachInfo.sourceApproachId &&
                                               item.procedure.sourceProcedureId === manualApproachInfo.sourceProcedureId;
                                      });

                                      // Verificar também no procedimento principal
                                      // O procedimento principal pode ter os metadados de bloco ou não
                                      const existsAsMainInSameBlock = selectedProcedure && selectedProcedure.id === procedure.id && (() => {
                                        const mainApproachId = selectedProcedure.sourceApproachId;
                                        const mainProcedureId = selectedProcedure.sourceProcedureId;
                                        
                                        // Se ambos são manuais (sem conduta associada), são duplicatas
                                        if (!mainApproachId && !manualApproachInfo) return true;
                                        
                                        // Se um tem conduta e outro não, são blocos diferentes - permitir
                                        if (!mainApproachId && manualApproachInfo) return false;
                                        if (mainApproachId && !manualApproachInfo) return false;
                                        
                                        // Ambos têm conduta - verificar se é o mesmo bloco
                                        return mainApproachId === manualApproachInfo?.sourceApproachId &&
                                               mainProcedureId === manualApproachInfo?.sourceProcedureId;
                                      })();

                                      if (existsInSameBlock || existsAsMainInSameBlock) {
                                        toast({
                                          title: "Procedimento já adicionado neste bloco",
                                          description: "Este procedimento CBHPM já foi adicionado a esta conduta. Você pode adicioná-lo a uma conduta diferente.",
                                          variant: "destructive",
                                          duration: 4000,
                                        });
                                        setSecondaryProcedureSearchOpen(false);
                                        return;
                                      }

                                      // Adicionar automaticamente à lista com a quantidade atual
                                      const newProcedure = {
                                        procedure: {
                                          ...procedure,
                                          ...(manualApproachInfo || {})
                                        },
                                        quantity: currentSecondaryQuantity,
                                      };

                                      const updatedProcedures = [...secondaryProcedures, newProcedure];
                                      
                                      // Atualizar lista de procedimentos
                                      setSecondaryProcedures(updatedProcedures);

                                      // Salvar todos os procedimentos no banco de dados imediatamente
                                      saveAllProceduresToDatabase().then(saveSuccess => {
                                        if (saveSuccess) {
                                          console.log(`Procedimento ${procedure.code} salvo no banco com sucesso`);
                                        } else {
                                          console.error(`Erro ao salvar procedimento ${procedure.code} no banco`);
                                        }
                                      });

                                      // Limpar seleção e fechar popup
                                      setCurrentSecondaryProcedure(null);
                                      setCurrentSecondaryQuantity(1);
                                      setSecondaryProcedureSearchOpen(false);

                                      const toastDescription = manualApproachInfo 
                                        ? `${procedure.code} adicionado e associado a "${manualApproachInfo.sourceApproachName}"!`
                                        : `${procedure.code} adicionado com sucesso!`;

                                      toast({
                                        title: "Procedimento adicionado",
                                        description: toastDescription,
                                        duration: 2000,
                                      });
                                    }}
                                    className="cursor-pointer hover:bg-accent-light"
                                  >
                                    <div className="flex flex-col w-full">
                                      <div className="flex items-center gap-2">
                                        <strong className="text-muted-foreground">
                                          {procedure.code}
                                        </strong>
                                        {procedure.porte && (
                                          <span className="text-xs px-2 py-0.5 bg-accent/50 rounded text-muted-foreground">
                                            Porte {procedure.porte}
                                          </span>
                                        )}
                                      </div>
                                      <span className="ml-2 text-foreground">
                                        {procedure.name}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="w-24">
                    <Label
                      htmlFor="secondaryQuantity"
                      className="mb-2 block text-sm text-foreground"
                    >
                      Quantidade
                    </Label>
                    <Input
                      id="secondaryQuantity"
                      type="number"
                      min="1"
                      value={currentSecondaryQuantity}
                      onChange={(e) =>
                        setCurrentSecondaryQuantity(
                          parseInt(e.target.value) || 1,
                        )
                      }
                      className="w-full bg-card text-foreground border-border"
                    />
                  </div>

                  {/* Componente de lateralidade removido conforme solicitado */}
                </div>
              </div>

              {/* Lista unificada de todos os procedimentos - Agrupados por Conduta Cirúrgica */}
              <div className="mt-4">
                {(() => {
                  // Combinar procedimento principal com secundários (preservando ordem de adição)
                  const allProcedures: any[] = [];
                  
                  // Adicionar procedimento principal se existir
                  if (selectedProcedure) {
                    allProcedures.push({
                      procedure: selectedProcedure,
                      quantity: procedureQuantity,
                      isFromMain: true
                    });
                  }
                  
                  // Adicionar procedimentos secundários (na ordem em que foram adicionados)
                  secondaryProcedures.forEach(item => {
                    allProcedures.push({
                      procedure: item.procedure,
                      quantity: item.quantity,
                      isFromMain: false
                    });
                  });

                  // Encontrar qual é o procedimento de maior porte (para marcar como principal)
                  let maxPorteIndex = 0;
                  let maxPorteValue = 0;
                  allProcedures.forEach((item, index) => {
                    const porteValue = getPorteValue(item.procedure.porte);
                    if (porteValue > maxPorteValue) {
                      maxPorteValue = porteValue;
                      maxPorteIndex = index;
                    }
                  });

                  // Verificar se há agrupamento necessário (mais de uma conduta ou manuais + automáticos)
                  const hasGrouping = allProcedures.some(p => p.procedure.sourceApproachId);
                  
                  if (!hasGrouping) {
                    // Sem agrupamento - ordenar por porte para lista simples
                    const sortedProcedures = [...allProcedures].sort((a, b) => 
                      getPorteValue(b.procedure.porte) - getPorteValue(a.procedure.porte)
                    );
                    return sortedProcedures.length > 0 ? (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground">
                          Procedimentos Cirúrgicos Necessários ({sortedProcedures.length})
                        </h4>
                        <div className="space-y-2">
                          {sortedProcedures.map((item, index) => (
                            <div
                              key={`${item.procedure.id}-${item.isFromMain ? 'main' : 'secondary'}-${index}`}
                              className="flex items-center justify-between p-3 border border-border rounded-md bg-accent/30"
                            >
                              <div className="flex-grow">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-muted-foreground">
                                    {item.procedure.code} - {item.procedure.name}
                                  </span>
                                  {item.procedure.porte && (
                                    <span className="text-xs px-2 py-0.5 bg-accent/50 rounded-full text-muted-foreground">
                                      Porte: {item.procedure.porte}
                                    </span>
                                  )}
                                  {index === 0 && (
                                    <span className="text-xs px-2 py-0.5 bg-accent-light rounded-full text-accent">
                                      Procedimento Principal
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                                  <span>Auxiliares: {item.procedure.numeroAuxiliares || 0}</span>
                                  <span>Porte Anestesista: {item.procedure.porteAnestesista || "0"}</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-2">
                                  <div className="flex items-center space-x-1">
                                    <span className="text-xs font-medium text-muted-foreground">
                                      Qtd:
                                    </span>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={item.quantity ?? 1}
                                      onChange={(e) => {
                                        const newQuantity = parseInt(e.target.value) || 1;
                                        if (item.isFromMain) {
                                          setProcedureQuantity(newQuantity);
                                        } else {
                                          const secondaryIndex = secondaryProcedures.findIndex(sp => sp.procedure.id === item.procedure.id);
                                          if (secondaryIndex !== -1) {
                                            handleUpdateProcedureQuantity(secondaryIndex, newQuantity);
                                          }
                                        }
                                      }}
                                      className="w-16 h-8 text-xs bg-card text-foreground border-border"
                                    />
                                  </div>
                                </div>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    if (item.isFromMain) {
                                      setSelectedProcedure(null);
                                      setProcedureQuantity(1);
                                      saveAllProceduresToDatabase();
                                      toast({
                                        title: "Procedimento removido",
                                        description: `${item.procedure.name} removido da lista`,
                                      });
                                    } else {
                                      const secondaryIndex = secondaryProcedures.findIndex(sp => sp.procedure.id === item.procedure.id);
                                      if (secondaryIndex !== -1) {
                                        handleRemoveSecondaryProcedure(secondaryIndex);
                                      }
                                    }
                                  }}
                                >
                                  Remover
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  }

                  // Agrupar procedimentos por conduta cirúrgica de origem (preservando ordem de adição dos grupos)
                  // Usar Map para preservar ordem de inserção
                  const groupedProceduresMap = new Map<string, { items: any[], sourceApproachId: any, isManual: boolean }>();
                  allProcedures.forEach((item: any, index: number) => {
                    const groupKey = item.procedure.sourceApproachId 
                      ? `${item.procedure.sourceProcedureName || 'Procedimento'} → ${item.procedure.sourceApproachName}`
                      : 'Adicionado Manualmente';
                    
                    if (!groupedProceduresMap.has(groupKey)) {
                      groupedProceduresMap.set(groupKey, {
                        items: [],
                        sourceApproachId: item.procedure.sourceApproachId,
                        isManual: !item.procedure.sourceApproachId
                      });
                    }
                    groupedProceduresMap.get(groupKey)!.items.push({ ...item, originalIndex: index, isPrincipal: index === maxPorteIndex });
                  });

                  // Converter Map para array preservando ordem, com 'Adicionado Manualmente' no final
                  const groupEntries = Array.from(groupedProceduresMap.entries());
                  const manualEntry = groupEntries.find(([key]) => key === 'Adicionado Manualmente');
                  const otherEntries = groupEntries.filter(([key]) => key !== 'Adicionado Manualmente');
                  const orderedGroupEntries = manualEntry ? [...otherEntries, manualEntry] : otherEntries;

                  return allProcedures.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Procedimentos Cirúrgicos Necessários ({allProcedures.length})
                      </h4>
                      <div className="space-y-4">
                        {orderedGroupEntries.map(([groupKey, groupData]) => {
                          // Ordenar itens DENTRO de cada grupo por porte (maior para menor)
                          const sortedItems = [...groupData.items].sort((a, b) => 
                            getPorteValue(b.procedure.porte) - getPorteValue(a.procedure.porte)
                          );
                          return (
                          <div key={groupKey} className="border border-border rounded-lg overflow-hidden">
                            {/* Cabeçalho do grupo */}
                            <div className={`px-3 py-2 text-sm font-medium flex items-center ${
                              groupData.isManual 
                                ? 'bg-muted/50 text-muted-foreground' 
                                : 'bg-medsync-blue/10 text-medsync-blue'
                            }`}>
                              {groupData.isManual ? (
                                <span>📝 {groupKey}</span>
                              ) : (
                                <span>🔗 {groupKey}</span>
                              )}
                              <span className="ml-2 text-xs px-2 py-0.5 bg-background rounded-full">
                                {groupData.items.length} CBHPM{groupData.items.length > 1 ? 's' : ''}
                              </span>
                            </div>
                            {/* Itens do grupo - ordenados por porte dentro do grupo */}
                            <div className="divide-y divide-border">
                              {sortedItems.map((item: any, idx: number) => (
                                <div
                                  key={`${item.procedure.id}-${item.isFromMain ? 'main' : 'secondary'}-${idx}`}
                                  className="flex items-center justify-between p-3 bg-accent/10"
                                >
                                  <div className="flex-grow">
                                    <div className="flex items-center space-x-2 flex-wrap">
                                      <span className="font-medium text-muted-foreground">
                                        {item.procedure.code} - {item.procedure.name}
                                      </span>
                                      {item.procedure.porte && (
                                        <span className="text-xs px-2 py-0.5 bg-accent/50 rounded-full text-muted-foreground">
                                          Porte: {item.procedure.porte}
                                        </span>
                                      )}
                                      {item.originalIndex === 0 && (
                                        <span className="text-xs px-2 py-0.5 bg-accent-light rounded-full text-accent">
                                          Procedimento Principal
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                                      <span>Auxiliares: {item.procedure.numeroAuxiliares || 0}</span>
                                      <span>Porte Anestesista: {item.procedure.porteAnestesista || "0"}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-2">
                                      <div className="flex items-center space-x-1">
                                        <span className="text-xs font-medium text-muted-foreground">
                                          Qtd:
                                        </span>
                                        <Input
                                          type="number"
                                          min="1"
                                          value={item.quantity ?? 1}
                                          onChange={(e) => {
                                            const newQuantity = parseInt(e.target.value) || 1;
                                            if (item.isFromMain) {
                                              setProcedureQuantity(newQuantity);
                                            } else {
                                              const secondaryIndex = secondaryProcedures.findIndex((sp: any) => sp.procedure.id === item.procedure.id);
                                              if (secondaryIndex !== -1) {
                                                handleUpdateProcedureQuantity(secondaryIndex, newQuantity);
                                              }
                                            }
                                          }}
                                          className="w-16 h-8 text-xs bg-card text-foreground border-border"
                                        />
                                      </div>
                                    </div>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => {
                                        if (item.isFromMain) {
                                          setSelectedProcedure(null);
                                          setProcedureQuantity(1);
                                          saveAllProceduresToDatabase();
                                          toast({
                                            title: "Procedimento removido",
                                            description: `${item.procedure.name} removido da lista`,
                                          });
                                        } else {
                                          const secondaryIndex = secondaryProcedures.findIndex((sp: any) => sp.procedure.id === item.procedure.id);
                                          if (secondaryIndex !== -1) {
                                            handleRemoveSecondaryProcedure(secondaryIndex);
                                          }
                                        }
                                      }}
                                    >
                                      Remover
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );})}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>

              <p className="text-xs text-muted-foreground mt-2">
                Adicione os procedimentos necessários para a cirurgia.
              </p>
              
              {/* Campo de texto rico para observações adicionais sobre procedimentos CBHPM */}
              <div className="mt-4">
                {!showCbhpmNotes ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCbhpmNotes(true)}
                    className="text-muted-foreground hover:text-foreground"
                    data-testid="button-add-cbhpm-notes"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar observações adicionais
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="cbhpm-notes" className="text-sm font-medium text-foreground">
                        Observações Adicionais (Procedimentos)
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCbhpmNotes(false)}
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                        data-testid="button-hide-cbhpm-notes"
                      >
                        <ChevronUp className="h-3 w-3 mr-1" />
                        Esconder
                      </Button>
                    </div>
                    <RichTextEditor
                      id="cbhpm-notes"
                      value={cbhpmAdditionalNotes}
                      onChange={setCbhpmAdditionalNotes}
                      placeholder="Insira aqui informações ou descrições adicionais sobre os procedimentos CBHPM..."
                      minHeight="min-h-[100px]"
                    />
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>

          {/* Seção para Lista de Materiais Necessários para a cirurgia OPME */}
          <div className="mb-6 text-foreground mt-6">
            <div className="bg-card/70 border border-border rounded-md shadow-md overflow-hidden">
                {/* Cabeçalho com fundo azul claro */}
                <div className="bg-medsync-blue px-4 py-3">
                  <div className="flex items-center">
                    <Package className="mr-2 h-5 w-5 text-white" />
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Lista de Materiais Necessários para a cirurgia OPME
                      </h3>
                    </div>
                  </div>
                </div>
                
                {/* Conteúdo com fundo card */}
                <div className="p-5">
              
              {/* Dropdown para associação OBRIGATÓRIA à conduta - aparece quando há condutas selecionadas */}
              {selectedSurgicalApproaches.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 mb-4">
                  <div className="flex-shrink-0">
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                      Associar à conduta: <span className="text-red-500">*</span>
                    </span>
                  </div>
                  <Select
                    value={manualAssociationApproachId}
                    onValueChange={setManualAssociationApproachId}
                  >
                    <SelectTrigger className={`flex-1 h-9 text-sm ${!manualAssociationApproachId || manualAssociationApproachId === "none" ? 'border-amber-400' : 'border-green-500'}`}>
                      <SelectValue placeholder="Selecione uma conduta (obrigatório)" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedSurgicalApproaches.map((approach: any, index: number) => (
                        <SelectItem 
                          key={`opme-approach-${approach.surgicalProcedureId}-${approach.surgicalApproachId}-${index}`} 
                          value={`${approach.surgicalProcedureId}-${approach.surgicalApproachId}`}
                        >
                          {approach.procedureName} → {approach.approachName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(!manualAssociationApproachId || manualAssociationApproachId === "none") && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      Obrigatório
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-4">
                {/* Formulário para busca de materiais OPME */}
                <div className="flex flex-col md:flex-row md:items-end md:space-x-3 space-y-3 md:space-y-0">
                  <div className="flex-grow">
                    <Label
                      htmlFor="opme-search"
                      className="mb-2 block text-sm text-foreground"
                    >
                      Material OPME
                    </Label>
                    <Popover
                      open={opmeSearchOpen}
                      onOpenChange={setOpmeSearchOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={opmeSearchOpen}
                          className="combobox-medsync"
                        >
                          <span className={opmeLoading ? "combobox-value" : "combobox-placeholder"}>
                            {opmeLoading ? (
                              <span className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Buscando materiais...
                              </span>
                            ) : (
                              "Pesquise e selecione materiais OPME"
                            )}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[500px] p-0 bg-popover border-border shadow-md" align="start" side="bottom" sideOffset={4}>
                        <Command className="bg-popover text-popover-foreground" shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar nome técnico, comercial ou registro ANVISA..."
                            value={opmeSearchTerm}
                            onValueChange={setOpmeSearchTerm}
                            className="bg-background text-foreground border-input placeholder:text-muted-foreground"
                          />
                          <CommandList className="text-popover-foreground bg-popover">
                            <CommandEmpty>
                              {opmeSearchTerm.length < 3 ? (
                                <p className="py-3 px-4 text-sm text-center text-muted-foreground">
                                  Digite pelo menos 3 caracteres para buscar
                                </p>
                              ) : opmeLoading ? (
                                <div className="py-6 flex items-center justify-center">
                                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                              ) : (
                                <p className="py-3 px-4 text-sm text-center text-muted-foreground">
                                  Nenhum material encontrado
                                </p>
                              )}
                            </CommandEmpty>
                            <CommandGroup className="text-muted-foreground">
                              {opmeResults.map((item) => (
                                <CommandItem
                                  key={item.id}
                                  value={`${item.technicalName} ${item.commercialName}`}
                                  className="cursor-pointer hover:bg-accent-light"
                                  onSelect={() => handleSelectOpmeItem(item)}
                                >
                                  <div className="flex flex-col w-full">
                                    <div className="flex items-center gap-2">
                                      <strong className="text-muted-foreground">
                                        {item.technicalName}
                                      </strong>
                                      {item.anvisaRegistrationNumber && (
                                        <span className="text-xs px-2 py-0.5 bg-accent/50 rounded text-muted-foreground">
                                          ANVISA: {item.anvisaRegistrationNumber}
                                        </span>
                                      )}
                                    </div>
                                    <span className="ml-2 text-foreground">
                                      {item.commercialName} - {item.manufacturerName}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="w-24">
                    <Label
                      htmlFor="opmeQuantity"
                      className="mb-2 block text-sm text-foreground"
                    >
                      Quantidade
                    </Label>
                    <Input
                      id="opmeQuantity"
                      type="number"
                      min="1"
                      value={opmeQuantity}
                      onChange={(e) =>
                        setOpmeQuantity(parseInt(e.target.value) || 1)
                      }
                      className="w-full bg-card text-foreground border-border"
                    />
                  </div>


                </div>

                {/* Lista de materiais OPME adicionados - Agrupados por Conduta Cirúrgica */}
                <div>
                  <h5 className="text-xs font-medium mb-2 text-muted-foreground">
                    Materiais selecionados{" "}
                    {opmeItems.length > 0 && `(${opmeItems.length})`}
                  </h5>
                  {opmeItems.length === 0 ? (
                    <div className="text-muted-foreground italic text-sm mb-3">
                      Nenhum material OPME adicionado para este procedimento.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(() => {
                        // Verificar se há agrupamento necessário
                        const hasGrouping = opmeItems.some((item: any) => item.item.sourceApproachId);
                        
                        if (!hasGrouping) {
                          // Sem agrupamento - mostrar lista simples
                          return opmeItems.map((opmeItem: any, index: number) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 border border-border rounded-md bg-accent/30"
                            >
                              <div className="flex-grow">
                                <div className="flex items-center">
                                  <span className="text-sm font-medium text-foreground">
                                    {opmeItem.item.technicalName}
                                  </span>
                                  {opmeItem.item.anvisaRegistrationNumber && (
                                    <span className="ml-2 text-xs px-2 py-0.5 bg-accent/50 rounded-full text-muted-foreground">
                                      Reg: {opmeItem.item.anvisaRegistrationNumber}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  <span>Nome Comercial: {opmeItem.item.commercialName}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  <span>Fabricante: {opmeItem.item.manufacturerName}</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-1">
                                  <span className="text-xs font-medium text-muted-foreground">Qtd:</span>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={opmeItem.quantity ?? 1}
                                    onChange={(e) => {
                                      const newQuantity = parseInt(e.target.value) || 1;
                                      handleUpdateOpmeQuantity(index, newQuantity);
                                    }}
                                    className="w-16 h-8 text-xs bg-card text-foreground border-border"
                                  />
                                </div>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleRemoveOpmeItem(index)}
                                >
                                  Remover
                                </Button>
                              </div>
                            </div>
                          ));
                        }

                        // Agrupar OPME por conduta cirúrgica de origem
                        const groupedOpme = opmeItems.reduce((acc: any, item: any, index: number) => {
                          const groupKey = item.item.sourceApproachId 
                            ? `${item.item.sourceProcedureName || 'Procedimento'} → ${item.item.sourceApproachName}`
                            : 'Adicionado Manualmente';
                          
                          if (!acc[groupKey]) {
                            acc[groupKey] = {
                              items: [],
                              sourceApproachId: item.item.sourceApproachId,
                              isManual: !item.item.sourceApproachId
                            };
                          }
                          acc[groupKey].items.push({ ...item, originalIndex: index });
                          return acc;
                        }, {});

                        const groupKeys = Object.keys(groupedOpme);

                        return groupKeys.map((groupKey) => (
                          <div key={groupKey} className="border border-border rounded-lg overflow-hidden">
                            {/* Cabeçalho do grupo */}
                            <div className={`px-3 py-2 text-sm font-medium flex items-center ${
                              groupedOpme[groupKey].isManual 
                                ? 'bg-muted/50 text-muted-foreground' 
                                : 'bg-medsync-blue/10 text-medsync-blue'
                            }`}>
                              {groupedOpme[groupKey].isManual ? (
                                <span>📝 {groupKey}</span>
                              ) : (
                                <span>🔗 {groupKey}</span>
                              )}
                              <span className="ml-2 text-xs px-2 py-0.5 bg-background rounded-full">
                                {groupedOpme[groupKey].items.length} OPME{groupedOpme[groupKey].items.length > 1 ? 's' : ''}
                              </span>
                            </div>
                            {/* Itens do grupo */}
                            <div className="divide-y divide-border">
                              {groupedOpme[groupKey].items.map((opmeItem: any) => (
                                <div
                                  key={opmeItem.originalIndex}
                                  className="flex items-center justify-between p-2 bg-accent/10"
                                >
                                  <div className="flex-grow">
                                    <div className="flex items-center">
                                      <span className="text-sm font-medium text-foreground">
                                        {opmeItem.item.technicalName}
                                      </span>
                                      {opmeItem.item.anvisaRegistrationNumber && (
                                        <span className="ml-2 text-xs px-2 py-0.5 bg-accent/50 rounded-full text-muted-foreground">
                                          Reg: {opmeItem.item.anvisaRegistrationNumber}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      <span>Nome Comercial: {opmeItem.item.commercialName}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      <span>Fabricante: {opmeItem.item.manufacturerName}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-1">
                                      <span className="text-xs font-medium text-muted-foreground">Qtd:</span>
                                      <Input
                                        type="number"
                                        min="1"
                                        value={opmeItem.quantity ?? 1}
                                        onChange={(e) => {
                                          const newQuantity = parseInt(e.target.value) || 1;
                                          handleUpdateOpmeQuantity(opmeItem.originalIndex, newQuantity);
                                        }}
                                        className="w-16 h-8 text-xs bg-card text-foreground border-border"
                                      />
                                    </div>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleRemoveOpmeItem(opmeItem.originalIndex)}
                                    >
                                      Remover
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                  
                  {/* Campo de texto rico para observações adicionais sobre itens OPME */}
                  <div className="mt-4">
                    {!showOpmeNotes ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowOpmeNotes(true)}
                        className="text-muted-foreground hover:text-foreground"
                        data-testid="button-add-opme-notes"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar observações adicionais
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="opme-notes" className="text-sm font-medium text-foreground">
                            Observações Adicionais (Materiais OPME)
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowOpmeNotes(false)}
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                            data-testid="button-hide-opme-notes"
                          >
                            <ChevronUp className="h-3 w-3 mr-1" />
                            Esconder
                          </Button>
                        </div>
                        <RichTextEditor
                          id="opme-notes"
                          value={opmeAdditionalNotes}
                          onChange={setOpmeAdditionalNotes}
                          placeholder="Insira aqui informações ou descrições adicionais sobre os materiais OPME..."
                          minHeight="min-h-[100px]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Seção para Seleção de Fornecedores - Sistema Dinâmico */}
          <div className="mb-6 text-foreground mt-6">
            <div className="bg-card/70 border border-border rounded-md shadow-md overflow-hidden">
                {/* Cabeçalho com fundo azul claro */}
                <div className="bg-medsync-blue px-4 py-3">
                  <div className="flex items-center">
                    <FileText className="mr-2 h-5 w-5 text-white" />
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Fornecedores de Materiais OPME
                      </h3>
                      <p className="text-xs text-white/80">
                        Adicione quantos fornecedores forem necessários para cada conduta
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Conteúdo com fundo card */}
                <div className="p-5 space-y-4">
              
              {/* Dropdown para associação OBRIGATÓRIA à conduta - aparece quando há condutas selecionadas */}
              {selectedSurgicalApproaches.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 mb-4">
                  <div className="flex-shrink-0">
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                      Associar à conduta: <span className="text-red-500">*</span>
                    </span>
                  </div>
                  <Select
                    value={manualAssociationApproachId}
                    onValueChange={setManualAssociationApproachId}
                  >
                    <SelectTrigger className={`flex-1 h-9 text-sm ${!manualAssociationApproachId || manualAssociationApproachId === "none" ? 'border-amber-400' : 'border-green-500'}`}>
                      <SelectValue placeholder="Selecione uma conduta (obrigatório)" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedSurgicalApproaches.map((approach: any, index: number) => (
                        <SelectItem 
                          key={`supplier-approach-${approach.surgicalProcedureId}-${approach.surgicalApproachId}-${index}`} 
                          value={`${approach.surgicalProcedureId}-${approach.surgicalApproachId}`}
                        >
                          {approach.procedureName} → {approach.approachName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(!manualAssociationApproachId || manualAssociationApproachId === "none") && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      Obrigatório
                    </span>
                  )}
                </div>
              )}

                  {/* Interface de adição de fornecedor */}
                  <div className="space-y-3">
                    <Label className="text-sm text-foreground font-medium">
                      Fornecedor
                    </Label>
                    <div className="flex gap-2">
                      <Popover
                        open={supplierSearchOpen}
                        onOpenChange={(open) => {
                          setSupplierSearchOpen(open);
                          if (open) loadAllSuppliers();
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={supplierSearchOpen}
                            className="flex-1 justify-between"
                            disabled={
                              !selectedOpmeItems || 
                              selectedOpmeItems.length === 0 ||
                              (selectedSurgicalApproaches.length > 0 && (!manualAssociationApproachId || manualAssociationApproachId === "none"))
                            }
                            data-testid="button-supplier-search"
                          >
                            <span className={currentSupplier ? "text-foreground" : "text-muted-foreground"}>
                              {supplierLoading ? (
                                <span className="flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Buscando fornecedores...
                                </span>
                              ) : currentSupplier ? (
                                <span className="flex flex-col text-left truncate">
                                  <span className="font-medium">
                                    {currentSupplier.tradeName || currentSupplier.companyName}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    CNPJ: {currentSupplier.cnpj}
                                  </span>
                                </span>
                              ) : (
                                "Pesquise e selecione fornecedores..."
                              )}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[500px] p-0 bg-popover border-border shadow-md" align="start" side="bottom" sideOffset={4}>
                          <Command className="bg-popover text-popover-foreground">
                            <CommandInput
                              placeholder="Buscar nome da empresa ou CNPJ..."
                              value={supplierSearchTerm}
                              onValueChange={setSupplierSearchTerm}
                              className="bg-background text-foreground border-input placeholder:text-muted-foreground"
                            />
                            <CommandList className="text-popover-foreground bg-popover">
                              <CommandEmpty>
                                {supplierSearchTerm.length < 3 ? (
                                  <p className="py-3 px-4 text-sm text-center text-muted-foreground">
                                    Digite pelo menos 3 caracteres para buscar
                                  </p>
                                ) : supplierLoading ? (
                                  <div className="py-6 flex items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                  </div>
                                ) : (
                                  <p className="py-3 px-4 text-sm text-center text-muted-foreground">
                                    Nenhum fornecedor encontrado
                                  </p>
                                )}
                              </CommandEmpty>
                              <CommandGroup className="text-muted-foreground">
                                {supplierSearchTerm.length >= 3 &&
                                  !supplierLoading && (
                                    <div className="p-2">
                                      <Button
                                        className="w-full justify-center bg-primary hover:bg-primary/90"
                                        onClick={handleSupplierSearch}
                                        data-testid="button-search-suppliers"
                                      >
                                        <Search className="mr-2 h-4 w-4" />
                                        Buscar fornecedores
                                      </Button>
                                    </div>
                                  )}
                                {supplierResults.map((supplier) => (
                                  <CommandItem
                                    key={supplier.id}
                                    value={`${supplier.tradeName} ${supplier.companyName} ${supplier.cnpj}`}
                                    className="cursor-pointer hover:bg-accent-light"
                                    onSelect={() => handleSelectSupplierFromSearch(supplier)}
                                    data-testid={`supplier-item-${supplier.id}`}
                                  >
                                    <div className="flex flex-col w-full">
                                      <div className="flex items-center gap-2">
                                        <strong className="text-muted-foreground">
                                          {supplier.tradeName || supplier.companyName}
                                        </strong>
                                        <span className="text-xs px-2 py-0.5 bg-accent/50 rounded text-muted-foreground">
                                          {supplier.cnpj}
                                        </span>
                                      </div>
                                      {supplier.tradeName && supplier.tradeName !== supplier.companyName && (
                                        <span className="ml-2 text-foreground">
                                          {supplier.companyName}
                                        </span>
                                      )}
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    {/* Mensagem quando não há itens OPME */}
                    {(!selectedOpmeItems || selectedOpmeItems.length === 0) && (
                      <p className="text-sm text-muted-foreground italic">
                        Adicione pelo menos um material OPME para poder selecionar fornecedores.
                      </p>
                    )}
                    
                    {/* Mensagem quando há condutas mas nenhuma está selecionada */}
                    {selectedOpmeItems && selectedOpmeItems.length > 0 && selectedSurgicalApproaches.length > 0 && (!manualAssociationApproachId || manualAssociationApproachId === "none") && (
                      <p className="text-sm text-amber-600 dark:text-amber-400 italic">
                        Selecione uma conduta cirúrgica acima para adicionar fornecedores.
                      </p>
                    )}
                  </div>
                  
                  {/* Lista de fornecedores adicionados - Agrupados por Conduta Cirúrgica */}
                  {selectedSuppliers.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm text-foreground font-medium">
                        Fornecedores adicionados ({selectedSuppliers.length})
                      </Label>
                      <div className="space-y-4">
                        {(() => {
                          // Agrupar fornecedores por conduta cirúrgica
                          const groupedSuppliers = selectedSuppliers.reduce((acc: any, supplier: any, index: number) => {
                            const procedureName = supplier.sourceProcedureName || null;
                            const approachName = supplier.sourceApproachName || null;
                            const approachId = supplier.sourceApproachId || null;
                            const procedureId = supplier.sourceProcedureId || null;
                            
                            let groupKey: string;
                            let isManual = false;
                            
                            if (procedureId && approachId) {
                              groupKey = `${procedureName} → ${approachName}`;
                            } else if (procedureId) {
                              groupKey = procedureName || 'Procedimento não especificado';
                            } else if (approachId) {
                              groupKey = `Via: ${approachName}`;
                            } else {
                              groupKey = 'Fornecedores Gerais';
                              isManual = true;
                            }
                            
                            if (!acc[groupKey]) {
                              acc[groupKey] = {
                                items: [],
                                procedureId,
                                approachId,
                                isManual
                              };
                            }
                            acc[groupKey].items.push({ ...supplier, originalIndex: index });
                            return acc;
                          }, {});
                          
                          const groupKeys = Object.keys(groupedSuppliers);
                          
                          // Se só houver um grupo "Fornecedores Gerais", mostrar sem agrupamento visual
                          if (groupKeys.length === 1 && groupKeys[0] === 'Fornecedores Gerais') {
                            return (
                              <div className="space-y-2">
                                {selectedSuppliers.map((supplier, index) => (
                                  <div
                                    key={`supplier-${supplier.id}-${index}`}
                                    className="flex items-center justify-between p-3 bg-accent/20 rounded-md border border-border"
                                    data-testid={`supplier-row-${index}`}
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-medsync-blue" />
                                        <span className="font-medium text-foreground">
                                          {supplier.tradeName || supplier.companyName}
                                        </span>
                                        <span className="text-xs px-2 py-0.5 bg-accent/50 rounded text-muted-foreground">
                                          {supplier.cnpj}
                                        </span>
                                      </div>
                                    </div>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleRemoveSupplier(index)}
                                      data-testid={`button-remove-supplier-${index}`}
                                    >
                                      Remover
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          
                          // Mostrar agrupado por conduta
                          return groupKeys.map((groupKey) => (
                            <div key={groupKey} className="border border-border rounded-lg overflow-hidden">
                              {/* Cabeçalho do grupo */}
                              <div className={`px-3 py-2 text-sm font-medium flex items-center ${
                                groupedSuppliers[groupKey].isManual 
                                  ? 'bg-muted/50 text-muted-foreground' 
                                  : 'bg-medsync-blue/10 text-medsync-blue'
                              }`}>
                                {groupedSuppliers[groupKey].isManual ? (
                                  <span>📝 {groupKey}</span>
                                ) : (
                                  <span>🔗 {groupKey}</span>
                                )}
                                <span className="ml-2 text-xs px-2 py-0.5 bg-background rounded-full">
                                  {groupedSuppliers[groupKey].items.length} fornecedor{groupedSuppliers[groupKey].items.length > 1 ? 'es' : ''}
                                </span>
                              </div>
                              {/* Itens do grupo */}
                              <div className="divide-y divide-border">
                                {groupedSuppliers[groupKey].items.map((item: any) => (
                                  <div
                                    key={`supplier-${item.id}-${item.originalIndex}`}
                                    className="flex items-center justify-between p-3 bg-accent/10"
                                    data-testid={`supplier-row-${item.originalIndex}`}
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-medsync-blue" />
                                        <span className="font-medium text-foreground">
                                          {item.tradeName || item.companyName}
                                        </span>
                                        <span className="text-xs px-2 py-0.5 bg-accent/50 rounded text-muted-foreground">
                                          {item.cnpj}
                                        </span>
                                      </div>
                                    </div>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleRemoveSupplier(item.originalIndex)}
                                      data-testid={`button-remove-supplier-${item.originalIndex}`}
                                    >
                                      Remover
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                  {/* Campo de texto rico para observações adicionais sobre fornecedores */}
                  <div className="mt-4">
                    {!showSupplierNotes ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSupplierNotes(true)}
                        className="text-muted-foreground hover:text-foreground"
                        data-testid="button-add-supplier-notes"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar observações adicionais
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="supplier-notes" className="text-sm font-medium text-foreground">
                            Observações Adicionais (Fornecedores)
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowSupplierNotes(false)}
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                            data-testid="button-hide-supplier-notes"
                          >
                            <ChevronUp className="h-3 w-3 mr-1" />
                            Esconder
                          </Button>
                        </div>
                        <RichTextEditor
                          id="supplier-notes"
                          value={supplierAdditionalNotes}
                          onChange={setSupplierAdditionalNotes}
                          placeholder="Insira aqui informações ou descrições adicionais sobre os fornecedores..."
                          minHeight="min-h-[100px]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Seção para Sugestão de Justificativa Clínica */}
            <div className="mb-6 text-foreground mt-6" data-testid="surgery-ai-justification">
              <div className="bg-card/70 border border-border rounded-md shadow-md overflow-hidden">
                {/* Cabeçalho com fundo azul claro */}
                <div className="bg-medsync-blue px-4 py-3">
                  <div className="flex items-center">
                    <FileText className="mr-2 h-5 w-5 text-white" />
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Sugestão de Justificativa Clínica <span className="text-red-300">*</span>
                      </h3>
                    </div>
                  </div>
                </div>
                
                {/* Conteúdo com fundo card */}
                <div className="p-5">
                  <div className="space-y-2">
                    <Label
                      htmlFor="clinical-justification"
                      className="text-sm text-foreground"
                    >
                      Insira uma sugestão de justificativa clínica para o
                      procedimento
                    </Label>
                    <RichTextEditor
                      id="clinical-justification"
                      placeholder="Digite a sugestão de justificativa clínica..."
                      value={clinicalJustification}
                      onChange={(value) => setClinicalJustification(value)}
                      minHeight="min-h-48"
                      disabled={isGeneratingAI}
                    />
                    
                    {/* Nota Informativa sobre a IA */}
                    <div className="mt-2">
                      <p className="text-xs text-medsync-dark-blue dark:text-medsync-dark-blue">
                        * Possuímos uma IA própria treinada por médicos especialistas. Porém poderá conter imprecisões. Sempre valide o pedido antes de submeter.
                      </p>
                    </div>
                    
                    <div className="mt-3 flex justify-end gap-2">
                      {/* Botão para restaurar texto original */}
                      {originalClinicalJustification && (
                        <button
                          type="button"
                          disabled={isGeneratingAI}
                          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
                          onClick={handleRestoreOriginal}
                          data-testid="button-restore-original"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                          </svg>
                          Restaurar Original
                        </button>
                      )}
                      
                      {/* Botão para gerar com IA */}
                      <button
                        type="button"
                        disabled={isGeneratingAI}
                        className="btn-medsync-dark disabled:opacity-50"
                        onClick={handleGenerateAIJustification}
                        data-testid="button-generate-ai"
                      >
                        {isGeneratingAI ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Gerando...
                          </>
                        ) : (
                          <>
                            <img src={RoboMedSyncIcon} alt="IA" className="w-5 h-5 mr-2 inline-block" />
                            Gerar Justificativa Clínica com IA
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      </Card>

      {/* Overlay de Loading da IA */}
      {isGeneratingAI && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150]" data-testid="ai-loading-overlay">
          <LoadingLogo 
            message="A IA está analisando os dados e gerando a justificativa clínica..." 
            size="lg"
          />
        </div>
      )}

      {/* Dialog para seleção de condutas cirúrgicas */}
      {showSurgicalApproachDialog && selectedCidForApproach && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-popover border border-border rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto shadow-md">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-popover-foreground mb-2">
                Condutas Cirúrgicas Disponíveis
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Para o CID-10 <strong className="text-popover-foreground">{selectedCidForApproach.code}</strong> - {selectedCidForApproach.description}
              </p>
            </div>

            {availableSurgicalApproaches.length > 0 ? (
              <div className="space-y-3 mb-6">
                {availableSurgicalApproaches.map((association, index) => (
                  <div
                    key={index}
                    className="border border-border rounded-lg p-4 bg-accent/20"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-popover-foreground mb-1">
                          {association.approachName}
                        </h4>
                        {association.approachDescription && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {association.approachDescription}
                          </p>
                        )}
                        {association.isPreferred && (
                          <span className="inline-block px-2 py-1 bg-accent-light text-accent text-xs rounded-full">
                            Conduta Preferencial
                          </span>
                        )}
                      </div>
                      <button
                        className="ml-3 px-3 py-1 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90 transition-colors"
                        onClick={async () => {
                          console.log("🎯 BUTTON CLICKED! - Conduta selecionada:", association.approachName);
                          console.log("🎯 BUTTON CLICKED! - Dados da associação:", association);
                          const approachData = {
                            surgicalApproachId: association.surgicalApproachId,
                            surgicalApproachName: association.approachName,
                            isPrimary: association.isPreferred || false
                          };
                          
                          // Criar nova linha CID + Conduta - FORMATO NORMALIZADO
                          const newCidWithApproach = {
                            cid: {
                              id: selectedCidForApproach.id,
                              code: selectedCidForApproach.code,
                              description: selectedCidForApproach.description,
                              category: selectedCidForApproach.category
                            },
                            // Formato normalizado do frontend
                            sourceProcedureId: procedureId,
                            sourceProcedureName: procedureName,
                            sourceApproachId: association.surgicalApproachId,
                            sourceApproachName: association.approachName
                          };

                          // Verificar se o CID já existe NA MESMA CONDUTA
                          // Dados já normalizados - usar apenas formato frontend (sourceApproachId/sourceProcedureId)
                          const cidAlreadyExists = multipleCids.some((item: any) => {
                            if (item.cid.id !== selectedCidForApproach.id) return false;
                            return item.sourceProcedureId === procedureId && item.sourceApproachId === association.surgicalApproachId;
                          });

                          if (cidAlreadyExists) {
                            toast({
                              title: "CID já adicionado",
                              description: `${selectedCidForApproach.code} já está associado à conduta "${association.approachName}".`,
                              variant: "destructive",
                            });
                            return;
                          }

                          // Adicionar à lista de CIDs (criando linha separada)
                          if (setMultipleCids) {
                            setMultipleCids((prev: any) => [...prev, newCidWithApproach]);
                          }
                          
                          // Adicionar ao estado do componente pai para salvamento em lote
                          console.log("🔧 Tentando adicionar conduta cirúrgica ao estado:", {
                            surgicalProcedureId: procedureId,
                            surgicalApproachId: association.surgicalApproachId,
                            approachName: association.approachName,
                            procedureName: procedureName,
                            isPrimary: association.isPreferred || false
                          });
                          
                          console.log("🔧 Função setSelectedSurgicalApproaches disponível?", typeof setSelectedSurgicalApproaches);
                          
                          if (setSelectedSurgicalApproaches && typeof setSelectedSurgicalApproaches === 'function') {
                            console.log("✅ setSelectedSurgicalApproaches disponível, chamando função...");
                            setSelectedSurgicalApproaches((prev: any) => {
                              const newApproach = {
                                surgicalProcedureId: procedureId,
                                surgicalApproachId: association.surgicalApproachId,
                                approachName: association.approachName,
                                procedureName: procedureName,
                                isPrimary: association.isPreferred || false
                              };
                              console.log("🔧 ConductSelector - Estado anterior no callback:", prev);
                              console.log("🔧 ConductSelector - Adicionando conduta ao estado:", newApproach);
                              const newState = [...prev, newApproach];
                              console.log("🔧 ConductSelector - Novo estado das condutas:", newState);
                              return newState;
                            });
                            console.log("✅ ConductSelector - Função setSelectedSurgicalApproaches executada com sucesso");
                          } else {
                            console.error("❌ setSelectedSurgicalApproaches não está disponível no ConductSelector");
                            console.error("❌ Tipo recebido:", typeof setSelectedSurgicalApproaches);
                            console.error("❌ Valor recebido:", setSelectedSurgicalApproaches);
                          }
                          
                          // AUTO-PREENCHIMENTO: Lateralidade e Caráter baseado nos valores padrão da conduta
                          if (association.defaultLaterality && setProcedureLaterality) {
                            const normalizedLaterality = association.defaultLaterality.toLowerCase().trim();
                            console.log(`🎯 Auto-preenchendo lateralidade: ${normalizedLaterality}`);
                            // Mapear valores do banco para valores do frontend
                            const lateralityMap: Record<string, string> = {
                              'esquerdo': 'esquerdo',
                              'direito': 'direito',
                              'bilateral': 'bilateral',
                              'indeterminado': 'nao_se_aplica',
                              'nao_se_aplica': 'nao_se_aplica'
                            };
                            const mappedLaterality = lateralityMap[normalizedLaterality] || normalizedLaterality;
                            setProcedureLaterality(mappedLaterality);
                          }
                          
                          if (association.defaultCharacter && setProcedureType) {
                            const normalizedCharacter = association.defaultCharacter.toLowerCase().trim();
                            console.log(`🎯 Auto-preenchendo caráter: ${normalizedCharacter}`);
                            // Mapear valores do banco para valores do frontend (eletiva/urgencia)
                            const characterMap: Record<string, string> = {
                              'eletiva': 'eletiva',
                              'urgencia': 'urgencia',
                              'emergencia': 'urgencia'
                            };
                            const mappedCharacter = characterMap[normalizedCharacter] || normalizedCharacter;
                            setProcedureType(mappedCharacter);
                          }
                          
                          // AUTO-PREENCHIMENTO: Buscar dados completos da conduta cirúrgica
                          try {
                            // Buscar o ID do procedimento cirúrgico selecionado
                            const surgicalProcedureId = selectedSurgicalProcedures.length > 0 ? selectedSurgicalProcedures[0].id : null;
                            console.log(`🔄 Iniciando auto-preenchimento para conduta cirúrgica ID: ${association.surgicalApproachId}, Procedimento Cirúrgico ID: ${surgicalProcedureId}`);
                            
                            const response = await fetch(`/api/surgical-approaches/${association.surgicalApproachId}/complete${surgicalProcedureId ? `?surgicalProcedureId=${surgicalProcedureId}` : ''}`, {
                              credentials: 'include'
                            });
                            
                            if (response.ok) {
                              const completeData = await response.json();
                              console.log('📋 Dados completos da conduta cirúrgica:', completeData);
                              
                              // AUTO-PREENCHIMENTO: Lateralidade e Caráter baseado nos valores padrão da API /complete
                              if (completeData.defaultLaterality && setProcedureLaterality) {
                                const normalizedLaterality = completeData.defaultLaterality.toLowerCase().trim();
                                console.log(`🎯 [API Complete] Auto-preenchendo lateralidade: ${normalizedLaterality}`);
                                const lateralityMap: Record<string, string> = {
                                  'esquerdo': 'esquerdo',
                                  'direito': 'direito',
                                  'bilateral': 'bilateral',
                                  'indeterminado': 'nao_se_aplica',
                                  'nao_se_aplica': 'nao_se_aplica'
                                };
                                const mappedLaterality = lateralityMap[normalizedLaterality] || normalizedLaterality;
                                setProcedureLaterality(mappedLaterality);
                              }
                              
                              if (completeData.defaultCharacter && setProcedureType) {
                                const normalizedCharacter = completeData.defaultCharacter.toLowerCase().trim();
                                console.log(`🎯 [API Complete] Auto-preenchendo caráter: ${normalizedCharacter}`);
                                const characterMap: Record<string, string> = {
                                  'eletiva': 'eletiva',
                                  'urgencia': 'urgencia',
                                  'emergencia': 'urgencia'
                                };
                                const mappedCharacter = characterMap[normalizedCharacter] || normalizedCharacter;
                                setProcedureType(mappedCharacter);
                              }
                              
                              // Auto-preencher procedimentos CBHPM
                              if (completeData.procedures && completeData.procedures.length > 0) {
                                const proceduresForSelection = completeData.procedures.map((proc: any) => ({
                                  procedure: {
                                    id: proc.id,
                                    code: proc.code,
                                    name: proc.name || proc.description,
                                    description: proc.description,
                                    active: true,
                                    porte: proc.porte
                                  },
                                  quantity: 1,
                                  isPreferred: proc.isPreferred
                                }));
                                
                                console.log(`🏥 Auto-preenchendo ${proceduresForSelection.length} procedimentos CBHPM`);
                                setSecondaryProcedures(proceduresForSelection);
                                
                                // Definir procedimento principal se houver um preferido
                                const preferredProcedure = completeData.procedures.find((proc: any) => proc.isPreferred);
                                if (preferredProcedure && setSelectedProcedure) {
                                  setSelectedProcedure({
                                    id: preferredProcedure.id,
                                    code: preferredProcedure.code,
                                    name: preferredProcedure.name || preferredProcedure.description,
                                    description: preferredProcedure.description,
                                    active: true,
                                    porte: preferredProcedure.porte
                                  });
                                  console.log(`✅ Procedimento principal definido: ${preferredProcedure.code}`);
                                }
                              }
                              
                              // Auto-preencher itens OPME
                              if (completeData.opmeItems && completeData.opmeItems.length > 0) {
                                const opmeForSelection = completeData.opmeItems.map((opme: any) => ({
                                  item: {
                                    id: opme.id,
                                    technicalName: opme.technicalName,
                                    commercialName: opme.commercialName,
                                    manufacturerName: opme.manufacturerName || '',
                                    anvisaRegistrationNumber: opme.anvisaRegistrationNumber,
                                    riskClass: opme.riskClass,
                                    registrationHolder: opme.registrationHolder
                                  },
                                  quantity: opme.quantity || 1
                                }));
                                
                                console.log(`📦 Auto-preenchendo ${opmeForSelection.length} itens OPME`);
                                if (setSelectedOpmeItems) {
                                  setSelectedOpmeItems(opmeForSelection);
                                }
                              }
                              
                              // Auto-preencher fornecedores (novo sistema dinâmico)
                              if (completeData.suppliers && completeData.suppliers.length > 0 && setSupplierDetails) {
                                const newSuppliers = completeData.suppliers.map((supplier: any) => ({
                                  id: supplier.id,
                                  companyName: supplier.companyName,
                                  tradeName: supplier.tradeName,
                                  cnpj: supplier.cnpj,
                                  municipalityId: supplier.municipalityId,
                                  address: supplier.address,
                                  phone: supplier.phone,
                                  email: supplier.email,
                                  active: supplier.active,
                                  sourceApproachId: association.surgicalApproachId,
                                  sourceApproachName: association.approachName,
                                  sourceProcedureId: procedureId,
                                  sourceProcedureName: procedureName
                                }));
                                
                                console.log(`🏢 Auto-preenchendo ${newSuppliers.length} fornecedores`);
                                
                                // Adicionar fornecedores evitando duplicatas por CNPJ
                                const currentSuppliers = [...(supplierDetails || [])];
                                newSuppliers.forEach((newSupplier: any) => {
                                  const exists = currentSuppliers.some((s: any) => s.cnpj === newSupplier.cnpj);
                                  if (!exists) {
                                    currentSuppliers.push(newSupplier);
                                  }
                                });
                                
                                setSupplierDetails(currentSuppliers);
                              }
                              
                              // Auto-preencher justificativa clínica SOMENTE se não existir
                              if (completeData.justifications && completeData.justifications.length > 0) {
                                const preferredJustification = completeData.justifications.find((just: any) => just.isPreferred) 
                                  || completeData.justifications[0];
                                
                                if (preferredJustification && setClinicalJustification) {
                                  setClinicalJustification((prevJustification: string) => {
                                    // 🔧 CORREÇÃO: Não sobrescrever justificativa existente no modo edição
                                    if (prevJustification && prevJustification.trim() && isEditMode) {
                                      console.log(`🛡️ JUSTIFICATIVA PRESERVADA: Dados existentes mantidos no modo edição`);
                                      return prevJustification; // Manter dados existentes
                                    }
                                    
                                    // Apenas auto-preencher se campo estiver vazio
                                    if (!prevJustification || prevJustification.trim() === "") {
                                      const justificationText = preferredJustification.content || preferredJustification.title;
                                      console.log(`📄 Auto-preenchendo justificativa clínica: ${preferredJustification.title}`);
                                      return justificationText;
                                    }
                                    
                                    return prevJustification;
                                  });
                                }
                              }
                              
                              toast({
                                title: "Conduta cirúrgica selecionada",
                                description: `${association.approachName} foi selecionada e os campos foram preenchidos automaticamente`,
                                duration: 4000,
                              });
                            } else {
                              console.error('Erro ao buscar dados completos da conduta cirúrgica');
                              toast({
                                title: "Conduta cirúrgica adicionada",
                                description: `${association.approachName} foi associada ao pedido médico`,
                                duration: 3000,
                              });
                            }
                          } catch (error) {
                            console.error('Erro no auto-preenchimento:', error);
                            toast({
                              title: "Conduta cirúrgica adicionada",
                              description: `${association.approachName} foi associada ao pedido médico`,
                              duration: 3000,
                            });
                          }
                          
                          // Salvar no banco imediatamente
                          saveSurgicalApproachesToDatabase([approachData]).then(success => {
                            if (success) {
                              // Fechar o dialog após seleção bem-sucedida
                              setShowSurgicalApproachDialog(false);
                              setSelectedCidForApproach(null);
                              
                              // Limpar busca para permitir nova seleção
                              setSearchTerm("");
                              setOpen(false);
                            }
                          });
                        }}
                      >
                        Selecionar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Nenhuma conduta cirúrgica encontrada para este CID-10.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => {
                  setShowSurgicalApproachDialog(false);
                  setAvailableSurgicalApproaches([]);
                  setSelectedCidForApproach(null);
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Componente para seleção de regiões anatômicas com integração de procedimentos
interface AnatomicalRegionSelectorProps {
  onRegionSelect?: (region: AnatomicalRegion) => void;
  selectedSurgicalProcedures?: SurgicalProcedure[];
  setSelectedSurgicalProcedures?: (procedures: SurgicalProcedure[]) => void;
  availableProceduresFromRegion?: SurgicalProcedure[];
  setAvailableProceduresFromRegion?: (procedures: SurgicalProcedure[]) => void;
  initialRegionId?: number | null;
}

export const AnatomicalRegionSelector: React.FC<AnatomicalRegionSelectorProps> = ({
  onRegionSelect,
  selectedSurgicalProcedures = [],
  setSelectedSurgicalProcedures = () => {},
  availableProceduresFromRegion = [],
  setAvailableProceduresFromRegion = () => {},
  initialRegionId = null
}) => {
  const [selectedRegion, setSelectedRegion] = useState<AnatomicalRegion | null>(null);
  const [regions, setRegions] = useState<AnatomicalRegion[]>([]);
  const [loadingRegionProcedures, setLoadingRegionProcedures] = useState(false);

  // Carregar regiões anatômicas
  const { data: regionData, isLoading } = useQuery({
    queryKey: ["/api/anatomical-regions"],
  });

  useEffect(() => {
    if (regionData && Array.isArray(regionData)) {
      setRegions(regionData);
    }
  }, [regionData]);

  // Handler para seleção de região
  const handleRegionClick = async (region: AnatomicalRegion) => {
    setSelectedRegion(region);
    setLoadingRegionProcedures(true);

    try {
      // Buscar procedimentos da região apenas para disponibilizar na lista
      const response = await fetch(`/api/anatomical-regions/${region.id}/procedures`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const procedures = await response.json();
        if (procedures && Array.isArray(procedures)) {
          // Armazenar procedimentos disponíveis da região (SEM adicioná-los à seleção)
          setAvailableProceduresFromRegion(procedures);
          console.log(`Região ${region.name}: ${procedures.length} procedimentos disponíveis para seleção manual`);
        } else {
          setAvailableProceduresFromRegion([]);
        }
      } else {
        console.error('Erro na resposta:', response.status);
        setAvailableProceduresFromRegion([]);
      }
      
      // Apenas notificar componente pai
      if (onRegionSelect) {
        onRegionSelect(region);
      }

      toast({
        title: "Região selecionada",
        description: `${region.name} selecionada. Escolha manualmente os procedimentos desejados.`,
      });
    } catch (error) {
      console.error('Erro ao carregar procedimentos da região:', error);
      setAvailableProceduresFromRegion([]);
      toast({
        title: "Erro",
        description: "Erro ao carregar procedimentos da região",
        variant: "destructive",
      });
    } finally {
      setLoadingRegionProcedures(false);
    }
  };

  // Carregar região inicial quando os dados estiverem disponíveis
  useEffect(() => {
    // Garantir que temos tanto o ID inicial quanto as regiões carregadas
    if (!initialRegionId || !regions?.length || isLoading) {
      return;
    }
    
    const region = regions.find(r => r.id === initialRegionId);
    if (region && (!selectedRegion || selectedRegion.id !== region.id)) {
      console.log(`✅ Região anatômica restaurada: ${region.name} (ID: ${region.id})`);
      setSelectedRegion(region);
    }
  }, [initialRegionId, regions, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Carregando regiões anatômicas...</span>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6" data-testid="surgery-anatomical-region">
        {/* Grid de ícones circulares das regiões */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6 place-items-center">
          {regions.map((region) => {
            const isLeftAligned = region.id === 1 || region.id === 2;
            const isRightAligned = region.id === 6 || region.id === 9;
            const tooltipPosition = isLeftAligned ? 'tooltip-left' : isRightAligned ? 'tooltip-right' : 'tooltip-center';
            const arrowPosition = isLeftAligned ? 'arrow-left' : isRightAligned ? 'arrow-right' : 'arrow-center';
            
            return (
              <div 
                key={region.id}
                onClick={() => handleRegionClick(region)}
                className={`body-region-icon group ${selectedRegion?.id === region.id ? 'selected' : ''}`}
                title={region.name}
              >
                <img
                  src={getAnatomicalRegionIcon(region.id, selectedRegion?.id === region.id) || ''}
                  alt={region.name}
                />
                
                {/* Tooltip personalizado com posicionamento inteligente */}
                <div className={`body-region-tooltip ${tooltipPosition}`}>
                  <div className="font-semibold">{region.name}</div>
                  {region.description && (
                    <div className="text-xs text-muted-foreground mt-1 whitespace-normal">{region.description}</div>
                  )}
                  {/* Seta do tooltip com posicionamento dinâmico */}
                  <div className={`body-region-tooltip-arrow ${arrowPosition}`}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Barra divisória sempre presente - mais fina quando não há região selecionada, completa quando há */}
      <div className="w-full bg-accent mt-8">
        {selectedRegion ? (
          /* Painel completo quando há região selecionada */
          <div className="container mx-auto px-4 py-6">
            <div className="text-center transition-all duration-300">
              <h3 className="text-2xl font-bold flex items-center justify-center text-accent-foreground mb-2">
                {selectedRegion.title || selectedRegion.name}
              </h3>
              {selectedRegion.description && (
                <p className="text-sm text-foreground leading-relaxed">
                  {selectedRegion.description}
                </p>
              )}
              
              {/* Mostrar status de carregamento de procedimentos */}
              {loadingRegionProcedures && (
                <div className="mt-3 flex items-center justify-center text-accent-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm">Carregando procedimentos...</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Barra fina de divisão quando não há região selecionada */
          <div className="container mx-auto px-4 py-3">
            <div className="text-center">
              <div className="h-1 bg-accent-foreground/20 rounded-full mx-auto max-w-md"></div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
