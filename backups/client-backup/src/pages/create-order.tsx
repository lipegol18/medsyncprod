import { useState, useEffect } from "react";
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
import MedSyncLogo from "../assets/medsync-logo.png";
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
} from "lucide-react";
import {
  type Hospital,
  type Patient,
  type MedicalOrder,
  type OpmeItem,
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

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
}

// Interface para procedimentos secundários, estendendo LocalProcedure
// Campo de lateralidade removido conforme solicitado
interface SecondaryProcedure {
  procedure: LocalProcedure;
  quantity: number;
}

import { useMutation, useQuery } from "@tanstack/react-query";
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
  
  // Detectar se estamos em modo de edição
  const urlParams = new URLSearchParams(window.location.search);
  const editOrderId = urlParams.get('edit');

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
  // Estado para cidLaterality removido, mas mantendo referências para compatibilidade
  const [cidLaterality, setCidLaterality] = useState<string | null>(null);

  // Novo estado para múltiplos CIDs (similar aos procedimentos secundários)
  const [multipleCids, setMultipleCids] = useState<
    Array<{
      cid: {
        id: number;
        code: string;
        description: string;
        category?: string;
      };
    }>
  >([]);
  
  // Flag para controlar se já carregamos CIDs com condutas cirúrgicas no modo edição
  const [cidsWithSurgicalApproachesLoaded, setCidsWithSurgicalApproachesLoaded] = useState(false);
  
  // Estado para procedimentos cirúrgicos por região anatômica
  const [selectedSurgicalProcedures, setSelectedSurgicalProcedures] = useState<SurgicalProcedure[]>([]);
  const [availableProceduresFromRegion, setAvailableProceduresFromRegion] = useState<SurgicalProcedure[]>([]);
  const [selectedAnatomicalRegion, setSelectedAnatomicalRegion] = useState<AnatomicalRegion | null>(null);

  // Handler simples para atualizar estado quando região é selecionada
  const handleAnatomicalRegionSelect = (region: AnatomicalRegion) => {
    console.log("Região anatômica selecionada:", region);
    setSelectedAnatomicalRegion(region);
  };
  
  // Estado de lateralidade da cirurgia (adicionado como um campo independente)
  const [procedureLaterality, setProcedureLaterality] = useState<string | null>(
    null,
  );
  const [procedureType, setProcedureType] = useState(
    PROCEDURE_TYPE_VALUES.ELETIVA,
  );
  const [procedureQuantity, setProcedureQuantity] = useState(1);
  const [selectedProcedure, setSelectedProcedure] =
    useState<LocalProcedure | null>(null);
  // Estados para procedimentos secundários
  const [secondaryProcedures, setSecondaryProcedures] = useState<
    SecondaryProcedure[]
  >([]);
  const [orderId, setOrderId] = useState<number | null>(null);
  // Estados para os itens OPME e fornecedores
  const [selectedOpmeItems, setSelectedOpmeItems] = useState<
    Array<{ item: any; quantity: number }>
  >([]);
  // Estados para fornecedores - usando formato compatível com SurgeryData
  const [suppliers, setSuppliers] = useState<{
    supplier1: number | null;
    supplier2: number | null;
    supplier3: number | null;
  }>({ supplier1: null, supplier2: null, supplier3: null });

  // Estado para armazenar dados dos fornecedores carregados
  const [supplierData, setSupplierData] = useState<any[]>([]);

  // Estado para dados completos dos fornecedores (similar aos CIDs e OPME)
  const [supplierDetails, setSupplierDetails] = useState<Array<{
    id: number;
    companyName: string;
    tradeName: string | null;
    cnpj: string;
    municipalityId: number;
    address: string | null;
    phone: string | null;
    email: string | null;
    active: boolean;
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

  // Estado para evitar chamadas duplicadas
  const [isLoadingPatientOrder, setIsLoadingPatientOrder] = useState(false);

  // Estados para o diálogo de pedido existente
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
        console.log('🚀 INÍCIO useEffect - Carregando pedido para edição:', editOrderId);
        
        try {
          console.log('🔍 Fazendo requisição para:', `/api/medical-orders/${editOrderId}`);
          const response = await fetch(`/api/medical-orders/${editOrderId}`);
          console.log('📡 Response status:', response.status);
          
          if (response.ok) {
            const orderData = await response.json();
            console.log('📋 Dados do pedido carregados para edição:', orderData);
            
            console.log('🔄 INICIANDO loadExistingOrderOptimized...');
            // Carregar TODOS os dados do pedido existente de uma só vez
            await loadExistingOrderOptimized(orderData);
            console.log('✅ loadExistingOrderOptimized CONCLUÍDO - TODOS os dados carregados');
            
            toast({
              title: "Modo de edição",
              description: `Editando pedido #${orderData.id}`,
              duration: 3000,
            });
          } else {
            console.error('❌ Erro na resposta da API:', response.status);
            toast({
              title: "Erro",
              description: "Pedido não encontrado ou sem permissão para editar",
              variant: "destructive",
            });
            navigate('/orders');
          }
        } catch (error) {
          console.error('❌ Erro ao carregar pedido:', error);
          toast({
            title: "Erro",
            description: "Erro ao carregar dados do pedido",
            variant: "destructive",
          });
          navigate('/orders');
        }
      } else {
        console.log('❌ Condição não atendida - editOrderId:', editOrderId, 'user.id:', user?.id);
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
            await _loadExistingOrder(orderData);

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
      setSelectedProcedure(null);
      setProcedureQuantity(1);
      setSecondaryProcedures([]);
      setOrderId(null);
      setCurrentOrderData(null);
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

    // Primeiro, definimos o paciente selecionado
    setSelectedPatient(patient);
    console.log(
      `Paciente selecionado: ${patient.fullName} (ID: ${patient.id})`,
    );

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
          setExistingOrderData(orderData);
          setPendingPatient(patient);
          setShowExistingOrderDialog(true);

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
            id: null,
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

  // Função para continuar com o pedido existente
  const handleContinueExistingOrder = async () => {
    if (existingOrderData && pendingPatient) {
      console.log(
        "Usuário escolheu continuar o pedido existente:",
        existingOrderData,
      );

      // Carregar os dados do pedido existente
      await loadExistingOrder(existingOrderData);
      console.log('🔍 AFTER handleContinueExistingOrder loadExistingOrder - attachments loaded');

      // Definir o paciente selecionado
      setSelectedPatient(pendingPatient);

      toast({
        title: "Pedido em andamento carregado",
        description: `Continuando o pedido existente para ${pendingPatient.fullName}`,
        duration: 4000,
      });
    }

    // Fechar o diálogo
    setShowExistingOrderDialog(false);
    setExistingOrderData(null);
    setPendingPatient(null);
  };

  // Função para iniciar um novo pedido
  const handleStartNewOrder = () => {
    if (pendingPatient) {
      console.log(
        "Usuário escolheu iniciar um novo pedido para:",
        pendingPatient,
      );

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
      setSelectedProcedure(null);
      setProcedureQuantity(1);
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
            await _loadExistingOrder(orderData);

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
      setSelectedProcedure(null);
      setProcedureQuantity(1);
      setSecondaryProcedures([]);
      setOrderId(null);
      setCurrentOrderData(null);
    };

    // DESABILITADO: Só deve verificar DEPOIS de selecionar paciente
    // checkExistingOrder();
  }, [user?.id]);

  // Função OTIMIZADA para carregar TODOS os dados de uma só vez
  const loadExistingOrderOptimized = async (order: MedicalOrder) => {
    console.log(`🚀 OTIMIZADO: Carregando TODOS os dados para pedido ${order.id} em uma única operação`);
    setOrderId(order.id);
    const currentOrderId = order.id;

    try {
      // **CARREGAMENTO PARALELO** - Fazer todas as chamadas ao mesmo tempo
      const [
        cidData,
        surgicalApproaches,
        procedures,
        opmeItems,
        suppliers,
        patientData,
        hospitalData
      ] = await Promise.all([
        apiRequest(`/api/orders/${currentOrderId}/cids`, "GET"),
        apiRequest(`/api/medical-order-surgical-approaches/order/${currentOrderId}`, "GET"),
        apiRequest(`/api/orders/${currentOrderId}/procedures`, "GET"),
        apiRequest(`/api/orders/${currentOrderId}/opme-items`, "GET"),
        apiRequest(`/api/orders/${currentOrderId}/suppliers`, "GET"),
        apiRequest(`/api/patients/${order.patientId}`, "GET"),
        apiRequest(`/api/hospitals/${order.hospitalId}`, "GET")
      ]);

      console.log(`✅ OTIMIZADO: Todas as ${7} consultas carregadas em paralelo`);

      // 1. Carregar CIDs COM condutas cirúrgicas
      if (cidData && cidData.length > 0) {
        const enrichedCids = cidData.map((cid: any) => {
          const primaryApproach = surgicalApproaches?.find((sa: any) => sa.is_primary);
          const anyApproach = surgicalApproaches?.length > 0 ? surgicalApproaches[0] : null;
          const selectedApproach = primaryApproach || anyApproach;
          
          return {
            cid,
            surgicalApproach: selectedApproach ? {
              id: selectedApproach.surgicalApproachId || selectedApproach.surgical_approach_id,
              name: selectedApproach.surgicalApproachName || selectedApproach.surgical_approach_name,
              description: selectedApproach.surgicalApproachDescription || selectedApproach.surgical_approach_description,
              isPrimary: selectedApproach.isPrimary || selectedApproach.is_primary || false
            } : undefined
          };
        });
        
        setMultipleCids(enrichedCids);
        setCidsWithSurgicalApproachesLoaded(true);
        
        const firstCid = cidData[0];
        setCidCode(firstCid.code || "");
        setCidDescription(firstCid.description || "");
        setSelectedCidId(firstCid.id);
        
        console.log(`✅ OTIMIZADO: ${cidData.length} CIDs carregados COM condutas cirúrgicas`);
      }

      // 2. Carregar procedimentos - SISTEMA UNIFICADO
      if (procedures && procedures.length > 0) {
        console.log(`✅ OTIMIZADO: ${procedures.length} procedimentos encontrados - aplicando sistema unificado`);
        
        // Função para calcular valor do porte
        const parsePorteValue = (porte: string | null | undefined): number => {
          if (!porte) return 0;
          const match = porte.match(/^(\d+)([A-Za-z]?)$/);
          if (!match) return 0;
          const numero = parseInt(match[1], 10);
          const letra = match[2]?.toUpperCase() || 'A';
          const valorLetra = letra.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
          return (numero * 100) + valorLetra;
        };

        // Ordenar TODOS os procedimentos por porte (maior para menor)
        const sortedProcedures = procedures.sort((a: any, b: any) => 
          parsePorteValue(b.procedure.porte) - parsePorteValue(a.procedure.porte)
        );

        // Carregar TODOS os procedimentos como lista unificada
        const allProceduresData = sortedProcedures.map((p: any) => ({
          procedure: p.procedure,
          quantity: p.quantityRequested
        }));
        
        setSecondaryProcedures(allProceduresData);
        console.log(`✅ OTIMIZADO: ${allProceduresData.length} procedimentos carregados em lista unificada ordenada por porte`);
        
        // Limpar procedimento principal para usar apenas a lista unificada
        setSelectedProcedure(null);
        setProcedureQuantity(1);
      }

      // 3. Carregar itens OPME
      if (opmeItems && opmeItems.length > 0) {
        setSelectedOpmeItems(opmeItems);
        console.log(`✅ OTIMIZADO: ${opmeItems.length} itens OPME carregados`);
      }

      // 4. Carregar fornecedores
      if (suppliers && suppliers.length > 0) {
        setSupplierDetails(suppliers);
        setSuppliers({
          supplier1: suppliers[0]?.id || null,
          supplier2: suppliers[1]?.id || null,
          supplier3: suppliers[2]?.id || null,
        });
        console.log(`✅ OTIMIZADO: ${suppliers.length} fornecedores carregados`);
      }

      // 5. Carregar dados do paciente
      if (patientData) {
        setSelectedPatient(patientData);
        console.log(`✅ OTIMIZADO: Paciente carregado: ${patientData.fullName}`);
      }

      // 6. Carregar dados do hospital
      if (hospitalData) {
        setSelectedHospital(hospitalData);
        console.log(`✅ OTIMIZADO: Hospital carregado: ${hospitalData.name}`);
      }

      // 7. Carregar dados específicos do pedido
      setClinicalIndication(order.clinicalIndication || "");
      setAdditionalNotes(order.additionalNotes || "");
      setProcedureType(order.procedureType || PROCEDURE_TYPE_VALUES.ELETIVA);
      
      if (order.procedureLaterality) {
        setProcedureLaterality(order.procedureLaterality);
      }
      if (order.clinicalJustification) {
        setClinicalJustification(order.clinicalJustification);
      }
      
      // 8. Carregar anexos
      if (order.attachments) {
        setCurrentOrderData(prev => ({
          ...prev,
          id: order.id,
          attachments: order.attachments
        }));
      }

      console.log(`🎉 OTIMIZADO: TODOS os dados carregados com sucesso para pedido ${order.id}`);

    } catch (error) {
      console.error("Erro no carregamento otimizado:", error);
    }
  };

  // Função para carregar pedido existente (inclui dados relacionais)
  const loadExistingOrder = async (order: MedicalOrder) => {
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
            console.log(`🔍 DEBUG CONDUTAS: Estrutura detalhada do multipleCids:`, JSON.stringify(enrichedCids, null, 2));
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
          
          // Função para calcular valor do porte
          const parsePorteValue = (porte: string | null | undefined): number => {
            if (!porte) return 0;
            const match = porte.match(/^(\d+)([A-Za-z]?)$/);
            if (!match) return 0;
            const numero = parseInt(match[1], 10);
            const letra = match[2]?.toUpperCase() || 'A';
            const valorLetra = letra.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
            return (numero * 100) + valorLetra;
          };

          // Ordenar todos os procedimentos por porte (maior para menor)
          const sortedProcedures = procedures.sort((a: any, b: any) => 
            parsePorteValue(b.procedure.porte) - parsePorteValue(a.procedure.porte)
          );

          // Carregar todos os procedimentos como secundários na lista unificada
          const allProceduresData = sortedProcedures.map((p: any) => ({
            procedure: p.procedure,
            quantity: p.quantityRequested
          }));
          
          console.log(`MODO EDIÇÃO: Carregando ${allProceduresData.length} procedimentos em lista unificada`);
          setSecondaryProcedures(allProceduresData);
          
          // Limpar procedimento principal para usar apenas a lista unificada
          setSelectedProcedure(null);
          setProcedureQuantity(1);
          
          console.log(`MODO EDIÇÃO: Todos os procedimentos carregados em lista unificada`);
        } else {
          console.log(`MODO EDIÇÃO: Nenhum procedimento encontrado para pedido ${currentOrderId}`);
        }
      } catch (error) {
        console.error("MODO EDIÇÃO: Erro ao carregar procedimentos:", error);
      }

      // 3. Carregar fornecedores salvos - CORRIGIDO para objetos completos
      try {
        const supplierData = await apiRequest(`/api/orders/${currentOrderId}/suppliers`, "GET");
        if (supplierData && supplierData.length > 0) {
          console.log(`MODO EDIÇÃO: Fornecedores salvos encontrados: ${supplierData.length} fornecedores`);
          console.log(`MODO EDIÇÃO: Dados dos fornecedores recebidos:`, supplierData);
          
          // Atualizar primeiro os detalhes completos
          setSupplierDetails(supplierData);
          
          // Em seguida, definir os IDs para sincronização
          setSuppliers({
            supplier1: supplierData[0]?.id || null,
            supplier2: supplierData[1]?.id || null,
            supplier3: supplierData[2]?.id || null
          });
          
          console.log(`MODO EDIÇÃO: Fornecedores carregados:`, supplierData.map((s: any) => s.companyName).join(', '));
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
    setProcedureQuantity(order.procedureCbhpmQuantity || 1);

    // Recuperar dados de lateralidade
    console.log("Carregando lateralidade do procedimento do banco de dados:", {
      procedureLaterality: order.procedureLaterality,
      procedureLateralityType: typeof order.procedureLaterality,
    });

    // Garantir que valores nulos ou undefined sejam tratados corretamente
    // O PostgreSQL retorna null para valores nulos, então precisamos fazer essa verificação
    // Campo cidLaterality foi removido conforme solicitado
    setCidLaterality(null);

    if (
      order.procedureLaterality !== null &&
      order.procedureLaterality !== undefined
    ) {
      setProcedureLaterality(order.procedureLaterality);
    } else {
      setProcedureLaterality(null);
    }

    // Processar URLs das imagens do exame
    const examImageUrls = Array.isArray(order.exam_images_url) ? order.exam_images_url : [];
    setImageUrls(examImageUrls);
    console.log(`Carregadas ${examImageUrls.length} URLs de imagens de exame`);

    // Processar URLs dos laudos médicos
    const medicalReportUrls = Array.isArray(order.medical_report_url) ? order.medical_report_url : [];
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
              console.log(`Carregando CIDs via API relacional (sem condutas cirúrgicas)`);
              setMultipleCids(cidData.map((cid: any) => ({ cid })));
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
          console.log(`DEBUG: Response from /api/orders/${order.id}/procedures:`, procedures);
          
          if (procedures && procedures.length > 0) {
            console.log(`Procedimentos salvos encontrados: ${procedures.length} procedimentos`);
            
            // Converter para formato padronizado: { item: procedure, quantity: number, isMain: boolean }
            const formattedProcedures = procedures.map((p: any) => ({
              item: p.procedure,
              quantity: p.quantityRequested || 1,
              isMain: p.isMain
            }));
            
            const mainProcedure = formattedProcedures.find(p => p.isMain);
            const secondaryProcedures = formattedProcedures.filter(p => !p.isMain);
            
            console.log(`DEBUG: mainProcedure formatado:`, mainProcedure);
            console.log(`DEBUG: secondaryProcedures formatados:`, secondaryProcedures);
            
            if (mainProcedure?.item) {
              console.log(`DEBUG: Definindo procedimento principal:`, mainProcedure.item);
              setSelectedProcedure(mainProcedure.item);
              setProcedureQuantity(mainProcedure.quantity);
              console.log(`Procedimento principal carregado: ${mainProcedure.item.code} - Quantidade: ${mainProcedure.quantity}`);
            } else {
              console.log(`DEBUG: Nenhum procedimento principal encontrado. mainProcedure:`, mainProcedure);
            }
            
            if (secondaryProcedures.length > 0) {
              const secondaryData = secondaryProcedures.map((p: any) => ({
                procedure: p.item,
                quantity: p.quantity
              }));
              console.log(`DEBUG: Definindo procedimentos secundários:`, secondaryData);
              setSecondaryProcedures(secondaryData);
              console.log(`Procedimentos secundários carregados: ${secondaryProcedures.length} procedimentos`);
            }
          } else {
            console.log(`DEBUG: Nenhum procedimento encontrado para pedido ${order.id}`);
          }
        } catch (error) {
          console.error("Erro ao carregar procedimentos:", error);
        }

        // 3. Carregar fornecedores salvos - PADRONIZADO como OPME
        try {
          const supplierData = await apiRequest(`/api/orders/${order.id}/suppliers`, "GET");
          if (supplierData && supplierData.length > 0) {
            console.log(`Fornecedores salvos encontrados: ${supplierData.length} fornecedores`);
            
            // Converter para formato padronizado: { item: supplier, quantity: 1 }
            const formattedSuppliers = supplierData.map((supplier: any) => ({
              item: supplier,
              quantity: 1 // Fornecedores não têm quantidade, mas mantemos consistência
            }));
            
            console.log(`DEBUG: Fornecedores formatados:`, formattedSuppliers);
            
            // Manter formato atual do estado para compatibilidade (apenas IDs)
            const suppliersState = {
              supplier1: supplierData[0]?.id || null,
              supplier2: supplierData[1]?.id || null,
              supplier3: supplierData[2]?.id || null
            };
            console.log(`DEBUG: IDs dos fornecedores sendo definidos:`, suppliersState);
            setSuppliers(suppliersState);
            console.log(`Fornecedores carregados:`, supplierData.map((s: any) => s.companyName).join(', '));
          }
        } catch (error) {
          console.error("Erro ao carregar fornecedores:", error);
        }

        // 4. Carregar itens OPME salvos (dados completos já retornados pela API)
        try {
          const opmeItems = await apiRequest(`/api/orders/${order.id}/opme-items`, "GET");
          if (opmeItems && opmeItems.length > 0) {
            console.log(`Itens OPME salvos encontrados: ${opmeItems.length} itens`);
            
            // A API já retorna dados completos, não precisamos fazer chamadas individuais
            setSelectedOpmeItems(opmeItems);
            console.log(`Itens OPME carregados: ${opmeItems.length} itens`);
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

    // Carregar itens OPME via API relacional (dados completos já retornados)
    try {
      const opmeResponse = await fetch(`/api/orders/${order.id}/opme-items`);
      if (opmeResponse.ok) {
        const opmeRelations = await opmeResponse.json();
        console.log("Itens OPME encontrados via API relacional:", opmeRelations);

        // A API já retorna dados completos, não precisamos fazer chamadas individuais
        if (opmeRelations && opmeRelations.length > 0) {
          console.log("Itens OPME carregados:", opmeRelations);
          setSelectedOpmeItems(opmeRelations);
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

    // Carregar CIDs via API relacional
    try {
      const cidsResponse = await fetch(`/api/orders/${order.id}/cids`);
      if (cidsResponse.ok) {
        const cidRelations = await cidsResponse.json();
        console.log("CIDs encontrados via API relacional:", cidRelations);
        
        // A API relacional já retorna objetos CID completos, não precisamos fazer chamadas adicionais
        const cidsList = cidRelations.map((cidData: any) => ({
          cid: cidData,
          laterality: "nao_aplicavel" // Default laterality
        }));
        
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
    console.log('🔍 LOAD - order.attachments:', order.attachments);
    console.log('🔍 LOAD - order.examImagesUrl:', order.examImagesUrl);
    console.log('🔍 LOAD - order.medicalReportUrl:', order.medicalReportUrl);
    
    let finalAttachments = [];
    if (order.attachments && Array.isArray(order.attachments) && order.attachments.length > 0) {
      console.log('✅ Anexos unificados encontrados:', order.attachments);
      finalAttachments = order.attachments;
    } else {
      console.log('🔄 Convertendo anexos legados para formato unificado');
      finalAttachments = convertLegacyAttachments(
        order.exam_images_url,
        order.medical_report_url
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
      exam_image_count: order.exam_image_count || 0,
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
      let remainingSecondaryProcedures = [];

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
        const cidId = item.cid?.id || item.id;
        if (!cidId) {
          console.warn("CID sem ID encontrado:", item);
        }
        return cidId;
      }).filter(id => id !== undefined); // Remove undefined IDs
      console.log("CIDs a serem enviados:", cidIds);

      // Objeto para armazenar os dados do pedido baseado no passo atual
      let orderData: any = {};

      // PASSO 1: Paciente e Hospital (já salvos na criação inicial)
      if (currentStep === 1) {
        orderData = {
          patientId: selectedPatient.id,
          userId: user?.id,
          hospitalId: selectedHospital?.id,
        };
      }
      
      // PASSO 2: Indicação clínica e notas (anexos salvos automaticamente no upload)
      else if (currentStep === 2) {
        orderData = {
          clinicalIndication: clinicalIndication || "",
          additionalNotes: additionalNotes || "",
        };
        console.log("🔍 PASSO 2 - Enviando dados:", {
          clinicalIndication: clinicalIndication,
          additionalNotes: additionalNotes,
          clinicalIndicationLength: clinicalIndication?.length || 0,
          additionalNotesLength: additionalNotes?.length || 0,
          orderId: orderId,
          currentStep: currentStep
        });
      }
      
      // PASSO 3: Apenas dados básicos - relacionamentos gerenciados via APIs separadas
      else if (currentStep === 3) {
        orderData = {
          clinicalJustification: clinicalJustification,
          procedureType: procedureType,
          procedureLaterality: procedureLaterality === "null" || procedureLaterality === "" ? null : procedureLaterality,
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

      // Salvar CIDs relacionais se há um orderId
      if (orderId) {
        try {
          const cidIds = multipleCids.map((item) => {
            // Suportar ambas as estruturas: item.cid.id ou item.id
            const cidId = item.cid?.id || item.id;
            if (!cidId) {
              console.warn("saveProgress - CID sem ID encontrado:", item);
            }
            return cidId;
          }).filter(id => id !== undefined); // Remove undefined IDs
          console.log(`saveProgress - Salvando ${cidIds.length} CIDs relacionais para pedido ${orderId}:`, cidIds);
          
          const cidResponse = await fetch(`/api/orders/${orderId}/cids`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ cidIds })
          });

          if (cidResponse.ok) {
            console.log("saveProgress - CIDs relacionais salvos com sucesso");
          } else {
            console.error("saveProgress - Erro ao salvar CIDs relacionais:", cidResponse.status);
          }
        } catch (error) {
          console.error("saveProgress - Erro ao salvar CIDs relacionais:", error);
        }
      }

      // Salvar procedimentos CBHPM relacionais se há um orderId
      if (orderId) {
        try {
          const procedures = [];
          
          // Adicionar procedimento principal se selecionado
          if (selectedProcedure?.id) {
            procedures.push({
              procedureId: selectedProcedure.id,
              quantityRequested: procedureQuantity || 1,
              isMain: true
            });
          }
          
          // Adicionar procedimentos secundários
          secondaryProcedures.forEach((proc) => {
            if (proc.procedure?.id) {
              procedures.push({
                procedureId: proc.procedure.id,
                quantityRequested: proc.quantity || 1,
                isMain: false
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
      }

      // Salvar itens OPME relacionais se há um orderId
      if (orderId && selectedOpmeItems && selectedOpmeItems.length > 0) {
        try {
          const opmeItems = selectedOpmeItems.map(item => ({
            opmeItemId: item.item.id,
            quantity: item.quantity || 1
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

        // Verificar se a lateralidade foi salva corretamente
        console.log(
          "saveProgressMutation - Dados retornados após salvamento:",
          {
            cidLateralitySalvo: updatedData.cidLaterality,
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
      
      // Procurar PDF nos attachments
      const pdfAttachment = orderData.attachments?.find((att: any) => att.type === 'pdf');
      
      if (!pdfAttachment) {
        toast({
          title: "PDF não encontrado",
          description: "Nenhum PDF foi gerado para este pedido",
          variant: "destructive",
        });
        return;
      }
      
      console.log('📄 PDF encontrado nos attachments:', pdfAttachment);
      
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

  // Função para gerar PDF vetorial com quebra automática de páginas
  const generateHighQualityPDF = async () => {
    try {
      console.log("🔄 INÍCIO - Geração de PDF vetorial com quebra automática");
      console.log("OrderID:", orderId);
      console.log("Paciente:", selectedPatient?.fullName);

      if (!orderId || !selectedPatient || !selectedHospital) {
        toast({
          title: "Erro ao gerar PDF",
          description: "Dados insuficientes para gerar o documento",
          variant: "destructive",
        });
        return;
      }

      // Carregar CIDs atualizados do banco de dados antes de gerar o PDF
      console.log("🔄 Carregando CIDs atualizados do banco para o PDF...");
      const freshCidData = await apiRequest(`/api/orders/${orderId}/cids`, "GET");
      const freshSurgicalApproaches = await apiRequest(`/api/medical-order-surgical-approaches/order/${orderId}`, "GET");
      
      // Combinar CIDs com condutas cirúrgicas (mesma lógica do modo edição)
      let freshMultipleCids = [];
      if (freshCidData && freshCidData.length > 0) {
        freshMultipleCids = freshCidData.map((cid: any) => {
          const primaryApproach = freshSurgicalApproaches?.find((sa: any) => sa.is_primary);
          const anyApproach = freshSurgicalApproaches?.length > 0 ? freshSurgicalApproaches[0] : null;
          const selectedApproach = primaryApproach || anyApproach;
          
          return {
            cid,
            surgicalApproach: selectedApproach ? {
              id: selectedApproach.surgicalApproachId || selectedApproach.surgical_approach_id,
              name: selectedApproach.surgicalApproachName || selectedApproach.surgical_approach_name,
              description: selectedApproach.surgicalApproachDescription || selectedApproach.surgical_approach_description,
              isPrimary: selectedApproach.isPrimary || selectedApproach.is_primary || false
            } : undefined
          };
        });
        console.log("✅ CIDs carregados para PDF:", freshMultipleCids.length, "CIDs com condutas");
      }

      toast({
        title: "Gerando PDF",
        description: "Criando documento com quebra automática de páginas...",
      });

      // Importar dinamicamente o react-pdf
      const { pdf } = await import('@react-pdf/renderer');
      const { OrderPDFDocument } = await import('@/components/order-pdf-document');

      // Preparar fornecedores como array com dados completos
      const suppliersArray: any[] = [];
      if (suppliers.supplier1) {
        const supplier1Data = supplierDetails.find(s => s.id === suppliers.supplier1);
        if (supplier1Data) suppliersArray.push(supplier1Data);
      }
      if (suppliers.supplier2) {
        const supplier2Data = supplierDetails.find(s => s.id === suppliers.supplier2);
        if (supplier2Data) suppliersArray.push(supplier2Data);
      }
      if (suppliers.supplier3) {
        const supplier3Data = supplierDetails.find(s => s.id === suppliers.supplier3);
        if (supplier3Data) suppliersArray.push(supplier3Data);
      }

      // Preparar dados para o PDF com quebra automática
      const pdfData = {
        orderData: {
          ...currentOrderData,
          id: orderId,
          clinicalJustification: currentOrderData?.clinical_justification || currentOrderData?.clinicalJustification,
          procedureLaterality: currentOrderData?.procedureLaterality,
          cidLaterality: currentOrderData?.cidLaterality,
          secondaryProcedureQuantities: currentOrderData?.secondaryProcedureQuantities,
          opmeItemQuantities: currentOrderData?.opmeItemQuantities,
          doctorName: user?.name || "Dr. Médico Responsável",
          doctorCRM: user?.crm || "CRM XXXX",
          doctorLogoUrl: user?.logoUrl, // Logo do médico do campo logo_url
        },
        patientData: selectedPatient,
        hospitalData: selectedHospital,
        procedureData: selectedProcedure,
        cidData: freshMultipleCids && freshMultipleCids.length > 0 ? freshMultipleCids : [{ cid: { code: cidCode, description: cidDescription } }],
        secondaryProcedures: secondaryProcedures || [],
        opmeItems: selectedOpmeItems || [],
        suppliers: suppliersArray,
      };

      console.log("📄 Gerando PDF com react-pdf/renderer (quebra automática)...");
      console.log("Dados enviados para PDF:", {
        orderId: pdfData.orderData.id,
        patientName: pdfData.patientData?.fullName,
        hospitalName: pdfData.hospitalData?.name,
        procedureName: pdfData.procedureData?.name,
        justificationLength: pdfData.orderData?.clinicalJustification?.length || 0,
        secondaryProceduresCount: pdfData.secondaryProcedures?.length || 0,
        opmeItemsCount: pdfData.opmeItems?.length || 0,
      });

      // Gerar PDF usando react-pdf com quebra automática de páginas
      const pdfBlob = await pdf(<OrderPDFDocument {...pdfData} />).toBlob();

      console.log("✅ PDF vetorial com quebra automática gerado! Tamanho:", pdfBlob.size, "bytes");

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
      const pdf = new jsPDF('p', 'mm', 'a4');
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
      
      // 2. Apenas mudar o status para "Aguardando Envio" (dados já estão salvos)
      const statusUpdateData = {
        statusId: ORDER_STATUS_IDS.AGUARDANDO_ENVIO,
      };

      console.log("🔄 Atualizando status do pedido para 'Aguardando Envio'...");

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
        const step3Valid = validateStep(2) && 
               !!(selectedProcedure?.id && 
                  (multipleCids && multipleCids.length > 0) && 
                  clinicalJustification && 
                  clinicalJustification.trim() !== "");
        
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

  // Função para navegar para o próximo passo
  const goToNextStep = async () => {
    if (currentStep < 5) {
      // Se estamos no passo 4 (Visualização), então finalizamos o pedido
      if (currentStep === 4) {
        await handleComplete();
        // Voltar ao topo da página após finalizar
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
        console.log("🔍 VALIDAÇÃO STEP 3 - Dados atuais:", {
          selectedProcedureId: selectedProcedure?.id,
          selectedProcedureExists: !!selectedProcedure,
          secondaryProceduresLength: secondaryProcedures?.length,
          totalProcedures: (selectedProcedure ? 1 : 0) + (secondaryProcedures?.length || 0),
          multipleCidsLength: multipleCids?.length,
          multipleCidsData: multipleCids,
          clinicalJustificationLength: clinicalJustification?.length,
          clinicalJustification: clinicalJustification?.substring(0, 100) + "..."
        });
        
        // Validação atualizada para sistema unificado de procedimentos
        const totalProcedures = (selectedProcedure ? 1 : 0) + secondaryProcedures.length;
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

        await saveProgress();
        setCurrentStep(currentStep + 1);
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
      } else {
        // Para outros passos, salvar o progresso e avançar
        // Lateralidade dos procedimentos secundários removida conforme solicitado
        console.log("Dados de lateralidade ANTES de salvar (próximo passo):", {
          cidLaterality,
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
        cidLaterality,
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

  return (
    <div className="min-h-screen flex flex-col bg-[#1a2332]">
      <main className="flex-grow overflow-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-white">
              Novo Pedido Cirúrgico
            </h2>
            <p className="text-blue-200 text-sm mt-2">
              Selecione o paciente e o hospital para o pedido cirúrgico
            </p>
          </div>

          <div className="mb-8 overflow-x-auto pb-2">
            <div className="flex items-center justify-center space-x-8 md:space-x-10 lg:space-x-12">
              {steps.map((step) => {
                const isActive = currentStep === step.number;
                const isCompleted = validateStep(step.number) && currentStep > step.number;
                const isAccessible = canAccessStep(step.number);
                const isClickable = isAccessible;
                
                // Determinar o status visual do passo
                let stepStatus = '';
                let textColor = '';
                
                if (isActive) {
                  stepStatus = "bg-blue-500 border-2 border-blue-300 shadow-lg";
                  textColor = "text-white";
                } else if (isCompleted) {
                  stepStatus = "bg-green-600 border border-green-400 shadow-md hover:bg-green-500";
                  textColor = "text-white";
                } else if (isAccessible && step.number > currentStep) {
                  stepStatus = "bg-blue-500/70 border border-blue-400 shadow-md hover:bg-blue-500";
                  textColor = "text-blue-100";
                } else if (isAccessible) {
                  stepStatus = "bg-blue-700 border border-blue-500 shadow-md hover:bg-blue-600";
                  textColor = "text-white";
                } else {
                  stepStatus = "bg-gray-600/50 border border-gray-500/50";
                  textColor = "text-gray-400";
                }
                
                return (
                  <div
                    key={step.number}
                    className={`flex items-center ${textColor} ${
                      isClickable ? "cursor-pointer hover:text-blue-100" : "cursor-not-allowed"
                    } transition-all duration-200`}
                    onClick={() => isClickable && goToStep(step.number)}
                    title={
                      isClickable 
                        ? `Ir para ${step.label}` 
                        : "Complete os passos anteriores para acessar"
                    }
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${stepStatus}`}
                    >
                      {isCompleted ? '✓' : step.number}
                    </div>
                    <span className="ml-2 text-sm whitespace-nowrap font-medium">
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Container principal com estilo do formulário de login */}
          <div className="w-full bg-[#1a2332] border border-blue-800 shadow-lg rounded-lg mb-8">
            {currentStep === 1 && (
              <div className="p-6">
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
              <div className="p-6">
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
              <div className="p-6">
                {/* Regiões Anatômicas - Apenas Ícones */}
                <div className="mb-6">
                  <AnatomicalRegionSelector 
                    onRegionSelect={handleAnatomicalRegionSelect}
                    selectedSurgicalProcedures={selectedSurgicalProcedures}
                    setSelectedSurgicalProcedures={setSelectedSurgicalProcedures}
                    availableProceduresFromRegion={availableProceduresFromRegion}
                    setAvailableProceduresFromRegion={setAvailableProceduresFromRegion}
                  />
                </div>
                
                <SurgeryData
                  cidCode={cidCode}
                  setCidCode={setCidCode}
                  cidDescription={cidDescription}
                  setCidDescription={setCidDescription}
                  selectedCidId={selectedCidId}
                  setSelectedCidId={setSelectedCidId}
                  cidLaterality={cidLaterality}
                  setCidLaterality={setCidLaterality}
                  multipleCids={multipleCids}
                  setMultipleCids={setMultipleCids}
                  procedureLaterality={procedureLaterality}
                  setProcedureLaterality={setProcedureLaterality}
                  procedureType={procedureType}
                  setProcedureType={setProcedureType}
                  procedureQuantity={procedureQuantity}
                  setProcedureQuantity={setProcedureQuantity}
                  selectedProcedure={selectedProcedure}
                  setSelectedProcedure={setSelectedProcedure}
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
                />
              </div>
            )}

            {currentStep === 4 && (
              <div className="p-6">
                <div className="mb-6 text-white">
                  <h3 className="text-lg font-medium text-white">
                    Visualização do Pedido
                  </h3>
                  <p className="text-sm text-blue-200">
                    Revise os dados do pedido antes de finalizar
                  </p>
                  <p className="text-xs text-blue-300 mt-1">
                    Prévia A4 (210 x 297 mm)
                  </p>

                  {/* Div principal que conterá o documento para exportação futura em PDF */}
                  <div className="flex justify-center mb-10">
                    <div id="documento-completo" className="bg-white shadow-xl" style={{ width: '210mm', minHeight: '297mm' }}>
                      
                      {/* Área de conteúdo com margens A4 */}
                      <div style={{ marginTop: '20px', marginBottom: '20px', marginLeft: '30px', marginRight: '30px' }}>
                        <div id="documento-pedido" className="w-full bg-white text-black p-2">
                          {/* Cabeçalho com logos do hospital e médico */}
                          <div className="mb-2">
                            <div className="flex items-start justify-between">
                              {/* Logo do hospital - lado esquerdo */}
                              <div className="w-40 h-16 flex items-center justify-center overflow-hidden">
                                {selectedHospital?.logoUrl ? (
                                  <img 
                                    src={selectedHospital.logoUrl} 
                                    alt={`Logo do ${selectedHospital.name}`} 
                                    className="max-h-full object-contain"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="text-xs text-gray-500 text-center">
                                    {selectedHospital?.name || 'Hospital'}
                                  </div>
                                )}
                              </div>

                              {/* Logo do médico - lado direito */}
                              <div className="w-48 h-20 flex items-center justify-center overflow-hidden">
                                {user?.logoUrl && (
                                  <img 
                                    src={user.logoUrl} 
                                    alt="Logo do Médico" 
                                    className="max-h-full object-contain"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Dados do Paciente */}
                          {selectedPatient && (
                            <div className="mb-5 p-2 bg-white rounded-lg">
                              <h3 className="text-sm font-semibold mb-1 border-b pb-1">Dados do Paciente</h3>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="text-xs">
                                  <p><span className="font-medium">Nome:</span> {selectedPatient.fullName}</p>
                                  <p><span className="font-medium">Data de Nascimento:</span> {formatDateBR(selectedPatient.birthDate)}</p>
                                  <p><span className="font-medium">Idade:</span> {new Date().getFullYear() - new Date(selectedPatient.birthDate).getFullYear()} anos</p>
                                </div>
                                <div className="text-xs">
                                  <p><span className="font-medium">Plano de Saúde:</span> {selectedPatient.insurance || 'Não informado'}</p>
                                  <p><span className="font-medium">Número da Carteirinha:</span> {selectedPatient.insuranceNumber || 'Não informado'}</p>
                                  <p><span className="font-medium">Tipo do Plano:</span> {selectedPatient.plan || 'Não informado'}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Título do documento */}
                          <div className="pb-1 mb-4">
                            <h2 className="text-base font-bold text-center text-blue-900">
                              SOLICITAÇÃO DE PROCEDIMENTO CIRÚRGICO
                            </h2>
                            
                            {/* Justificativa clínica */}
                            <div className="mt-2 text-xs text-justify bg-white p-2 rounded-md" style={{ 
                              minHeight: '72px',  // Altura mínima (equivale a ~3 linhas)
                              height: 'auto'      // Altura automática baseada no conteúdo
                            }}>
                              <p className="whitespace-pre-wrap">{clinicalJustification || 'Justificativa clínica será exibida aqui'}</p>
                            </div>
                          </div>

                          {/* Procedimentos e dados clínicos */}
                          <div className="space-y-4 mt-10">
                            <div className="pb-2">
                              <div className="space-y-2">
                                
                                {/* Códigos CID-10 */}
                                <div>
                                  <p className="font-bold text-xs text-gray-700">Códigos CID-10:</p>
                                  <div className="text-xs text-gray-900 pl-4 space-y-0.5">
                                    {multipleCids && multipleCids.length > 0 ? (
                                      multipleCids.map((cidItem, index) => {
                                        // Suportar ambas as estruturas: cidItem.cid.code ou cidItem.code
                                        const code = cidItem.cid?.code || cidItem.code;
                                        const description = cidItem.cid?.description || cidItem.description;
                                        const id = cidItem.cid?.id || cidItem.id;
                                        
                                        return (
                                          <p key={id || index}>
                                            {code} - {description}
                                            {(cidItem.isAutoAdded || cidItem.cid?.isAutoAdded) && (
                                              <span className="ml-2 text-green-600 text-xs font-medium">(Automático)</span>
                                            )}
                                          </p>
                                        );
                                      })
                                    ) : (
                                      <p>Nenhum código CID selecionado</p>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Condutas Cirúrgicas Associadas */}
                                {multipleCids && multipleCids.some(cidItem => cidItem.surgicalApproach) && (
                                  <div>
                                    <p className="font-bold text-xs text-gray-700">Condutas Cirúrgicas:</p>
                                    <div className="text-xs text-gray-900 pl-4 space-y-0.5">
                                      {(() => {
                                        // Extrair condutas únicas para evitar repetição
                                        const uniqueApproaches = new Map();
                                        multipleCids.forEach(cidItem => {
                                          if (cidItem.surgicalApproach) {
                                            const approachId = cidItem.surgicalApproach.id;
                                            if (!uniqueApproaches.has(approachId)) {
                                              uniqueApproaches.set(approachId, cidItem.surgicalApproach);
                                            }
                                          }
                                        });
                                        
                                        return Array.from(uniqueApproaches.values()).map((approach, index) => (
                                          <p key={index}>
                                            {approach.name}
                                            {approach.isPrimary && (
                                              <span className="ml-2 text-blue-600 text-xs font-medium">(Principal)</span>
                                            )}
                                          </p>
                                        ));
                                      })()}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Procedimentos Cirúrgicos Necessários - Lista Unificada */}
                                {secondaryProcedures.length > 0 && (
                                  <div>
                                    <p className="font-bold text-xs text-gray-700">Procedimentos Cirúrgicos Necessários:</p>
                                    <div className="text-xs text-gray-900 pl-4 space-y-0.5">
                                      {(() => {
                                        // Aplicar a mesma lógica de ordenação do salvamento
                                        const parsePorteValue = (porte: string | null | undefined): number => {
                                          if (!porte) return 0;
                                          const match = porte.match(/^(\d+)([A-Za-z]?)$/);
                                          if (!match) return 0;
                                          const numero = parseInt(match[1], 10);
                                          const letra = match[2]?.toUpperCase() || 'A';
                                          const valorLetra = letra.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
                                          return (numero * 100) + valorLetra;
                                        };

                                        const sortedProcedures = [...secondaryProcedures].sort(
                                          (a, b) => parsePorteValue(b.procedure.porte) - parsePorteValue(a.procedure.porte)
                                        );

                                        // Mostrar todos os procedimentos ordenados por porte
                                        // O primeiro é sempre o principal (maior porte)
                                        return sortedProcedures.map((proc, index) => (
                                          <p key={index}>
                                            {proc.quantity} x {proc.procedure.code} - {proc.procedure.name}
                                            {index === 0 ? ' (Procedimento Principal)' : ''}
                                          </p>
                                        ));
                                      })()}
                                    </div>
                                  </div>
                                )}

                                {/* Informações do procedimento */}
                                <div className="flex text-xs">
                                  <div className="w-1/2">
                                    <p className="font-bold text-gray-700">Caráter do Procedimento:</p>
                                    <p className="text-gray-900 pl-4">
                                      {procedureType === 'eletiva' ? 'Eletivo' : 
                                       procedureType === 'urgencia' ? 'Urgência' : 
                                       procedureType === 'emergencia' ? 'Emergência' : 'Não especificado'}
                                    </p>
                                  </div>
                                  <div className="w-1/2">
                                    <p className="font-bold text-gray-700">Lateralidade do Procedimento:</p>
                                    <p className="text-gray-900 pl-4">
                                      {procedureLaterality === 'direito' ? 'Direito' :
                                       procedureLaterality === 'esquerdo' ? 'Esquerdo' :
                                       procedureLaterality === 'bilateral' ? 'Bilateral' : 'Não especificado'}
                                    </p>
                                  </div>
                                </div>

                                {/* Materiais OPME */}
                                {selectedOpmeItems && selectedOpmeItems.length > 0 && (
                                  <div>
                                    <p className="font-bold text-xs text-gray-700">Lista de Materiais Necessários:</p>
                                    <div className="flex flex-col text-xs text-gray-900 pl-4 gap-0.5">
                                      {selectedOpmeItems.map((item, index) => (
                                        <p key={index}>
                                          {item.quantity} x {item.technicalName || item.item?.technicalName || 'Material não especificado'}
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Fornecedores */}
                                <SupplierDisplay 
                                  supplierIds={[
                                    suppliers.supplier1,
                                    suppliers.supplier2,
                                    suppliers.supplier3
                                  ].filter(Boolean) as number[]}
                                />

                                {/* Seção de assinatura - agora com posicionamento relativo */}
                                <div className="mt-8 mb-4">
                                  {/* Data */}
                                  <div className="text-right mb-6">
                                    <p className="text-xs text-gray-900">
                                      {selectedHospital?.name?.includes('Niterói') ? 'Niterói' : 'Rio de Janeiro'}, {new Date().toLocaleDateString('pt-BR')}
                                    </p>
                                  </div>

                                  {/* Assinatura do médico */}
                                  <div className="flex justify-center mb-4">
                                    {user?.signatureUrl ? (
                                      <img 
                                        src={user.signatureUrl} 
                                        alt="Assinatura do Médico" 
                                        className="h-36 object-contain"
                                        onError={(e) => {
                                          // Fallback para área vazia se a imagem falhar ao carregar
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <div className="h-36 w-48 border border-gray-300 flex items-center justify-center bg-gray-50">
                                        <span className="text-xs text-gray-500">Assinatura não cadastrada</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Dados do médico */}
                                  {user && (
                                    <div className="flex flex-col items-center mb-6">
                                      <div className="border-t border-gray-400 w-48 mb-1"></div>
                                      <p className="text-xs font-bold text-gray-900">{user.name?.toUpperCase()}</p>
                                      <div className="text-xs text-gray-900 text-center">
                                        {user.signatureNote ? (
                                          user.signatureNote.split('\n').map((line, index) => (
                                            <p key={index}>{line}</p>
                                          ))
                                        ) : (
                                          <p>ORTOPEDIA E TRAUMATOLOGIA</p>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-900">CRM {user.crm}</p>
                                    </div>
                                  )}

                                  {/* Rodapé */}
                                  <div className="pt-1 border-t border-gray-300 flex flex-row items-center justify-center">
                                    <img 
                                      src={MedSyncLogo} 
                                      alt="Logo MedSync" 
                                      className="h-5 mr-2"
                                    />
                                    <p className="text-xs text-gray-500">Documento gerado por MedSync v2.5.3</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="p-6">
                <div className="text-center mt-4 mb-8">
                  <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white">
                    Pedido Criado com Sucesso!
                  </h3>
                  <p className="text-blue-200 mt-2">
                    Seu pedido cirúrgico foi criado e está pronto para ser enviado.
                  </p>
                </div>

                <div className="flex justify-center gap-4 mt-6">
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={downloadExistingPDF}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      toast({
                        title: "Funcionalidade em desenvolvimento",
                        description: "Envio por email será implementado em breve",
                        duration: 3000,
                      });
                    }}
                  >
                    📧 Enviar por Email
                  </Button>
                  <Button
                    className="bg-gray-500 cursor-not-allowed"
                    disabled
                  >
                    💬 Enviar pelo WhatsApp
                  </Button>
                </div>
              </div>
            )}

            {/* Botões de navegação */}
            {currentStep < 5 && (
              <div className="px-6 py-4 border-t border-blue-800 grid grid-cols-3 items-center">
                {/* Área esquerda - Botão Voltar */}
                <div className="flex items-center">
                  {currentStep > 1 && (
                    <Button
                      variant="outline"
                      onClick={goToPreviousStep}
                      className="border-blue-600 text-white hover:bg-blue-900 h-10"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Voltar
                    </Button>
                  )}
                </div>

                {/* Área central - Botão Salvar e Sair */}
                <div className="flex items-center justify-center">
                  <Button
                    variant="outline"
                    onClick={saveAndExit}
                    className="border-blue-600 text-white hover:bg-blue-900 h-10"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Salvar e Sair
                  </Button>
                </div>

                {/* Área direita - Botão Próximo/Finalizar */}
                <div className="flex items-center justify-end">
                  <Button
                    onClick={goToNextStep}
                    className="bg-blue-600 hover:bg-blue-700 h-10"
                    disabled={
                      (currentStep === 1 &&
                        (!selectedPatient || !selectedHospital)) ||
                      (currentStep === 2 && !clinicalIndication) // Apenas indicação clínica é obrigatória no passo 2
                      // (currentStep === 3 && !selectedProcedure) // COMENTADO TEMPORARIAMENTE PARA TESTE
                    }
                  >
                    {currentStep < 4 ? (
                      <>
                        Próximo
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Finalizar
                        <Check className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Diálogo de pedido existente */}
      <Dialog
        open={showExistingOrderDialog}
        onOpenChange={setShowExistingOrderDialog}
      >
        <DialogContent className="bg-[#1a2332] border-blue-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-400">
              <AlertTriangle className="h-5 w-5" />
              Pedido em Andamento Encontrado
            </DialogTitle>
            <DialogDescription className="text-blue-200">
              Encontramos um pedido em preenchimento para{" "}
              <strong>{pendingPatient?.fullName}</strong>.
              <br />
              <br />O que você gostaria de fazer?
            </DialogDescription>
          </DialogHeader>

          <div className="text-sm text-blue-300 bg-blue-900/30 p-3 rounded border border-blue-700">
            <p>
              <strong>Pedido ID:</strong> {existingOrderData?.id}
            </p>
            <p>
              <strong>Status:</strong> Em preenchimento
            </p>
            {existingOrderData?.clinicalIndication && (
              <p>
                <strong>Indicação:</strong>{" "}
                {existingOrderData.clinicalIndication.substring(0, 50)}...
              </p>
            )}
          </div>

          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={handleStartNewOrder}
              className="border-blue-600 text-white hover:bg-blue-900"
            >
              Iniciar Novo Pedido
            </Button>
            <Button
              onClick={handleContinueExistingOrder}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Continuar Pedido Existente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
