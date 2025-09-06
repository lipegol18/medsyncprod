import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PartialApprovalModal } from "@/components/partial-approval-modal";
import { ReceivedValuesModal } from "@/components/received-values-modal";
import { SurgeryAppointmentFormCompact } from "@/components/surgery-appointment-form-compact";
import { StatusChangeModal } from "@/components/status-change-modal";
import { SupplierApprovalModal } from "@/components/supplier-approval-modal";
import { Label } from "@/components/ui/label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ChevronLeft, FileText, Eye, FileCheck, AlertCircle, Clock, Phone, Search, Filter, X, ChevronDown, Check, Edit2, Plus, Trash2, Loader2, Download, CheckCircle, ArrowRight, Undo2, Building2, Calendar, CalendarDays, Users, TrendingUp, CheckCircle2 } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { t } from "@/lib/i18n";
import { addOrdersTranslations } from "@/lib/translations/orders";
import { useToast } from "@/hooks/use-toast";

// Adicionar traduções
addOrdersTranslations();

// Status dos pedidos
const orderStatus = {
  "em_preenchimento": { label: "Incompleta", color: "bg-muted/50 text-muted-foreground" },
  "em_avaliacao": { label: "Em análise", color: "bg-accent/50 text-foreground" },
  "aceito": { label: "Autorizado", color: "bg-accent/50 text-foreground" },
  "autorizado_parcial": { label: "Autorizado Parcial", color: "bg-accent/50 text-foreground" },
  "cirurgia_realizada": { label: "Cirurgia realizada", color: "bg-accent-light text-foreground" },
  "cancelado": { label: "Cancelada", color: "bg-destructive/50 text-destructive" },
  "aguardando_envio": { label: "Aguardando Envio", color: "bg-accent/50 text-foreground" },
  "recebido": { label: "Recebido", color: "bg-accent/50 text-foreground" },
  "pendencia": { label: "Pendência", color: "bg-amber-100/80 text-amber-700" },
  "aguardando_recurso": { label: "Aguardando Recurso", color: "bg-rose-100/80 text-rose-700" }
};

// Locale para formatação de datas
const dateLocales = {
  "pt-BR": ptBR,
  "en-US": enUS,
  "es-ES": es
};

export default function Orders() {
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.roleId === 1;
  
  // Estado para armazenar locale atual
  const [currentLocale, setCurrentLocale] = useState<"pt-BR" | "en-US" | "es-ES">("pt-BR");
  
  // Estado para dados de pedidos
  const [ordersData, setOrdersData] = useState<any[]>([]);
  const [filteredOrdersData, setFilteredOrdersData] = useState<any[]>([]);
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHospital, setSelectedHospital] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  
  // Estados para controlar carregamento e erros
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  
  // Estado para lista de hospitais (para o filtro)
  const [hospitalsList, setHospitalsList] = useState<any[]>([]);
  
  // Estado para armazenar agendamentos cirúrgicos por pedido médico
  const [appointmentsByOrder, setAppointmentsByOrder] = useState<{[key: number]: any}>({});

  // Função para buscar agendamento cirúrgico de um pedido específico
  const fetchAppointmentForOrder = async (orderId: number) => {
    try {
      const response = await apiRequest(`/api/surgery-appointments/by-medical-order/${orderId}`, "GET");
      setAppointmentsByOrder(prev => ({
        ...prev,
        [orderId]: response
      }));
    } catch (error) {
      // Se não encontrar agendamento, não fazer nada (pedido pode não ter agendamento)
      console.log(`Nenhum agendamento encontrado para pedido ${orderId}`);
    }
  };

  // Função para formatar a data do procedimento considerando agendamentos
  const formatProcedureDate = (order: any) => {
    const appointment = appointmentsByOrder[order.id];
    
    // Se existe agendamento, mostrar data e hora agendada
    if (appointment && appointment.scheduledDate && appointment.scheduledTime) {
      const scheduledDate = new Date(appointment.scheduledDate);
      return `${formatDateBrazilian(scheduledDate.toISOString())} às ${appointment.scheduledTime}`;
    }
    
    // Usar lógica original para pedidos sem agendamento
    if (order.procedureDate && 
        order.procedureDate !== null && 
        order.procedureDate !== 'null' && 
        order.procedureDate !== 'undefined' &&
        order.procedureDate !== 'Data não agendada') {
      return formatDate(order.procedureDate);
    }
    
    return (order.status === 'aceito' || order.status === 'autorizado_parcial') ? 'Aguardando agendamento' : 'Aguardando aceitação';
  };
  
  // Estados para agendamento de procedimento
  const [schedulingOrderId, setSchedulingOrderId] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>("");
  
  // Estados para modal de aprovação parcial
  const [partialApprovalOrderId, setPartialApprovalOrderId] = useState<number | null>(null);
  const [showPartialApprovalModal, setShowPartialApprovalModal] = useState(false);
  
  // Estados para modal de valores recebidos
  const [showReceivedValuesModal, setShowReceivedValuesModal] = useState(false);
  const [receivedValuesOrderId, setReceivedValuesOrderId] = useState<number | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ orderId: number; status: string } | null>(null);
  
  // Estados para recursos (appeals)
  const [showAppealDialog, setShowAppealDialog] = useState<boolean>(false);
  const [selectedOrderForAppeal, setSelectedOrderForAppeal] = useState<number | null>(null);
  const [appealJustification, setAppealJustification] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [isCreatingAppeal, setIsCreatingAppeal] = useState<boolean>(false);

  // Estados para modal de agendamento cirúrgico
  const [showAppointmentModal, setShowAppointmentModal] = useState<boolean>(false);
  const [selectedOrderForAppointment, setSelectedOrderForAppointment] = useState<number | null>(null);

  // Estados para prompt de agendamento após autorização
  const [showSchedulingPrompt, setShowSchedulingPrompt] = useState<boolean>(false);
  const [authorizedOrderForScheduling, setAuthorizedOrderForScheduling] = useState<number | null>(null);
  
  // Estados para modal de aprovação de fornecedor
  const [showSupplierApprovalModal, setShowSupplierApprovalModal] = useState<boolean>(false);
  const [supplierApprovalOrderId, setSupplierApprovalOrderId] = useState<number | null>(null);

  // Estados para confirmação de exclusão
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(false);
  const [orderToDelete, setOrderToDelete] = useState<number | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState<boolean>(false);

  // Estados para modal de mudança de status
  const queryClient = useQueryClient();
  const [showStatusChangeModal, setShowStatusChangeModal] = useState<boolean>(false);
  const [statusChangeOrderId, setStatusChangeOrderId] = useState<number | null>(null);
  const [statusChangeCurrentStatus, setStatusChangeCurrentStatus] = useState<string>("");
  const [statusChangeCurrentStatusLabel, setStatusChangeCurrentStatusLabel] = useState<string>("");
  const [statusChangeOrder, setStatusChangeOrder] = useState<any>(null);
  
  // Mapeamento de statusId para status code (completo)
  const statusIdToCode = {
    1: "em_preenchimento",
    2: "em_avaliacao", 
    3: "aceito",
    4: "autorizado_parcial",
    5: "pendencia",
    6: "cirurgia_realizada",
    7: "cancelado",
    8: "aguardando_envio",
    9: "recebido",
    10: "aguardando_recurso"
  };
  
  // Ler parâmetros da URL no carregamento da página
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const statusIdParam = urlParams.get('statusId');
    const appealParam = urlParams.get('appeal');
    
    if (statusIdParam) {
      const statusCode = statusIdToCode[parseInt(statusIdParam) as keyof typeof statusIdToCode];
      if (statusCode) {
        setSelectedStatus(statusCode);
      }
    }

    // Se há parâmetro appeal, abrir dialog de recurso para esse pedido
    if (appealParam) {
      const orderId = parseInt(appealParam);
      if (!isNaN(orderId)) {
        setSelectedOrderForAppeal(orderId);
        setAppealJustification("");
        setRejectionReason("");
        setShowAppealDialog(true);
        
        // Limpar o parâmetro da URL para não reabrir se navegar de volta
        const newUrl = window.location.pathname + (statusIdParam ? `?statusId=${statusIdParam}` : '');
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []);
  
  // Função para buscar pedidos reais do banco de dados
  const fetchOrders = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setIsError(false);
      
      // URL da API que implementamos com filtro por usuário
      const url = isAdmin 
        ? '/api/medical-orders' 
        : `/api/medical-orders?userId=${user.id}`;
        
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar pedidos: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Converter statusId para statusCode se necessário e ordenar pedidos
      const processedData = Array.isArray(data) ? data.map(order => ({
        ...order,
        // Se o status não está presente ou é um ID numérico, converter usando statusIdToCode
        status: order.status && typeof order.status === 'string' ? order.status : 
                statusIdToCode[order.statusId as keyof typeof statusIdToCode] || 'nao_especificado'
      })).sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at || 0);
        const dateB = new Date(b.createdAt || b.created_at || 0);
        return dateB.getTime() - dateA.getTime(); // Mais recente primeiro
      }) : [];
      
      setOrdersData(processedData);
      setFilteredOrdersData(processedData);
      
      // Extrair lista única de hospitais para o filtro
      const uniqueHospitals = Array.from(
        new Map(
          data
            .filter((order: any) => order.hospitalName)
            .map((order: any) => [order.hospitalId, { id: order.hospitalId, name: order.hospitalName }])
        ).values()
      );
      setHospitalsList(uniqueHospitals);
      
      // Buscar agendamentos para pedidos com status "aceito", "autorizado_parcial" ou outros que podem ter agendamento
      const ordersWithPossibleAppointments = processedData.filter(order => 
        ['aceito', 'autorizado_parcial', 'cirurgia_realizada', 'recebido'].includes(order.status)
      );
      
      // Buscar agendamentos para esses pedidos
      ordersWithPossibleAppointments.forEach(order => {
        fetchAppointmentForOrder(order.id);
      });
      
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar pedidos quando o componente carrega
  useEffect(() => {
    fetchOrders();
  }, [user, isAdmin]);

  // Função para buscar e atualizar apenas um pedido específico (otimização)
  const fetchOrder = async (orderId: number) => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/medical-orders/${orderId}`);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar pedido: ${response.status}`);
      }
      
      const updatedOrder = await response.json();
      
      // Processar o pedido atualizado
      const processedOrder = {
        ...updatedOrder,
        status: updatedOrder.status && typeof updatedOrder.status === 'string' ? updatedOrder.status : 
                statusIdToCode[updatedOrder.statusId as keyof typeof statusIdToCode] || 'nao_especificado'
      };
      
      // Atualizar apenas este pedido nos estados locais
      const updateOrderInArray = (orders: any[]) => 
        orders.map(order => 
          order.id === orderId ? processedOrder : order
        );
      
      setOrdersData(prev => updateOrderInArray(prev));
      setFilteredOrdersData(prev => updateOrderInArray(prev));
      
      // Se este pedido pode ter agendamento, buscar o agendamento
      if (['aceito', 'autorizado_parcial', 'cirurgia_realizada', 'recebido'].includes(processedOrder.status)) {
        fetchAppointmentForOrder(orderId);
      }
      
    } catch (error) {
      console.error(`Erro ao buscar pedido ${orderId}:`, error);
      // Em caso de erro, fazer fallback para buscar todos os pedidos
      fetchOrders();
    }
  };

  // Função para recarregar dados após atualização
  const reloadOrders = () => {
    fetchOrders();
  };



  // Função para aplicar filtros
  const applyFilters = () => {
    let filtered = [...ordersData];

    // Filtro por termo de busca (nome do paciente)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(order => 
        order.patientName?.toLowerCase().includes(term) ||
        order.id.toString().includes(term)
      );
    }

    // Filtro por hospital
    if (selectedHospital) {
      filtered = filtered.filter(order => 
        order.hospitalId?.toString() === selectedHospital
      );
    }

    // Filtro por status
    if (selectedStatus) {
      filtered = filtered.filter(order => 
        order.status === selectedStatus
      );
    }

    // Manter ordenação por data de criação mais recente primeiro
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.created_at || 0);
      const dateB = new Date(b.createdAt || b.created_at || 0);
      return dateB.getTime() - dateA.getTime(); // Mais recente primeiro
    });

    setFilteredOrdersData(filtered);
  };

  // Aplicar filtros quando os critérios mudarem
  useEffect(() => {
    applyFilters();
  }, [searchTerm, selectedHospital, selectedStatus, ordersData]);

  // Função para formatação de moeda (memoizada)
  const formatCurrency = useMemo(() => (valueInCents: number | null) => {
    if (!valueInCents) return "Aguardando recebimento";
    return `R$ ${(valueInCents / 100).toFixed(2).replace('.', ',')}`;
  }, []);

  // Funções para limpar filtros
  const clearSearchTerm = () => setSearchTerm("");
  const clearHospitalFilter = () => setSelectedHospital("");
  const clearStatusFilter = () => setSelectedStatus("");
  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedHospital("");
    setSelectedStatus("");
  };

  // Memoizar controles de filtro para evitar re-renderização desnecessária
  const hasActiveFilters = useMemo(() => 
    searchTerm || selectedHospital || selectedStatus, 
    [searchTerm, selectedHospital, selectedStatus]
  );

  // Função para criar recurso
  const createAppeal = async () => {
    if (!selectedOrderForAppeal || !appealJustification.trim()) {
      toast({
        title: "Erro",
        description: "Justificativa é obrigatória",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreatingAppeal(true);
      
      const response = await apiRequest(`/api/medical-orders/${selectedOrderForAppeal}/appeals`, "POST", {
        justification: appealJustification,
        rejectionReason: rejectionReason || null
      });
      
      setShowAppealDialog(false);
      setSelectedOrderForAppeal(null);
      setAppealJustification("");
      setRejectionReason("");
      
      toast({
        title: "Recurso criado",
        description: "Seu recurso foi enviado para análise da operadora",
      });
      
      // Invalidar cache e atualizar dados
      if (selectedOrderForAppeal) {
        // Invalidar queries do React Query para atualizar cache
        queryClient.invalidateQueries({ queryKey: [`/api/medical-orders/${selectedOrderForAppeal}`] });
        queryClient.invalidateQueries({ queryKey: ['/api/medical-orders'] });
        
        // Buscar apenas este pedido para obter o status e cores atualizadas (otimizado)
        await fetchOrder(selectedOrderForAppeal);
      }
      
    } catch (error) {
      console.error("Erro ao criar recurso:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o recurso",
        variant: "destructive",
      });
    } finally {
      setIsCreatingAppeal(false);
    }
  };

  // Função para agendar procedimento
  const scheduleProcedure = async (orderId: number, date: string) => {
    try {
      const response = await apiRequest(`/api/medical-orders/${orderId}/schedule`, "PATCH", { 
        procedureDate: date 
      });
      
      // Atualizar o pedido específico nos estados locais
      const updateOrderInArray = (orders: any[]) => 
        orders.map(order => 
          order.id === orderId ? { ...order, procedureDate: date } : order
        );
      
      setOrdersData(prev => updateOrderInArray(prev));
      setFilteredOrdersData(prev => updateOrderInArray(prev));
      
      // Fechar modal
      setSchedulingOrderId(null);
      setScheduleDate("");
      
      toast({
        title: "Procedimento agendado",
        description: `Data do procedimento definida para ${formatDate(date)}`,
      });
    } catch (error) {
      console.error("Erro ao agendar procedimento:", error);
      toast({
        title: "Erro",
        description: "Não foi possível agendar o procedimento",
        variant: "destructive",
      });
    }
  };

  // Função para converter valor em reais para centavos
  const parseCurrencyToCents = (value: string): number | null => {
    if (!value || value.trim() === "") return null;
    const numericValue = parseFloat(value.replace(',', '.'));
    return isNaN(numericValue) ? null : Math.round(numericValue * 100);
  };

  // Função para atualizar status do pedido
  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      
      // Se for autorizado parcial, abrir modal primeiro
      if (newStatus === 'autorizado_parcial') {
        setPartialApprovalOrderId(orderId);
        setShowPartialApprovalModal(true);
        return; // Não atualizar o status ainda
      }
      
      // Se for recebido e status anterior é cirurgia_realizada, abrir modal de valores recebidos
      if (newStatus === 'recebido') {
        // Buscar o pedido atual nos dados para verificar o status anterior
        const currentOrder = ordersData.find(order => order.id === orderId) || 
                            filteredOrdersData.find(order => order.id === orderId);
        
        if (currentOrder && currentOrder.status === 'cirurgia_realizada') {
          setPendingStatusChange({ orderId, status: newStatus });
          setReceivedValuesOrderId(orderId);
          setShowReceivedValuesModal(true);
          return; // Não atualizar o status ainda - será atualizado quando modal for fechado
        }
      }
      
      const response = await apiRequest(`/api/medical-orders/${orderId}/status`, "PATCH", { status: newStatus });
      
      // Buscar apenas este pedido para obter o status e cores atualizadas (otimizado)
      await fetchOrder(orderId);
      
      // Invalidar queries relacionadas para atualizar estatísticas
      queryClient.invalidateQueries({ queryKey: ['/api/home/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/medical-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/stats'] });
      
      toast({
        title: "Status atualizado",
        description: `Status do pedido alterado para "${orderStatus[newStatus as keyof typeof orderStatus]?.label || newStatus}"`,
      });

      // Se o status mudou para "aceito" (autorizado), mostrar modal de seleção de fornecedor
      if (newStatus === 'aceito') {
        setSupplierApprovalOrderId(orderId);
        setShowSupplierApprovalModal(true);
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      
      // Em caso de erro, recarregar os dados para garantir consistência
      fetchOrders();
      
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do pedido",
        variant: "destructive",
      });
    }
  };

  // Função para finalizar a aprovação parcial
  const handlePartialApprovalComplete = async () => {
    if (!partialApprovalOrderId) return;

    // Apenas fechar o modal - o status não deve ser alterado aqui
    // Os procedimentos já foram salvos individualmente pelo modal
    setShowPartialApprovalModal(false);
    setPartialApprovalOrderId(null);
    
    // Recarregar dados para refletir as mudanças nos procedimentos
    await fetchOrder(partialApprovalOrderId);
  };

  // Função para finalizar valores recebidos
  const handleReceivedValuesComplete = async () => {
    if (!pendingStatusChange) return;

    try {
      // Atualizar o status do pedido para recebido
      const response = await apiRequest(`/api/medical-orders/${pendingStatusChange.orderId}/status`, "PATCH", { 
        status: pendingStatusChange.status 
      });
      
      // Buscar apenas este pedido para obter o status e cores atualizadas (otimizado)
      await fetchOrder(pendingStatusChange.orderId);
      
      // Invalidar queries relacionadas para atualizar estatísticas
      queryClient.invalidateQueries({ queryKey: ['/api/home/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/medical-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/stats'] });
      
      toast({
        title: "Status atualizado",
        description: `Status do pedido alterado para "${orderStatus[pendingStatusChange.status as keyof typeof orderStatus]?.label || pendingStatusChange.status}"`,
      });

    } catch (error) {
      console.error('Erro ao finalizar valores recebidos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do pedido",
        variant: "destructive",
      });
    }
  };

  // Atualizar locale quando o idioma mudar
  useEffect(() => {
    const handleLanguageChange = () => {
      const lang = document.documentElement.lang || 'pt-BR';
      setCurrentLocale(lang as "pt-BR" | "en-US" | "es-ES");
    };

    // Inicializar
    handleLanguageChange();
    
    // Adicionar listener para mudanças de idioma
    window.addEventListener('languageChange', handleLanguageChange);
    
    // Cleanup
    return () => {
      window.removeEventListener('languageChange', handleLanguageChange);
    };
  }, []);

  // Função para formatar data
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString || dateString === 'null' || dateString === 'undefined' || dateString === null || dateString === undefined || dateString === 'Data não agendada') {
      return "Data não definida";
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Data inválida";
      }
      return format(date, "PPP", { locale: dateLocales[currentLocale] });
    } catch (error) {
      return "Data inválida";
    }
  };

  // Função para formatar data no padrão brasileiro (dd/mm/AAAA)
  const formatDateBrazilian = (dateString: string | null | undefined) => {
    if (!dateString || dateString === 'null' || dateString === 'undefined' || dateString === null || dateString === undefined || dateString === 'Data não agendada') {
      return "Data não definida";
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Data inválida";
      }
      return format(date, "dd/MM/yyyy");
    } catch (error) {
      return "Data inválida";
    }
  };

  // Função simplificada para obter classes CSS do status
  const getStatusColorClasses = (order: any) => {
    // Se o backend já enviou as classes CSS geradas automaticamente, usar elas
    if (order.statusColorClasses) {
      return order.statusColorClasses;
    }
    
    // Fallback para cinza se não houver classes
    return {
      background: 'bg-gradient-to-r from-slate-50 to-slate-100/50',
      iconBg: 'bg-slate-200',
      iconText: 'text-slate-700'
    };
  };

  // Função para calcular dias úteis entre duas datas
  const calculateBusinessDays = (startDate: Date, endDate: Date): number => {
    let count = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Não é domingo (0) nem sábado (6)
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  };

  // Função para adicionar dias úteis a uma data
  const addBusinessDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    let addedDays = 0;
    
    while (addedDays < days) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Não é domingo nem sábado
        addedDays++;
      }
    }
    
    return result;
  };

  // Função para calcular dias corridos entre duas datas
  const calculateCalendarDays = (startDate: Date, endDate: Date): number => {
    const timeDiff = endDate.getTime() - startDate.getTime();
    return Math.floor(timeDiff / (1000 * 3600 * 24));
  };

  // Função para obter informações de contagem regressiva (em_avaliacao e cirurgia_realizada)
  const getCountdownInfo = (order: any) => {
    if (!order || (order.status !== 'em_avaliacao' && order.status !== 'cirurgia_realizada')) return null;
    
    const now = new Date();
    
    if (order.status === 'em_avaliacao') {
      // Lógica original para "em_avaliacao" - 21 dias úteis
      const analysisStart = new Date(order.updatedAt);
      const businessDaysElapsed = calculateBusinessDays(analysisStart, now);
      const remainingDays = 21 - businessDaysElapsed;
      
      // Se o prazo já esgotou (mais de 21 dias úteis)
      if (remainingDays <= 0) {
        const overdueBusinessDays = businessDaysElapsed - 21;
        return {
          text: `Prazo de resposta pelo operador esgotado há ${overdueBusinessDays} dias`,
          color: "text-destructive"
        };
      }
      
      // Se ainda está dentro do prazo
      return {
        text: `${remainingDays} dias úteis restantes (de 21)`,
        color: remainingDays <= 5 ? "text-muted-foreground" : "text-accent"
      };
    }
    
    if (order.status === 'cirurgia_realizada') {
      // Nova lógica para "cirurgia_realizada" - 90 dias corridos
      const surgeryCompletedDate = new Date(order.updatedAt);
      const calendarDaysElapsed = calculateCalendarDays(surgeryCompletedDate, now);
      const remainingDays = 90 - calendarDaysElapsed;
      
      // Se o prazo já esgotou (mais de 90 dias corridos)
      if (remainingDays <= 0) {
        const overdueDays = calendarDaysElapsed - 90;
        return {
          text: `Prazo para recebimento esgotado há ${overdueDays} dias`,
          color: "text-destructive"
        };
      }
      
      // Se ainda está dentro do prazo
      return {
        text: `${remainingDays} dias corridos restantes para recebimento (de 90)`,
        color: remainingDays <= 15 ? "text-muted-foreground" : "text-accent"
      };
    }
    
    return null;
  };

  // Função para baixar PDF do pedido (mesma lógica do create-order.tsx)
  const handleDownloadPdf = async (orderId: number, patientName: string) => {
    try {
      // Buscar os dados completos do pedido para obter os attachments (mesma lógica do create-order)
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
      
      // Fazer download do PDF existente usando a URL dos attachments
      const pdfResponse = await fetch(pdfAttachment.url);
      if (!pdfResponse.ok) {
        throw new Error('Erro ao acessar o PDF');
      }
      
      const blob = await pdfResponse.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = pdfAttachment.filename || `pedido_${orderId}_${patientName?.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download concluído",
        description: "PDF baixado com sucesso!",
      });
      
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o PDF do pedido.",
        variant: "destructive",
      });
    }
  };

  // Função para renderizar o status do pedido com botão de desfazer
  const renderStatus = (status: string, orderId: number, hasPreviousStatus: boolean = false, order: any = null) => {
    const statusInfo = orderStatus[status as keyof typeof orderStatus] || { 
      label: status, 
      color: "bg-muted/50 text-muted-foreground" 
    };

    // Usar a cor dinâmica do status se o order estiver disponível
    const buttonColor = order ? getStatusColorClasses(order).iconBg : statusInfo.color;
    const textColor = order ? getStatusColorClasses(order).iconText : 'text-foreground';

    return (
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className={`${buttonColor} ${textColor} px-3 py-1 text-sm font-bold rounded-full cursor-default`}
          disabled
        >
          {statusInfo.label}
        </Button>
        {hasPreviousStatus && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300"
            onClick={() => handleUndoStatus(orderId)}
            title="Desfazer última alteração de status"
          >
            <Undo2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  // Função para abrir modal de mudança de status
  const handleOpenStatusChangeModal = (order: any, currentStatus: string, currentStatusLabel: string) => {
    setStatusChangeOrderId(order.id);
    setStatusChangeCurrentStatus(currentStatus);
    setStatusChangeCurrentStatusLabel(currentStatusLabel);
    setStatusChangeOrder(order);
    setShowStatusChangeModal(true);
  };

  // Função para lidar com mudança de status via modal
  const handleStatusChangeFromModal = (orderId: number, newStatus: string) => {
    updateOrderStatus(orderId, newStatus);
  };

  // Função para lidar com aprovação parcial via modal
  const handlePartialApprovalFromModal = (orderId: number) => {
    setPartialApprovalOrderId(orderId);
    setShowPartialApprovalModal(true);
  };

  // Função para lidar com valores recebidos via modal
  const handleReceivedValuesFromModal = (orderId: number) => {
    // Configurar a mudança de status pendente para 'recebido'
    setPendingStatusChange({ orderId, status: 'recebido' });
    setReceivedValuesOrderId(orderId);
    setShowReceivedValuesModal(true);
  };

  // Função para desfazer última alteração de status
  const handleUndoStatus = async (orderId: number) => {
    try {
      setIsLoading(true);
      
      const response = await apiRequest(`/api/medical-orders/${orderId}/undo-status`, 'PATCH');
      
      if (response) {
        toast({
          title: "Status desfeito",
          description: "O status foi revertido para o estado anterior com sucesso.",
        });
        
        // Buscar apenas este pedido para obter o status e cores atualizadas (otimizado)
        await fetchOrder(orderId);
        
        // Invalidar queries relacionadas para atualizar estatísticas
        queryClient.invalidateQueries({ queryKey: ['/api/home/stats'] });
        queryClient.invalidateQueries({ queryKey: ['/api/medical-orders'] });
        queryClient.invalidateQueries({ queryKey: ['/api/reports/stats'] });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao desfazer status",
        description: error.message || "Não foi possível desfazer a última alteração de status.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para gerar recurso após aprovação parcial
  const handleGenerateAppeal = async (orderId: number) => {
    // Abrir dialog de recurso ao invés de mudar status diretamente
    setSelectedOrderForAppeal(orderId);
    setAppealJustification("");
    setRejectionReason("");
    setShowAppealDialog(true);
  };

  // Função para aceitar glosas após aprovação parcial
  const handleAcceptGloss = async (orderId: number) => {
    try {
      // Primeiro, atualizar status do pedido para "autorizado_parcial"
      await apiRequest(`/api/medical-orders/${orderId}/status`, 'PATCH', {
        status: 'autorizado_parcial' // Código do status
      });

      // Invalidar cache para atualizar dados
      queryClient.invalidateQueries({ queryKey: [`/api/medical-orders/${orderId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/medical-orders'] });
      
      // Depois, abrir modal de seleção de fornecedor
      setSupplierApprovalOrderId(orderId);
      setShowSupplierApprovalModal(true);
      
      toast({
        title: "Glosas aceitas",
        description: "Status atualizado para autorizado parcialmente. Agora selecione o fornecedor autorizado.",
      });
    } catch (error) {
      console.error('Erro ao aceitar glosas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível aceitar as glosas. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Voltar para a página anterior
  const handleGoBack = () => {
    navigate("/");
  };

  // Visualizar detalhes do pedido
  const handleViewOrder = (orderId: number) => {
    navigate(`/order/${orderId}`);
  };

  // Função para editar pedido (movida da página de detalhes)
  const handleEditOrder = (order: any) => {
    if (!order) return;

    // Verificar se o pedido está em status que não permite edição
    const nonEditableStatuses = ["aceito", "autorizado_parcial", "realizado", "cancelado", "concluido"];
    
    if (nonEditableStatuses.includes(order.status)) {
      const statusMessages = {
        "aceito": "Este pedido já foi aceito pela seguradora e não pode mais ser editado.",
        "autorizado_parcial": "Este pedido já foi autorizado parcialmente pela seguradora e não pode mais ser editado.",
        "realizado": "Este pedido já foi realizado e não pode mais ser editado.",
        "cancelado": "Este pedido foi cancelado e não pode mais ser editado.",
        "concluido": "Este pedido já foi concluído e não pode mais ser editado."
      };
      
      toast({
        title: "Edição não permitida",
        description: statusMessages[order.status as keyof typeof statusMessages] || "Este pedido não pode mais ser editado.",
        variant: "destructive",
      });
      return;
    }

    // Se o pedido pode ser editado, navegar para create-order com o ID do pedido
    navigate(`/create-order?edit=${order.id}`);
  };
  
  // Função para abrir WhatsApp com o número do paciente
  const handleWhatsAppClick = (phone: string | null) => {
    if (!phone) return;
    
    // Formatar o número removendo caracteres não numéricos
    const formattedPhone = phone.replace(/\D/g, '');
    
    // Verificar se o número já tem o código do país
    const phoneWithCountryCode = formattedPhone.startsWith('55') 
      ? formattedPhone 
      : `55${formattedPhone}`;
    
    // Abrir o WhatsApp com o número formatado
    window.open(`https://wa.me/${phoneWithCountryCode}`, '_blank');
  };

  // Função para confirmar exclusão de pedido
  const handleDeleteOrder = (orderId: number) => {
    setOrderToDelete(orderId);
    setShowDeleteConfirmation(true);
  };

  // Função para deletar pedido incompleto
  const deleteOrder = async () => {
    if (!orderToDelete) return;
    
    try {
      setIsDeletingOrder(true);
      
      const response = await apiRequest(`/api/medical-orders/${orderToDelete}`, "DELETE");
      
      // Remover o pedido dos estados locais
      setOrdersData(prev => prev.filter(order => order.id !== orderToDelete));
      setFilteredOrdersData(prev => prev.filter(order => order.id !== orderToDelete));
      
      // Fechar modal
      setShowDeleteConfirmation(false);
      setOrderToDelete(null);
      
      toast({
        title: "Pedido excluído",
        description: "O pedido foi removido com sucesso",
      });
      
    } catch (error) {
      console.error("Erro ao excluir pedido:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o pedido",
        variant: "destructive",
      });
    } finally {
      setIsDeletingOrder(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted">
      <main className="flex-grow bg-muted/30">
        <div className="container mx-auto px-4 py-6 max-w-8xl">
          {/* Cabeçalho Moderno com Fundo Azul */}
          <div className="mb-8">
            <div className="flex flex-col mb-8 p-10 rounded-xl bg-medsync-blue">
              <div className="flex items-center justify-center my-2">
                <h1 className="text-3xl font-bold text-white text-center">
                  Gestão dos Pedidos Cirúrgicos
                </h1>
              </div>
            </div>
          </div>
          
          {/* Seção de Filtros Moderna */}
          {!isLoading && !isError && ordersData.length > 0 && (
            <Card className="border-gray-200 bg-gradient-to-r from-sky-50 to-sky-100/50 shadow-sm mb-6">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-sky-200 rounded-lg">
                      <Filter className="h-5 w-5 text-sky-700" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-sky-800">Filtros de Busca</h3>
                      <p className="text-sm text-sky-700/80">Encontre pedidos específicos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasActiveFilters && (
                      <div className="px-3 py-1 bg-sky-200/70 rounded-full text-xs font-medium text-sky-800">
                        {filteredOrdersData.length} de {ordersData.length} resultados
                      </div>
                    )}
                    <Button
                      onClick={() => navigate("/create-order")}
                      className="bg-sky-600 hover:bg-sky-700 text-white font-semibold"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Novo Pedido
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Campo de busca por paciente ou ID */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-sky-600" />
                    <Input
                      placeholder="Buscar por paciente ou ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white border-sky-200 text-foreground placeholder:text-sky-600/60 focus:border-sky-400 focus:ring-sky-400"
                    />
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearSearchTerm}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-sky-600 hover:text-sky-800"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  {/* Filtro por hospital */}
                  <Select value={selectedHospital} onValueChange={setSelectedHospital}>
                    <SelectTrigger className="bg-white border-sky-200 text-foreground focus:border-sky-400 focus:ring-sky-400">
                      <SelectValue placeholder="Filtrar por hospital..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-sky-200">
                      {hospitalsList.map((hospital) => (
                        <SelectItem 
                          key={hospital.id} 
                          value={hospital.id.toString()}
                          className="text-foreground hover:bg-sky-50"
                        >
                          {hospital.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Filtro por status */}
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="bg-white border-sky-200 text-foreground focus:border-sky-400 focus:ring-sky-400">
                      <SelectValue placeholder="Filtrar por status..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-sky-200">
                      {Object.entries(orderStatus).map(([key, status]) => (
                        <SelectItem 
                          key={key} 
                          value={key}
                          className="text-foreground hover:bg-sky-50"
                        >
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Botão de limpar filtros quando há filtros ativos */}
                {hasActiveFilters && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllFilters}
                      className="border-sky-300 text-sky-700 hover:bg-sky-100"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Limpar todos os filtros
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Lista de Pedidos */}
          <Card className="border-gray-200 bg-card shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center text-foreground">
                    <FileText className="mr-2 h-5 w-5 text-sky-600" />
                    Lista de Pedidos Cirúrgicos
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {isAdmin 
                      ? "Visualize e gerencie todos os pedidos médicos do sistema" 
                      : "Acompanhe o status e histórico dos seus pedidos cirúrgicos"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>

              {/* Conteúdo principal */}
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Card key={index} className="border-gray-200 bg-card shadow overflow-hidden animate-pulse">
                      <CardContent className="p-0">
                        <div className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                            <div className="flex-1">
                              <div className="h-6 bg-muted/50 rounded w-3/4 mb-2"></div>
                              <div className="h-4 bg-muted/40 rounded w-1/2 mb-1"></div>
                              <div className="h-4 bg-muted/30 rounded w-1/3"></div>
                            </div>
                            <div className="h-8 bg-muted/50 rounded-full w-24"></div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                              <div key={i} className="h-4 bg-gray-700/30 rounded w-full"></div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="h-px bg-border"></div>
                        
                        <div className="py-2 px-4 flex justify-between items-center">
                          <div className="h-8 bg-muted/40 rounded w-20"></div>
                          <div className="flex gap-2">
                            <div className="h-8 bg-muted/30 rounded w-16"></div>
                            <div className="h-8 bg-muted/30 rounded w-16"></div>
                            <div className="h-8 bg-muted/30 rounded w-16"></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : isError ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <p className="text-lg text-destructive mb-2">{t('orders.list.error.title')}</p>
                  <p className="text-sm text-muted-foreground">{t('orders.list.error.description')}</p>
                </div>
              ) : ordersData.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg text-foreground mb-2">{t('orders.list.empty.title')}</p>
                  <p className="text-sm text-muted-foreground mb-6">{t('orders.list.empty.description')}</p>
                  <Button 
                    onClick={() => navigate("/create-order")}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {t('orders.list.empty.action')}
                  </Button>
                </div>
              ) : filteredOrdersData.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg text-foreground mb-2">Nenhum pedido encontrado</p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Não foram encontrados pedidos que correspondam aos filtros aplicados.
                  </p>
                  <Button 
                    onClick={clearAllFilters}
                    variant="outline"
                    className="border-accent text-accent hover:bg-accent-light"
                  >
                    Limpar Filtros
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredOrdersData.map((order: any) => (
                    <Card key={order.id} className="border-gray-200 bg-card shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden group">
                      <CardContent className="p-0">
                        {/* Header com gradiente baseado na cor do status do banco */}
                        <div className={`p-4 relative ${getStatusColorClasses(order).background}`}>
                          {/* ID no canto superior direito */}
                          <div className="absolute top-2 right-2">
                            <p className="text-xs font-semibold text-muted-foreground">
                              ID: #{order.id}
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`p-2 rounded-lg ${getStatusColorClasses(order).iconBg}`}>
                                  <FileText className={`h-5 w-5 ${getStatusColorClasses(order).iconText}`} />
                                </div>
                                <div className="flex-1">
                                  <div>
                                    <h3 className="text-lg font-bold text-muted-foreground pr-16">
                                      {order.patientName || 'Paciente não informado'}
                                    </h3>
                                  </div>
                                  <p className="text-sm text-medsync-blue font-bold mb-1">
                                    {order.procedureName || 'Procedimento não informado'}
                                    {order.clinicalJustification && (
                                      <>
                                        <br />
                                        <span className="text-sm text-medsync-blue font-bold mb-1">{order.clinicalJustification}</span>
                                      </>
                                    )}
                                  </p>
                                </div>
                              </div>
                              
                              {order.status === 'em_avaliacao' ? (
                                // Para estado "em_avaliacao", mostrar informações completas com contagem regressiva
                                (() => {
                                  const countdownInfo = getCountdownInfo(order);
                                  return (
                                    <div className="flex items-center gap-2 px-3 py-1 bg-white/80 rounded-full w-fit">
                                      <Clock className="h-4 w-4 text-red-600" />
                                      <div className="text-sm text-slate-700 font-medium">
                                        <div>Criado em: {formatDateBrazilian(order.createdAt)}</div>
                                        <div>Última Atualização: {formatDateBrazilian(order.updatedAt || order.createdAt)}</div>
                                        {countdownInfo && (
                                          <div className={`${countdownInfo.color} font-bold`}>
                                            {countdownInfo.text}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()
                              ) : order.status === 'cirurgia_realizada' ? (
                                // Para estado "cirurgia_realizada", mostrar informações completas com contagem regressiva
                                (() => {
                                  const countdownInfo = getCountdownInfo(order);
                                  return (
                                    <div className="flex items-center gap-2 px-3 py-1 bg-white/80 rounded-full w-fit">
                                      <Clock className="h-4 w-4 text-orange-600" />
                                      <div className="text-sm text-slate-700 font-medium">
                                        <div>Criado em: {formatDateBrazilian(order.createdAt)}</div>
                                        <div>Última Atualização: {formatDateBrazilian(order.updatedAt || order.createdAt)}</div>
                                        {countdownInfo && (
                                          <div className={`${countdownInfo.color} font-bold`}>
                                            {countdownInfo.text}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()
                              ) : (
                                // Para demais estados, mostrar última atualização
                                <div className="flex items-center gap-2 px-3 py-1 bg-white/80 rounded-full w-fit">
                                  <Clock className="h-4 w-4 text-slate-600" />
                                  <div className="text-sm text-slate-700 font-medium">
                                    <div>Criado em: {formatDateBrazilian(order.createdAt)}</div>
                                    <div>Última Atualização: {formatDateBrazilian(order.updatedAt || order.createdAt)}</div>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 order-3">
                              {renderStatus(order.status, order.id, !!order.previousStatusId, order)}
                            </div>
                          </div>
                        </div>
                        
                        {/* Informações organizadas em linhas */}
                        <div className="px-4 py-3 border-t border-gray-200/30 space-y-2">
                          {/* Primeira linha */}
                          <div className="grid grid-cols-2 gap-8 text-sm">
                            <div>
                              <span className="text-muted-foreground font-medium">Data da cirurgia:</span>
                              <span className="ml-2 text-foreground">{formatProcedureDate(order)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground font-medium">Médico Responsável:</span>
                              <span className="ml-2 text-foreground">
                                {order.userName ? `Dr(a). ${order.userName}` : 'Não informado'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Segunda linha */}
                          <div className="grid grid-cols-2 gap-8 text-sm">
                            <div>
                              <span className="text-muted-foreground font-medium">Caráter da Cirurgia:</span>
                              <span className="ml-2 text-foreground">
                                {order.procedureType === 'eletiva' ? 'Eletiva' :
                                 order.procedureType === 'urgencia' ? 'Urgência' :
                                 order.procedureType === 'emergencia' ? 'Emergência' :
                                 'Não definido'}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground font-medium">Hospital:</span>
                              <span className="ml-2 text-foreground">{order.hospitalName || 'Não informado'}</span>
                            </div>
                          </div>
                          
                          {/* Terceira linha */}
                          <div className="text-sm">
                            <span className="text-muted-foreground font-medium">Valor Recebido:</span>
                            <span className="ml-2 font-semibold text-emerald-600">{formatCurrency(order.receivedValue)}</span>
                          </div>
                        </div>
                        
                        {/* Seção de Ações Modernizada */}
                        <div className="bg-gradient-to-r from-slate-50 to-slate-100/30 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            {/* Botão WhatsApp destacado à esquerda */}
                            <Button
                              variant="outline"
                              size="sm"
                              className={`border-green-200 text-green-700 hover:bg-green-50 h-9 font-medium ${
                                order.patientPhone === null || order.patientPhone === undefined || order.patientPhone === ""
                                  ? "opacity-50 cursor-not-allowed"
                                  : "hover:shadow-sm"
                              }`}
                              onClick={() => handleWhatsAppClick(order.patientPhone)}
                              disabled={order.patientPhone === null || order.patientPhone === undefined || order.patientPhone === ""}
                              title={order.patientPhone ? `Enviar mensagem para ${order.patientName}` : "Paciente sem telefone cadastrado"}
                            >
                              <FaWhatsapp className="h-4 w-4 mr-2" />
                              WhatsApp
                            </Button>
                            
                            {/* Grupo de botões principais */}
                            <div className="flex flex-wrap gap-2">
                              {/* Botão de agendamento - aparece para status "aceito" e "autorizado_parcial" */}
                              {(order.status === "aceito" || order.status === "autorizado_parcial") && (
                                <Button
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white h-9 font-medium hover:shadow-sm"
                                  onClick={() => {
                                    setSelectedOrderForAppointment(order.id);
                                    setShowAppointmentModal(true);
                                  }}
                                >
                                  <CalendarDays className="h-4 w-4 mr-2" />
                                  {(appointmentsByOrder[order.id] && appointmentsByOrder[order.id].scheduledDate) ||
                                   (order.procedureDate && 
                                    order.procedureDate !== null && 
                                    order.procedureDate !== 'null' && 
                                    order.procedureDate !== 'undefined' &&
                                    order.procedureDate !== 'Data não agendada') ? 
                                    "Reagendar" : "Agendar"}
                                </Button>
                              )}
                              
                              {/* Botão de recurso */}
                              {(order.status === "recusado" || order.status === "pendencia" || order.status === "autorizado_parcial") && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-amber-200 text-amber-700 hover:bg-amber-50 h-9 font-medium hover:shadow-sm"
                                  onClick={() => {
                                    setSelectedOrderForAppeal(order.id);
                                    setAppealJustification("");
                                    setShowAppealDialog(true);
                                  }}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Gerar Recurso
                                </Button>
                              )}
                              
                              {/* Botão de deletar */}
                              {order.status === "em_preenchimento" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-red-200 text-red-700 hover:bg-red-50 h-9 font-medium hover:shadow-sm"
                                  onClick={() => handleDeleteOrder(order.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Apagar
                                </Button>
                              )}
                              
                              {/* Botão de editar */}
                              {['em_preenchimento', 'aguardando_envio', 'em_avaliacao'].includes(order.status) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-sky-200 text-sky-700 hover:bg-sky-50 h-9 font-medium hover:shadow-sm"
                                  onClick={() => handleEditOrder(order)}
                                  title="Editar pedido"
                                >
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Editar
                                </Button>
                              )}
                              
                              {/* Botão de download PDF */}
                              {order.status !== 'em_preenchimento' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-purple-200 text-purple-700 hover:bg-purple-50 h-9 font-medium hover:shadow-sm"
                                  onClick={() => handleDownloadPdf(order.id, order.patientName)}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Baixar PDF
                                </Button>
                              )}
                              
                              {/* Botão de visualizar */}
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-slate-200 text-slate-700 hover:bg-slate-50 h-9 font-medium hover:shadow-sm"
                                onClick={() => handleViewOrder(order.id)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Visualizar
                              </Button>
                              
                              {/* Botão "Próxima Etapa" destacado */}
                              {order.status !== 'recebido' && order.status !== 'cancelado' && (
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 font-medium hover:shadow-sm"
                                  onClick={() => handleOpenStatusChangeModal(order, order.status, orderStatus[order.status as keyof typeof orderStatus]?.label || order.status)}
                                >
                                  <ArrowRight className="h-4 w-4 mr-2" />
                                  Próxima Etapa
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Modal de agendamento de procedimento */}
      <Dialog open={schedulingOrderId !== null} onOpenChange={(open) => {
        if (!open) {
          setSchedulingOrderId(null);
          setScheduleDate("");
        }
      }}>
        <DialogContent className="bg-card border-gray-200 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Agendar Procedimento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="scheduleDate" className="text-muted-foreground">
                Data do Procedimento *
              </Label>
              <Input
                id="scheduleDate"
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="bg-input border-gray-200 text-foreground mt-1"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSchedulingOrderId(null);
                  setScheduleDate("");
                }}
                className="border-gray-200 text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (schedulingOrderId && scheduleDate) {
                    scheduleProcedure(schedulingOrderId, scheduleDate);
                  }
                }}
                disabled={!scheduleDate}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <CalendarDays className="h-4 w-4 mr-2" />
                Confirmar Agendamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para criar recurso */}
      <Dialog open={showAppealDialog} onOpenChange={setShowAppealDialog}>
        <DialogContent className="bg-card border-gray-200 text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Gerar Recurso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="rejectionReason" className="text-muted-foreground">
                Motivo da Recusa (Operadora)
              </Label>
              <Textarea
                id="rejectionReason"
                placeholder="Cole aqui a mensagem de recusa enviada pela operadora..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="bg-input border-gray-200 text-foreground mt-1 min-h-[80px]"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="appealJustification" className="text-muted-foreground">
                Justificativa Médica *
              </Label>
              <Textarea
                id="appealJustification"
                placeholder="Descreva a justificativa médica para o recurso..."
                value={appealJustification}
                onChange={(e) => setAppealJustification(e.target.value)}
                className="bg-input border-gray-200 text-foreground mt-1 min-h-[100px]"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAppealDialog(false);
                  setSelectedOrderForAppeal(null);
                  setAppealJustification("");
                  setRejectionReason("");
                }}
                className="border-destructive text-destructive hover:bg-destructive/10"
              >
                Cancelar
              </Button>
              <Button
                onClick={createAppeal}
                disabled={!appealJustification.trim() || isCreatingAppeal}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {isCreatingAppeal ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Enviar Recurso
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Aprovação Parcial */}
      {partialApprovalOrderId && (
        <PartialApprovalModal
          isOpen={showPartialApprovalModal}
          onClose={() => {
            setShowPartialApprovalModal(false);
            setPartialApprovalOrderId(null);
          }}
          orderId={partialApprovalOrderId}
          onApprovalComplete={handlePartialApprovalComplete}
          onGenerateAppeal={handleGenerateAppeal}
          onAcceptGloss={handleAcceptGloss}
        />
      )}

      {/* Modal de Valores Recebidos */}
      {receivedValuesOrderId && (
        <ReceivedValuesModal
          isOpen={showReceivedValuesModal}
          onClose={() => {
            setShowReceivedValuesModal(false);
            setReceivedValuesOrderId(null);
            setPendingStatusChange(null); // Limpar mudança pendente
          }}
          orderId={receivedValuesOrderId}
          onValuesComplete={handleReceivedValuesComplete}
        />
      )}

      {/* Modal de Aprovação de Fornecedor */}
      {supplierApprovalOrderId && (
        <SupplierApprovalModal
          isOpen={showSupplierApprovalModal}
          onClose={() => {
            setShowSupplierApprovalModal(false);
            setSupplierApprovalOrderId(null);
          }}
          orderId={supplierApprovalOrderId}
          onApprovalComplete={() => {
            // Após aprovar fornecedor, perguntar se quer agendar o procedimento
            if (supplierApprovalOrderId) {
              setAuthorizedOrderForScheduling(supplierApprovalOrderId);
              setShowSchedulingPrompt(true);
            }
            // Atualizar dados do pedido
            if (supplierApprovalOrderId) {
              fetchOrder(supplierApprovalOrderId);
            }
          }}
        />
      )}

      {/* Modal de Agendamento Cirúrgico */}
      <Dialog open={showAppointmentModal} onOpenChange={setShowAppointmentModal}>
        <DialogContent className="bg-card border-gray-200 text-foreground max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary text-xl">
              <CalendarDays className="h-5 w-5 inline mr-2" />
              <span id="appointment-modal-title">Agendar Cirurgia</span>
            </DialogTitle>
          </DialogHeader>
          {selectedOrderForAppointment && (
            <SurgeryAppointmentFormCompact
              mode="create"
              preSelectedOrderId={selectedOrderForAppointment}
              onClose={() => {
                setShowAppointmentModal(false);
                setSelectedOrderForAppointment(null);
                // Buscar apenas este pedido para refletir mudanças (otimização)
                if (selectedOrderForAppointment) {
                  fetchOrder(selectedOrderForAppointment);
                }
                toast({
                  title: "Agendamento criado",
                  description: "Cirurgia agendada com sucesso",
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <AlertDialogContent className="bg-card border-destructive/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.
              Todos os dados associados ao pedido serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-secondary border-gray-200 text-secondary-foreground hover:bg-secondary/80"
              disabled={isDeletingOrder}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteOrder}
              disabled={isDeletingOrder}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeletingOrder ? "Excluindo..." : "Excluir Pedido"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Prompt de Agendamento após Autorização */}
      <AlertDialog open={showSchedulingPrompt} onOpenChange={setShowSchedulingPrompt}>
        <AlertDialogContent className="bg-card border-green-500/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-green-600 dark:text-green-400 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Pedido Autorizado!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              O pedido foi autorizado com sucesso. Gostaria de agendar o procedimento cirúrgico agora?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-secondary border-gray-200 text-secondary-foreground hover:bg-secondary/80"
              onClick={() => {
                setShowSchedulingPrompt(false);
                setAuthorizedOrderForScheduling(null);
              }}
            >
              Mais tarde
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (authorizedOrderForScheduling) {
                  setSelectedOrderForAppointment(authorizedOrderForScheduling);
                  setShowAppointmentModal(true);
                }
                setShowSchedulingPrompt(false);
                setAuthorizedOrderForScheduling(null);
              }}
              className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-600 dark:hover:bg-green-700"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Agendar Agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Mudança de Status */}
      <StatusChangeModal
        isOpen={showStatusChangeModal}
        onClose={() => {
          setShowStatusChangeModal(false);
          setStatusChangeOrderId(null);
          setStatusChangeCurrentStatus("");
          setStatusChangeCurrentStatusLabel("");
          setStatusChangeOrder(null);
        }}
        orderId={statusChangeOrderId || 0}
        currentStatus={statusChangeCurrentStatus}
        currentStatusLabel={statusChangeCurrentStatusLabel}
        onStatusChange={handleStatusChangeFromModal}
        onPartialApproval={handlePartialApprovalFromModal}
        onReceivedValues={handleReceivedValuesFromModal}
        onEditOrder={handleEditOrder}
        order={statusChangeOrder}
      />
    </div>
  );
}