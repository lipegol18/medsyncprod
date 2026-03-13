import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { StepProgress } from "@/components/layout/step-progress";
import { formatDateBR } from "@/lib/utils";
import { HospitalSelection } from "@/steps/hospital-selection";
import { PatientSelection } from "@/steps/patient-selection";
import { ExamInfo } from "@/steps/exam-info";
import { UnifiedExamInfo } from "@/steps/unified-exam-info";
import { UnifiedAttachment } from "@/components/unified-file-upload";
import { convertLegacyAttachments } from "@/lib/unified-attachment-utils";
import { SurgeryData, AnatomicalRegionSelector } from "@/steps/surgery-data";
import type { AnatomicalRegion, SurgicalProcedure } from "@shared/schema";
import { OpmeSelection } from "@/steps/opme-selection";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import MedSyncLogo from "../assets/medsync-logo-new.svg";
import DownloadIcon from "../assets/icons/MedSync_Icones_Download_Sem_Borda.svg";
import EmailIcon from "../assets/icons/MedSync_Icones_Email_Sem_Borda.svg";
import { useOnboarding, TourStepMetadata } from "@/features/onboarding";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Save,
  FileText,
  AlertTriangle,
  Download,
  Mail,
  MessageCircle,
  GripVertical,
  RotateCcw,
  X,
  Plus,
  Trash2,
  Send,
  Building2,
  Package,
  User as UserIcon,
} from "lucide-react";
import {
  type Hospital,
  type Patient,
  type MedicalOrder,
  type OpmeItem,
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Interface base para referência de conduta/procedimento cirúrgico
interface SurgicalRef {
  id: number;
  name: string;
}

// Interface local para procedimento compatível com o componente OpmeSelection
interface LocalProcedure {
  id: number;
  code: string;
  name: string;
  description: string | null;
  active: boolean | null;
  porte?: string;
  custoOperacional?: string;
  porteAnestesista?: string;
  numeroAuxiliares?: number;
  sourceApproachId?: number;
  sourceProcedureId?: number;
}

// Interface para procedimentos secundários, estendendo LocalProcedure
// Campo de lateralidade removido conforme solicitado
interface SecondaryProcedure {
  procedure: LocalProcedure;
  quantity: number;
  surgicalApproach?: SurgicalRef | null;
  surgicalProcedure?: SurgicalRef | null;
}

// Interface para item CID com associação cirúrgica
interface CidItemWithAssociation {
  cid: {
    id: number;
    code: string;
    description: string;
    category?: string;
    sourceApproachId?: number;
    sourceProcedureId?: number;
  };
  surgicalApproach?: SurgicalRef | null;
  surgicalProcedure?: SurgicalRef | null;
  sourceApproachId?: number;
  sourceProcedureId?: number;
}

// Interface para item OPME com associação cirúrgica
interface OpmeItemWithAssociation {
  item: {
    id: number;
    technicalName: string;
    commercialName?: string | null;
    anvisaCode?: string | null;
    sourceApproachId?: number;
    sourceProcedureId?: number;
  };
  quantity: number;
  surgicalApproach?: SurgicalRef | null;
  surgicalProcedure?: SurgicalRef | null;
}

import { useMutation, useQuery } from "@tanstack/react-query";
import { Buffer } from 'buffer';
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  API_ENDPOINTS,
  ORDER_STATUS_IDS,
  PROCEDURE_TYPE_VALUES,
} from "@shared/constants";
import { useAuth } from "@/hooks/use-auth";
import {
  uploadExamImage,
  uploadMedicalReport,
  getFileUrl,
} from "@/lib/file-upload";
import { FileManager } from "@/lib/file-manager";
import { SupplierDisplay } from "@/components/supplier-display";
import { LoadingLogo } from "@/components/loading-logo";
import { MarkdownViewer } from "@/components/markdown-editor";
import { OrderPreview } from "@/components/order-preview";
import { OrderPreviewV2 } from "@/components/order-preview_v2";

const USE_PAGINATED_PREVIEW = true;

const steps = [
  { number: 1, label: "Paciente e Hospital" },
  { number: 2, label: "Exame e Laudo" },
  { number: 3, label: "Dados da Cirurgia" },
  { number: 4, label: "Visualização" },
  { number: 5, label: "Confirmação" },
];

export default function CreateOrder() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  
  // Estado para armazenar o step inicial antes do tour começar
  const [stepBeforeTour, setStepBeforeTour] = useState<number | null>(null);
  const [isTourActive, setIsTourActive] = useState(false);
  
  // Hook para onboarding tours - sincronização com wizard
  const { registerStepChangeListener, state: onboardingState } = useOnboarding();
  
  // Listener para sincronizar o wizard com o tour
  const handleTourStepChange = useCallback((tourId: string, stepIndex: number, metadata?: TourStepMetadata) => {
    if (tourId !== 'create-order-tour') return;
    
    // Se stepIndex === -1, o tour terminou ou foi cancelado
    if (stepIndex === -1) {
      // Restaurar o step original
      if (stepBeforeTour !== null) {
        setCurrentStep(stepBeforeTour);
        setStepBeforeTour(null);
      }
      setIsTourActive(false);
      return;
    }
    
    // Tour começou - salvar step atual
    if (!isTourActive && stepIndex === 0) {
      setStepBeforeTour(currentStep);
      setIsTourActive(true);
    }
    
    // Sincronizar wizard step com o tour
    if (metadata?.wizardStep) {
      setCurrentStep(metadata.wizardStep);
    }
  }, [currentStep, stepBeforeTour, isTourActive]);
  
  // Registrar listener quando o componente montar
  useEffect(() => {
    const unsubscribe = registerStepChangeListener(handleTourStepChange);
    return () => {
      unsubscribe();
    };
  }, [registerStepChangeListener, handleTourStepChange]);
  
  // Detectar se estamos em modo de edição
  const urlParams = new URLSearchParams(window.location.search);
  const editOrderId = urlParams.get('edit');

  // Estados para marcadores de quebra de página ajustáveis (Step 4 - Visualização)
  interface PageBreakInfo {
    originalPosition: number;
    adjustedPosition: number;
  }
  const orderPreviewRef = useRef<HTMLDivElement>(null);
  const orderContainerRef = useRef<HTMLDivElement>(null);
  const [orderPageBreaks, setOrderPageBreaks] = useState<PageBreakInfo[]>([]);
  const [draggingBreakIndex, setDraggingBreakIndex] = useState<number | null>(null);
  const [breakDragStartY, setBreakDragStartY] = useState<number>(0);
  const [breakDragStartPosition, setBreakDragStartPosition] = useState<number>(0);
  
  // Altura útil por página A4 em pixels (sincronizado com PDF)
  // PDF: A4 = 842pt, paddingTop=80pt, paddingBottom=60pt → altura útil = 702pt
  // Convertendo para pixels de tela (96 DPI): 702 * (96/72) ≈ 936px
  const PAGE_HEIGHT_PX = 936;
  const MIN_PAGE_CONTENT = 200; // Mínimo de conteúdo por página

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(
    null,
  );
  const [additionalNotes, setAdditionalNotes] = useState("");
  // Estados para armazenar arquivos de imagem de exame (novo modelo unificado)
  const [examImages, setExamImages] = useState<File[]>([]);
  
  // Estados para armazenar arquivos de laudos médicos (novo modelo unificado)
  const [medicalReports, setMedicalReports] = useState<File[]>([]);
  const [medicalReport, setMedicalReport] = useState<File | null>(null);
  const [clinicalIndication, setClinicalIndication] = useState("");

  // Estados para as URLs das imagens e laudos no banco de dados
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [medicalReportUrls, setMedicalReportUrls] = useState<string[]>([]);

  // Dados brutos do pedido atual em edição (para persistir URLs entre etapas)
  const [currentOrderData, setCurrentOrderData] = useState<{
    id?: number;
    // Campo unificado para anexos
    attachments?: UnifiedAttachment[] | null;
    // Campos legados mantidos para compatibilidade
    exam_images_url?: string[] | null;
    exam_image_count?: number | null;
    medical_report_url?: string[] | null;
  } | null>(null);
  // Estados para o CID principal (mantido para compatibilidade)
  const [cidCode, setCidCode] = useState("");
  const [cidDescription, setCidDescription] = useState("");
  const [selectedCidId, setSelectedCidId] = useState<number | null>(null);
  // cidLaterality removido - funcionalidade descontinuada

  // Novo estado para múltiplos CIDs (similar aos procedimentos secundários)
  const [multipleCids, setMultipleCids] = useState<CidItemWithAssociation[]>([]);
  
  // Flag para controlar se já carregamos CIDs com condutas cirúrgicas no modo edição
  const [cidsWithSurgicalApproachesLoaded, setCidsWithSurgicalApproachesLoaded] = useState(false);
  
  // Estado para procedimentos cirúrgicos por região anatômica
  const [selectedSurgicalProcedures, setSelectedSurgicalProcedures] = useState<SurgicalProcedure[]>([]);
  const [availableProceduresFromRegion, setAvailableProceduresFromRegion] = useState<SurgicalProcedure[]>([]);
  const [selectedAnatomicalRegion, setSelectedAnatomicalRegion] = useState<AnatomicalRegion | null>(null);

  // Estado para condutas cirúrgicas selecionadas (seguindo o mesmo padrão dos outros dados relacionais)
  const [selectedSurgicalApproaches, setSelectedSurgicalApproaches] = useState<Array<{
    surgicalProcedureId: number;
    surgicalApproachId: number;
    approachName: string;
    procedureName: string;
    isPrimary: boolean;
  }>>([]);
  
  // Função para atualizar condutas cirúrgicas selecionadas
  const updateSelectedSurgicalApproaches = (newApproaches: any) => {
    setSelectedSurgicalApproaches(newApproaches);
  };

  // Handler simples para atualizar estado quando região é selecionada
  const handleAnatomicalRegionSelect = async (region: AnatomicalRegion) => {
    console.log("Região anatômica selecionada:", region);
    setSelectedAnatomicalRegion(region);
    
    // Salvar ID da região anatômica no banco
    if (orderId) {
      await updateOrderField('anatomicalRegionId', region.id);
      console.log(`✅ Região anatômica ${region.name} (ID: ${region.id}) salva no banco`);
    }
  };
  
  // Estado de lateralidade da cirurgia (adicionado como um campo independente)
  const [procedureLaterality, setProcedureLaterality] = useState<string | null>(
    null,
  );
  const [procedureType, setProcedureType] = useState(
    PROCEDURE_TYPE_VALUES.ELETIVA,
  );
  
  // ❌ CÓDIGO LEGADO - Sistema de procedimento principal/secundário DESCONTINUADO
  // Agora usamos apenas secondaryProcedures (lista unificada)
  // O procedimento principal é determinado automaticamente pelo MAIOR PORTE
  // const [procedureQuantity, setProcedureQuantity] = useState(1);
  // const [selectedProcedure, setSelectedProcedure] =
  //   useState<LocalProcedure | null>(null);
  
  // Estados para procedimentos secundários
  const [secondaryProcedures, setSecondaryProcedures] = useState<
    SecondaryProcedure[]
  >([]);
  const [orderId, setOrderId] = useState<number | null>(null);

  // Estado para dialog de envio por email
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState<Array<{
    id: string;
    name: string;
    email: string;
    type: 'hospital' | 'fornecedor' | 'custom';
    selected: boolean;
  }>>([]);
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newRecipientEmail, setNewRecipientEmail] = useState('');

  // Estado para quebras de página forçadas do preview (IDs dos blocos que devem iniciar nova página)
  const [forcedPageBreaks, setForcedPageBreaks] = useState<Set<string>>(new Set());
  // Estados para os itens OPME e fornecedores
  const [selectedOpmeItems, setSelectedOpmeItems] = useState<OpmeItemWithAssociation[]>([]);
  // Estados para fornecedores - usando formato compatível com SurgeryData
  const [suppliers, setSuppliers] = useState<{
    supplier1: number | null;
    supplier2: number | null;
    supplier3: number | null;
  }>({ supplier1: null, supplier2: null, supplier3: null });

  // Estado para armazenar dados dos fornecedores carregados
  const [supplierData, setSupplierData] = useState<any[]>([]);

  // Estado para dados completos dos fornecedores COM associações de conduta (similar aos CIDs e OPME)
  const [supplierDetails, setSupplierDetails] = useState<Array<{
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
    isApproved?: boolean;
  }>>([]);

  // Função para buscar dados dos fornecedores
  // COMENTADO: Esta função carregava todos os fornecedores desnecessariamente ao abrir a página
  // TODO: Implementar carregamento sob demanda apenas quando necessário para o preview/PDF
  const fetchSupplierData = async () => {
    try {
      const response = await fetch("/api/suppliers/search?term=", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setSupplierData(data);
        console.log("Dados dos fornecedores carregados:", data);
      }
    } catch (error) {
      console.error("Erro ao buscar fornecedores:", error);
    }
  };

  // COMENTADO: Carregar dados dos fornecedores quando o componente monta
  // Esta chamada automática estava causando carregamento desnecessário de todos os fornecedores
  // useEffect(() => {
  //   fetchSupplierData();
  // }, []);

  // Estado para a sugestão de justificativa clínica
  const [clinicalJustification, setClinicalJustification] =
    useState<string>("");

  // Estados para observações adicionais de CBHPM, OPME e Fornecedores
  const [cbhpmAdditionalNotes, setCbhpmAdditionalNotes] = useState<string>("");
  const [opmeAdditionalNotes, setOpmeAdditionalNotes] = useState<string>("");
  const [supplierAdditionalNotes, setSupplierAdditionalNotes] = useState<string>("");

  // Estado para evitar chamadas duplicadas
  const [isLoadingPatientOrder, setIsLoadingPatientOrder] = useState(false);
  
  // Estado para controlar loading do modo de edição
  const [isLoadingEditMode, setIsLoadingEditMode] = useState(!!urlParams.get('edit'));
  
  // Estado para controlar loading de transição do passo 3 para 4 (visualização)
  const [isPreparingPreview, setIsPreparingPreview] = useState(false);
  
  // Estado para controlar loading de criação do PDF (botão Finalizar no passo 4)
  const [isCreatingPDF, setIsCreatingPDF] = useState(false);

  // Estados para o diálogo de pedido existente (RESTAURADO - usuário precisa escolher)
  const [showExistingOrderDialog, setShowExistingOrderDialog] = useState(false);
  const [existingOrderData, setExistingOrderData] = useState<any>(null);
  const [pendingPatient, setPendingPatient] = useState<Patient | null>(null);

  // Usando um valor temporário para procedureId (em produção isso seria uma seleção real)
  const [procedureId] = useState<number>(1);
  const { toast } = useToast();
  const { user } = useAuth();

  // Invalidar cache de hospitais quando a página é carregada
  // Isso garante que os hospitais atualizados no perfil sejam carregados
  useEffect(() => {
    // Invalidar cache de hospitais para garantir dados atualizados
    queryClient.invalidateQueries({ 
      queryKey: ['/api/hospitals'] 
    });
  }, []);


  // Efeito para carregar pedido em modo de edição
  useEffect(() => {
    console.log('🔍 useEffect EXECUTADO - editOrderId:', editOrderId, 'user.id:', user?.id);
    
    const loadOrderForEdit = async () => {
      if (editOrderId && user?.id) {
        console.log('🚀 OTIMIZADO: Carregando pedido para edição DIRETAMENTE:', editOrderId);
        setIsLoadingEditMode(true);
        
        try {
          console.log('⚡ OTIMIZADO: carregando tudo via loadExistingOrderOptimized incluindo dados básicos');
          // ✅ OTIMIZAÇÃO: Carregar TODOS os dados diretamente, incluindo clinicalIndication e additionalNotes
          await loadExistingOrderOptimized({ id: editOrderId } as MedicalOrder);
          console.log('✅ OTIMIZADO: TODOS os dados carregados em uma única operação');
          
          // Usar setTimeout para evitar warning de React (setState durante render)
          setTimeout(() => {
            toast({
              title: "Modo de edição",
              description: `Editando pedido #${editOrderId}`,
              duration: 3000,
            });
          }, 0);
        } catch (error) {
          console.error('❌ Erro ao carregar pedido:', error);
          // Usar setTimeout para evitar warning de React (setState durante render)
          setTimeout(() => {
            toast({
              title: "Erro",
              description: "Erro ao carregar dados do pedido",
              variant: "destructive",
            });
          }, 0);
          navigate('/orders');
        } finally {
          setIsLoadingEditMode(false);
        }
      } else {
        console.log('❌ Condição não atendida - editOrderId:', editOrderId, 'user.id:', user?.id);
        setIsLoadingEditMode(false);
      }
    };

    loadOrderForEdit();
  }, [editOrderId, user?.id, navigate, toast]);

  // Efeito para verificar e carregar pedido em andamento ou limpar o formulário
  useEffect(() => {
    // Função para verificar se existe um pedido em preenchimento
    const checkExistingOrder = async () => {
      try {
        if (user?.id) {
          console.log(
            `Verificando pedido em andamento para usuário ID: ${user.id}`,
          );

          // Buscar se há um pedido em andamento para o usuário atual
          const res = await apiRequest(
            "GET",
            API_ENDPOINTS.MEDICAL_ORDER_IN_PROGRESS,
          );
          console.log("Resposta da API:", res.status);

          if (res.status === 200) {
            const orderData = await res.json();
            // Se encontramos um pedido em andamento, carregamos seus dados
            console.log("Pedido em andamento encontrado:", orderData);
            // COMENTADO: await loadExistingOrder(orderData); // Função comentada durante unificação
            console.log('⚠️ loadExistingOrder comentada - funcionalidade desabilitada');

            toast({
              title: "Pedido em andamento recuperado",
              description: "Você pode continuar de onde parou.",
              duration: 4000,
            });
          } else if (res.status === 404) {
            // Não encontramos um pedido em andamento, limpar o formulário
            console.log("Nenhum pedido em andamento encontrado");
            resetForm();
          } else {
            console.error(`Resposta inesperada da API: ${res.status}`);
            const errorData = await res.json().catch(() => ({}));
            console.error("Detalhes do erro:", errorData);
            resetForm();
          }
        }
      } catch (error) {
        console.error("Erro ao verificar pedido em andamento:", error);
        // Se houver erro, iniciamos com formulário limpo
        resetForm();
      }
    };

    // Função para limpar o formulário
    const resetForm = () => {
      setSelectedPatient(null);
      setSelectedHospital(null);
      setAdditionalNotes("");
      // Usando apenas setExamImages para gerenciar todas as imagens de exame
      setExamImages([]);
      setMedicalReport(null);
      setClinicalIndication("");
      setCidCode("");
      setCidDescription("");
      setSelectedCidId(null);
      setProcedureType(PROCEDURE_TYPE_VALUES.ELETIVA);
      // ❌ LEGADO: setSelectedProcedure(null);
      // ❌ LEGADO: setProcedureQuantity(1);
      setSecondaryProcedures([]);
      setOrderId(null);
      setCurrentOrderData(null);
      setCbhpmAdditionalNotes("");
      setOpmeAdditionalNotes("");
    };

    // DESABILITADO: Só deve verificar DEPOIS de selecionar paciente
    // checkExistingOrder();
  }, [user?.id]);

  // Função para tratar a seleção do paciente e verificar se há pedidos em andamento
  const handlePatientSelected = async (patient: Patient) => {
    // Evitar chamadas duplicadas
    if (isLoadingPatientOrder) {
      console.log(
        "Já está carregando pedido para outro paciente, ignorando chamada duplicada",
      );
      return;
    }

    // Buscar paciente completo via API para incluir nome da operadora (insurance)
    let enrichedPatient = patient;
    try {
      const fullPatient = await apiRequest(`/api/patients/${patient.id}`, "GET");
      enrichedPatient = fullPatient;
      setSelectedPatient(fullPatient);
      console.log(
        `Paciente selecionado: ${fullPatient.fullName} (ID: ${fullPatient.id}), Convênio: ${fullPatient.insurance || 'N/A'}`,
      );
    } catch (error) {
      console.error("Erro ao buscar dados completos do paciente:", error);
      setSelectedPatient(patient);
      console.log(
        `Paciente selecionado (fallback): ${patient.fullName} (ID: ${patient.id})`,
      );
    }

    // Verificar se existe um pedido em preenchimento para este paciente
    try {
      setIsLoadingPatientOrder(true);
      console.log(
        `Verificando pedidos em preenchimento para o paciente ID: ${patient.id}`,
      );

      // Buscar se há um pedido em andamento para este paciente
      const url = API_ENDPOINTS.MEDICAL_ORDER_IN_PROGRESS_BY_PATIENT(patient.id);
      console.log("URL construída para verificação:", url);
      
      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
      });

      console.log("Status da resposta:", res.status);
      console.log("Headers da resposta:", Object.fromEntries(res.headers.entries()));

      if (res.status === 200) {
        const ordersData = await res.json();
        console.log(
          "Pedidos em andamento encontrados para o paciente:",
          ordersData,
        );

        // Se encontramos pelo menos um pedido em andamento, mostrar diálogo
        if (ordersData && ordersData.length > 0) {
          const orderData = ordersData[0]; // Pegar o primeiro pedido encontrado
          console.log(
            "Pedido existente encontrado, mostrando diálogo:",
            orderData,
          );

          // Armazenar os dados para o diálogo
          // ✅ RESTAURADO: Mostrar modal para usuário escolher
          setExistingOrderData(orderData);
          setPendingPatient(enrichedPatient);
          setShowExistingOrderDialog(true);
          
          console.log('🔄 Modal exibido - usuário pode escolher entre editar ou criar novo');

          // Não carregamos automaticamente - deixamos o usuário escolher
          return;
        }
      } else if (res.status === 404) {
        console.log("Nenhum pedido em andamento encontrado para este paciente");
        // Resetar alguns campos quando não há pedido existente
        setOrderId(null);
        // PRESERVAR ATTACHMENTS ao resetar quando há pedido existente
        // Resetando formulário
        if (currentOrderData?.attachments?.length) {
          console.log('🔍 RESET - Preservando attachments durante reset');
          setCurrentOrderData(prev => ({
            ...prev,
            id: undefined,
            // Manter apenas attachments se existirem
            attachments: prev?.attachments || []
          }));
        } else {
          setCurrentOrderData(null);
        }
      } else {
        console.log("Status inesperado:", res.status);
        const responseText = await res.text();
        console.log("Resposta completa:", responseText);
      }
    } catch (error) {
      console.error(
        "Erro ao verificar pedido em andamento para o paciente:",
        error,
      );
    } finally {
      setIsLoadingPatientOrder(false);
    }
  };

  // ✅ UNIFICAÇÃO: Função para continuar com o pedido existente (redireciona para rota unificada)
  const handleContinueExistingOrder = async () => {
    if (existingOrderData && pendingPatient) {
      console.log('🔄 UNIFICAÇÃO: Usuário escolheu continuar pedido existente - redirecionando para rota unificada');
      
      // ✅ REDIRECIONAR para rota unificada (mesmo fluxo do botão "Editar")
      navigate(`/create-order?edit=${existingOrderData.id}`);
    }
    
    // Fechar o diálogo
    setShowExistingOrderDialog(false);
    setExistingOrderData(null);
    setPendingPatient(null);
  };

  // ✅ RESTAURADO: Função para iniciar um novo pedido
  const handleStartNewOrder = () => {
    if (pendingPatient) {
      console.log('🆕 Usuário escolheu iniciar um novo pedido para:', pendingPatient.fullName);
      
      // Resetar os campos do formulário
      setOrderId(null);
      setCurrentOrderData(null);
      setClinicalIndication("");
      setCidCode("");
      setCidDescription("");
      setSelectedCidId(null);
      setAdditionalNotes("");
      setExamImages([]);
      setMedicalReport(null);
      setSelectedHospital(null);
      // ❌ LEGADO: setSelectedProcedure(null);
      // ❌ LEGADO: setProcedureQuantity(1);
      setSecondaryProcedures([]);
      setMultipleCids([]);

      // Definir o paciente selecionado
      setSelectedPatient(pendingPatient);

      toast({
        title: "Novo pedido iniciado",
        description: `Iniciando um novo pedido para ${pendingPatient.fullName}`,
        duration: 2000,
      });
    }

    // Fechar o diálogo
    setShowExistingOrderDialog(false);
    setExistingOrderData(null);
    setPendingPatient(null);
  };

  // Efeito para verificar e carregar pedido em andamento ou limpar o formulário
  useEffect(() => {
    // Função para verificar se existe um pedido em preenchimento
    const checkExistingOrder = async () => {
      try {
        if (user?.id) {
          console.log(
            `Verificando pedido em andamento para usuário ID: ${user.id}`,
          );

          // Buscar se há um pedido em andamento para o usuário atual
          const res = await apiRequest(
            "GET",
            API_ENDPOINTS.MEDICAL_ORDER_IN_PROGRESS,
          );
          console.log("Resposta da API:", res.status);

          if (res.status === 200) {
            const orderData = await res.json();
            // Se encontramos um pedido em andamento, carregamos seus dados
            console.log("Pedido em andamento encontrado:", orderData);
            // COMENTADO: await loadExistingOrder(orderData); // Função comentada durante unificação
            console.log('⚠️ loadExistingOrder comentada - funcionalidade desabilitada');

            toast({
              title: "Pedido em andamento recuperado",
              description: "Você pode continuar de onde parou.",
              duration: 4000,
            });
          } else if (res.status === 404) {
            // Não encontramos um pedido em andamento, limpar o formulário
            console.log("Nenhum pedido em andamento encontrado");
            resetForm();
          } else {
            console.error(`Resposta inesperada da API: ${res.status}`);
            const errorData = await res.json().catch(() => ({}));
            console.error("Detalhes do erro:", errorData);
            resetForm();
          }
        }
      } catch (error) {
        console.error("Erro ao verificar pedido em andamento:", error);
        // Se houver erro, iniciamos com formulário limpo
        resetForm();
      }
    };

    // Função para limpar o formulário
    const resetForm = () => {
      setSelectedPatient(null);
      setSelectedHospital(null);
      setAdditionalNotes("");
      // Usando apenas setExamImages para gerenciar todas as imagens de exame
      setExamImages([]);
      setMedicalReport(null);
      setClinicalIndication("");
      setCidCode("");
      setCidDescription("");
      setSelectedCidId(null);
      setProcedureType(PROCEDURE_TYPE_VALUES.ELETIVA);
      // ❌ LEGADO: setSelectedProcedure(null);
      // ❌ LEGADO: setProcedureQuantity(1);
      setSecondaryProcedures([]);
      setOrderId(null);
      setCurrentOrderData(null);
      setCbhpmAdditionalNotes("");
      setOpmeAdditionalNotes("");
    };

    // DESABILITADO: Só deve verificar DEPOIS de selecionar paciente
    // checkExistingOrder();
  }, [user?.id]);

  // Função OTIMIZADA para carregar TODOS os dados de uma só vez incluindo dados básicos
  const loadExistingOrderOptimized = async (order: MedicalOrder) => {
    console.log(`🚀 OTIMIZADO: Carregando TODOS os dados para pedido ${order.id} em uma única operação`);
    setOrderId(order.id);
    const currentOrderId = order.id;

    try {
      // **ETAPA 1: DADOS BÁSICOS DO PEDIDO** - Primeiro para obter IDs necessários
      console.log('📋 ETAPA 1: Carregando dados básicos do pedido...');
      
      // Invalidar cache para garantir dados frescos
      await queryClient.invalidateQueries({ queryKey: [`/api/medical-orders/${currentOrderId}`] });
      
      const orderBasicData = await apiRequest(`/api/medical-orders/${currentOrderId}`, "GET");
      
      if (!orderBasicData) {
        throw new Error('Pedido médico não encontrado');
      }

      console.log('✅ DADOS BÁSICOS carregados:', {
        clinicalIndication: orderBasicData.clinicalIndication,
        additionalNotes: orderBasicData.additionalNotes,
        clinicalJustification: orderBasicData.clinicalJustification,
        patientId: orderBasicData.patientId,
        hospitalId: orderBasicData.hospitalId,
        anatomicalRegionId: orderBasicData.anatomicalRegionId
      });

      // **ETAPA 2: DADOS DO PACIENTE E HOSPITAL** - Usando IDs obtidos na ETAPA 1
      console.log('👤 ETAPA 2: Carregando paciente e hospital...');
      const [patientData, hospitalData] = await Promise.all([
        apiRequest(`/api/patients/${orderBasicData.patientId}`, "GET"),
        apiRequest(`/api/hospitals/${orderBasicData.hospitalId}`, "GET")
      ]);
      
      if (patientData) {
        setSelectedPatient(patientData);
        console.log(`✅ Paciente carregado: ${patientData.fullName}`);
      }
      
      if (hospitalData) {
        setSelectedHospital(hospitalData);
        console.log(`✅ Hospital carregado: ${hospitalData.name}`);
      }
      
      // Aplicar dados básicos ao estado
      setClinicalIndication(orderBasicData.clinicalIndication || "");
      setAdditionalNotes(orderBasicData.additionalNotes || "");
      setProcedureType(orderBasicData.procedureType || PROCEDURE_TYPE_VALUES.ELETIVA);
      
      if (orderBasicData.procedureLaterality) {
        setProcedureLaterality(orderBasicData.procedureLaterality);
      }
      if (orderBasicData.clinicalJustification) {
        setClinicalJustification(orderBasicData.clinicalJustification);
        console.log('📄 JUSTIFICATIVA CLÍNICA carregada do banco:', {
          comprimento: orderBasicData.clinicalJustification.length,
          preview: orderBasicData.clinicalJustification.substring(0, 100) + '...'
        });
      } else {
        console.log('⚠️ JUSTIFICATIVA CLÍNICA não encontrada ou vazia no banco de dados');
      }
      
      // Carregar observações adicionais de CBHPM, OPME e Fornecedores
      if (orderBasicData.cbhpmAdditionalNotes) {
        setCbhpmAdditionalNotes(orderBasicData.cbhpmAdditionalNotes);
        console.log('📋 CBHPM Notes carregados:', orderBasicData.cbhpmAdditionalNotes.substring(0, 50) + '...');
      }
      if (orderBasicData.opmeAdditionalNotes) {
        setOpmeAdditionalNotes(orderBasicData.opmeAdditionalNotes);
        console.log('📋 OPME Notes carregados:', orderBasicData.opmeAdditionalNotes.substring(0, 50) + '...');
      }
      if (orderBasicData.supplierAdditionalNotes) {
        setSupplierAdditionalNotes(orderBasicData.supplierAdditionalNotes);
        console.log('📋 Supplier Notes carregados:', orderBasicData.supplierAdditionalNotes.substring(0, 50) + '...');
      }
      
      // Carregar região anatômica se existir
      if (orderBasicData.anatomicalRegionId) {
        try {
          const regionData = await apiRequest(`/api/anatomical-regions/${orderBasicData.anatomicalRegionId}`, "GET");
          if (regionData) {
            setSelectedAnatomicalRegion(regionData);
            console.log(`✅ Região anatômica carregada: ${regionData.name} (ID: ${orderBasicData.anatomicalRegionId})`);
          }
        } catch (error) {
          console.error('⚠️ Erro ao carregar região anatômica:', error);
        }
      }
      
      if (orderBasicData.attachments) {
        console.log('📎 ATTACHMENTS carregados:', {
          quantidade: orderBasicData.attachments.length,
          attachments: orderBasicData.attachments
        });
        setCurrentOrderData(prev => ({
          ...prev,
          id: orderBasicData.id,
          attachments: orderBasicData.attachments as UnifiedAttachment[]
        }));
        console.log('✅ ATTACHMENTS aplicados ao estado currentOrderData');
      } else {
        console.log('ℹ️ Nenhum attachment encontrado para o pedido');
      }

      // **ETAPA 3: CARREGAR CONDUTAS E PROCEDIMENTOS CIRÚRGICOS (já vêm no orderBasicData)**
      console.log('⚡ ETAPA 3: Processando condutas e procedimentos cirúrgicos...');
      
      // 1. Condutas Cirúrgicas - JÁ VÊM no orderBasicData.surgicalApproaches COM surgicalProcedureId (sem chamada API extra!)
      const surgicalApproaches = orderBasicData.surgicalApproaches || [];
      if (surgicalApproaches.length > 0) {
        console.log(`✅ REUTILIZADO: ${surgicalApproaches.length} condutas do orderBasicData (sem chamada API extra)`);
        console.log('📋 Condutas brutas do backend:', surgicalApproaches.map((sa: any) => ({
          id: sa.id,
          name: sa.name,
          surgicalProcedureId: sa.surgicalProcedureId,
          procedureName: sa.procedureName
        })));
        
        const conductApproaches = surgicalApproaches.map((sa: any) => ({
          surgicalProcedureId: sa.surgicalProcedureId || null,
          surgicalApproachId: sa.id,
          approachName: sa.name,
          procedureName: sa.procedureName || "Procedimento não definido",
          isPrimary: sa.isPrimary || false
        }));
        
        setSelectedSurgicalApproaches(conductApproaches);
        console.log(`✅ REUTILIZADO: Estado selectedSurgicalApproaches atualizado:`, conductApproaches);
      }

      // 3. Procedimentos Cirúrgicos - JÁ VÊM no orderBasicData.surgicalProcedures (sem chamada API extra!)
      const surgicalProcedures = orderBasicData.surgicalProcedures || [];
      if (surgicalProcedures.length > 0) {
        console.log(`✅ REUTILIZADO: ${surgicalProcedures.length} procedimentos cirúrgicos do orderBasicData (sem chamada API extra)`);
        
        const proceduresData = surgicalProcedures.map((sp: any) => ({
          id: sp.id,
          surgicalProcedureId: sp.surgicalProcedureId,
          name: sp.procedureName,
          description: sp.procedureDescription || '',
          isMain: sp.isMain || false
        }));
        
        setSelectedSurgicalProcedures(proceduresData);
        console.log(`✅ REUTILIZADO: Estado selectedSurgicalProcedures atualizado:`, proceduresData);
      }

      // **ETAPA 4: TODAS AS CHAMADAS EM PARALELO (CIDs, CBHPM, OPME, Fornecedores)**
      console.log('⚡ ETAPA 4: Carregando todos os dados relacionais em paralelo (4 chamadas)...');
      
      // Usar Promise.allSettled para capturar erros individuais sem interromper as outras chamadas
      const [
        cidResult,
        proceduresResult,
        opmeResult,
        suppliersResult
      ] = await Promise.allSettled([
        apiRequest(`/api/orders/${currentOrderId}/cids`, "GET"),
        apiRequest(`/api/orders/${currentOrderId}/procedures`, "GET"),
        apiRequest(`/api/orders/${currentOrderId}/opme-items`, "GET"),
        apiRequest(`/api/orders/${currentOrderId}/suppliers`, "GET")
      ]);
      
      // Extrair dados com tratamento de erros individual
      let cidData: any[] = [];
      let cidLoadFailed = false;
      if (cidResult.status === 'fulfilled') {
        cidData = cidResult.value || [];
      } else {
        cidLoadFailed = true;
        console.error('❌ Erro ao carregar CIDs com associações:', cidResult.reason);
      }
      
      const procedures = proceduresResult.status === 'fulfilled' ? proceduresResult.value : [];
      const opmeItems = opmeResult.status === 'fulfilled' ? opmeResult.value : [];
      const suppliers = suppliersResult.status === 'fulfilled' ? suppliersResult.value : [];
      
      if (proceduresResult.status === 'rejected') console.error('❌ Erro ao carregar procedimentos:', proceduresResult.reason);
      if (opmeResult.status === 'rejected') console.error('❌ Erro ao carregar OPME:', opmeResult.reason);
      if (suppliersResult.status === 'rejected') console.error('❌ Erro ao carregar fornecedores:', suppliersResult.reason);

      console.log(`✅ OTIMIZADO: 4 chamadas API executadas em paralelo!`);

      // 1. Processar CIDs com associações cirúrgicas - NORMALIZADO
      if (cidData && cidData.length > 0) {
        // Converter formato backend (surgicalApproach/surgicalProcedure) para formato frontend (sourceApproachId/etc)
        const cidsWithAssociations = cidData.map((cidItem: any) => {
          let sourceApproachId = cidItem.surgicalApproach?.id || null;
          let sourceApproachName = cidItem.surgicalApproach?.name || null;
          const sourceProcedureId = cidItem.surgicalProcedure?.id || null;
          const sourceProcedureName = cidItem.surgicalProcedure?.name || null;
          
          // CORREÇÃO DE DADOS LEGADOS: Inferir approach a partir do procedure
          if (!sourceApproachId && sourceProcedureId && surgicalApproaches && surgicalApproaches.length > 0) {
            const matchingApproach = surgicalApproaches.find((sa: any) => 
              sa.surgicalProcedureId === sourceProcedureId
            );
            
            if (matchingApproach) {
              sourceApproachId = matchingApproach.id;
              sourceApproachName = matchingApproach.name;
              console.log(`🔧 CORREÇÃO: CID ${cidItem.cid?.code} inferiu approachId=${sourceApproachId} a partir do procedureId=${sourceProcedureId}`);
            }
          }
          
          return {
            cid: cidItem.cid || cidItem,
            // Formato normalizado do frontend
            sourceApproachId,
            sourceApproachName,
            sourceProcedureId,
            sourceProcedureName
          };
        });
        
        setMultipleCids(cidsWithAssociations);
        setCidsWithSurgicalApproachesLoaded(true);
        
        const firstCid = cidData[0]?.cid || cidData[0];
        setCidCode(firstCid.code || "");
        setCidDescription(firstCid.description || "");
        setSelectedCidId(firstCid.id);
        
        console.log(`✅ CIDs carregados com associações cirúrgicas: ${cidData.length} CIDs`);
        console.log('📋 CIDs detalhados:', cidsWithAssociations.map((c: any) => ({
          cidId: c.cid?.id,
          code: c.cid?.code,
          surgicalApproachId: c.surgicalApproach?.id,
          surgicalProcedureId: c.surgicalProcedure?.id
        })));
      } else if (cidLoadFailed) {
        // Fallback para orderBasicData.cidCodes APENAS se a API falhou (não se retornou vazio)
        const fallbackCids = orderBasicData.cidCodes || [];
        if (fallbackCids.length > 0) {
          setMultipleCids(fallbackCids.map((cid: any) => ({ cid })));
          console.log(`⚠️ Usando fallback: ${fallbackCids.length} CIDs sem associações (API falhou)`);
        }
      }

      // 2. Carregar procedimentos CBHPM - SISTEMA UNIFICADO
      if (procedures && procedures.length > 0) {
        console.log(`✅ OTIMIZADO: ${procedures.length} procedimentos encontrados - aplicando sistema unificado`);
        console.log('📋 PROCEDIMENTOS CARREGADOS:', procedures.map(p => ({
          id: p.procedure?.id,
          codigo: p.procedure?.code,
          descricao: p.procedure?.description,
          porte: p.procedure?.porte,
          quantidade: p.quantity
        })));
        
        // IMPORTANTE: Manter ordem original de inserção dos procedimentos
        // A ordenação por porte acontece apenas na visualização (preview), dentro de cada grupo
        
        // Carregar TODOS os procedimentos como lista unificada (convertendo associações para formato esperado)
        const allProceduresData = procedures.map((p: any) => {
          // Converter formato backend para formato frontend
          // Backend retorna: surgicalApproachId, surgicalApproachName, surgicalProcedureId, surgicalProcedureName (campos separados)
          // OU: surgicalApproach: { id, name }, surgicalProcedure: { id, name } (objetos aninhados)
          const procedureWithAssociations = {
            ...p.procedure,
            // Adicionar campos de associação no formato esperado pelo frontend
            sourceApproachId: p.surgicalApproach?.id || p.surgicalApproachId || null,
            sourceApproachName: p.surgicalApproach?.name || p.surgicalApproachName || null,
            sourceProcedureId: p.surgicalProcedure?.id || p.surgicalProcedureId || null,
            sourceProcedureName: p.surgicalProcedure?.name || p.surgicalProcedureName || null
          };
          
          return {
            procedure: procedureWithAssociations,
            quantity: p.quantity || 1,
            // Também adicionar objetos no nível do item para compatibilidade com PDF
            surgicalApproach: p.surgicalApproach || (p.surgicalApproachId ? { id: p.surgicalApproachId, name: p.surgicalApproachName } : null),
            surgicalProcedure: p.surgicalProcedure || (p.surgicalProcedureId ? { id: p.surgicalProcedureId, name: p.surgicalProcedureName } : null)
          };
        });
        
        setSecondaryProcedures(allProceduresData);
        console.log(`✅ OTIMIZADO: ${allProceduresData.length} procedimentos CBHPM carregados com associações cirúrgicas`);
        console.log('📋 Procedimentos com associações:', allProceduresData.map(p => ({
          codigo: p.procedure.code,
          sourceApproachId: p.procedure.sourceApproachId,
          sourceApproachName: p.procedure.sourceApproachName,
          sourceProcedureName: p.procedure.sourceProcedureName
        })));
        
        // ❌ LEGADO: Limpeza de estados de procedimento principal (descontinuado)
        // setSelectedProcedure(null);
        // setProcedureQuantity(1);
      }

      // 3. Carregar itens OPME (convertendo associações para formato esperado)
      // CORREÇÃO: Inferir sourceApproachId a partir de sourceProcedureId quando approach não está definido
      if (opmeItems && opmeItems.length > 0) {
        const opmeItemsWithAssociations = opmeItems.map((opmeEntry: any) => {
          let sourceApproachId = opmeEntry.surgicalApproach?.id || null;
          let sourceApproachName = opmeEntry.surgicalApproach?.name || null;
          const sourceProcedureId = opmeEntry.surgicalProcedure?.id || null;
          const sourceProcedureName = opmeEntry.surgicalProcedure?.name || null;
          
          // CORREÇÃO DE DADOS LEGADOS: Inferir approach a partir do procedure
          if (!sourceApproachId && sourceProcedureId && surgicalApproaches && surgicalApproaches.length > 0) {
            const matchingApproach = surgicalApproaches.find((sa: any) => 
              sa.surgicalProcedureId === sourceProcedureId
            );
            
            if (matchingApproach) {
              sourceApproachId = matchingApproach.id;
              sourceApproachName = matchingApproach.name;
              console.log(`🔧 CORREÇÃO: Item OPME ${opmeEntry.item?.technicalName} inferiu approachId=${sourceApproachId} a partir do procedureId=${sourceProcedureId}`);
            }
          }
          
          // Converter formato backend para formato frontend
          const itemWithAssociations = {
            ...opmeEntry.item,
            // Adicionar campos de associação no formato esperado pelo frontend
            sourceApproachId,
            sourceApproachName,
            sourceProcedureId,
            sourceProcedureName
          };
          
          return {
            item: itemWithAssociations,
            quantity: opmeEntry.quantity
          };
        });
        
        setSelectedOpmeItems(opmeItemsWithAssociations);
        console.log(`✅ OTIMIZADO: ${opmeItems.length} itens OPME carregados com associações cirúrgicas`);
        console.log('🏥 ITENS OPME com associações:', opmeItemsWithAssociations.map(item => ({
          id: item.item?.id,
          technicalName: item.item?.technicalName,
          sourceApproachId: item.item?.sourceApproachId,
          sourceApproachName: item.item?.sourceApproachName,
          sourceProcedureName: item.item?.sourceProcedureName
        })));
      }

      // 4. Carregar fornecedores (convertendo associações para formato esperado)
      if (suppliers && suppliers.length > 0) {
        // Converter formato backend (surgicalApproach/surgicalProcedure) para formato frontend (sourceApproachId/etc)
        // CORREÇÃO: Inferir sourceApproachId a partir de sourceProcedureId quando approach não está definido
        const suppliersWithAssociations = suppliers.map((supplierEntry: any) => {
          let sourceApproachId = supplierEntry.surgicalApproach?.id || null;
          let sourceApproachName = supplierEntry.surgicalApproach?.name || null;
          const sourceProcedureId = supplierEntry.surgicalProcedure?.id || null;
          const sourceProcedureName = supplierEntry.surgicalProcedure?.name || null;
          
          // CORREÇÃO DE DADOS LEGADOS: Se temos procedimento mas não temos approach,
          // tentar inferir o approach a partir das condutas do pedido
          if (!sourceApproachId && sourceProcedureId && surgicalApproaches && surgicalApproaches.length > 0) {
            // Buscar a conduta que corresponde a este procedimento
            const matchingApproach = surgicalApproaches.find((sa: any) => 
              sa.surgicalProcedureId === sourceProcedureId
            );
            
            if (matchingApproach) {
              sourceApproachId = matchingApproach.id;
              sourceApproachName = matchingApproach.name;
              console.log(`🔧 CORREÇÃO: Fornecedor inferiu approachId=${sourceApproachId} (${sourceApproachName}) a partir do procedureId=${sourceProcedureId}`);
            }
          }
          
          return {
            id: supplierEntry.supplier?.id || supplierEntry.id,
            companyName: supplierEntry.supplier?.name || supplierEntry.supplier?.companyName || supplierEntry.companyName,
            tradeName: supplierEntry.supplier?.tradeName || supplierEntry.tradeName,
            cnpj: supplierEntry.supplier?.cnpj || supplierEntry.cnpj,
            phone: supplierEntry.supplier?.phone || supplierEntry.phone,
            email: supplierEntry.supplier?.email || supplierEntry.email,
            address: supplierEntry.supplier?.address || supplierEntry.address,
            // Adicionar campos de associação no formato esperado pelo frontend
            sourceApproachId,
            sourceApproachName,
            sourceProcedureId,
            sourceProcedureName,
            isApproved: supplierEntry.isApproved || false
          };
        });
        
        setSupplierDetails(suppliersWithAssociations);
        
        // Manter compatibilidade com formato legado (primeiro 3 fornecedores únicos)
        const uniqueSupplierIds = [...new Set(suppliersWithAssociations.map((s: any) => s.id))].slice(0, 3);
        setSuppliers({
          supplier1: uniqueSupplierIds[0] || null,
          supplier2: uniqueSupplierIds[1] || null,
          supplier3: uniqueSupplierIds[2] || null,
        });
        
        console.log(`✅ OTIMIZADO: ${suppliers.length} fornecedores carregados com associações cirúrgicas`);
        console.log('🏢 FORNECEDORES com associações:', suppliersWithAssociations.map((s: any) => ({
          id: s.id,
          companyName: s.companyName,
          sourceApproachId: s.sourceApproachId,
          sourceApproachName: s.sourceApproachName,
          sourceProcedureName: s.sourceProcedureName
        })));
        
        // 4.1 Carregar fabricantes associados aos fornecedores (se houver)
        try {
          const manufacturersResponse = await fetch(`/api/medical-orders/${currentOrderId}/suppliers-with-manufacturers`, {
            credentials: 'include',
          });
          
          if (manufacturersResponse.ok) {
            const manufacturersData = await manufacturersResponse.json();
            console.log(`✅ OTIMIZADO: Fabricantes carregados para pedido ${currentOrderId}:`, manufacturersData);
          }
        } catch (error) {
          console.log(`ℹ️ OTIMIZADO: Nenhum fabricante encontrado para pedido ${currentOrderId}`);
        }
      }

      // 5. Carregar procedimentos cirúrgicos
      if (surgicalProcedures && surgicalProcedures.length > 0) {
        const proceduresData = surgicalProcedures.map((sp: any) => ({
          id: sp.surgicalProcedureId,
          name: sp.procedureName,
          description: sp.procedureDescription,
          isMain: sp.isMain
        }));
        setSelectedSurgicalProcedures(proceduresData);
        console.log(`✅ OTIMIZADO: ${surgicalProcedures.length} procedimentos cirúrgicos carregados`);
      }

      // ✅ REMOVIDO: Paciente, hospital e dados básicos já carregados nas ETAPAS 1 e 2

      console.log(`🎉 OTIMIZADO: TODOS os dados carregados com sucesso para pedido ${order.id}`);

    } catch (error) {
      console.error("Erro no carregamento otimizado:", error);
    }
  };

  // COMENTADO: Função para carregar pedido existente (UNIFICAÇÃO - usando loadExistingOrderOptimized)
  // Esta função foi substituída pelo fluxo unificado que usa loadExistingOrderOptimized
  const loadExistingOrder_COMENTADO = async (order: MedicalOrder) => {
    console.log(`🔄 INICIANDO loadExistingOrder para pedido ${order.id}`);
    console.log("Carregando pedido existente:", order);
    setOrderId(order.id);

    // Usar order.id diretamente em vez de orderId (que ainda não foi atualizado)
    const currentOrderId = order.id;

    // Carregar dados relacionais diretamente no modo de edição
    try {
      console.log(`=== MODO EDIÇÃO: Carregando dados relacionais para pedido ${currentOrderId} ===`);

      // 1. Carregar CIDs salvos
      try {
        const cidData = await apiRequest(`/api/orders/${currentOrderId}/cids`, "GET");
        if (cidData && cidData.length > 0) {
          console.log(`MODO EDIÇÃO: CIDs salvos encontrados: ${cidData.length} CIDs`);
          console.log(`MODO EDIÇÃO: Dados dos CIDs recebidos:`, cidData);
          
          // Carregar condutas cirúrgicas associadas a este pedido
          try {
            const surgicalApproaches = await apiRequest(`/api/medical-order-surgical-approaches/order/${currentOrderId}`, "GET");
            console.log(`MODO EDIÇÃO: Condutas cirúrgicas encontradas:`, surgicalApproaches);
            
            // Combinar CIDs com suas condutas cirúrgicas
            const enrichedCids = cidData.map((cid: any) => {
              // Primeiro tentar encontrar a conduta principal, senão pegar qualquer conduta disponível
              const primaryApproach = surgicalApproaches?.find((sa: any) => sa.is_primary);
              const anyApproach = surgicalApproaches?.length > 0 ? surgicalApproaches[0] : null;
              const selectedApproach = primaryApproach || anyApproach;
              

              
              return {
                cid,
                surgicalApproach: selectedApproach ? {
                  id: selectedApproach.surgicalApproachId,
                  name: selectedApproach.surgicalApproachName,
                  description: selectedApproach.surgicalApproachDescription,
                  isPrimary: selectedApproach.isPrimary
                } : undefined
              };
            });
            
            setMultipleCids(enrichedCids);
            setCidsWithSurgicalApproachesLoaded(true); // Marcar que CIDs com condutas foram carregados
            console.log(`MODO EDIÇÃO: CIDs com condutas carregados:`, enrichedCids);
          } catch (approachError) {
            console.warn("MODO EDIÇÃO: Erro ao carregar condutas cirúrgicas, continuando só com CIDs:", approachError);
            // Fallback: carregar apenas os CIDs
            setMultipleCids(cidData.map((cid: any) => ({ cid })));
          }
          
          const firstCid = cidData[0];
          setCidCode(firstCid.code || "");
          setCidDescription(firstCid.description || "");
          setSelectedCidId(firstCid.id);
          console.log(`MODO EDIÇÃO: CID principal carregado: ${firstCid.code}`);
        }
      } catch (error) {
        console.error("MODO EDIÇÃO: Erro ao carregar CIDs:", error);
      }

      // 2. Carregar procedimentos salvos
      try {
        const procedures = await apiRequest(`/api/orders/${currentOrderId}/procedures`, "GET");
        console.log(`MODO EDIÇÃO FUNÇÃO 1: Response from /api/orders/${currentOrderId}/procedures:`, procedures);
        
        if (procedures && procedures.length > 0) {
          console.log(`MODO EDIÇÃO: Procedimentos salvos encontrados: ${procedures.length} procedimentos`);
          
          // IMPORTANTE: Manter ordem original de inserção dos procedimentos
          // A ordenação por porte acontece apenas na visualização (preview), dentro de cada grupo
          
          // Carregar todos os procedimentos como secundários na lista unificada (preservando associações cirúrgicas e ordem original)
          const allProceduresData = procedures.map((p: any) => ({
            procedure: p.procedure,
            quantity: p.quantity || 1,
            surgicalApproach: p.surgicalApproach || null,
            surgicalProcedure: p.surgicalProcedure || null
          }));
          
          console.log(`MODO EDIÇÃO: Carregando ${allProceduresData.length} procedimentos em lista unificada`);
          setSecondaryProcedures(allProceduresData);
          
          // ❌ LEGADO: Limpeza de estados de procedimento principal (descontinuado)
          // setSelectedProcedure(null);
          // setProcedureQuantity(1);
          
          console.log(`MODO EDIÇÃO: Todos os procedimentos carregados em lista unificada`);
        } else {
          console.log(`MODO EDIÇÃO: Nenhum procedimento encontrado para pedido ${currentOrderId}`);
        }
      } catch (error) {
        console.error("MODO EDIÇÃO: Erro ao carregar procedimentos:", error);
      }

      // 3. Carregar fornecedores salvos - CORRIGIDO para objetos completos com associações de conduta
      try {
        const supplierData = await apiRequest(`/api/orders/${currentOrderId}/suppliers`, "GET");
        
        // Também carregar condutas para poder inferir approachId quando faltando
        let orderApproaches: any[] = [];
        try {
          orderApproaches = await apiRequest(`/api/medical-order-surgical-approaches/order/${currentOrderId}`, "GET");
          console.log(`MODO EDIÇÃO: Condutas carregadas para inferência: ${orderApproaches?.length || 0}`);
        } catch (e) {
          console.log(`MODO EDIÇÃO: Nenhuma conduta encontrada para inferência`);
        }
        
        if (supplierData && supplierData.length > 0) {
          console.log(`MODO EDIÇÃO: Fornecedores salvos encontrados: ${supplierData.length} fornecedores`);
          console.log(`MODO EDIÇÃO: Dados dos fornecedores recebidos:`, supplierData);
          
          // Mapear dados do backend para o formato esperado pelo frontend
          // CORREÇÃO: Inferir sourceApproachId a partir de sourceProcedureId quando approach não está definido
          const mappedSuppliers = supplierData.map((item: any) => {
            // Formato: { supplier: {...}, surgicalApproach: {...}, surgicalProcedure: {...} }
            const supplier = item.supplier || item;
            
            let sourceApproachId = item.surgicalApproach?.id || null;
            let sourceApproachName = item.surgicalApproach?.name || null;
            const sourceProcedureId = item.surgicalProcedure?.id || null;
            const sourceProcedureName = item.surgicalProcedure?.name || null;
            
            // CORREÇÃO DE DADOS LEGADOS: Inferir approach a partir do procedure
            if (!sourceApproachId && sourceProcedureId && orderApproaches && orderApproaches.length > 0) {
              const matchingApproach = orderApproaches.find((sa: any) => 
                sa.surgicalProcedureId === sourceProcedureId
              );
              
              if (matchingApproach) {
                sourceApproachId = matchingApproach.id;
                sourceApproachName = matchingApproach.name;
                console.log(`🔧 CORREÇÃO EDIÇÃO: Fornecedor ${supplier.name || supplier.companyName} inferiu approachId=${sourceApproachId} a partir do procedureId=${sourceProcedureId}`);
              }
            }
            
            return {
              id: supplier.id,
              companyName: supplier.name || supplier.companyName,
              tradeName: supplier.tradeName || supplier.name,
              cnpj: supplier.cnpj,
              phone: supplier.phone,
              email: supplier.email,
              isApproved: item.isApproved || false,
              // Associações de conduta para agrupamento
              sourceApproachId,
              sourceApproachName,
              sourceProcedureId,
              sourceProcedureName
            };
          });
          
          // Atualizar primeiro os detalhes completos
          setSupplierDetails(mappedSuppliers);
          
          // Em seguida, definir os IDs para sincronização
          setSuppliers({
            supplier1: mappedSuppliers[0]?.id || null,
            supplier2: mappedSuppliers[1]?.id || null,
            supplier3: mappedSuppliers[2]?.id || null
          });
          
          console.log(`MODO EDIÇÃO: Fornecedores carregados:`, mappedSuppliers.map((s: any) => s.companyName).join(', '));
          console.log(`MODO EDIÇÃO: Fornecedores com conduta:`, mappedSuppliers.filter((s: any) => s.sourceApproachId).length);
        }
      } catch (error) {
        console.error("MODO EDIÇÃO: Erro ao carregar fornecedores:", error);
      }

      // 4. Carregar itens OPME salvos
      try {
        const opmeItems = await apiRequest(`/api/orders/${currentOrderId}/opme-items`, "GET");
        if (opmeItems && opmeItems.length > 0) {
          console.log(`MODO EDIÇÃO: Itens OPME salvos encontrados: ${opmeItems.length} itens`);
          
          // A API já retorna dados completos, não precisamos fazer chamadas individuais
          setSelectedOpmeItems(opmeItems);
          console.log(`MODO EDIÇÃO: Itens OPME carregados: ${opmeItems.length} itens`);
        }
      } catch (error) {
        console.error("MODO EDIÇÃO: Erro ao carregar itens OPME:", error);
      }

      console.log("MODO EDIÇÃO: Carregamento de dados relacionais concluído");
    } catch (error) {
      console.error("MODO EDIÇÃO: Erro geral ao carregar dados relacionais:", error);
    }

    // Recuperar dados do paciente
    if (order.patientId) {
      try {
        console.log(`Buscando paciente com ID ${order.patientId}`);
        const patient = await apiRequest(
          API_ENDPOINTS.PATIENT_BY_ID(order.patientId),
          "GET",
        );
        console.log("Paciente encontrado:", patient);
        setSelectedPatient(patient);
      } catch (error) {
        console.error("Erro ao buscar dados do paciente:", error);
      }
    }

    // Recuperar dados do hospital de forma robusta
    if (order.hospitalId) {
      try {
        console.log(`Buscando hospital com ID ${order.hospitalId}`);

        // Primeiro tenta com a API dedicada
        const res = await apiRequest(
          API_ENDPOINTS.HOSPITAL_BY_ID(order.hospitalId),
          "GET",
        );

        const hospital = res;
        console.log("Hospital encontrado via API específica:", hospital);
        if (hospital && hospital.id) {
          setSelectedHospital(hospital);
        } else {
          console.warn("Hospital retornado sem ID:", hospital);
          await buscarHospitalAlternativo(order.hospitalId);
        }
      } catch (error) {
        console.error("Erro ao buscar dados do hospital:", error);
        await buscarHospitalAlternativo(order.hospitalId);
      }
    }

    // Função auxiliar para buscar hospital por método alternativo
    async function buscarHospitalAlternativo(hospitalId: number) {
      try {
        console.log("Buscando hospital via API de lista...");
        // Buscar todos os hospitais e encontrar o correto por ID
        const allHospitalsRes = await apiRequest(
          "GET",
          API_ENDPOINTS.HOSPITALS,
        );

        if (allHospitalsRes.ok) {
          const hospitals = await allHospitalsRes.json();
          const matchingHospital = hospitals.find(
            (h: any) => h.id === hospitalId,
          );

          if (matchingHospital) {
            console.log("Hospital encontrado via lista:", matchingHospital);
            setSelectedHospital(matchingHospital);
          } else {
            console.error(
              `Hospital com ID ${hospitalId} não encontrado na lista de hospitais`,
            );
          }
        } else {
          console.error(
            "Erro ao buscar lista de hospitais, status:",
            allHospitalsRes.status,
          );
        }
      } catch (error) {
        console.error("Erro ao buscar lista de hospitais:", error);
      }
    }

    // Recuperar outros dados do pedido
    setClinicalIndication(order.clinicalIndication || "");
    setAdditionalNotes(order.additionalNotes || "");
    setProcedureType(order.procedureType || PROCEDURE_TYPE_VALUES.ELETIVA);
    // ❌ LEGADO: setProcedureQuantity((order as any).procedureCbhpmQuantity || 1);

    // Recuperar dados de lateralidade
    console.log("Carregando lateralidade do procedimento do banco de dados:", {
      procedureLaterality: order.procedureLaterality,
      procedureLateralityType: typeof order.procedureLaterality,
    });

    // Garantir que valores nulos ou undefined sejam tratados corretamente
    // O PostgreSQL retorna null para valores nulos, então precisamos fazer essa verificação
    // Campo cidLaterality foi removido conforme solicitado
    // ❌ LEGADO: setCidLaterality(null);

    if (
      order.procedureLaterality !== null &&
      order.procedureLaterality !== undefined
    ) {
      setProcedureLaterality(order.procedureLaterality);
    } else {
      setProcedureLaterality(null);
    }

    // Processar URLs das imagens do exame (sistema legado)
    const examImageUrls = Array.isArray((order as any).exam_images_url) ? (order as any).exam_images_url : [];
    setImageUrls(examImageUrls);
    console.log(`Carregadas ${examImageUrls.length} URLs de imagens de exame`);

    // Processar URLs dos laudos médicos (sistema legado)
    const medicalReportUrls = Array.isArray((order as any).medical_report_url) ? (order as any).medical_report_url : [];
    setMedicalReportUrls(medicalReportUrls);
    console.log(`Carregadas ${medicalReportUrls.length} URLs de laudos médicos`);
    
    // Limpar estados de arquivos locais se há dados do servidor
    if (examImageUrls.length > 0) {
      setExamImages([]);
    }
    if (medicalReportUrls.length > 0) {
      setMedicalReports([]);
    }

    // REMOVIDO: Duplicação de setCurrentOrderData - será feito no final da função

    // Carregar TODOS os dados relacionais de uma vez
    const loadAllRelationalData = async () => {
      try {
        console.log(`=== Carregando dados relacionais para pedido ${order.id} ===`);

        // 1. Carregar CIDs salvos (apenas se não foram carregados no modo edição)
        try {
          const cidData = await apiRequest(`/api/orders/${order.id}/cids`, "GET");
          if (cidData && cidData.length > 0) {
            console.log(`CIDs salvos encontrados: ${cidData.length} CIDs`);
            
            // Verificar se já temos CIDs carregados do modo edição (com condutas cirúrgicas)
            if (!cidsWithSurgicalApproachesLoaded) {
              console.log(`Carregando CIDs via API relacional - NORMALIZANDO`);
              // Converter formato backend para formato frontend (normalizado)
              setMultipleCids(cidData.map((cidItem: any) => ({
                cid: cidItem.cid || cidItem,
                sourceApproachId: cidItem.surgicalApproach?.id || null,
                sourceApproachName: cidItem.surgicalApproach?.name || null,
                sourceProcedureId: cidItem.surgicalProcedure?.id || null,
                sourceProcedureName: cidItem.surgicalProcedure?.name || null
              })));
            } else {
              console.log(`🛡️ CIDs já carregados no modo edição (COM condutas) - não sobrescrever`);
            }
            
            const firstCid = cidData[0];
            setCidCode(firstCid.code || "");
            setCidDescription(firstCid.description || "");
            setSelectedCidId(firstCid.id);
            console.log(`CID principal carregado: ${firstCid.code}`);
          }
        } catch (error) {
          console.error("Erro ao carregar CIDs:", error);
        }

        // 2. Carregar procedimentos salvos - PADRONIZADO como OPME
        try {
          const procedures = await apiRequest(`/api/orders/${order.id}/procedures`, "GET");
          
          if (procedures && procedures.length > 0) {
            console.log(`Procedimentos salvos encontrados: ${procedures.length} procedimentos`);
            
            // Converter para formato padronizado (preservando associações cirúrgicas)
            const formattedProcedures = procedures.map((p: any) => ({
              item: p.procedure,
              quantity: p.quantity || 1,
              isMain: p.isMain,
              surgicalApproach: p.surgicalApproach || null,
              surgicalProcedure: p.surgicalProcedure || null
            }));
            
            const mainProcedure = formattedProcedures.find((p: any) => p.isMain);
            const secondaryProcs = formattedProcedures.filter((p: any) => !p.isMain);
            
            
            if (mainProcedure?.item) {
              // ❌ LEGADO: setSelectedProcedure(mainProcedure.item);
              // ❌ LEGADO: setProcedureQuantity(mainProcedure.quantity);
              console.log(`Procedimento principal carregado: ${mainProcedure.item.code} - Quantidade: ${mainProcedure.quantity}`);
            }
            
            if (secondaryProcs.length > 0) {
              // Normalizar para formato frontend (sourceApproachId/sourceProcedureId)
              const secondaryData = secondaryProcs.map((p: any) => ({
                procedure: {
                  ...p.item,
                  sourceApproachId: p.surgicalApproach?.id || null,
                  sourceApproachName: p.surgicalApproach?.name || null,
                  sourceProcedureId: p.surgicalProcedure?.id || null,
                  sourceProcedureName: p.surgicalProcedure?.name || null
                },
                quantity: p.quantity
              }));
              setSecondaryProcedures(secondaryData);
              console.log(`Procedimentos secundários carregados (NORMALIZADOS): ${secondaryProcs.length} procedimentos`);
            }
          }
        } catch (error) {
          console.error("Erro ao carregar procedimentos:", error);
        }

        // 3. Carregar fornecedores salvos - COM ASSOCIAÇÕES DE CONDUTA
        try {
          const supplierData = await apiRequest(`/api/orders/${order.id}/suppliers`, "GET");
          
          // Também carregar condutas para poder inferir approachId quando faltando
          let orderApproaches: any[] = [];
          try {
            orderApproaches = await apiRequest(`/api/medical-order-surgical-approaches/order/${order.id}`, "GET");
            console.log(`Condutas carregadas para inferência: ${orderApproaches?.length || 0}`);
          } catch (e) {
            console.log(`Nenhuma conduta encontrada para inferência`);
          }
          
          if (supplierData && supplierData.length > 0) {
            console.log(`Fornecedores salvos encontrados: ${supplierData.length} fornecedores`);
            
            // Mapear dados do backend para o formato esperado pelo frontend
            // CORREÇÃO: Inferir sourceApproachId a partir de sourceProcedureId quando approach não está definido
            const mappedSuppliers = supplierData.map((item: any) => {
              // Formato: { supplier: {...}, surgicalApproach: {...}, surgicalProcedure: {...} }
              const supplier = item.supplier || item;
              
              let sourceApproachId = item.surgicalApproach?.id || null;
              let sourceApproachName = item.surgicalApproach?.name || null;
              const sourceProcedureId = item.surgicalProcedure?.id || null;
              const sourceProcedureName = item.surgicalProcedure?.name || null;
              
              // CORREÇÃO DE DADOS LEGADOS: Inferir approach a partir do procedure
              if (!sourceApproachId && sourceProcedureId && orderApproaches && orderApproaches.length > 0) {
                const matchingApproach = orderApproaches.find((sa: any) => 
                  sa.surgicalProcedureId === sourceProcedureId
                );
                
                if (matchingApproach) {
                  sourceApproachId = matchingApproach.id;
                  sourceApproachName = matchingApproach.name;
                  console.log(`🔧 CORREÇÃO: Fornecedor ${supplier.name || supplier.companyName} inferiu approachId=${sourceApproachId} a partir do procedureId=${sourceProcedureId}`);
                }
              }
              
              return {
                id: supplier.id,
                companyName: supplier.name || supplier.companyName,
                tradeName: supplier.tradeName || supplier.name,
                cnpj: supplier.cnpj,
                phone: supplier.phone,
                email: supplier.email,
                isApproved: item.isApproved || false,
                // Associações de conduta para agrupamento
                sourceApproachId,
                sourceApproachName,
                sourceProcedureId,
                sourceProcedureName
              };
            });
            
            // Atualizar primeiro os detalhes completos
            setSupplierDetails(mappedSuppliers);
            
            // Manter formato atual do estado para compatibilidade (apenas IDs)
            const suppliersState = {
              supplier1: mappedSuppliers[0]?.id || null,
              supplier2: mappedSuppliers[1]?.id || null,
              supplier3: mappedSuppliers[2]?.id || null
            };
            setSuppliers(suppliersState);
            console.log(`Fornecedores carregados:`, mappedSuppliers.map((s: any) => s.companyName).join(', '));
            console.log(`Fornecedores com conduta:`, mappedSuppliers.filter((s: any) => s.sourceApproachId).length);
          }
        } catch (error) {
          console.error("Erro ao carregar fornecedores:", error);
        }

        // 4. Carregar itens OPME salvos - COM NORMALIZAÇÃO
        try {
          const opmeItems = await apiRequest(`/api/orders/${order.id}/opme-items`, "GET");
          if (opmeItems && opmeItems.length > 0) {
            console.log(`Itens OPME salvos encontrados: ${opmeItems.length} itens`);
            
            // Normalizar para formato frontend (sourceApproachId/sourceProcedureId)
            const normalizedOpme = opmeItems.map((opmeEntry: any) => ({
              item: {
                ...(opmeEntry.item || opmeEntry),
                sourceApproachId: opmeEntry.surgicalApproach?.id || opmeEntry.sourceApproachId || null,
                sourceApproachName: opmeEntry.surgicalApproach?.name || opmeEntry.sourceApproachName || null,
                sourceProcedureId: opmeEntry.surgicalProcedure?.id || opmeEntry.sourceProcedureId || null,
                sourceProcedureName: opmeEntry.surgicalProcedure?.name || opmeEntry.sourceProcedureName || null
              },
              quantity: opmeEntry.quantity || 1
            }));
            setSelectedOpmeItems(normalizedOpme);
            console.log(`Itens OPME carregados (NORMALIZADOS): ${normalizedOpme.length} itens`);
          }
        } catch (error) {
          console.error("Erro ao carregar itens OPME:", error);
        }

        console.log("=== Carregamento de dados relacionais concluído ===");
      } catch (error) {
        console.error("Erro geral ao carregar dados relacionais:", error);
      }
    };

    // Executar carregamento de todos os dados relacionais
    await loadAllRelationalData();

    // Removido carregamento da lateralidade do CID conforme solicitado
    // Valor padrão será null

    // Carregar a lateralidade do procedimento principal
    if (order.procedureLaterality) {
      setProcedureLaterality(order.procedureLaterality);
    }

    // REMOVIDO: Código antigo para carregar procedimento individual
    // Os procedimentos agora são carregados via loadAllRelationalData

    console.log("✅ Dados relacionais carregados com sucesso - procedimentos e fornecedores já processados via API relacional");

    // Carregar itens OPME via API relacional - COM NORMALIZAÇÃO
    try {
      const opmeResponse = await fetch(`/api/orders/${order.id}/opme-items`);
      if (opmeResponse.ok) {
        const opmeRelations = await opmeResponse.json();
        console.log("Itens OPME encontrados via API relacional:", opmeRelations);

        if (opmeRelations && opmeRelations.length > 0) {
          // Normalizar para formato frontend (sourceApproachId/sourceProcedureId)
          const normalizedOpme = opmeRelations.map((opmeEntry: any) => ({
            item: {
              ...(opmeEntry.item || opmeEntry),
              sourceApproachId: opmeEntry.surgicalApproach?.id || opmeEntry.sourceApproachId || null,
              sourceApproachName: opmeEntry.surgicalApproach?.name || opmeEntry.sourceApproachName || null,
              sourceProcedureId: opmeEntry.surgicalProcedure?.id || opmeEntry.sourceProcedureId || null,
              sourceProcedureName: opmeEntry.surgicalProcedure?.name || opmeEntry.sourceProcedureName || null
            },
            quantity: opmeEntry.quantity || 1
          }));
          console.log("Itens OPME carregados (NORMALIZADOS):", normalizedOpme);
          setSelectedOpmeItems(normalizedOpme);
        }
      } else {
        console.log("Nenhum item OPME encontrado via API relacional");
        setSelectedOpmeItems([]);
      }
    } catch (error) {
      console.error("Erro ao carregar itens OPME:", error);
      setSelectedOpmeItems([]);
    }

    // Carregar fornecedores via API relacional
    try {
      const suppliersResponse = await fetch(`/api/orders/${order.id}/suppliers`);
      if (suppliersResponse.ok) {
        const supplierRelations = await suppliersResponse.json();
        console.log("Fornecedores encontrados via API relacional:", supplierRelations);
        
        const loadedSuppliers = {
          supplier1: supplierRelations[0]?.supplierId || null,
          supplier2: supplierRelations[1]?.supplierId || null,
          supplier3: supplierRelations[2]?.supplierId || null,
        };
        
        setSuppliers(loadedSuppliers);
      } else {
        setSuppliers({ supplier1: null, supplier2: null, supplier3: null });
      }
    } catch (error) {
      console.error("Erro ao carregar fornecedores:", error);
      setSuppliers({ supplier1: null, supplier2: null, supplier3: null });
    }

    // Carregar CIDs via API relacional - COM NORMALIZAÇÃO
    try {
      const cidsResponse = await fetch(`/api/orders/${order.id}/cids`);
      if (cidsResponse.ok) {
        const cidRelations = await cidsResponse.json();
        console.log("CIDs encontrados via API relacional:", cidRelations);
        
        // Normalizar para formato frontend (sourceApproachId/sourceProcedureId)
        const cidsList = cidRelations.map((cidData: any) => ({
          cid: cidData.cid || cidData,
          sourceApproachId: cidData.surgicalApproach?.id || null,
          sourceApproachName: cidData.surgicalApproach?.name || null,
          sourceProcedureId: cidData.surgicalProcedure?.id || null,
          sourceProcedureName: cidData.surgicalProcedure?.name || null
        }));
        
        console.log("CIDs carregados (NORMALIZADOS):", cidsList);
        setMultipleCids(cidsList);
      } else {
        setMultipleCids([]);
      }
    } catch (error) {
      console.error("Erro ao carregar CIDs:", error);
      setMultipleCids([]);
    }



    // Carregar justificativa clínica
    if (order.clinicalJustification) {
      console.log(
        "Justificativa clínica encontrada no pedido:",
        order.clinicalJustification,
      );
      setClinicalJustification(order.clinicalJustification);
    } else {
      console.log("Nenhuma justificativa clínica encontrada para o pedido");
      setClinicalJustification("");
    }

    // Carregar anexos unificados com debug detalhado
    
    let finalAttachments = [];
    if (order.attachments && Array.isArray(order.attachments) && order.attachments.length > 0) {
      console.log('✅ Anexos unificados encontrados:', order.attachments);
      finalAttachments = order.attachments;
    } else {
      console.log('🔄 Convertendo anexos legados para formato unificado');
      finalAttachments = convertLegacyAttachments(
        (order as any).exam_images_url,
        (order as any).medical_report_url
      );
      console.log('🔄 Resultado da conversão:', finalAttachments);
    }

    // Definir dados completos do pedido incluindo attachments
    const orderMediaData = {
      ...order,
      // Campo unificado de anexos
      attachments: finalAttachments,
      // Usando nomes das colunas exatamente iguais ao banco de dados
      exam_images_url: examImageUrls,
      exam_image_count: (order as any).exam_image_count || 0,
      medical_report_url: medicalReportUrls,
    };

    console.log("🔍 FINAL - orderMediaData.attachments:", orderMediaData.attachments);
    console.log("🔍 FINAL - attachments length:", orderMediaData.attachments?.length || 0);
    setCurrentOrderData(orderMediaData);
    
    console.log(`✅ _loadExistingOrder concluído para pedido ${order.id}`);
  };

  // Função para salvar o progresso atual
  const saveProgress = async () => {
    // Só tentamos salvar se pelo menos o paciente for selecionado
    if (!selectedPatient) {
      return;
    }

    try {
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
        return (numero * 100) + valorLetra;
      };

      // Ordenar procedimentos secundários por valor do porte (maior para menor)
      const sortedSecondaryProcedures = [...secondaryProcedures].sort(
        (a, b) => parsePorteValue(b.procedure.porte) - parsePorteValue(a.procedure.porte)
      );

      // Definir procedimento principal e secundários baseado na quantidade
      let mainProcedure = null;
      let mainProcedureQuantity = 1;
      let remainingSecondaryProcedures: any[] = [];

      if (sortedSecondaryProcedures.length === 1) {
        // Se há apenas 1 procedimento, ele é o principal
        mainProcedure = sortedSecondaryProcedures[0];
        mainProcedureQuantity = mainProcedure.quantity;
        remainingSecondaryProcedures = []; // Nenhum secundário
        
        console.log(`🏆 Único procedimento definido como principal: ${mainProcedure.procedure.code} - ${mainProcedure.procedure.name} (Porte: ${mainProcedure.procedure.porte})`);
      } else if (sortedSecondaryProcedures.length > 1) {
        // Se há mais de 1, o de maior porte é principal, os demais são secundários
        mainProcedure = sortedSecondaryProcedures[0];
        mainProcedureQuantity = mainProcedure.quantity;
        remainingSecondaryProcedures = sortedSecondaryProcedures.slice(1); // Remove o primeiro (que agora é principal)
        
        console.log(`🏆 Procedimento de maior porte definido como principal: ${mainProcedure.procedure.code} - ${mainProcedure.procedure.name} (Porte: ${mainProcedure.procedure.porte})`);
        console.log(`📋 ${remainingSecondaryProcedures.length} procedimentos definidos como secundários`);
      }

      // Preparar arrays dos procedimentos secundários restantes (sem o principal)
      const secondaryProcedureIds = remainingSecondaryProcedures.map(
        (item) => item.procedure.id,
      );
      const secondaryProcedureQuantities = remainingSecondaryProcedures.map(
        (item) => item.quantity,
      );
      // Lateralidade dos procedimentos secundários removida conforme solicitado

      // Extrair IDs e quantidades dos itens OPME
      const opmeItemIds: number[] = selectedOpmeItems.map(
        (item) => item.item.id,
      );
      const opmeItemQuantities: number[] = selectedOpmeItems.map(
        (item) => item.quantity,
      );
      console.log(
        "🔍 DEBUG OPME - Estado selectedOpmeItems completo:",
        selectedOpmeItems
      );
      console.log(
        "🔍 DEBUG OPME - Itens OPME a serem enviados:",
        "IDs:", opmeItemIds,
        "Quantidades:", opmeItemQuantities,
      );

      // Extrair os IDs dos CIDs múltiplos para enviar ao backend
      const cidIds = multipleCids.map((item) => {
        // Suportar ambas as estruturas: item.cid.id ou item.id
        const cidId = item.cid?.id || (item as any).id;
        if (!cidId) {
          console.warn("CID sem ID encontrado:", item);
        }
        return cidId;
      }).filter(id => id !== undefined); // Remove undefined IDs
      console.log("CIDs a serem enviados:", cidIds);

      // Objeto para armazenar os dados do pedido baseado no passo atual
      let orderData: any = {};

      // **PRESERVAR ATTACHMENTS EXISTENTES**: Buscar attachments atuais do pedido
      let currentAttachments = [];
      if (orderId) {
        try {
          const currentOrder = await apiRequest(`/api/medical-orders/${orderId}`, "GET");
          currentAttachments = currentOrder?.attachments || [];
          console.log(`🔍 PRESERVANDO ATTACHMENTS: ${currentAttachments.length} anexos existentes`);
        } catch (error) {
          console.error("Erro ao buscar attachments atuais:", error);
        }
      }

      // PASSO 1: Paciente e Hospital (já salvos na criação inicial)
      if (currentStep === 1) {
        orderData = {
          patientId: selectedPatient.id,
          userId: user?.id,
          hospitalId: selectedHospital?.id,
          // **PRESERVAR ATTACHMENTS**
          attachments: currentAttachments,
        };
      }
      
      // PASSO 2: Indicação clínica e notas (anexos salvos automaticamente no upload)
      else if (currentStep === 2) {
        orderData = {
          clinicalIndication: clinicalIndication || "",
          additionalNotes: additionalNotes || "",
          // **PRESERVAR ATTACHMENTS**
          attachments: currentAttachments,
        };
        console.log("🔍 PASSO 2 - Enviando dados:", {
          clinicalIndication: clinicalIndication,
          additionalNotes: additionalNotes,
          clinicalIndicationLength: clinicalIndication?.length || 0,
          additionalNotesLength: additionalNotes?.length || 0,
          orderId: orderId,
          currentStep: currentStep,
          attachmentsPreservados: currentAttachments.length
        });
      }
      
      // PASSO 3: Apenas dados básicos - relacionamentos gerenciados via APIs separadas
      else if (currentStep === 3) {
        orderData = {
          clinicalJustification: clinicalJustification,
          procedureType: procedureType,
          procedureLaterality: procedureLaterality === "null" || procedureLaterality === "" ? null : procedureLaterality,
          cbhpmAdditionalNotes: cbhpmAdditionalNotes || null,
          opmeAdditionalNotes: opmeAdditionalNotes || null,
          supplierAdditionalNotes: supplierAdditionalNotes || null,
          // **PRESERVAR ATTACHMENTS**
          attachments: currentAttachments,
        };
      }
      
      // PASSO 4: Apenas visualização - não salva nada
      else if (currentStep === 4) {
        console.log("Passo 4: Apenas visualização, não salvando dados");
        return; // Sair da função sem salvar
      }

      // Se o pedido já existir, adicionar ID
      if (orderId) {
        orderData.id = orderId;
      }

      // Log detalhado dos dados sendo enviados
      console.log("Dados de lateralidade sendo enviados ao backend:", {
        // cidLaterality removido conforme solicitado
        // Apenas mantemos a lateralidade do procedimento principal
        procedureLaterality,
      });

      // 1. Upload das imagens de exame (se houver)
      // COMENTADO: Imagens já são enviadas automaticamente quando selecionadas
      // Aqui apenas preservamos as URLs já existentes no banco de dados
      /*
      // Agora apenas gerenciamos um único array de imagens, não há mais imagem "principal"
      let newExamImagesUrls: string[] = [];
      
      // Se há imagens existentes no pedido atual, mantemos suas URLs
      if (currentOrderData?.exam_images_url && currentOrderData.exam_images_url.length > 0) {
        newExamImagesUrls = [...currentOrderData.exam_images_url];
      }
      
      // Processar novas imagens se houver
      if (examImages && examImages.length > 0) {
        try {
          console.log(`Enviando ${examImages.length} imagens para o servidor...`);
          
          // Fazer upload de cada imagem
          for (const image of examImages) {
            const uploadResult = await uploadExamImage(
              image, 
              selectedPatient.id, 
              orderId || undefined
            );
            
            // Adicionar URL da nova imagem ao array
            newExamImagesUrls.push(uploadResult.url);
            console.log("Imagem do exame enviada com sucesso:", uploadResult.url);
          }
          
          orderData.exam_images_url = newExamImagesUrls;
          orderData.exam_image_count = newExamImagesUrls.length;
        } catch (error) {
          console.error("Erro ao fazer upload da imagem do exame:", error);
        }
      } else if (currentOrderData?.exam_images_url?.length) {
        // Manter URLs das imagens existentes
        orderData.exam_images_url = currentOrderData.exam_images_url;
        orderData.exam_image_count = currentOrderData.exam_images_url.length;
      }
      */

      // Anexos agora são gerenciados via campo unificado 'attachments'
      // Preservar attachments existentes
      if (currentOrderData?.attachments?.length) {
        orderData.attachments = currentOrderData.attachments;
        console.log("Preservando attachments existentes:", currentOrderData.attachments);
      }

      // 3. Upload de imagens de exame (se houver)
      // COMENTADO: Código duplicado - imagens já são tratadas acima
      /*
      if (examImages && examImages.length > 0) {
        try {
          console.log(`Enviando ${examImages.length} imagens para o servidor...`);
          
          // Obter as URLs existentes, se houver
          const existingUrls = currentOrderData?.exam_images_url || [];
          
          // Atualizar directamente com imagens existentes por enquanto (upload será implementado depois)
          orderData.exam_images_url = existingUrls;
          orderData.exam_image_count = existingUrls.length;
          console.log("URLs de imagens:", existingUrls);
          
          // Limpar o array de arquivos após o upload
          setExamImages([]);
        } catch (error) {
          console.error("Erro ao processar imagens:", error);
        }
      } else if (currentOrderData?.exam_images_url?.length) {
        // Manter URLs das imagens existentes se não houver novas
        orderData.exam_images_url = currentOrderData.exam_images_url;
        orderData.exam_image_count = currentOrderData.exam_images_url.length;
        console.log("Preservando URLs de imagens existentes:", currentOrderData.exam_images_url);
      } else {
        // Inicialize como array vazio para evitar erros de null/undefined
        orderData.exam_images_url = [];
        orderData.exam_image_count = 0;
      }
      */

      // PASSO 3: Salvar dados relacionais específicos (CIDs, procedimentos CBHPM, itens OPME)
      if (currentStep === 3 && orderId) {
        console.log("🔄 PASSO 3 - Salvando dados relacionais específicos do passo de cirurgia");
        
        // Salvar CIDs relacionais (com associações cirúrgicas)
        try {
          const cids = multipleCids.map((item) => {
            // Suportar ambas as estruturas: item.cid.id ou item.id
            const cidId = item.cid?.id;
            if (!cidId) {
              console.warn("saveProgress - CID sem ID encontrado:", item);
            }
            // Buscar associações em múltiplos locais possíveis:
            // 1. item.surgicalApproach?.id (formato padrão com objetos)
            // 2. item.sourceApproachId (formato direto usado pelo auto-preenchimento)
            // 3. item.cid?.sourceApproachId (formato legado)
            const surgicalApproachId = item.surgicalApproach?.id || item.sourceApproachId || item.cid?.sourceApproachId || null;
            const surgicalProcedureId = item.surgicalProcedure?.id || item.sourceProcedureId || item.cid?.sourceProcedureId || null;
            
            return {
              cidId,
              surgicalApproachId,
              surgicalProcedureId
            };
          }).filter(cid => cid.cidId !== undefined); // Remove undefined IDs
          console.log(`saveProgress - Salvando ${cids.length} CIDs relacionais para pedido ${orderId}:`, cids);
          
          const cidResponse = await fetch(`/api/orders/${orderId}/cids`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ cids })
          });

          if (cidResponse.ok) {
            console.log("saveProgress - CIDs relacionais salvos com sucesso");
          } else {
            console.error("saveProgress - Erro ao salvar CIDs relacionais:", cidResponse.status);
          }
        } catch (error) {
          console.error("saveProgress - Erro ao salvar CIDs relacionais:", error);
        }

        // Salvar procedimentos CBHPM relacionais
        try {
          const procedures = [];
          
          // ❌ CÓDIGO LEGADO - Sistema de procedimento principal descontinuado
          // O procedimento principal agora é determinado automaticamente pelo MAIOR PORTE no backend
          // if (selectedProcedure?.id) {
          //   procedures.push({
          //     procedureId: selectedProcedure.id,
          //     quantityRequested: procedureQuantity || 1,
          //     isMain: true
          //   });
          // }
          
          // Adicionar procedimentos da lista unificada (backend determina qual é o principal)
          // Inclui associações cirúrgicas para agrupamento
          secondaryProcedures.forEach((proc) => {
            if (proc.procedure?.id) {
              procedures.push({
                procedureId: proc.procedure.id,
                quantityRequested: proc.quantity || 1,
                isMain: false,
                surgicalApproachId: proc.surgicalApproach?.id || proc.procedure?.sourceApproachId || null,
                surgicalProcedureId: proc.surgicalProcedure?.id || proc.procedure?.sourceProcedureId || null
              });
            }
          });
          
          console.log(`saveProgress - Salvando ${procedures.length} procedimentos CBHPM relacionais para pedido ${orderId}:`, procedures);
          
          const procedureResponse = await fetch(`/api/orders/${orderId}/procedures`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ procedures })
          });

          if (procedureResponse.ok) {
            console.log("saveProgress - Procedimentos CBHPM relacionais salvos com sucesso");
          } else {
            console.error("saveProgress - Erro ao salvar procedimentos CBHPM relacionais:", procedureResponse.status, await procedureResponse.text());
          }
        } catch (error) {
          console.error("saveProgress - Erro ao salvar procedimentos CBHPM relacionais:", error);
        }

        // Salvar procedimentos cirúrgicos relacionais
        try {
          const surgicalProcedures = selectedSurgicalProcedures.map((proc, index) => ({
            surgicalProcedureId: proc.id,
            isMain: index === 0, // Primeiro procedimento é considerado principal
            additionalNotes: null
          }));
          
          console.log(`saveProgress - Salvando ${surgicalProcedures.length} procedimentos cirúrgicos relacionais para pedido ${orderId}:`, surgicalProcedures);
          
          const surgicalProcedureResponse = await fetch(`/api/orders/${orderId}/surgical-procedures`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ procedures: surgicalProcedures })
          });

          if (surgicalProcedureResponse.ok) {
            console.log("saveProgress - Procedimentos cirúrgicos relacionais salvos com sucesso");
          } else {
            console.error("saveProgress - Erro ao salvar procedimentos cirúrgicos relacionais:", surgicalProcedureResponse.status, await surgicalProcedureResponse.text());
          }
        } catch (error) {
          console.error("saveProgress - Erro ao salvar procedimentos cirúrgicos relacionais:", error);
        }

        // Salvar itens OPME relacionais (com associações cirúrgicas)
        if (selectedOpmeItems && selectedOpmeItems.length > 0) {
          try {
            const opmeItems = selectedOpmeItems.map(item => ({
              opmeItemId: item.item.id,
              quantity: item.quantity || 1,
              surgicalApproachId: item.surgicalApproach?.id || item.item?.sourceApproachId || null,
              surgicalProcedureId: item.surgicalProcedure?.id || item.item?.sourceProcedureId || null
            }));
            
            console.log(`saveProgress - Salvando ${opmeItems.length} itens OPME relacionais para pedido ${orderId}:`, opmeItems);
            
            const opmeResponse = await fetch(`/api/orders/${orderId}/opme-items`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({ opmeItems })
            });

            if (opmeResponse.ok) {
              console.log("saveProgress - Itens OPME relacionais salvos com sucesso");
            } else {
              console.error("saveProgress - Erro ao salvar itens OPME relacionais:", opmeResponse.status, await opmeResponse.text());
            }
          } catch (error) {
            console.error("saveProgress - Erro ao salvar itens OPME relacionais:", error);
          }
        }

        // Salvar fornecedores relacionais (com associações de conduta quando existirem)
        try {
          let suppliersPayload: any;
          
          // DEBUG: Log detalhado do supplierDetails antes de processar
          console.log(`🔍 DEBUG SUPPLIERS - supplierDetails original:`, supplierDetails.map(s => ({
            id: s.id,
            companyName: s.companyName,
            sourceApproachId: s.sourceApproachId,
            sourceApproachName: s.sourceApproachName,
            sourceProcedureId: s.sourceProcedureId,
            sourceProcedureName: s.sourceProcedureName
          })));
          
          // SEMPRE usar o novo formato se há fornecedores em supplierDetails
          // Isso garante que TODOS os fornecedores sejam salvos, não apenas os 3 primeiros
          if (supplierDetails.length > 0) {
            // Novo formato: fornecedores com associações de conduta (mesmo que vazias)
            suppliersPayload = {
              suppliers: supplierDetails.map(supplier => ({
                supplierId: supplier.id,
                surgicalApproachId: supplier.sourceApproachId || null,
                surgicalProcedureId: supplier.sourceProcedureId || null,
                isApproved: supplier.isApproved || false
              }))
            };
            console.log(`🔍 DEBUG SUPPLIERS - Payload preparado:`, suppliersPayload);
            console.log(`saveProgress - Salvando ${supplierDetails.length} fornecedores:`, suppliersPayload);
          } else {
            // Fallback: Formato legado apenas se não houver supplierDetails
            const supplierIds = [
              suppliers.supplier1,
              suppliers.supplier2,
              suppliers.supplier3
            ].filter(Boolean) as number[];
            suppliersPayload = { supplierIds };
            console.log(`saveProgress - Salvando ${supplierIds.length} fornecedores (formato legado):`, supplierIds);
          }
          
          const suppliersResponse = await fetch(`/api/orders/${orderId}/suppliers`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(suppliersPayload)
          });

          if (suppliersResponse.ok) {
            console.log("saveProgress - Fornecedores relacionais salvos com sucesso");
          } else {
            console.error("saveProgress - Erro ao salvar fornecedores relacionais:", suppliersResponse.status, await suppliersResponse.text());
          }
        } catch (error) {
          console.error("saveProgress - Erro ao salvar fornecedores relacionais:", error);
        }

        // Salvar condutas cirúrgicas relacionais
        try {
          // Debug: verificar estado atual das condutas cirúrgicas
          
          // Usar o estado selectedSurgicalApproaches diretamente para salvamento em lote
          if (selectedSurgicalApproaches && selectedSurgicalApproaches.length > 0) {
            // Preparar dados das condutas cirúrgicas para envio
            const surgicalApproaches = selectedSurgicalApproaches.map((approach, index) => ({
              surgicalApproachId: approach.surgicalApproachId,
              surgicalProcedureId: approach.surgicalProcedureId,
              isPrimary: index === 0 // Primeira conduta é considerada principal
            }));

            console.log(`saveProgress - Salvando ${surgicalApproaches.length} condutas cirúrgicas relacionais para pedido ${orderId}:`, surgicalApproaches);
            
            const approachesResponse = await fetch(`/api/orders/${orderId}/surgical-approaches`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({ surgicalApproaches })
            });

            if (approachesResponse.ok) {
              console.log("saveProgress - Condutas cirúrgicas relacionais salvas com sucesso");
            } else {
              console.error("saveProgress - Erro ao salvar condutas cirúrgicas relacionais:", approachesResponse.status, await approachesResponse.text());
            }
          } else {
            console.log("saveProgress - Nenhuma conduta cirúrgica selecionada para salvar");
          }
        } catch (error) {
          console.error("saveProgress - Erro ao salvar condutas cirúrgicas relacionais:", error);
        }

        // Salvar fabricantes relacionais usando sistema de prioridades
        try {
          console.log("🏭 saveProgress - Iniciando salvamento de fabricantes");
          
          // Coletar dados dos fabricantes através de callback do componente SurgeryData
          if (typeof window !== 'undefined' && (window as any).getManufacturersData) {
            const manufacturersData = (window as any).getManufacturersData();
            console.log(`🏭 saveProgress - Dados de fabricantes obtidos via callback:`, manufacturersData);
            
            if (manufacturersData && manufacturersData.length > 0) {
              const manufacturersResponse = await fetch(`/api/medical-orders/${orderId}/manufacturers`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ manufacturers: manufacturersData })
              });

              if (manufacturersResponse.ok) {
                const result = await manufacturersResponse.json();
                console.log(`🏭 saveProgress - Fabricantes salvos com sucesso:`, result);
              } else {
                console.error("🏭 saveProgress - Erro ao salvar fabricantes:", manufacturersResponse.status, await manufacturersResponse.text());
              }
            } else {
              console.log("🏭 saveProgress - Nenhum fabricante informado para salvar");
            }
          } else {
            console.log("🏭 saveProgress - Callback de fabricantes não disponível");
          }
        } catch (error) {
          console.error("🏭 saveProgress - Erro ao salvar fabricantes:", error);
        }
      }

      // Atualizar o pedido no banco de dados
      saveProgressMutation.mutate(orderData);
    } catch (error) {
      console.error("Erro ao salvar progresso:", error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar o pedido. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Mutação para salvar/atualizar o pedido em preenchimento
  const saveProgressMutation = useMutation({
    mutationFn: async (orderData: any) => {
      console.log("saveProgressMutation - Dados a serem enviados:", orderData);
      
      // Se já temos um ID, atualizamos o pedido existente
      if (orderId) {
        // Remover campos que não existem mais na tabela
        const { 
          cidCodeId, opmeItemIds, opmeItemQuantities, supplierIds, 
          secondaryProcedureIds, secondaryProcedureQuantities,
          exam_images_url, exam_image_count, medical_report_url,
          ...validOrderData 
        } = orderData;

        console.log("saveProgressMutation - Dados válidos após limpeza:", validOrderData);

        const updatedData = await apiRequest(
          `/api/medical-orders/${orderId}`,
          "PUT",
          {
            ...validOrderData,
            statusId: ORDER_STATUS_IDS.EM_PREENCHIMENTO,
          },
        );

        // Verificar se os dados foram salvos corretamente
        console.log(
          "saveProgressMutation - Dados retornados após salvamento:",
          {
            procedureLateralitySalvo: updatedData.procedureLaterality,
          },
        );

        // Atualizar dados locais com resposta do servidor
        setCurrentOrderData(updatedData);
        return updatedData;
      }
      // Senão criamos um novo pedido em preenchimento
      else {
        // Remover campos que não existem mais na tabela
        const { 
          cidCodeId, opmeItemIds, opmeItemQuantities, supplierIds, 
          secondaryProcedureIds, secondaryProcedureQuantities,
          exam_images_url, exam_image_count, medical_report_url,
          ...validOrderData 
        } = orderData;

        return await apiRequest("/api/medical-orders", "POST", {
          ...validOrderData,
          statusId: ORDER_STATUS_IDS.EM_PREENCHIMENTO,
        });
      }
    },
    onSuccess: (data) => {
      setOrderId(data.id);

      // Atualizar dados do pedido com a resposta do servidor
      setCurrentOrderData(prev => ({
        ...prev,
        ...data,
        // Preservar attachments existentes
        attachments: prev?.attachments || data.attachments || []
      }));

      // Toast de progresso desabilitado para evitar interferir com o scroll automático durante navegação
      // toast({
      //   title: "Progresso salvo automaticamente",
      //   description: "Dados preenchidos até o momento foram salvos.",
      //   duration: 2000,
      // });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar progresso",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Função para atualizar campos específicos do pedido no banco de dados
  const updateOrderField = async (fieldName: string, value: any) => {
    if (!orderId) {
      console.error("Não há pedido para atualizar");
      return false;
    }

    try {
      // Criamos um objeto com apenas o campo a ser atualizado
      const updateData = {
        [fieldName]: value,
      };

      // Logar campos de lateralidade se estiverem sendo atualizados
      if (
        fieldName === "cidLaterality" ||
        fieldName === "procedureLaterality"
      ) {
        console.log(
          `updateOrderField - Atualizando campo de lateralidade: ${fieldName}`,
          value,
        );
      }

      const updatedOrder = await apiRequest(
        API_ENDPOINTS.MEDICAL_ORDER_BY_ID(orderId),
        "PUT",
        {
          ...updateData,
          statusId: ORDER_STATUS_IDS.EM_PREENCHIMENTO,
        },
      );
      console.log(`Campo ${fieldName} atualizado com sucesso:`, updatedOrder);

      // Verificar se as lateralidades foram preservadas na resposta
      if (
        fieldName === "cidLaterality" ||
        fieldName === "procedureLaterality"
      ) {
        console.log("updateOrderField - Lateralidades após atualização:", {
          cidLaterality: updatedOrder.cidLaterality,
          procedureLaterality: updatedOrder.procedureLaterality,
        });
      }

      // Atualizar o estado local currentOrderData para refletir a mudança
      // PRESERVAR ATTACHMENTS durante atualizações
      console.log('🔍 updateOrderField - Preservando attachments:', currentOrderData?.attachments);
      setCurrentOrderData(prev => ({
        ...prev,
        ...updatedOrder,
        attachments: prev?.attachments || [] // Preservar attachments existentes
      }));

      return true;
    } catch (error) {
      console.error(`Erro ao atualizar campo ${fieldName}:`, error);
      return false;
    }
  };

  // Função para baixar PDF já gerado
  const downloadExistingPDF = async () => {
    try {
      // Buscar os dados atualizados do pedido para obter os attachments
      const response = await fetch(`/api/medical-orders/${orderId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Erro ao buscar dados do pedido');
      }
      
      const orderData = await response.json();
      
      // Procurar PDF gerado pelo sistema (não PDFs anexados pelo usuário)
      const systemPdfs = orderData.attachments?.filter((att: any) => {
        if (att.type !== 'pdf') return false;
        const filename = att.filename || '';
        // Identificar se é PDF gerado pelo sistema (contém padrão pedido_ID_)
        return filename.includes(`pedido_${orderId}_`) || filename.includes(`order_${orderId}_`);
      }) || [];
      
      
      if (systemPdfs.length === 0) {
        toast({
          title: "PDF do pedido não encontrado",
          description: "Nenhum PDF do pedido foi gerado. Por favor, gere o PDF primeiro.",
          variant: "destructive",
        });
        return;
      }
      
      // Pegar o PDF do sistema mais recente (último gerado)
      const pdfAttachment = systemPdfs[systemPdfs.length - 1];
      console.log('📄 PDF do pedido encontrado para download:', pdfAttachment);
      
      // Fazer download do PDF existente usando a URL dos attachments
      const pdfResponse = await fetch(pdfAttachment.url);
      if (!pdfResponse.ok) {
        throw new Error('Erro ao acessar o PDF');
      }
      
      const blob = await pdfResponse.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = pdfAttachment.filename || `pedido_${orderId}_${selectedPatient?.fullName?.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download concluído",
        description: "PDF baixado com sucesso!",
      });
      
    } catch (error) {
      console.error("Erro ao baixar PDF:", error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o PDF",
        variant: "destructive",
      });
    }
  };

  const handleOpenEmailDialog = () => {
    const recipients: typeof emailRecipients = [];
    const seenEmails = new Set<string>();

    if (selectedHospital && (selectedHospital as any).email) {
      const email = (selectedHospital as any).email as string;
      seenEmails.add(email.toLowerCase());
      recipients.push({
        id: `hospital-${selectedHospital.id}`,
        name: selectedHospital.name,
        email,
        type: 'hospital',
        selected: true,
      });
    }

    for (const supplier of supplierDetails) {
      if (supplier.email && !seenEmails.has(supplier.email.toLowerCase())) {
        seenEmails.add(supplier.email.toLowerCase());
        recipients.push({
          id: `supplier-${supplier.id}`,
          name: supplier.tradeName || supplier.companyName,
          email: supplier.email,
          type: 'fornecedor',
          selected: true,
        });
      }
    }

    setEmailRecipients(recipients);
    setNewRecipientName('');
    setNewRecipientEmail('');
    setShowEmailDialog(true);
  };

  const handleSendEmail = async () => {
    const selected = emailRecipients.filter(r => r.selected);
    if (selected.length === 0) {
      toast({ title: 'Selecione pelo menos um destinatário', variant: 'destructive' });
      return;
    }

    setIsSendingEmail(true);
    try {
      const orderResponse = await fetch(`/api/medical-orders/${orderId}`, { credentials: 'include' });
      if (!orderResponse.ok) throw new Error('Erro ao buscar pedido');
      const orderData = await orderResponse.json();

      const systemPdfs = (orderData.attachments || []).filter((att: any) => {
        if (att.type !== 'pdf') return false;
        const filename = att.filename || '';
        return filename.includes(`pedido_${orderId}_`) || filename.includes(`order_${orderId}_`);
      });

      if (systemPdfs.length === 0) {
        toast({
          title: 'PDF não encontrado',
          description: 'Nenhum PDF do pedido foi gerado. Por favor, gere o PDF primeiro.',
          variant: 'destructive',
        });
        setIsSendingEmail(false);
        return;
      }

      const pdfAttachment = systemPdfs[systemPdfs.length - 1];
      const pdfResponse = await fetch(pdfAttachment.url);
      if (!pdfResponse.ok) throw new Error('Erro ao buscar PDF');
      const pdfBlob = await pdfResponse.blob();

      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });

      const result = await apiRequest(`/api/medical-orders/${orderId}/send-email`, 'POST', {
        recipients: selected.map(r => ({ name: r.name, email: r.email })),
        pdfBase64,
        pdfFilename: pdfAttachment.filename || `pedido_${orderId}.pdf`,
        patientName: selectedPatient?.fullName || '',
      });

      if (result.devMode) {
        toast({
          title: 'Simulação de envio (modo dev)',
          description: `Email seria enviado para: ${result.sent.join(', ')}`,
        });
      } else if (result.failed.length > 0 && result.sent.length === 0) {
        toast({ title: 'Falha no envio', description: 'Nenhum email foi enviado.', variant: 'destructive' });
      } else {
        const failMsg = result.failed.length > 0 ? ` Falha: ${result.failed.join(', ')}` : '';
        toast({
          title: 'Email enviado!',
          description: `Enviado para ${result.sent.length} destinatário(s).${failMsg}`,
        });
      }
      setShowEmailDialog(false);
    } catch (err) {
      console.error('[send-email]', err);
      toast({ title: 'Erro ao enviar email', variant: 'destructive' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleAddCustomRecipient = () => {
    const emailTrimmed = newRecipientEmail.trim().toLowerCase();
    const nameTrimmed = newRecipientName.trim();
    if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      toast({ title: 'Email inválido', variant: 'destructive' });
      return;
    }
    if (emailRecipients.some(r => r.email.toLowerCase() === emailTrimmed)) {
      toast({ title: 'Email já adicionado', variant: 'destructive' });
      return;
    }
    setEmailRecipients(prev => [...prev, {
      id: `custom-${Date.now()}`,
      name: nameTrimmed || emailTrimmed,
      email: emailTrimmed,
      type: 'custom',
      selected: true,
    }]);
    setNewRecipientName('');
    setNewRecipientEmail('');
  };

  // Função para gerar PDF vetorial com quebra automática de páginas
  const generateHighQualityPDF = async () => {
    // Configurar Buffer globalmente para @react-pdf/renderer
    if (typeof window !== 'undefined' && !window.Buffer) {
      window.Buffer = Buffer;
    }
    try {
      console.log("🔄 INÍCIO - Geração de PDF vetorial com quebra automática");

      if (!orderId || !selectedPatient || !selectedHospital) {
        toast({
          title: "Erro ao gerar PDF",
          description: "Dados insuficientes para gerar o documento",
          variant: "destructive",
        });
        return;
      }

      // ✅ OTIMIZAÇÃO: Usar dados já carregados no estado (visualizador do pedido)
      // Isso garante que o PDF tenha EXATAMENTE os mesmos dados que o usuário viu no preview
      console.log("📋 Usando dados do visualizador (já carregados no estado)...");
      
      // Usar CIDs do estado local - inclui tanto objetos surgicalApproach/surgicalProcedure quanto IDs diretos
      const localCids = multipleCids.map((cidItem: CidItemWithAssociation) => ({
        cid: cidItem.cid,
        surgicalApproach: cidItem.surgicalApproach || null,
        surgicalProcedure: cidItem.surgicalProcedure || null,
        // Incluir IDs diretos para fallback quando objetos não estão disponíveis
        sourceApproachId: cidItem.sourceApproachId || cidItem.surgicalApproach?.id || null,
        sourceProcedureId: cidItem.sourceProcedureId || cidItem.surgicalProcedure?.id || null,
      }));
      console.log("✅ CIDs do estado local:", localCids.length, "CIDs com associações:", 
        localCids.map((c: any) => `${c.cid?.code} → proc:${c.surgicalProcedure?.id || c.sourceProcedureId || 'sem'} → approach:${c.surgicalApproach?.id || c.sourceApproachId || 'sem'}`));

      toast({
        title: "Gerando PDF",
        description: "Criando documento com quebra automática de páginas...",
      });

      // Configurar Buffer para @react-pdf/renderer no navegador
      if (typeof window !== 'undefined') {
        (window as any).Buffer = Buffer;
      }
      
      // Importar dinamicamente o react-pdf e o novo componente V2
      const { pdf } = await import('@react-pdf/renderer');
      const { OrderPDFDocumentV2 } = await import('@/components/order-pdf-document-v2');

      console.log("📄 Usando OrderPDFDocumentV2 com mesmos dados do Preview V2...");
      
      // Preparar dados no formato IDÊNTICO ao Preview V2
      // IMPORTANTE: Usar exatamente os mesmos estados que são passados para OrderPreviewV2
      const pdfV2Data = {
        orderId,
        selectedPatient,
        selectedHospital,
        user,
        clinicalJustification,
        procedureType,
        procedureLaterality,
        multipleCids,  // ✅ Usar multipleCids diretamente (igual ao Preview V2)
        secondaryProcedures,
        selectedOpmeItems,
        supplierDetails,
        cbhpmAdditionalNotes,
        opmeAdditionalNotes,
        supplierAdditionalNotes,
      };

      console.log("📄 Gerando PDF V2 com react-pdf/renderer...");
      console.log("Dados enviados para PDF V2:", {
        orderId: pdfV2Data.orderId,
        patientName: pdfV2Data.selectedPatient?.fullName,
        hospitalName: pdfV2Data.selectedHospital?.name,
        justificationLength: pdfV2Data.clinicalJustification?.length || 0,
        secondaryProceduresCount: pdfV2Data.secondaryProcedures?.length || 0,
        opmeItemsCount: pdfV2Data.selectedOpmeItems?.length || 0,
        cidsCount: pdfV2Data.multipleCids?.length || 0,
        suppliersCount: pdfV2Data.supplierDetails?.length || 0,
      });

      // Preparar anexos de imagem para incluir no PDF
      const rawImageAttachments = (currentOrderData?.attachments || []).filter((attachment: any) => 
        attachment.type === 'image' || 
        (attachment.type && ['jpeg', 'jpg', 'png', 'gif', 'webp'].includes(attachment.type.toLowerCase())) ||
        (attachment.filename && /\.(jpeg|jpg|png|gif|webp)$/i.test(attachment.filename))
      );

      // Função para calcular se a imagem tem proporção de documento A4
      const calculateIsDocumentRatio = (width: number, height: number): boolean => {
        const aspectRatio = Math.min(width, height) / Math.max(width, height);
        return aspectRatio >= 0.6 && aspectRatio <= 0.85;
      };

      // Função para obter dimensões de uma imagem via URL
      const getImageDimensionsFromUrl = (url: string): Promise<{ width: number; height: number }> => {
        return new Promise((resolve) => {
          const img = new window.Image();
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () => resolve({ width: 0, height: 0 });
          img.src = url;
        });
      };

      // Processar anexos para detectar proporção
      const imageAttachments = await Promise.all(
        rawImageAttachments.map(async (attachment: any) => {
          try {
            const dimensions = await getImageDimensionsFromUrl(attachment.url);
            const isDocumentRatio = dimensions.width > 0 && dimensions.height > 0 
              ? calculateIsDocumentRatio(dimensions.width, dimensions.height)
              : false;
            console.log(`📐 Anexo "${attachment.filename}": ${dimensions.width}x${dimensions.height}, proporção documento: ${isDocumentRatio}`);
            return { ...attachment, isDocumentRatio };
          } catch {
            return { ...attachment, isDocumentRatio: false };
          }
        })
      );

      console.log(`📎 Encontradas ${imageAttachments.length} imagens para adicionar ao PDF:`, imageAttachments.map(a => a.filename));

      // Calcular quebras de página manuais baseadas nas posições ajustadas
      interface PageBreakConfig {
        sectionIndex?: number;
        justificationLineIndex?: number;
      }
      const pageBreakConfigs: PageBreakConfig[] = [];
      
      if (orderPageBreaks.length > 0) {
        // Obter texto da justificativa para calcular linhas
        const justificationText = currentOrderData?.clinical_justification || currentOrderData?.clinicalJustification || '';
        // Usar parseMarkdownToPdf para obter o mesmo número de linhas que o PDF
        const { parseMarkdownToPdf } = await import('@/components/order-pdf-document');
        const pdfLines = parseMarkdownToPdf(justificationText);
        const totalPdfLines = pdfLines.length;
        
        // Obter posição real da justificativa no DOM
        const justificationBox = document.getElementById('justification-preview-box');
        const documentoCompleto = document.getElementById('documento-completo');
        
        if (justificationBox && documentoCompleto) {
          const docRect = documentoCompleto.getBoundingClientRect();
          const justRect = justificationBox.getBoundingClientRect();
          
          // Posições relativas ao documento
          const justificationStart = justRect.top - docRect.top;
          const justificationEnd = justRect.bottom - docRect.top;
          const justificationHeight = justRect.height;
          
          console.log('📄 Posições reais do DOM:', {
            justificationStart,
            justificationEnd,
            justificationHeight,
            totalPdfLines
          });
          
          orderPageBreaks.forEach((breakInfo, breakIndex) => {
            // Só processar se a quebra foi ajustada
            if (breakInfo.adjustedPosition !== breakInfo.originalPosition) {
              const breakPos = breakInfo.adjustedPosition;
              
              // Verificar se a quebra está dentro da justificativa
              if (breakPos >= justificationStart && breakPos < justificationEnd) {
                // Calcular posição relativa dentro da justificativa (0 a 1)
                const relativePosition = (breakPos - justificationStart) / justificationHeight;
                
                // Aplicar proporção ao número de linhas do PDF
                const lineIndex = Math.floor(relativePosition * totalPdfLines);
                
                // Adicionar quebra antes dessa linha (índice limitado ao número de linhas)
                const safeLineIndex = Math.max(1, Math.min(lineIndex, totalPdfLines - 1));
                pageBreakConfigs.push({ justificationLineIndex: safeLineIndex });
                console.log(`📄 Quebra na justificativa: posição relativa ${(relativePosition * 100).toFixed(1)}% → linha ${safeLineIndex} de ${totalPdfLines}`);
              } else if (breakPos < justificationStart) {
                // Quebra antes da justificativa (seção 2)
                pageBreakConfigs.push({ sectionIndex: 2 });
                console.log(`📄 Quebra antes da justificativa (seção 2)`);
              } else if (breakPos >= justificationEnd) {
                // Quebra nas seções após a justificativa
                pageBreakConfigs.push({ sectionIndex: 3 });
                console.log(`📄 Quebra após a justificativa (seção 3)`);
              }
            }
          });
        } else {
          console.warn('⚠️ Elementos DOM não encontrados para cálculo de quebras');
        }

        console.log('📄 Configurações de quebras de página:', pageBreakConfigs);
      }

      // Converter Set de quebras forçadas para array para passar ao PDF
      const forcedPageBreaksArray = Array.from(forcedPageBreaks);
      console.log('📄 Quebras de página forçadas do preview:', forcedPageBreaksArray);
      
      // Buscar anexos de imagem do pedido atual para incluir no PDF V2
      const pdfImageAttachments = (currentOrderData?.attachments || []).filter((attachment: any) => 
        attachment.type === 'image' || 
        (attachment.type && ['jpeg', 'jpg', 'png', 'gif', 'webp'].includes(attachment.type.toLowerCase())) ||
        (attachment.filename && /\.(jpeg|jpg|png|gif|webp)$/i.test(attachment.filename))
      );
      console.log(`📷 Total de imagens nos anexos para PDF V2: ${pdfImageAttachments.length}`);
      
      // Gerar PDF V2 principal usando react-pdf (mesma estrutura do Preview V2)
      const mainPdfBlob = await pdf(
        <OrderPDFDocumentV2 
          {...pdfV2Data} 
          forcedPageBreaks={forcedPageBreaksArray}
          attachments={pdfImageAttachments}
        />
      ).toBlob();

      console.log("✅ PDF vetorial principal gerado! Tamanho:", mainPdfBlob.size, "bytes");

      // ========== FAZER MERGE COM PDFs DOS ANEXOS ==========
      console.log("📄 Verificando anexos PDF para merge no @react-pdf/renderer...");
      
      // Buscar anexos PDF do pedido atual
      const allPdfAttachments = (currentOrderData?.attachments || []).filter((attachment: any) => 
        attachment.type === 'pdf' || 
        (attachment.filename && attachment.filename.toLowerCase().endsWith('.pdf'))
      );
      
      console.log(`📎 Total de PDFs nos anexos: ${allPdfAttachments.length}`);
      
      // FILTRAR para excluir o próprio PDF do pedido (PDFs gerados pelo sistema)
      const pdfAttachments = allPdfAttachments.filter((attachment: any) => {
        const filename = attachment.filename || '';
        const url = attachment.url || '';
        
        // Padrões para identificar o próprio PDF do pedido (gerado pelo sistema)
        const ownPdfPatterns = [
          `pedido_${orderId}`,
          `order_${orderId}`,
          `${orderId}_`,
          `pedido-${orderId}`,
          `order-${orderId}`,
          `${orderId}.pdf`
        ];
        
        // Verificar se o filename ou URL contém algum dos padrões do sistema
        const isSystemGeneratedPdf = ownPdfPatterns.some(pattern => 
          filename.toLowerCase().includes(pattern.toLowerCase()) ||
          url.toLowerCase().includes(pattern.toLowerCase())
        );
        
        // DEBUG: Log detalhado da verificação
        console.log(`🔍 PDF: ${filename}`);
        console.log(`   URL: ${url}`);
        console.log(`   É PDF do sistema? ${isSystemGeneratedPdf}`);
        console.log(`   Será incluído no merge? ${!isSystemGeneratedPdf}`);
        
        if (isSystemGeneratedPdf) {
          console.log(`🚫 Excluindo PDF gerado pelo sistema: ${filename}`);
        } else {
          console.log(`✅ Incluindo PDF do usuário no merge: ${filename}`);
        }
        
        return !isSystemGeneratedPdf;
      });
      
      console.log(`📎 PDFs do usuário (após filtrar PDFs do sistema): ${pdfAttachments.length}`);
      console.log('PDFs que serão incluídos no merge:', pdfAttachments.map(a => a.filename));
      
      let finalPdfBlob = mainPdfBlob;
      
      if (pdfAttachments.length > 0) {
        toast({
          title: "Fazendo merge dos PDFs",
          description: `Adicionando ${pdfAttachments.length} documento(s) PDF anexo(s)...`,
        });
        
        try {
          // Importar pdf-lib dinamicamente
          const { PDFDocument } = await import('pdf-lib');
          
          // Converter o PDF principal para PDFDocument para fazer merge
          const mainPdfBytes = await mainPdfBlob.arrayBuffer();
          const finalPdfDoc = await PDFDocument.load(mainPdfBytes);
          
          // Processar cada PDF dos anexos
          for (let i = 0; i < pdfAttachments.length; i++) {
            const attachment = pdfAttachments[i];
            
            try {
              console.log(`📄 Fazendo merge do PDF ${i + 1}/${pdfAttachments.length}:`, attachment.filename);
              
              // Carregar o PDF de anexo do servidor
              const pdfResponse = await fetch(attachment.url, {
                credentials: 'include'
              });
              
              if (!pdfResponse.ok) {
                console.warn(`⚠️ Falha ao carregar anexo PDF: ${attachment.filename}`);
                continue;
              }
              
              const attachmentPdfBytes = await pdfResponse.arrayBuffer();
              const attachmentPdf = await PDFDocument.load(attachmentPdfBytes);
              
              // Copiar todas as páginas do PDF de anexo
              const pageIndices = attachmentPdf.getPageIndices();
              const copiedPages = await finalPdfDoc.copyPages(attachmentPdf, pageIndices);
              
              // Adicionar as páginas copiadas ao documento final
              copiedPages.forEach((page) => finalPdfDoc.addPage(page));
              
              console.log(`✅ PDF ${i + 1} merged: ${attachment.filename} (${pageIndices.length} páginas)`);
              
            } catch (error) {
              console.error(`❌ Erro ao fazer merge do PDF ${attachment.filename}:`, error);
              // Continuar processando outros PDFs mesmo se um falhar
            }
          }
          
          // Salvar o PDF final com merge
          const finalPdfBytes = await finalPdfDoc.save();
          finalPdfBlob = new Blob([finalPdfBytes], { type: 'application/pdf' });
          
          console.log(`✅ Merge de PDFs concluído. Total de páginas: ${finalPdfDoc.getPageCount()}`);
          
        } catch (error) {
          console.error(`❌ Erro geral no merge de PDFs:`, error);
          toast({
            title: "Erro no merge de PDFs",
            description: "Alguns anexos PDF podem não ter sido incluídos",
            variant: "destructive"
          });
          // Continuar com o PDF principal se o merge falhar
        }
      } else {
        console.log("📄 Nenhum anexo PDF encontrado para fazer merge");
      }

      const pdfBlob = finalPdfBlob;

      // Gerar nome do arquivo
      const fileName = `pedido_${orderId}_${selectedPatient?.fullName?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      console.log("📁 Nome do arquivo gerado:", fileName);
      
      // Criar FormData para enviar o arquivo
      const formData = new FormData();
      formData.append('pdf', pdfBlob, fileName);
      formData.append('orderId', orderId.toString());
      formData.append('patientName', selectedPatient?.fullName || 'Paciente');
      
      console.log("📤 Enviando PDF vetorial para servidor...");
      
      // Enviar PDF para o servidor
      const uploadResponse = await fetch('/api/uploads/order-pdf', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Erro no upload: ${uploadResponse.status}`);
      }
      
      const uploadResult = await uploadResponse.json();
      console.log("✅ Upload concluído:", uploadResult);
      
      // Atualizar status do pedido para "Aguardando Envio"
      await updateOrderField('statusId', ORDER_STATUS_IDS.AGUARDANDO_ENVIO);
      
      toast({
        title: "PDF gerado com sucesso!",
        description: "Documento com quebra automática de páginas criado",
      });
      
      // Avançar para o próximo passo
      setCurrentStep(5);
      
    } catch (error) {
      console.error("❌ Erro na geração do PDF vetorial:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Falha na geração do documento com quebra automática",
        variant: "destructive",
      });
      
      // Não usar fallback - apenas reportar erro
      console.error("Falha na geração do PDF com @react-pdf/renderer:", error);
    }
  };

  // Função para gerar PDF da prévia do pedido (método original como backup)
  const generatePDF = async () => {
    try {
      console.log("🔄 INÍCIO - Geração de PDF");
      console.log("OrderID:", orderId);
      console.log("Paciente:", selectedPatient?.fullName);
      
      if (!orderId) {
        console.error("❌ OrderID é obrigatório para gerar PDF");
        toast({
          title: "Erro ao gerar PDF",
          description: "ID do pedido não encontrado. Salve o pedido primeiro.",
          variant: "destructive",
        });
        return;
      }
      
      const element = document.getElementById('documento-completo');
      if (!element) {
        console.log("❌ ERRO: Elemento documento-completo não encontrado");
        toast({
          title: "Erro ao gerar PDF",
          description: "Elemento do documento não encontrado",
          variant: "destructive",
        });
        return;
      }

      console.log("✅ Elemento encontrado, iniciando captura...");
      toast({
        title: "Gerando PDF",
        description: "Processando documento...",
      });

      // Capturar a div como canvas com configurações de alta qualidade
      const canvas = await html2canvas(element, {
        scale: 2.0, // Aumentar escala para melhor qualidade de texto
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        height: element.offsetHeight,
        width: element.offsetWidth,
        removeContainer: true,
        logging: false,
        pixelRatio: window.devicePixelRatio || 2, // Usar pixel ratio do dispositivo
        imageTimeout: 0,
        ignoreElements: (element) => {
          return element.tagName === 'IMG' && (element as HTMLImageElement).src?.includes('attached_assets');
        },
      });
      
      console.log("🖼️ Canvas criado - Dimensões:", canvas.width, "x", canvas.height);

      // Criar PDF com alta qualidade
      let pdf: any = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/jpeg', 0.95); // JPEG com 95% de qualidade para melhor texto
      console.log("📊 Tamanho da imagem base64:", Math.round(imgData.length / 1024), "KB");
      
      // Dimensões A4: 210 x 297 mm - forçar uma única página
      const imgWidth = 210;
      const pageHeight = 297;
      
      // Calcular altura proporcional, mas limitar à página A4
      let imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Se a altura exceder a página A4, ajustar para caber
      if (imgHeight > pageHeight) {
        imgHeight = pageHeight;
      }

      // Adicionar apenas uma página (igual à prévia)
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);

      // ========== ADICIONAR IMAGENS DOS ANEXOS ==========
      console.log("🖼️ Verificando anexos para adicionar ao PDF...");
      
      // Buscar anexos de imagem do pedido atual
      const attachments = currentOrderData?.attachments || [];
      const imageAttachments = attachments.filter((attachment: any) => 
        attachment.type && ['jpeg', 'jpg', 'png', 'gif', 'webp'].includes(attachment.type.toLowerCase())
      );
      
      console.log(`📎 Encontrados ${imageAttachments.length} anexos de imagem:`, imageAttachments);
      
      if (imageAttachments.length > 0) {
        toast({
          title: "Adicionando anexos",
          description: `Processando ${imageAttachments.length} imagem(s) anexa(s)...`,
        });
        
        // Função auxiliar para adicionar cabeçalho
        const addHeader = (pdf: any) => {
          // Logo à esquerda
          if (doctorData?.signature) {
            try {
              pdf.addImage(doctorData.signature, 'PNG', 20, 15, 30, 15);
            } catch (error) {
              console.log('Logo não disponível');
            }
          }
          
          // Título centralizado
          pdf.setFontSize(14);
          pdf.setTextColor(0, 0, 0);
          const title = 'SOLICITAÇÃO DE AUTORIZAÇÃO PARA CIRURGIA';
          const titleWidth = pdf.getTextWidth(title);
          pdf.text(title, (210 - titleWidth) / 2, 25);
          
          // Linha divisória
          pdf.setDrawColor(0, 0, 0);
          pdf.setLineWidth(0.5);
          pdf.line(20, 35, 190, 35);
        };
        
        // Função auxiliar para adicionar rodapé
        const addFooter = (pdf: any) => {
          const pageHeight = 297; // A4 height in mm
          
          // Linha divisória
          pdf.setDrawColor(0, 0, 0);
          pdf.setLineWidth(0.5);
          pdf.line(20, pageHeight - 25, 190, pageHeight - 25);
          
          // Texto do rodapé
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          const footerText = `MedSync - Sistema de Gestão Médica | Documento gerado em ${new Date().toLocaleDateString('pt-BR')}`;
          const footerWidth = pdf.getTextWidth(footerText);
          pdf.text(footerText, (210 - footerWidth) / 2, pageHeight - 15);
        };

        // Processar cada imagem dos anexos diretamente
        for (let i = 0; i < imageAttachments.length; i++) {
          const attachment = imageAttachments[i];
          
          try {
            console.log(`🖼️ Processando anexo ${i + 1}/${imageAttachments.length}:`, attachment.filename);
            
            // Carregar a imagem do servidor
            const imageResponse = await fetch(attachment.url, {
              credentials: 'include'
            });
            
            if (!imageResponse.ok) {
              console.warn(`⚠️ Falha ao carregar anexo: ${attachment.filename}`);
              continue;
            }
            
            const imageBlob = await imageResponse.blob();
            const imageDataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(imageBlob);
            });
            
            // Adicionar nova página para cada imagem
            pdf.addPage();
            
            // Adicionar cabeçalho e rodapé
            addHeader(pdf);
            addFooter(pdf);
            
            // Criar um novo canvas para redimensionar a imagem
            const img = new Image();
            img.crossOrigin = "anonymous";
            
            await new Promise<void>((resolve, reject) => {
              img.onload = () => {
                try {
                  // Calcular dimensões para ajustar à página A4 mantendo proporção (considerando cabeçalho e rodapé)
                  const maxWidth = 170; // Margem para cabeçalho e rodapé
                  const maxHeight = 200; // Espaço entre cabeçalho (35mm) e rodapé (272mm), menos margem para legenda
                  
                  let finalWidth = img.width;
                  let finalHeight = img.height;
                  
                  // Redimensionar mantendo proporção se necessário
                  if (finalWidth > maxWidth || finalHeight > maxHeight) {
                    const widthRatio = maxWidth / finalWidth;
                    const heightRatio = maxHeight / finalHeight;
                    const ratio = Math.min(widthRatio, heightRatio);
                    
                    finalWidth = finalWidth * ratio;
                    finalHeight = finalHeight * ratio;
                  }
                  
                  // Converter pixels para mm (assumindo 96 DPI)
                  const widthMM = (finalWidth * 25.4) / 96;
                  const heightMM = (finalHeight * 25.4) / 96;
                  
                  // Centralizar a imagem na página (considerando cabeçalho)
                  const xPos = (210 - widthMM) / 2;
                  const yPos = 45 + (200 - heightMM) / 2; // Começar após cabeçalho
                  
                  // Adicionar a imagem ao PDF
                  pdf.addImage(imageDataUrl, 'JPEG', xPos, yPos, widthMM, heightMM);
                  
                  // Adicionar legenda na parte inferior (antes do rodapé)
                  pdf.setFontSize(10);
                  pdf.setTextColor(107, 114, 128);
                  const legendText = `Pedido nº ${currentOrderData?.id} - Paciente: ${selectedPatient?.fullName} - Anexo ${i + 1} / ${imageAttachments.length}`;
                  const legendWidth = pdf.getTextWidth(legendText);
                  pdf.text(legendText, (210 - legendWidth) / 2, 260);
                  
                  console.log(`✅ Anexo ${i + 1} adicionado: ${attachment.filename} (${widthMM.toFixed(1)}x${heightMM.toFixed(1)}mm)`);
                  resolve();
                } catch (error) {
                  console.error(`❌ Erro ao processar anexo ${attachment.filename}:`, error);
                  reject(error);
                }
              };
              
              img.onerror = () => {
                console.error(`❌ Erro ao carregar imagem: ${attachment.filename}`);
                reject(new Error(`Falha ao carregar ${attachment.filename}`));
              };
              
              img.src = imageDataUrl;
            });
            
          } catch (error) {
            console.error(`❌ Erro ao processar anexo ${attachment.filename}:`, error);
            // Continuar processando outras imagens mesmo se uma falhar
          }
        }
        
        console.log(`✅ Processamento de anexos concluído. Total de páginas no PDF: ${pdf.getNumberOfPages()}`);
      } else {
        console.log("📎 Nenhum anexo de imagem encontrado para adicionar ao PDF");
      }

      // ========== FAZER MERGE COM PDFs DOS ANEXOS ==========
      console.log("📄 Verificando anexos PDF para fazer merge...");
      
      // Buscar anexos PDF do pedido atual
      const allPdfAttachments = attachments.filter((attachment: any) => 
        attachment.type === 'pdf' || 
        (attachment.filename && attachment.filename.toLowerCase().endsWith('.pdf'))
      );
      
      console.log(`📎 Total de PDFs nos anexos: ${allPdfAttachments.length}`);
      
      // FILTRAR para excluir o próprio PDF do pedido
      const pdfAttachments = allPdfAttachments.filter((attachment: any) => {
        const filename = attachment.filename || '';
        
        // Padrões para identificar o próprio PDF do pedido
        const ownPdfPatterns = [
          `pedido_${orderId}`,
          `order_${orderId}`,
          `${orderId}_`,
          `pedido-${orderId}`,
          `order-${orderId}`,
          `${orderId}.pdf`
        ];
        
        // Verificar se o filename contém algum dos padrões
        const isOwnPdf = ownPdfPatterns.some(pattern => 
          filename.toLowerCase().includes(pattern.toLowerCase())
        );
        
        if (isOwnPdf) {
          console.log(`🚫 Excluindo próprio PDF do merge (html2canvas+jsPDF): ${filename}`);
        }
        
        return !isOwnPdf;
      });
      
      console.log(`📎 PDFs externos (após filtrar próprio pedido): ${pdfAttachments.length}`);
      console.log('PDFs que serão incluídos no merge:', pdfAttachments.map(a => a.filename));
      
      if (pdfAttachments.length > 0) {
        toast({
          title: "Fazendo merge dos PDFs",
          description: `Adicionando ${pdfAttachments.length} documento(s) PDF anexo(s)...`,
        });
        
        try {
          // Importar pdf-lib dinamicamente
          const { PDFDocument } = await import('pdf-lib');
          
          // Converter o PDF atual (jsPDF) para PDFDocument para fazer merge
          const currentPdfBytes = pdf.output('arraybuffer');
          const finalPdfDoc = await PDFDocument.load(currentPdfBytes);
          
          // Processar cada PDF dos anexos
          for (let i = 0; i < pdfAttachments.length; i++) {
            const attachment = pdfAttachments[i];
            
            try {
              console.log(`📄 Fazendo merge do PDF ${i + 1}/${pdfAttachments.length}:`, attachment.filename);
              
              // Carregar o PDF de anexo do servidor
              const pdfResponse = await fetch(attachment.url, {
                credentials: 'include'
              });
              
              if (!pdfResponse.ok) {
                console.warn(`⚠️ Falha ao carregar anexo PDF: ${attachment.filename}`);
                continue;
              }
              
              const attachmentPdfBytes = await pdfResponse.arrayBuffer();
              const attachmentPdf = await PDFDocument.load(attachmentPdfBytes);
              
              // Copiar todas as páginas do PDF de anexo
              const pageIndices = attachmentPdf.getPageIndices();
              const copiedPages = await finalPdfDoc.copyPages(attachmentPdf, pageIndices);
              
              // Adicionar as páginas copiadas ao documento final
              copiedPages.forEach((page) => finalPdfDoc.addPage(page));
              
              console.log(`✅ PDF ${i + 1} merged: ${attachment.filename} (${pageIndices.length} páginas)`);
              
            } catch (error) {
              console.error(`❌ Erro ao fazer merge do PDF ${attachment.filename}:`, error);
              // Continuar processando outros PDFs mesmo se um falhar
            }
          }
          
          // Salvar o PDF final com merge
          const finalPdfBytes = await finalPdfDoc.save();
          
          // Substituir o objeto pdf pelo PDF final
          const finalBlob = new Blob([finalPdfBytes], { type: 'application/pdf' });
          
          // Criar objeto PDF final para envio
          pdf = {
            output: (format: string) => {
              if (format === 'blob') return finalBlob;
              if (format === 'arraybuffer') return finalPdfBytes;
              return finalBlob;
            },
            save: (filename: string) => {
              const url = URL.createObjectURL(finalBlob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              a.click();
              URL.revokeObjectURL(url);
            },
            getNumberOfPages: () => finalPdfDoc.getPageCount()
          };
          
          console.log(`✅ Merge de PDFs concluído. Total de páginas: ${finalPdfDoc.getPageCount()}`);
          
        } catch (error) {
          console.error(`❌ Erro geral no merge de PDFs:`, error);
          toast({
            title: "Erro no merge de PDFs",
            description: "Alguns anexos PDF podem não ter sido incluídos",
            variant: "destructive"
          });
        }
      } else {
        console.log("📄 Nenhum anexo PDF encontrado para fazer merge");
      }

      // Gerar nome do arquivo
      const fileName = `pedido_${orderId}_${selectedPatient?.fullName?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      console.log("📁 Nome do arquivo gerado:", fileName);
      
      // Converter PDF para blob para enviar ao servidor
      const pdfBlob = pdf.output('blob');
      console.log("📄 PDF blob criado, tamanho:", pdfBlob.size, "bytes");
      
      // Criar FormData para enviar o arquivo
      const formData = new FormData();
      formData.append('pdf', pdfBlob, fileName);
      formData.append('orderId', orderId.toString());
      formData.append('patientName', selectedPatient?.fullName || 'Paciente');
      
      console.log("📤 Enviando dados para servidor:");
      console.log("- OrderID:", orderId);
      console.log("- Nome do arquivo:", fileName);
      console.log("- Tamanho do PDF:", pdfBlob.size);
      
      // Enviar PDF para o servidor (seguindo padrão do laudo médico)
      const uploadResponse = await fetch('/api/uploads/order-pdf', {
        method: 'POST',
        credentials: 'include', // Incluir cookies de sessão
        body: formData,
      });
      
      console.log("📡 Resposta do servidor:", uploadResponse.status, uploadResponse.statusText);
      
      if (uploadResponse.ok) {
        const result = await uploadResponse.json();
        console.log("✅ Sucesso! Resultado do servidor:", result);
        
        // PDF salvo apenas no servidor (sem download automático)
        
        toast({
          title: "PDF gerado com sucesso",
          description: `Arquivo salvo no servidor`,
        });
        
        return result.pdfUrl; // Retornar URL do PDF salvo
      } else {
        const errorText = await uploadResponse.text();
        console.log("❌ Erro do servidor:", errorText);
        
        // Se falhar no servidor, ainda assim baixar localmente
        pdf.save(fileName);
        
        toast({
          title: "PDF gerado",
          description: "Arquivo baixado localmente (erro ao salvar no servidor)",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o documento",
        variant: "destructive",
      });
    }
  };

  // Função para finalizar o pedido (otimizada)
  const handleComplete = async () => {
    try {
      console.log("🔄 Iniciando finalização - Gerando PDF...");
      
      // 1. Gerar o PDF (única operação necessária)
      const pdfUrl = await generateHighQualityPDF();
      
      console.log("📄 PDF gerado com sucesso:", pdfUrl);
      
      // **PRESERVAR ATTACHMENTS**: Buscar attachments atuais antes de finalizar
      let currentAttachments = [];
      try {
        const currentOrder = await apiRequest(`/api/medical-orders/${orderId}`, "GET");
        currentAttachments = currentOrder?.attachments || [];
        console.log(`🔍 FINALIZANDO - PRESERVANDO ATTACHMENTS: ${currentAttachments.length} anexos existentes`);
      } catch (error) {
        console.error("Erro ao buscar attachments atuais:", error);
      }
      
      // 2. Definir status baseado no tipo de procedimento (eletivo vs urgência)
      // - Eletivo: vai para "Aguardando Envio" (ID 8)
      // - Urgência: vai para "Autorização Pós" (ID 11)
      const isUrgency = procedureType === PROCEDURE_TYPE_VALUES.URGENCIA;
      const targetStatusId = isUrgency 
        ? ORDER_STATUS_IDS.AUTORIZACAO_POS 
        : ORDER_STATUS_IDS.AGUARDANDO_ENVIO;
      const targetStatusLabel = isUrgency ? 'Autorização Pós' : 'Aguardando Envio';
      
      const statusUpdateData = {
        statusId: targetStatusId,
        // **PRESERVAR ATTACHMENTS**
        attachments: currentAttachments,
      };

      console.log(`🔄 Atualizando status do pedido para '${targetStatusLabel}' (preservando attachments)...`);

      // Utilizar o endpoint de update apenas para status
      const data = await apiRequest(
        API_ENDPOINTS.MEDICAL_ORDER_BY_ID(orderId),
        "PUT",
        statusUpdateData,
      );

      toast({
        title: "Pedido enviado com sucesso",
        description: `Pedido para ${selectedPatient?.fullName} no hospital ${selectedHospital?.name} foi enviado para avaliação.`,
        duration: 3000,
      });

      queryClient.invalidateQueries({
        queryKey: [API_ENDPOINTS.MEDICAL_ORDERS],
      });
      queryClient.invalidateQueries({ queryKey: ['/api/home/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/stats'] });

      // Avançar para o último passo (confirmação)
      setCurrentStep(5);
    } catch (error) {
      console.error("Erro ao finalizar pedido:", error);
      toast({
        title: "Erro ao finalizar pedido",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // Função para validar um passo específico
  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        return !!(selectedPatient?.id && selectedHospital?.id);
      
      case 2:
        return validateStep(1) && 
               !!(clinicalIndication && 
                  clinicalIndication.trim() !== "" && 
                  clinicalIndication !== "A ser preenchido");
      
      case 3:
        // ❌ VALIDAÇÃO LEGADA COMENTADA - selectedProcedure não existe mais
        // Agora validamos secondaryProcedures.length > 0
        const step3Valid = validateStep(2) && 
               !!(secondaryProcedures.length > 0 &&  // ✅ CORRIGIDO
                  (multipleCids && multipleCids.length > 0) && 
                  clinicalJustification && 
                  clinicalJustification.trim() !== "" &&
                  procedureLaterality && 
                  procedureLaterality.trim() !== "" && 
                  procedureLaterality !== "null");
        
        // Validation debug removed for performance
        
        return step3Valid;
      
      case 4:
        return validateStep(3);
      
      case 5:
        return validateStep(4);
      
      default:
        return false;
    }
  };

  // Função para verificar se um passo pode ser acessado
  const canAccessStep = (stepNumber: number) => {
    // Sempre pode acessar o passo 1
    if (stepNumber === 1) return true;
    
    // Para passos anteriores ao atual, sempre pode acessar
    if (stepNumber < currentStep) return true;
    
    // Para o passo atual, sempre pode acessar
    if (stepNumber === currentStep) return true;
    
    // REGRA ESPECIAL: O passo 5 (visualização) só pode ser acessado via botão "Próximo"
    // Nunca via clique direto no breadcrumb, exceto se já estiver no passo 5 ou posterior
    if (stepNumber === 5 && currentStep < 5) {
      return false;
    }
    
    // Para outros passos futuros (2, 3, 4), verificar se todos os passos intermediários estão válidos
    for (let i = 1; i < stepNumber; i++) {
      if (!validateStep(i)) {
        return false;
      }
    }
    
    return true;
  };

  // Função para navegar diretamente para um passo específico
  const goToStep = async (stepNumber: number) => {
    // Verificar se o passo pode ser acessado
    if (!canAccessStep(stepNumber)) {
      // Determinar qual requisito está faltando para dar feedback específico
      if (stepNumber === 2 && !validateStep(1)) {
        toast({
          title: "Complete o Passo 1",
          description: "Selecione um paciente e hospital antes de continuar",
          variant: "destructive",
          duration: 5000,
        });
      } else if (stepNumber === 3 && !validateStep(2)) {
        toast({
          title: "Complete o Passo 2",
          description: "Preencha a indicação clínica antes de continuar",
          variant: "destructive",
          duration: 5000,
        });
      } else if (stepNumber === 4 && !validateStep(3)) {
        toast({
          title: "Complete o Passo 3",
          description: "Selecione procedimento, CID e preencha a justificativa clínica",
          variant: "destructive",
          duration: 5000,
        });
      } else if (stepNumber === 5 && currentStep < 5) {
        toast({
          title: "Use o botão Próximo",
          description: "Para acessar a visualização, use o botão 'Próximo' do passo 4",
          variant: "destructive",
          duration: 5000,
        });
      } else {
        toast({
          title: "Passo não disponível",
          description: "Complete os passos anteriores para acessar este passo",
          variant: "destructive",
          duration: 5000,
        });
      }
      return;
    }
    
    // Se estamos avançando para um passo futuro, salvar progresso atual primeiro
    if (stepNumber > currentStep) {
      try {
        await saveProgress();
      } catch (error) {
        console.error("Erro ao salvar progresso:", error);
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível salvar o progresso atual",
          variant: "destructive",
          duration: 5000,
        });
        return;
      }
    }
    
    // Navegar para o passo selecionado
    setCurrentStep(stepNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // === QUEBRAS DE PÁGINA AJUSTÁVEIS (Step 4 - Visualização) ===
  
  // Calcular posições das quebras de página quando o preview é renderizado
  useEffect(() => {
    console.log('[PageBreaks] useEffect triggered, currentStep:', currentStep);
    if (currentStep !== 4) {
      console.log('[PageBreaks] Not step 4, skipping');
      return;
    }
    if (!orderPreviewRef.current) {
      console.log('[PageBreaks] orderPreviewRef.current is null');
      return;
    }
    
    // Pequeno delay para garantir que o conteúdo está renderizado
    const timer = setTimeout(() => {
      const previewHeight = orderPreviewRef.current?.scrollHeight || 0;
      const numPages = Math.ceil(previewHeight / PAGE_HEIGHT_PX);
      
      console.log('[PageBreaks] previewHeight:', previewHeight, 'PAGE_HEIGHT_PX:', PAGE_HEIGHT_PX, 'numPages:', numPages);
      
      if (numPages <= 1) {
        console.log('[PageBreaks] Only 1 page, no breaks needed');
        setOrderPageBreaks([]);
        return;
      }
      
      const breaks: PageBreakInfo[] = [];
      for (let i = 1; i < numPages; i++) {
        const position = i * PAGE_HEIGHT_PX;
        breaks.push({
          originalPosition: position,
          adjustedPosition: position
        });
      }
      console.log('[PageBreaks] Setting breaks:', breaks);
      setOrderPageBreaks(breaks);
    }, 500); // Aumentado delay para garantir renderização
    
    return () => clearTimeout(timer);
  }, [currentStep, selectedPatient, selectedHospital, clinicalIndication, clinicalJustification, secondaryProcedures]);

  // Handlers para arrastar marcadores de quebra de página
  const handleBreakDragStart = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault();
    setDraggingBreakIndex(index);
    setBreakDragStartY(e.clientY);
    setBreakDragStartPosition(orderPageBreaks[index]?.adjustedPosition || 0);
  }, [orderPageBreaks]);

  const handleBreakDrag = useCallback((e: MouseEvent) => {
    if (draggingBreakIndex === null) return;
    
    const deltaY = e.clientY - breakDragStartY;
    const newPosition = breakDragStartPosition + deltaY;
    const breakInfo = orderPageBreaks[draggingBreakIndex];
    
    if (!breakInfo) return;
    
    // Limite superior: posição da quebra anterior + MIN_PAGE_CONTENT
    const previousBreakPosition = draggingBreakIndex > 0 
      ? orderPageBreaks[draggingBreakIndex - 1].adjustedPosition 
      : 0;
    const minPosition = previousBreakPosition + MIN_PAGE_CONTENT;
    
    // Limite inferior: posição original (não pode passar do limite da página)
    const maxPosition = breakInfo.originalPosition;
    
    // Aplicar limites
    const clampedPosition = Math.max(minPosition, Math.min(maxPosition, newPosition));
    
    setOrderPageBreaks(prev => {
      const updated = [...prev];
      updated[draggingBreakIndex] = {
        ...updated[draggingBreakIndex],
        adjustedPosition: clampedPosition,
      };
      return updated;
    });
  }, [draggingBreakIndex, breakDragStartY, breakDragStartPosition, orderPageBreaks]);

  const handleBreakDragEnd = useCallback(() => {
    setDraggingBreakIndex(null);
  }, []);

  // Adicionar listeners globais para drag
  useEffect(() => {
    if (draggingBreakIndex !== null) {
      document.addEventListener('mousemove', handleBreakDrag);
      document.addEventListener('mouseup', handleBreakDragEnd);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleBreakDrag);
        document.removeEventListener('mouseup', handleBreakDragEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [draggingBreakIndex, handleBreakDrag, handleBreakDragEnd]);

  // Resetar quebras de página para posições originais
  const resetOrderPageBreaks = useCallback(() => {
    setOrderPageBreaks(prev => prev.map(b => ({
      ...b,
      adjustedPosition: b.originalPosition
    })));
  }, []);

  // Função para navegar para o próximo passo
  const goToNextStep = async () => {
    if (currentStep < 5) {
      // Se estamos no passo 4 (Visualização), então finalizamos o pedido
      if (currentStep === 4) {
        // Ativar loading durante criação do PDF
        setIsCreatingPDF(true);
        try {
          await handleComplete();
          // Voltar ao topo da página após finalizar
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
          setIsCreatingPDF(false);
        }
        return;
      }
      if (currentStep === 1) {
        // Se estamos no passo 1 (paciente e hospital), garantir que um pedido seja criado no banco
        try {
          // Verificar se temos paciente e hospital selecionados
          if (!selectedPatient?.id) {
            toast({
              title: "Paciente não selecionado",
              description: "Por favor, selecione um paciente para continuar",
              variant: "destructive",
              duration: 5000,
            });
            return;
          }

          if (!selectedHospital?.id) {
            toast({
              title: "Hospital não selecionado",
              description: "Por favor, selecione um hospital para continuar",
              variant: "destructive",
              duration: 5000,
            });
            return;
          }

          // Validar que temos os dados obrigatórios
          if (!selectedPatient?.id || !user?.id || !selectedHospital?.id) {
            console.error("Dados obrigatórios ausentes:", {
              patientId: selectedPatient?.id,
              userId: user?.id,
              hospitalId: selectedHospital?.id
            });
            toast({
              title: "Erro de validação",
              description: "Dados obrigatórios ausentes. Verifique paciente, usuário e hospital.",
              variant: "destructive",
              duration: 5000,
            });
            return;
          }

          // Preparar objeto base com dados mínimos necessários
          // Somente incluindo campos que realmente existem na tabela do banco de dados
          const initialOrderData = {
            patientId: Number(selectedPatient.id),
            userId: Number(user.id),
            hospitalId: Number(selectedHospital.id),
            statusId: ORDER_STATUS_IDS.EM_PREENCHIMENTO, // Alterado de 'statusCode' para 'statusId'
            procedureType: PROCEDURE_TYPE_VALUES.ELETIVA, // Valor padrão
            clinicalIndication: "A ser preenchido", // Campo obrigatório deve ter valor não vazio
            // Valor de lateralidade do procedimento (possivelmente null neste ponto, será atualizado depois)
            procedureLaterality: procedureLaterality || null,
            additionalNotes: null,
            clinicalJustification: null,
            attachments: []
            // Campos removidos - agora gerenciados via tabelas relacionais
          };

          console.log("🔍 Dados do pedido sendo enviados:", JSON.stringify(initialOrderData, null, 2));
          console.log("🔍 Validação frontend antes do envio:", {
            selectedPatientId: selectedPatient?.id,
            userId: user?.id,
            selectedHospitalId: selectedHospital?.id,
            initialOrderDataPatientId: initialOrderData.patientId,
            initialOrderDataUserId: initialOrderData.userId,
            initialOrderDataHospitalId: initialOrderData.hospitalId
          });

          // Se não temos um ID de pedido ainda, criar um novo
          if (!orderId) {
            console.log(
              "Criando novo pedido cirúrgico com paciente:",
              selectedPatient.fullName,
            );

            console.log("🔍 Fazendo POST para API com dados:", initialOrderData);
            const data = await apiRequest(
              API_ENDPOINTS.MEDICAL_ORDERS,
              "POST",
              initialOrderData,
            );
            console.log("🔍 Resposta da API:", data);

            setOrderId(data.id);
            setCurrentOrderData(data);

            console.log("Pedido criado com sucesso, ID:", data.id);

            toast({
              title: "Pedido iniciado",
              description: `Pedido cirúrgico #${data.id} foi iniciado com sucesso`,
              duration: 2000,
            });
          } else {
            // Se já temos um ID, apenas atualizar os dados básicos
            await saveProgress();
          }

          // Avançar para o próximo passo após a criação bem-sucedida
          setCurrentStep(currentStep + 1);
          // Voltar ao topo da página
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
          console.error("Erro ao criar pedido:", error);
          toast({
            title: "Erro ao iniciar pedido",
            description:
              "Não foi possível iniciar o pedido cirúrgico. Tente novamente.",
            variant: "destructive",
            duration: 5000,
          });
        }
      } else if (currentStep === 2) {
        // Validação do passo 2 (Exame e Laudo)
        if (!clinicalIndication || clinicalIndication.trim() === "" || clinicalIndication === "A ser preenchido") {
          toast({
            title: "Indicação Clínica obrigatória",
            description: "Por favor, preencha a indicação clínica para continuar",
            variant: "destructive",
            duration: 5000,
          });
          return;
        }

        await saveProgress();
        setCurrentStep(currentStep + 1);
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
      } else if (currentStep === 3) {
        // Validação do passo 3 (Dados da Cirurgia)
        
        // ❌ LOG LEGADO COMENTADO - selectedProcedure não existe mais
        // console.log("🔍 VALIDAÇÃO STEP 3 - Dados atuais:", {
        //   selectedProcedureId: selectedProcedure?.id,
        //   selectedProcedureExists: !!selectedProcedure,
        //   secondaryProceduresLength: secondaryProcedures?.length,
        //   totalProcedures: (selectedProcedure ? 1 : 0) + (secondaryProcedures?.length || 0),
        //   multipleCidsLength: multipleCids?.length,
        //   multipleCidsData: multipleCids,
        //   clinicalJustificationLength: clinicalJustification?.length,
        //   clinicalJustification: clinicalJustification?.substring(0, 100) + "..."
        // });
        
        // ✅ Validação atualizada para sistema unificado de procedimentos
        const totalProcedures = secondaryProcedures.length;  // ✅ CORRIGIDO
        if (totalProcedures === 0) {
          toast({
            title: "Procedimento obrigatório",
            description: "Por favor, selecione pelo menos um procedimento para continuar",
            variant: "destructive",
            duration: 5000,
          });
          return;
        }

        if (!multipleCids || multipleCids.length === 0) {
          toast({
            title: "Código CID-10 obrigatório",
            description: "Por favor, selecione pelo menos um código CID-10 para continuar",
            variant: "destructive",
            duration: 5000,
          });
          return;
        }

        if (!clinicalJustification || clinicalJustification.trim() === "") {
          toast({
            title: "Justificativa Clínica obrigatória",
            description: "Por favor, preencha a justificativa clínica para continuar",
            variant: "destructive",
            duration: 5000,
          });
          return;
        }

        // Validação da Lateralidade da Cirurgia
        if (!procedureLaterality || procedureLaterality.trim() === "" || procedureLaterality === "null") {
          toast({
            title: "Lateralidade da Cirurgia obrigatória",
            description: "Por favor, selecione a lateralidade da cirurgia para continuar",
            variant: "destructive",
            duration: 5000,
          });
          return;
        }

        // Ativar loading durante transição do passo 3 para visualização
        setIsPreparingPreview(true);
        try {
          await saveProgress();
          setCurrentStep(currentStep + 1);
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 50);
        } finally {
          setIsPreparingPreview(false);
        }
      } else {
        // Para outros passos, salvar o progresso e avançar
        // Lateralidade dos procedimentos secundários removida conforme solicitado
        console.log("Dados de lateralidade ANTES de salvar (próximo passo):", {
          procedureLaterality,
          // Não incluir mais as lateralidades dos procedimentos secundários
        });

        await saveProgress();

        console.log(
          "Próximo passo: Valores de lateralidade salvos com sucesso",
        );
        
        // Avançar para o próximo passo imediatamente e depois fazer scroll
        setCurrentStep(currentStep + 1);
        
        // Fazer scroll após a mudança de passo para evitar conflito com toast
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
      }
    }
  };

  // Função para navegar para o passo anterior
  const goToPreviousStep = async () => {
    if (currentStep > 1) {
      console.log("Dados de lateralidade ANTES de salvar (passo anterior):", {
        procedureLaterality,
        // Lateralidade dos procedimentos secundários removida conforme solicitado
      });

      // Salvar progresso antes de voltar para a etapa anterior
      await saveProgress();

      console.log("Passo anterior: Valores de lateralidade salvos com sucesso");
      setCurrentStep(currentStep - 1);
      // Voltar ao topo da página
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Função para voltar para a home e salvar o progresso
  const saveAndExit = async () => {
    await saveProgress();
    navigate("/");
  };

  // Tela de loading para modo de edição
  if (isLoadingEditMode) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150]">
        <LoadingLogo 
          message="Verificando a informação do pedido. Aguarde..." 
          size="lg" 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted">
      <main className="flex-grow overflow-auto">
        {/* Barra horizontal sky-200 do título até breadcrumbs */}
        <div className="w-full bg-muted/30">
          <div className="container mx-auto px-4 py-6">
            <div className="mb-6 text-center" data-testid="order-header">
              <h2 className="text-3xl font-bold text-muted-foreground">
                Pedido Cirúrgico
              </h2>
              <p className="text-medsync-blue text-sm mt-2 font-semibold">
                Seu pedido em apenas 5 etapas.
              </p>
            </div>

            <div className="mb-4 sm:mb-8 overflow-x-auto pb-2" data-testid="order-steps-progress">
              <div className="relative h-16" style={{ minHeight: '4rem' }}>
                {/* Background progress line */}
                <div className="absolute top-3 h-2 rounded-full" 
                     style={{
                       left: '20%',
                       right: '20%',
                       zIndex: 1,
                       backgroundColor: 'hsl(0, 0%, 83%)'
                     }}
                />
                
                {/* Progress fill line */}
                <div className="absolute top-3 h-2 bg-medsync-blue rounded-full transition-all duration-500" 
                     style={{
                       left: '20%',
                       width: `${60 * Math.max(0, (currentStep - 1) / (steps.length - 1))}%`,
                       zIndex: 2
                     }}
                />
                
                {steps.map((step, index) => {
                  const isActive = currentStep === step.number;
                  const isCompleted = currentStep > step.number;
                  const isUpcoming = currentStep < step.number;
                  
                  // Determinar o status visual do passo
                  let stepStatus = '';
                  let textColor = '';
                  
                  if (isActive || isCompleted) {
                    stepStatus = "bg-medsync-blue text-white border-2 border-medsync-blue";
                    textColor = "font-semibold text-muted-foreground";
                  } else {
                    stepStatus = "bg-white text-muted-foreground border-2 border-white";
                    textColor = "font-semibold text-medsync-blue";
                  }
                  
                  // Posicionar cada círculo: step 3 no centro (50%), outros distribuídos
                  const positions = ['20%', '35%', '50%', '65%', '80%'];
                  
                  return (
                    <div
                      key={step.number}
                      className={`absolute flex flex-col items-center ${textColor} cursor-pointer transition-all duration-200 z-10`}
                      style={{
                        left: positions[index],
                        transform: 'translateX(-50%)'
                      }}
                      onClick={() => goToStep(step.number)}
                      title={`Ir para ${step.label}`}
                    >
                      <div
                        className={`breadcrumb-base transition-all duration-300 ${
                          isActive ? 'breadcrumb-active' : 
                          isCompleted ? 'breadcrumb-completed' : 
                          'breadcrumb-inactive'
                        }`}
                      >
                        {step.number}
                      </div>
                      <span className={`mt-2 text-xs text-center whitespace-nowrap ${textColor} hidden sm:block`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              {/* Nome do step ativo centralizado - apenas mobile */}
              <div className="sm:hidden text-center mt-2">
                <span className="text-sm font-semibold text-muted-foreground">
                  {steps.find(s => s.number === currentStep)?.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Regiões Anatômicas - Fora de qualquer container para largura total */}
        {currentStep === 3 && (
          <div className="my-8">
            <AnatomicalRegionSelector 
              onRegionSelect={handleAnatomicalRegionSelect}
              selectedSurgicalProcedures={selectedSurgicalProcedures}
              setSelectedSurgicalProcedures={setSelectedSurgicalProcedures}
              availableProceduresFromRegion={availableProceduresFromRegion}
              setAvailableProceduresFromRegion={setAvailableProceduresFromRegion}
              initialRegionId={selectedAnatomicalRegion?.id || null}
            />
          </div>
        )}

        {/* Título Dados para Cirurgia - Fora do container */}
        {currentStep === 3 && (
          <div className="mb-6 flex flex-col items-center justify-center text-center">
            <h2 className="text-3xl font-bold text-muted-foreground">
              Dados para Cirurgia
            </h2>
            <p className="text-medsync-blue text-sm mt-2">
              Preencha os campos necessários para o seu Pedido Cirúrgico
            </p>
          </div>
        )}

        {/* Container principal com estilo do formulário de login */}
        <div className="container mx-auto px-2 sm:px-4">
            {currentStep === 1 && (
              <div className="p-3 sm:p-6" data-testid="order-step-1">
                <PatientSelection
                  selectedPatient={selectedPatient}
                  setSelectedPatient={(patient) => {
                    if (patient) {
                      handlePatientSelected(patient);
                    } else {
                      setSelectedPatient(null);
                    }
                  }}
                />

                {/* Dialog de pedido existente removido */}

                <HospitalSelection
                  selectedHospital={selectedHospital}
                  setSelectedHospital={setSelectedHospital}
                />
              </div>
            )}

            {currentStep === 2 && (
              <div className="p-3 sm:p-6" data-testid="order-step-2">
                <UnifiedExamInfo
                  additionalNotes={additionalNotes}
                  setAdditionalNotes={setAdditionalNotes}
                  clinicalIndication={clinicalIndication}
                  setClinicalIndication={setClinicalIndication}
                  attachments={currentOrderData?.attachments && Array.isArray(currentOrderData.attachments) 
                    ? currentOrderData.attachments 
                    : []}
                  setAttachments={(attachments: UnifiedAttachment[]) => {
                    setCurrentOrderData(prev => prev ? { ...prev, attachments } : null);
                  }}
                  orderId={orderId || currentOrderData?.id}
                  updateOrderField={updateOrderField}
                />
              </div>
            )}

            {currentStep === 3 && (
              <div className="p-2 sm:p-6" data-testid="order-step-3">
                <SurgeryData
                  cidCode={cidCode}
                  setCidCode={setCidCode}
                  cidDescription={cidDescription}
                  setCidDescription={setCidDescription}
                  selectedCidId={selectedCidId}
                  setSelectedCidId={setSelectedCidId}
                  cidLaterality={null}
                  setCidLaterality={() => {}}
                  selectedPatient={selectedPatient}
                  clinicalIndication={clinicalIndication}
                  additionalNotes={additionalNotes}
                  attachments={currentOrderData?.attachments}
                  multipleCids={multipleCids}
                  setMultipleCids={setMultipleCids}
                  procedureLaterality={procedureLaterality}
                  setProcedureLaterality={setProcedureLaterality}
                  procedureType={procedureType}
                  setProcedureType={setProcedureType}
                  secondaryProcedures={secondaryProcedures}
                  setSecondaryProcedures={setSecondaryProcedures}
                  clinicalJustification={clinicalJustification}
                  setClinicalJustification={setClinicalJustification}
                  selectedOpmeItems={selectedOpmeItems}
                  setSelectedOpmeItems={setSelectedOpmeItems}
                  suppliers={suppliers}
                  setSuppliers={setSuppliers}
                  supplierDetails={supplierDetails}
                  setSupplierDetails={setSupplierDetails}
                  orderId={orderId || currentOrderData?.id}
                  updateOrderField={updateOrderField}
                  selectedSurgicalProcedures={selectedSurgicalProcedures}
                  setSelectedSurgicalProcedures={setSelectedSurgicalProcedures}
                  availableProceduresFromRegion={availableProceduresFromRegion}
                  setAvailableProceduresFromRegion={setAvailableProceduresFromRegion}
                  selectedSurgicalApproaches={selectedSurgicalApproaches}
                  setSelectedSurgicalApproaches={updateSelectedSurgicalApproaches}
                  isEditMode={!!editOrderId}
                  selectedAnatomicalRegion={selectedAnatomicalRegion}
                  cbhpmAdditionalNotes={cbhpmAdditionalNotes}
                  setCbhpmAdditionalNotes={setCbhpmAdditionalNotes}
                  opmeAdditionalNotes={opmeAdditionalNotes}
                  setOpmeAdditionalNotes={setOpmeAdditionalNotes}
                  supplierAdditionalNotes={supplierAdditionalNotes}
                  setSupplierAdditionalNotes={setSupplierAdditionalNotes}
                />
              </div>
            )}

            {currentStep === 4 && (
              <div className="p-3 sm:p-6" data-testid="order-step-4">
                <OrderPreviewV2
                  orderId={orderId}
                  selectedPatient={selectedPatient}
                  selectedHospital={selectedHospital}
                  user={user}
                  clinicalJustification={clinicalJustification}
                  procedureType={procedureType}
                  procedureLaterality={procedureLaterality}
                  multipleCids={multipleCids}
                  secondaryProcedures={secondaryProcedures}
                  selectedOpmeItems={selectedOpmeItems}
                  supplierDetails={supplierDetails}
                  cbhpmAdditionalNotes={cbhpmAdditionalNotes}
                  opmeAdditionalNotes={opmeAdditionalNotes}
                  supplierAdditionalNotes={supplierAdditionalNotes}
                  onForcedPageBreaksChange={setForcedPageBreaks}
                />
              </div>
            )}

            {currentStep === 5 && (
              <div className="p-3 sm:p-6" data-testid="order-step-5">
                <div className="text-center mt-4 mb-8">
                  <Check className="w-16 h-16 text-medsync-blue mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground">
                    Pedido Criado com Sucesso!
                  </h3>
                  <p className="text-muted-foreground mt-2">
                    Seu pedido cirúrgico foi criado e está pronto para ser enviado.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 mt-6" data-testid="order-pdf-actions">
                  <button
                    className="btn-medsync-dark h-10 flex items-center justify-center w-full sm:w-auto"
                    onClick={downloadExistingPDF}
                    data-testid="button-download-pdf"
                  >
                    <img src={DownloadIcon} alt="Download" className="mr-2 h-5 w-5" />
                    Download PDF
                  </button>
                  <button
                    className="btn-medsync-dark h-10 flex items-center justify-center w-full sm:w-auto"
                    data-testid="button-send-email"
                    onClick={handleOpenEmailDialog}
                  >
                    <img src={EmailIcon} alt="Email" className="mr-2 h-5 w-5" />
                    Enviar por Email
                  </button>
                  <Button
                    variant="outline"
                    className="border-border text-muted-foreground hover:bg-muted/30 h-10 cursor-not-allowed w-full sm:w-auto"
                    disabled
                  >
                    💬 WhatsApp
                  </Button>
                </div>
              </div>
            )}
          
          {/* Botões de navegação */}
          {currentStep < 5 && (
            <div className="px-4 sm:px-6 py-4 flex flex-col sm:grid sm:grid-cols-3 gap-3 sm:gap-0 items-center" data-testid="order-navigation-buttons">
              {/* Mobile: Botões empilhados centralizados */}
              {/* Desktop: Grid de 3 colunas */}
              
              {/* Área esquerda - Botão Voltar */}
              <div className="flex items-center justify-center sm:justify-start w-full sm:w-auto order-2 sm:order-1">
                {currentStep > 1 && (
                  <button
                    onClick={goToPreviousStep}
                    className="btn-medsync-dark h-10 flex items-center justify-center w-full sm:w-auto"
                    disabled={isPreparingPreview || isCreatingPDF}
                    data-testid="button-order-back"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                  </button>
                )}
              </div>

              {/* Área central - Botão Salvar e Sair */}
              <div className="flex items-center justify-center w-full sm:w-auto order-3 sm:order-2">
                <button
                  onClick={saveAndExit}
                  className="btn-medsync-dark h-10 flex items-center justify-center w-full sm:w-auto"
                  disabled={isPreparingPreview || isCreatingPDF}
                  data-testid="button-order-save-exit"
                >
                  <Save className="mr-2 h-4 w-4" />
                  <span>Salvar e Sair</span>
                </button>
              </div>

              {/* Área direita - Botão Próximo/Finalizar */}
              <div className="flex items-center justify-center sm:justify-end w-full sm:w-auto order-1 sm:order-3">
                <button
                  onClick={goToNextStep}
                  className="btn-medsync-dark h-10 flex items-center justify-center w-full sm:w-auto"
                  disabled={
                    isPreparingPreview || isCreatingPDF ||
                    (currentStep === 1 &&
                      (!selectedPatient || !selectedHospital)) ||
                    (currentStep === 2 && !clinicalIndication)
                  }
                  data-testid="button-order-next"
                >
                  {currentStep < 4 ? (
                    <>
                      <span>Avançar</span>
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      <span>Finalizar</span>
                      <Check className="ml-2 h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Overlay de loading para transição do passo 3 para visualização */}
      {isPreparingPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150]">
          <LoadingLogo 
            message="Preparando a visualização do pedido..." 
            size="lg"
          />
        </div>
      )}

      {/* Overlay de loading para criação do PDF (botão Finalizar) */}
      {isCreatingPDF && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150]">
          <LoadingLogo 
            message="Aguarde, estamos criando o PDF do seu pedido." 
            size="lg"
          />
        </div>
      )}

      {/* ✅ RESTAURADO: Diálogo de pedido existente com escolha do usuário */}
      <Dialog
        open={showExistingOrderDialog}
        onOpenChange={setShowExistingOrderDialog}
      >
        <DialogContent className="bg-popover border border-border text-foreground max-w-md">
          <DialogHeader className="space-y-0">
            <DialogTitle className="flex items-center justify-center gap-2 text-xl">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <span className="text-medsync-gray">Pedido em Andamento</span>
              <span className="text-medsync-blue font-bold">Encontrado</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-center mt-4">
              <div>Encontramos um pedido em preenchimento para</div>
              <div className="font-bold text-lg mt-2 text-medsync-dark-blue">{pendingPatient?.fullName}</div>
              {existingOrderData?.updatedAt && (
                <div className="text-xs mt-1 mb-4">
                  Última atualização: {new Date(existingOrderData.updatedAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="text-sm text-medsync-gray p-3 rounded border border-border space-y-2">
            {existingOrderData?.surgicalConduct && (
              <p>
                <strong>Conduta Cirúrgica:</strong>{" "}
                {existingOrderData.surgicalConduct.length > 60 
                  ? `${existingOrderData.surgicalConduct.substring(0, 60)}...`
                  : existingOrderData.surgicalConduct
                }
              </p>
            )}
            {existingOrderData?.procedureName && (
              <p>
                <strong>Procedimento:</strong>{" "}
                {existingOrderData.procedureName.length > 60
                  ? `${existingOrderData.procedureName.substring(0, 60)}...`
                  : existingOrderData.procedureName
                }
              </p>
            )}
            {existingOrderData?.clinicalIndication && (
              <p>
                <strong>Indicação Clínica:</strong>{" "}
                {existingOrderData.clinicalIndication.length > 60
                  ? `${existingOrderData.clinicalIndication.substring(0, 60)}...`
                  : existingOrderData.clinicalIndication
                }
              </p>
            )}
            {existingOrderData?.hospitalName && (
              <p>
                <strong>Hospital:</strong>{" "}
                {existingOrderData.hospitalName.length > 60
                  ? `${existingOrderData.hospitalName.substring(0, 60)}...`
                  : existingOrderData.hospitalName
                }
              </p>
            )}
          </div>

          <div className="text-muted-foreground text-center mt-4">
            O que você gostaria de fazer?
          </div>

          <DialogFooter className="flex justify-center items-center gap-4 w-full">
            <Button
              onClick={handleStartNewOrder}
              className="bg-medsync-blue hover:bg-medsync-blue-dark text-white transition-colors duration-200 h-10 w-48 text-center"
            >
              Iniciar Novo Pedido
            </Button>
            <Button
              onClick={handleContinueExistingOrder}
              className="bg-medsync-blue hover:bg-medsync-blue-dark text-white transition-colors duration-200 h-10 w-48 text-center"
            >
              Continuar Pedido Existente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Envio por Email */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-medsync-blue" />
              Enviar Pedido por Email
            </DialogTitle>
            <DialogDescription>
              Selecione os destinatários e confirme o envio do pedido <strong>#{orderId}</strong> em PDF.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {emailRecipients.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                Nenhum email cadastrado para o hospital ou fornecedores deste pedido. Adicione um destinatário abaixo.
              </div>
            )}

            {emailRecipients.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Destinatários</p>
                {emailRecipients.map(recipient => (
                  <div
                    key={recipient.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${recipient.selected ? 'border-medsync-blue/50 bg-medsync-blue/5' : 'border-border bg-muted/20'}`}
                    onClick={() => setEmailRecipients(prev => prev.map(r => r.id === recipient.id ? { ...r, selected: !r.selected } : r))}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${recipient.selected ? 'bg-medsync-blue border-medsync-blue' : 'border-muted-foreground/40'}`}>
                      {recipient.selected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {recipient.type === 'hospital' && <Building2 className="h-4 w-4 text-blue-500 flex-shrink-0" />}
                      {recipient.type === 'fornecedor' && <Package className="h-4 w-4 text-green-500 flex-shrink-0" />}
                      {recipient.type === 'custom' && <UserIcon className="h-4 w-4 text-purple-500 flex-shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{recipient.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{recipient.email}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground capitalize flex-shrink-0">{recipient.type === 'fornecedor' ? 'Fornecedor' : recipient.type === 'hospital' ? 'Hospital' : 'Outro'}</span>
                    {recipient.type === 'custom' && (
                      <button
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        onClick={e => { e.stopPropagation(); setEmailRecipients(prev => prev.filter(r => r.id !== recipient.id)); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Adicionar outro destinatário</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Nome"
                  value={newRecipientName}
                  onChange={e => setNewRecipientName(e.target.value)}
                  className="flex-1 h-9 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newRecipientEmail}
                  onChange={e => setNewRecipientEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCustomRecipient()}
                  className="flex-1 h-9 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button type="button" size="sm" variant="outline" onClick={handleAddCustomRecipient} className="flex-shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEmailDialog(false)} disabled={isSendingEmail}>
              Cancelar
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={isSendingEmail || emailRecipients.filter(r => r.selected).length === 0}
              className="bg-medsync-blue hover:bg-medsync-blue-dark text-white gap-2"
            >
              {isSendingEmail ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar para {emailRecipients.filter(r => r.selected).length} destinatário{emailRecipients.filter(r => r.selected).length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
