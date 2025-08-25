import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PartialApprovalModal } from "@/components/partial-approval-modal";
import { ReceivedValuesModal } from "@/components/received-values-modal";
import { Calendar, CalendarDays } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ChevronLeft, FileText, Eye, FileCheck, AlertCircle, Clock, Phone, Search, Filter, X, ChevronDown, Check, Edit2, Plus } from "lucide-react";
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
  "em_preenchimento": { label: "Incompleta", color: "bg-orange-700/70 text-orange-200" },
  "em_avaliacao": { label: "Em análise", color: "bg-blue-700/70 text-blue-200" },
  "aceito": { label: "Autorizado", color: "bg-green-700/70 text-green-200" },
  "autorizado_parcial": { label: "Autorizado Parcial", color: "bg-purple-700/70 text-purple-200" },
  "pendencia": { label: "Pendência", color: "bg-yellow-700/70 text-yellow-200" },
  "cirurgia_realizada": { label: "Cirurgia realizada", color: "bg-emerald-700/70 text-emerald-200" },
  "cancelado": { label: "Cancelada", color: "bg-red-700/70 text-red-200" },
  "aguardando_envio": { label: "Aguardando Envio", color: "bg-purple-700/70 text-purple-200" },
  "recebido": { label: "Recebido", color: "bg-green-700/70 text-green-200" }
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
  
  // Estados para agendamento de procedimento
  const [schedulingOrderId, setSchedulingOrderId] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>("");
  
  // Estados para valor recebido
  const [editingValueOrderId, setEditingValueOrderId] = useState<number | null>(null);
  const [tempReceivedValue, setTempReceivedValue] = useState<string>("");
  
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
  
  // Mapeamento de statusId para status code
  const statusIdToCode = {
    1: "em_preenchimento",
    2: "em_avaliacao", 
    3: "aceito",
    4: "autorizado_parcial",
    5: "pendencia",
    6: "cirurgia_realizada",
    7: "cancelado",
    8: "aguardando_envio",
    9: "recebido"
  };
  
  // Ler parâmetros da URL no carregamento da página
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const statusIdParam = urlParams.get('statusId');
    
    if (statusIdParam) {
      const statusCode = statusIdToCode[parseInt(statusIdParam) as keyof typeof statusIdToCode];
      if (statusCode) {
        setSelectedStatus(statusCode);
        console.log(`Filtro aplicado da URL: statusId=${statusIdParam} -> status=${statusCode}`);
      }
    }
  }, []);
  
  // Função para buscar pedidos reais do banco de dados
  const fetchOrders = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setIsError(false);
      
      // Buscar dados reais do servidor - usar a nova API implementada
      console.log(`Buscando pedidos para o usuário ID: ${user.id}`);
      
      // URL da API que implementamos com filtro por usuário
      const url = isAdmin 
        ? '/api/medical-orders' 
        : `/api/medical-orders?userId=${user.id}`;
        
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar pedidos: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Pedidos carregados da API:", data);
      
      // Log temporário para debug de status
      if (Array.isArray(data) && data.length > 0) {
        console.log("DEBUG STATUS FRONTEND - Primeiros 3 pedidos:");
        data.slice(0, 3).forEach(order => {
          console.log(`  Pedido #${order.id}: status="${order.status}", statusId=${order.statusId}`);
        });
      }
      
      // Verificar detalhes dos dados recebidos, especialmente CIDs e condutas
      if (Array.isArray(data) && data.length > 0) {
        data.forEach(order => {
          console.log(`Pedido #${order.id}:`);
          console.log(`  Paciente: ${order.patientName}, Telefone: ${order.patientPhone}`);
          console.log(`  CIDs:`, order.cidCodes);
          console.log(`  Condutas:`, order.surgicalApproaches);
        });
      }
      
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
      
      // Log para debug após processamento
      if (processedData.length > 0) {
        console.log("DEBUG STATUS APÓS PROCESSAMENTO - Primeiros 3 pedidos:");
        processedData.slice(0, 3).forEach(order => {
          console.log(`  Pedido #${order.id}: status="${order.status}", statusId=${order.statusId}`);
        });
      }
      
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
      
    } catch (error) {
      console.error("Erro ao processar pedidos:", error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar pedidos quando o componente carrega
  useEffect(() => {
    fetchOrders();
  }, [user, isAdmin]);

  // Função para recarregar dados após atualização
  const reloadOrders = () => {
    fetchOrders();
  };

  // useEffect original
  useEffect(() => {
    if (user) {
      const fetchOrdersOld = async () => {
        try {
          setIsLoading(true);
          setIsError(false);
          
          // Buscar dados reais do servidor - usar a nova API implementada
          console.log(`Buscando pedidos para o usuário ID: ${user.id}`);
          
          // URL da API que implementamos com filtro por usuário
          const url = isAdmin 
            ? '/api/medical-orders' 
            : `/api/medical-orders?userId=${user.id}`;
            
          const response = await fetch(url);
          
          if (!response.ok) {
            throw new Error(`Erro ao buscar pedidos: ${response.status}`);
          }
          
          const data = await response.json();
          console.log("Pedidos carregados da API:", data);
          
          // Verificar detalhes dos dados recebidos, especialmente telefones
          if (Array.isArray(data) && data.length > 0) {
            data.forEach(order => {
              console.log(`Paciente: ${order.patientName}, ID: ${order.patientId}, Telefone: ${order.patientPhone}`);
            });
          }
          
          // Ordenar pedidos por data de criação mais recente primeiro
          const sortedData = Array.isArray(data) ? data.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.created_at || 0);
            const dateB = new Date(b.createdAt || b.created_at || 0);
            return dateB.getTime() - dateA.getTime(); // Mais recente primeiro
          }) : [];
          
          // Usar os dados reais do banco de dados
          setOrdersData(sortedData);
          setFilteredOrdersData(sortedData);
          
          // Extrair lista única de hospitais para o filtro
          const uniqueHospitals = Array.from(
            new Map(
              data
                .filter((order: any) => order.hospitalName)
                .map((order: any) => [order.hospitalId, { id: order.hospitalId, name: order.hospitalName }])
            ).values()
          );
          setHospitalsList(uniqueHospitals);
          
        } catch (error) {
          console.error("Erro ao processar pedidos:", error);
          setIsError(true);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchOrders();
    }
  }, [user, isAdmin]);

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

  // Funções para limpar filtros
  const clearSearchTerm = () => setSearchTerm("");
  const clearHospitalFilter = () => setSelectedHospital("");
  const clearStatusFilter = () => setSelectedStatus("");
  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedHospital("");
    setSelectedStatus("");
  };

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
      
      console.log("Recurso criado:", response);
      
      setShowAppealDialog(false);
      setSelectedOrderForAppeal(null);
      setAppealJustification("");
      setRejectionReason("");
      
      toast({
        title: "Recurso criado",
        description: "Seu recurso foi enviado para análise da operadora",
      });
      
      // Recarregar dados para refletir mudanças
      reloadOrders();
      
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
      console.log(`Agendando procedimento ${orderId} para: ${date}`);
      
      const response = await apiRequest(`/api/medical-orders/${orderId}/schedule`, "PATCH", { 
        procedureDate: date 
      });
      
      console.log("Resposta do agendamento:", response);
      
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

  // Função para formatar valor monetário para exibição
  const formatCurrency = (valueInCents: number | null) => {
    if (!valueInCents) return "Não informado";
    return `R$ ${(valueInCents / 100).toFixed(2).replace('.', ',')}`;
  };

  // Função para converter valor em reais para centavos
  const parseCurrencyToCents = (value: string): number | null => {
    if (!value || value.trim() === "") return null;
    const numericValue = parseFloat(value.replace(',', '.'));
    return isNaN(numericValue) ? null : Math.round(numericValue * 100);
  };

  // Função para iniciar edição do valor recebido
  const startEditingReceivedValue = (orderId: number, currentValue: number | null) => {
    setEditingValueOrderId(orderId);
    setTempReceivedValue(currentValue ? (currentValue / 100).toFixed(2) : "");
  };

  // Função para cancelar edição do valor recebido
  const cancelEditingReceivedValue = () => {
    setEditingValueOrderId(null);
    setTempReceivedValue("");
  };

  // Função para salvar valor recebido
  const saveReceivedValue = async (orderId: number) => {
    try {
      const valueInCents = parseCurrencyToCents(tempReceivedValue);
      
      console.log(`Salvando valor recebido: R$ ${tempReceivedValue} (${valueInCents} centavos)`);
      
      const response = await apiRequest(`/api/medical-orders/${orderId}/received-value`, "PATCH", { 
        receivedValue: valueInCents 
      });
      
      console.log("Resposta da atualização de valor:", response);
      
      // Atualizar o pedido específico nos estados locais
      const updateOrderInArray = (orders: any[]) => 
        orders.map(order => 
          order.id === orderId ? { ...order, receivedValue: valueInCents } : order
        );
      
      setOrdersData(prev => updateOrderInArray(prev));
      setFilteredOrdersData(prev => updateOrderInArray(prev));
      
      // Fechar edição
      setEditingValueOrderId(null);
      setTempReceivedValue("");
      
      const formattedValue = valueInCents ? formatCurrency(valueInCents) : "removido";
      toast({
        title: "Valor atualizado",
        description: `Valor recebido ${formattedValue}`,
      });
    } catch (error) {
      console.error("Erro ao salvar valor recebido:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o valor recebido",
        variant: "destructive",
      });
    }
  };

  // Função para atualizar status do pedido
  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      console.log(`Atualizando status do pedido ${orderId} para: ${newStatus}`);
      
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
          console.log(`Pedido ${orderId}: Transição de 'cirurgia_realizada' para 'recebido' - Abrindo modal de valores recebidos`);
          setPendingStatusChange({ orderId, status: newStatus });
          setReceivedValuesOrderId(orderId);
          setShowReceivedValuesModal(true);
          return; // Não atualizar o status ainda - será atualizado quando modal for fechado
        }
      }
      
      const response = await apiRequest(`/api/medical-orders/${orderId}/status`, "PATCH", { status: newStatus });
      console.log("Resposta da atualização de status:", response);
      
      // Atualizar apenas o pedido específico nos estados locais
      const updateOrderInArray = (orders: any[]) => 
        orders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        );
      
      setOrdersData(prev => updateOrderInArray(prev));
      setFilteredOrdersData(prev => updateOrderInArray(prev));
      
      toast({
        title: "Status atualizado",
        description: `Status do pedido alterado para "${orderStatus[newStatus as keyof typeof orderStatus]?.label || newStatus}"`,
      });
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

    try {
      // Atualizar o status do pedido para autorizado_parcial
      const response = await apiRequest(`/api/medical-orders/${partialApprovalOrderId}/status`, "PATCH", { 
        status: 'autorizado_parcial' 
      });
      
      // Atualizar apenas o pedido específico nos estados locais
      const updateOrderInArray = (orders: any[]) => 
        orders.map(order => 
          order.id === partialApprovalOrderId ? { ...order, status: 'autorizado_parcial' } : order
        );
      
      setOrdersData(prev => updateOrderInArray(prev));
      setFilteredOrdersData(prev => updateOrderInArray(prev));
      
      toast({
        title: "Status atualizado",
        description: "Pedido marcado como autorizado parcialmente",
      });

    } catch (error) {
      console.error('Erro ao finalizar aprovação parcial:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do pedido",
        variant: "destructive",
      });
    }
  };

  // Função para finalizar valores recebidos
  const handleReceivedValuesComplete = async () => {
    if (!pendingStatusChange) return;

    try {
      // Atualizar o status do pedido para recebido
      const response = await apiRequest(`/api/medical-orders/${pendingStatusChange.orderId}/status`, "PATCH", { 
        status: pendingStatusChange.status 
      });
      
      // Atualizar apenas o pedido específico nos estados locais
      const updateOrderInArray = (orders: any[]) => 
        orders.map(order => 
          order.id === pendingStatusChange.orderId ? { ...order, status: pendingStatusChange.status } : order
        );
      
      setOrdersData(prev => updateOrderInArray(prev));
      setFilteredOrdersData(prev => updateOrderInArray(prev));
      
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
  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'null' || dateString === 'undefined') {
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

  // Função para renderizar o status do pedido
  const renderStatus = (status: string, orderId: number) => {
    const statusInfo = orderStatus[status as keyof typeof orderStatus] || { 
      label: status, 
      color: "bg-gray-700/70 text-gray-200" 
    };

    // Obter lista de status disponíveis (excluindo o atual)
    const availableStatuses = Object.entries(orderStatus).filter(([key, _]) => key !== status);

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`${statusInfo.color} px-3 py-1 text-xs rounded-full hover:opacity-80 transition-opacity cursor-pointer`}
          >
            {statusInfo.label}
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-[#1a2332] border-blue-800">
          {availableStatuses.map(([statusKey, statusData]) => (
            <DropdownMenuItem
              key={statusKey}
              onClick={() => updateOrderStatus(orderId, statusKey)}
              className="text-white hover:bg-blue-900/30 cursor-pointer"
            >
              <div className={`w-2 h-2 rounded-full mr-2 ${statusData.color.split(' ')[0]}`} />
              {statusData.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
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
    const nonEditableStatuses = ["aceito", "realizado", "cancelado", "concluido"];
    
    if (nonEditableStatuses.includes(order.status)) {
      const statusMessages = {
        "aceito": "Este pedido já foi aceito pela seguradora e não pode mais ser editado.",
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
    console.log('Navegando para edição do pedido:', order.id);
    navigate(`/create-order?edit=${order.id}`);
  };
  
  // Função para abrir WhatsApp com o número do paciente
  const handleWhatsAppClick = (phone: string | null) => {
    if (!phone) return;
    
    console.log("Telefone recebido:", phone);
    
    // Formatar o número removendo caracteres não numéricos
    const formattedPhone = phone.replace(/\D/g, '');
    console.log("Telefone formatado:", formattedPhone);
    
    // Verificar se o número já tem o código do país
    const phoneWithCountryCode = formattedPhone.startsWith('55') 
      ? formattedPhone 
      : `55${formattedPhone}`;
    
    console.log("Telefone com código do país:", phoneWithCountryCode);
    
    // Abrir o WhatsApp com o número formatado
    window.open(`https://wa.me/${phoneWithCountryCode}`, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#1a2332]">
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-6">
          {/* Cabeçalho */}
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              className="mr-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
              onClick={handleGoBack}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t('common.back')}
            </Button>
            <h1 className="text-2xl font-bold text-white">{t('orders.title')}</h1>
          </div>
          
          {/* Conteúdo principal */}
          <Card className="border-blue-800 bg-[#1a2332]/80 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center text-white">
                    <FileText className="mr-2 h-5 w-5 text-blue-400" />
                    {t('orders.list.title')}
                  </CardTitle>
                  <CardDescription className="text-blue-300">
                    {isAdmin 
                      ? t('orders.list.description.admin') 
                      : t('orders.list.description.user')}
                  </CardDescription>
                </div>
                <Button
                  onClick={() => navigate("/create-order")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Pedido
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Seção de Filtros */}
              {!isLoading && !isError && ordersData.length > 0 && (
                <div className="mb-6 p-4 bg-[#0f1629]/50 rounded-lg border border-blue-800/30">
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-4 w-4 text-blue-400" />
                    <h3 className="text-sm font-medium text-blue-300">Filtros de Busca</h3>
                    {(searchTerm || selectedHospital || selectedStatus) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFilters}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/30 ml-auto"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Limpar Filtros
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Campo de busca por paciente ou ID */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-400" />
                      <Input
                        placeholder="Buscar por paciente ou ID do pedido..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-[#1a2332] border-blue-800/50 text-white placeholder:text-blue-300/70"
                      />
                      {searchTerm && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearSearchTerm}
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-blue-400 hover:text-blue-300"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {/* Filtro por hospital */}
                    <Select value={selectedHospital} onValueChange={setSelectedHospital}>
                      <SelectTrigger className="bg-[#1a2332] border-blue-800/50 text-white">
                        <SelectValue placeholder="Filtrar por hospital..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a2332] border-blue-800">
                        {hospitalsList.map((hospital) => (
                          <SelectItem 
                            key={hospital.id} 
                            value={hospital.id.toString()}
                            className="text-white hover:bg-blue-900/30"
                          >
                            {hospital.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Filtro por status */}
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="bg-[#1a2332] border-blue-800/50 text-white">
                        <SelectValue placeholder="Filtrar por status..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a2332] border-blue-800">
                        {Object.entries(orderStatus).map(([key, status]) => (
                          <SelectItem 
                            key={key} 
                            value={key}
                            className="text-white hover:bg-blue-900/30"
                          >
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Indicador de resultados */}
                  {filteredOrdersData.length !== ordersData.length && (
                    <div className="mt-3 text-sm text-blue-300/70">
                      Mostrando {filteredOrdersData.length} de {ordersData.length} pedidos
                    </div>
                  )}
                </div>
              )}

              {/* Conteúdo principal */}
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : isError ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <p className="text-lg text-red-400 mb-2">{t('orders.list.error.title')}</p>
                  <p className="text-sm text-red-300/70">{t('orders.list.error.description')}</p>
                </div>
              ) : ordersData.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-blue-500/70 mx-auto mb-4" />
                  <p className="text-lg text-blue-400 mb-2">{t('orders.list.empty.title')}</p>
                  <p className="text-sm text-blue-300/70 mb-6">{t('orders.list.empty.description')}</p>
                  <Button 
                    onClick={() => navigate("/create-order")}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {t('orders.list.empty.action')}
                  </Button>
                </div>
              ) : filteredOrdersData.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 text-blue-500/70 mx-auto mb-4" />
                  <p className="text-lg text-blue-400 mb-2">Nenhum pedido encontrado</p>
                  <p className="text-sm text-blue-300/70 mb-6">
                    Não foram encontrados pedidos que correspondam aos filtros aplicados.
                  </p>
                  <Button 
                    onClick={clearAllFilters}
                    variant="outline"
                    className="border-blue-600 text-blue-400 hover:bg-blue-900/30"
                  >
                    Limpar Filtros
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrdersData.map((order: any) => (
                    <Card key={order.id} className="border-blue-800/50 bg-[#1e293b]/80 shadow overflow-hidden">
                      <CardContent className="p-0">
                        <div className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                            <div>
                              <h3 className="text-lg font-medium text-white truncate">
                                {order.cidCodes && order.cidCodes.length > 0 ? 
                                  `${order.cidCodes[0].code} - ${order.cidCodes[0].description}` :
                                  order.procedureName || `Pedido #${order.id}`}
                              </h3>
                              {order.surgicalApproaches && order.surgicalApproaches.length > 0 && (
                                <p className="text-sm text-green-400 mt-1">
                                  Conduta: {order.surgicalApproaches[0].name}
                                </p>
                              )}
                              <p className="text-sm text-blue-300">
                                {t('orders.list.item.created')}: {formatDate(order.createdAt)}
                              </p>
                            </div>
                            {renderStatus(order.status, order.id)}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-blue-400/80">{t('orders.list.item.patient')}:</span>{' '}
                              <span className="text-white">{order.patientName || 'Não informado'}</span>
                            </div>
                            <div>
                              <span className="text-blue-400/80">{t('orders.list.item.hospital')}:</span>{' '}
                              <span className="text-white">{order.hospitalName || 'Não informado'}</span>
                            </div>
                            <div>
                              <span className="text-blue-400/80">Data do Procedimento:</span>{' '}
                              <span className="text-white">
                                {order.procedureDate && order.procedureDate !== 'Invalid Date' ? 
                                  formatDate(order.procedureDate) : 
                                  order.status === 'aceito' ? 'Aguardando agendamento' : 'Aguardando aceitação'}
                              </span>
                            </div>
                            <div>
                              <span className="text-blue-400/80">{t('orders.list.item.doctor')}:</span>{' '}
                              <span className="text-white">{order.userName || 'Não informado'}</span>
                            </div>
                            <div>
                              <span className="text-blue-400/80">Valor Recebido:</span>{' '}
                              {editingValueOrderId === order.id ? (
                                <div className="flex items-center gap-2 mt-1">
                                  <Input
                                    type="text"
                                    placeholder="0,00"
                                    value={tempReceivedValue}
                                    onChange={(e) => setTempReceivedValue(e.target.value)}
                                    className="w-24 h-7 text-xs bg-[#1a2332] border-blue-800/50 text-white"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => saveReceivedValue(order.id)}
                                    className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700"
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={cancelEditingReceivedValue}
                                    className="h-7 px-2 text-xs border-red-600 text-red-400 hover:bg-red-900/30"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-white">{formatCurrency(order.receivedValue)}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => startEditingReceivedValue(order.id, order.receivedValue)}
                                    className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <Separator className="bg-blue-900/50" />
                        
                        <div className="py-2 px-4 flex justify-between items-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-500 hover:text-green-400 hover:bg-green-900/30"
                            onClick={() => handleWhatsAppClick(order.patientPhone)}
                            disabled={order.patientPhone === null || order.patientPhone === undefined || order.patientPhone === ""}
                            title={order.patientPhone ? `Enviar mensagem para ${order.patientName}` : "Paciente sem telefone cadastrado"}
                          >
                            <FaWhatsapp className="h-4 w-4 mr-1" />
                            WhatsApp
                          </Button>
                          
                          <div className="flex gap-2">
                            {/* Botão de agendamento - só aparece se status for "aceito" */}
                            {order.status === "aceito" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-yellow-500 hover:text-yellow-400 hover:bg-yellow-900/30"
                                onClick={() => {
                                  // Redirecionar para a agenda cirúrgica com parâmetro para abrir o formulário automaticamente e ID do pedido
                                  navigate(`/surgery-appointments?create=true&orderId=${order.id}`);
                                }}
                              >
                                <CalendarDays className="h-4 w-4 mr-1" />
                                {order.procedureDate ? "Reagendar" : "Agendar"}
                              </Button>
                            )}
                            
                            {/* Botão de recurso - aparece para status "recusado", "pendencia" e "autorizado_parcial" */}
                            {(order.status === "recusado" || order.status === "pendencia" || order.status === "autorizado_parcial") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                                onClick={() => {
                                  setSelectedOrderForAppeal(order.id);
                                  setAppealJustification("");
                                  setShowAppealDialog(true);
                                }}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Gerar Recurso
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-orange-400 hover:text-orange-300 hover:bg-orange-900/30"
                              onClick={() => handleEditOrder(order)}
                              disabled={["aceito", "realizado", "cancelado", "concluido"].includes(order.status)}
                              title={["aceito", "realizado", "cancelado", "concluido"].includes(order.status) ? "Este pedido não pode mais ser editado" : "Editar pedido"}
                            >
                              <Edit2 className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
                              onClick={() => handleViewOrder(order.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              {t('orders.list.item.view')}
                            </Button>
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
        <DialogContent className="bg-[#1e293b] border-blue-800/50 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Agendar Procedimento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="scheduleDate" className="text-blue-300">
                Data do Procedimento *
              </Label>
              <Input
                id="scheduleDate"
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="bg-[#1a2332] border-blue-800/50 text-white mt-1"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSchedulingOrderId(null);
                  setScheduleDate("");
                }}
                className="border-blue-600 text-blue-400 hover:bg-blue-900/30"
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
                className="bg-blue-600 hover:bg-blue-700 text-white"
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
        <DialogContent className="bg-[#0f1419] border-red-800/50 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Gerar Recurso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="rejectionReason" className="text-red-300">
                Motivo da Recusa (Operadora)
              </Label>
              <Textarea
                id="rejectionReason"
                placeholder="Cole aqui a mensagem de recusa enviada pela operadora..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="bg-[#1a2332] border-red-800/50 text-white mt-1 min-h-[80px]"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="appealJustification" className="text-red-300">
                Justificativa Médica *
              </Label>
              <Textarea
                id="appealJustification"
                placeholder="Descreva a justificativa médica para o recurso..."
                value={appealJustification}
                onChange={(e) => setAppealJustification(e.target.value)}
                className="bg-[#1a2332] border-red-800/50 text-white mt-1 min-h-[100px]"
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
                className="border-red-600 text-red-400 hover:bg-red-900/30"
              >
                Cancelar
              </Button>
              <Button
                onClick={createAppeal}
                disabled={!appealJustification.trim() || isCreatingAppeal}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isCreatingAppeal ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
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
    </div>
  );
}