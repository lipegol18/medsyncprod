import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/hooks/use-auth";

import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Search, UserPlus, Pencil, Trash2, CheckCircle, Circle, Loader2, Filter, X, ChevronsUpDown, Check, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn, calculateAge } from "@/lib/utils";
import { type Patient } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientFormDialog } from "@/components/patients/patient-form-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FaWhatsapp } from "react-icons/fa";
import { openWhatsAppChat } from "@/lib/whatsapp";

export default function Patients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCpf, setFilterCpf] = useState("");
  const [filterBirthDate, setFilterBirthDate] = useState("");
  const [filterInsurance, setFilterInsurance] = useState("");
  const [openInsuranceCombobox, setOpenInsuranceCombobox] = useState(false);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [openPatientForm, setOpenPatientForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | undefined>(undefined);
  const [processingPatientId, setProcessingPatientId] = useState<number | null>(null);
  const [showDissociateModal, setShowDissociateModal] = useState(false);
  const [patientToRemove, setPatientToRemove] = useState<Patient | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Tipo para armazenar os IDs dos pacientes associados
  type AssociatedPatient = {
    patientId: number;
    patientName: string;
    associatedAt: Date;
  };
  
  // Buscar dados dos pacientes diretamente da API
  const { data: patients, isLoading, error } = useQuery<Patient[]>({
    queryKey: ["/api/patients"]
  });
  
  // Buscar pacientes associados ao médico atual (para médicos e administradores)
  const { data: associatedPatients, isLoading: isLoadingAssociations } = useQuery<AssociatedPatient[]>({
    queryKey: ['/api/doctors', user?.id, 'patients'],
    queryFn: async () => {
      // Permitir acesso para médicos e administradores
      if (!user?.id || (user?.roleId !== 2 && user?.roleId !== 1)) return []; 
      
      // Buscar dados reais da API
      try {
        const res = await fetch(`/api/doctors/${user.id}/patients`);
        if (!res.ok) {
          console.error(`Erro ao buscar pacientes associados: ${res.status}`);
          return [];
        }
        const data = await res.json();
        console.log(`Encontrados ${data.length} pacientes associados ao médico ID ${user.id}`);
        return data;
      } catch (error) {
        console.error("Erro ao buscar pacientes associados:", error);
        return [];
      }
    },
    // Habilitar a consulta para médicos e administradores
    enabled: !!user?.id && (user?.roleId === 2 || user?.roleId === 1),
  });

  // Verificar se o usuário é um médico
  const isMedico = user?.roleId === 2;
  
  // Criar lista de convênios únicos para o filtro
  const uniqueInsurances = patients 
    ? Array.from(new Set(patients.map(p => p.insurance).filter(Boolean))) as string[]
    : [];
  
  // Verificar se há filtros ativos
  const hasActiveFilters = searchTerm.trim() || filterCpf.trim() || filterBirthDate.trim() || filterInsurance;
  
  // Funções para limpar filtros
  const clearAllFilters = () => {
    setSearchTerm("");
    setFilterCpf("");
    setFilterBirthDate("");
    setFilterInsurance("");
  };
  
  const clearSearchTerm = () => setSearchTerm("");
  const clearFilterCpf = () => setFilterCpf("");
  const clearFilterBirthDate = () => setFilterBirthDate("");
  
  useEffect(() => {
    if (!patients) return;
    
    // Filtrar a lista de pacientes com base no perfil e critérios de busca
    let filtered = [...patients];
    
    // Se o usuário for médico, sempre restringir aos pacientes associados
    if (isMedico) {
      const associatedIds = (associatedPatients || []).map(ap => ap.patientId);
      filtered = patients.filter(patient => associatedIds.includes(patient.id));
    }
    
    // Aplicar filtro de nome
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((patient) => 
        patient.fullName.toLowerCase().includes(term)
      );
    }
    
    // Aplicar filtro de CPF
    if (filterCpf.trim()) {
      const cpfTerm = filterCpf.toLowerCase();
      filtered = filtered.filter((patient) => 
        patient.cpf.toLowerCase().includes(cpfTerm)
      );
    }
    
    // Aplicar filtro de Data de Nascimento
    if (filterBirthDate.trim()) {
      filtered = filtered.filter((patient) => 
        formatDate(patient.birthDate).includes(filterBirthDate)
      );
    }
    
    // Aplicar filtro de Convênio
    if (filterInsurance) {
      filtered = filtered.filter((patient) => 
        patient.insurance === filterInsurance
      );
    }
    
    setFilteredPatients(filtered);
  }, [patients, searchTerm, filterCpf, filterBirthDate, filterInsurance, associatedPatients, isMedico]);

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };
  
  // Função para abrir o formulário de edição com um paciente selecionado
  const handleEdit = (patient: Patient) => {
    setSelectedPatient(patient);
    setOpenPatientForm(true);
  };
  
  // Função para abrir o formulário de cadastro (novo paciente)
  const handleAddNew = () => {
    setSelectedPatient(undefined);
    setOpenPatientForm(true);
  };
  
  // Função para excluir um paciente
  const handleDelete = async (patient: Patient) => {
    if (confirm(`Tem certeza que deseja excluir o paciente ${patient.fullName}?`)) {
      try {
        // Definir estado de processamento
        setProcessingPatientId(patient.id);
        
        const response = await apiRequest("DELETE", `/api/patients/${patient.id}`);
        
        if (response.ok) {
          // Força atualização da lista de pacientes
          queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
          
          // Filtrar o paciente excluído da lista local enquanto aguarda recarregamento
          if (patients) {
            const updatedPatients = patients.filter(p => p.id !== patient.id);
            // Atualiza a lista filtrada manualmente
            setFilteredPatients(updatedPatients.filter(p => 
              p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
              p.cpf.includes(searchTerm)
            ));
          }
          
          toast({
            title: "Paciente excluído com sucesso",
            description: `${patient.fullName} foi removido(a) da sua lista de pacientes.`,
          });
        } else {
          const errorText = await response.text();
          console.error("Erro na resposta:", errorText);
          throw new Error(errorText || "Erro ao excluir paciente");
        }
      } catch (error) {
        console.error("Erro ao excluir paciente:", error);
        toast({
          title: "Erro ao excluir paciente",
          description: "Não foi possível excluir o paciente. Tente novamente mais tarde.",
          variant: "destructive",
        });
      } finally {
        // Remover estado de processamento
        setProcessingPatientId(null);
      }
    }
  };
  
  // Função para associar um paciente ao médico
  const handleAssociatePatient = async (patientId: number) => {
    if (!user?.id) return;
    
    setProcessingPatientId(patientId);
    
    try {
      const response = await fetch(`/api/doctor-patients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ doctorId: user.id, patientId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
      }
      
      // Atualizar a lista de pacientes associados
      queryClient.invalidateQueries({ queryKey: ['/api/doctors', user.id, 'patients'] });
      
      toast({
        title: "Paciente associado com sucesso",
        description: "O paciente foi adicionado à sua lista.",
      });
    } catch (error) {
      console.error("Erro ao associar paciente:", error);
      toast({
        title: "Erro ao associar paciente",
        description: "Não foi possível associar o paciente. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setProcessingPatientId(null);
    }
  };
  
  // Função para abrir o modal de confirmação de desassociação
  const openDissociateModal = (patient: Patient) => {
    setPatientToRemove(patient);
    setShowDissociateModal(true);
  };
  
  // Função para executar a desassociação do paciente
  const confirmDissociatePatient = async () => {
    if (!user?.id || !patientToRemove) return;
    
    setProcessingPatientId(patientToRemove.id);
    setShowDissociateModal(false);
    
    const patientName = patientToRemove.fullName || "paciente";
    
    try {
      const response = await fetch(`/api/doctors/${user.id}/patients/${patientToRemove.id}`, {
        method: "DELETE",
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        // Se tem pedidos associados, mostrar mensagem específica
        if (errorData.hasOrders) {
          toast({
            title: "Não é possível remover este paciente",
            description: errorData.message,
            variant: "destructive",
          });
          return;
        }
        throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
      }
      
      // Atualizar a lista de pacientes associados
      queryClient.invalidateQueries({ queryKey: ['/api/doctors', user.id, 'patients'] });
      
      toast({
        title: "Paciente removido com sucesso",
        description: `${patientName} foi removido(a) da sua lista.`,
      });
    } catch (error) {
      console.error("Erro ao remover paciente:", error);
      const errorMessage = error instanceof Error ? error.message : "Não foi possível remover o paciente da sua lista.";
      toast({
        title: "Erro ao remover paciente",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setProcessingPatientId(null);
      setPatientToRemove(null);
    }
  };
  
  // Função para enviar mensagem de WhatsApp
  const handleWhatsAppMessage = (phone: string) => {
    const success = openWhatsAppChat(phone);
    if (!success) {
      toast({
        title: "Telefone não disponível",
        description: "Este paciente não possui um número de telefone válido registrado.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted">
      <main className="flex-grow bg-muted/30">
        <div className="container mx-auto px-4 py-6 max-w-8xl">
          {/* Cabeçalho Moderno com Fundo Azul */}
          <div className="mb-8">
            <div className="flex flex-col mb-8 p-10 rounded-xl bg-medsync-blue" data-testid="patients-header">
              <div className="flex items-center justify-center my-2">
                <h1 className="text-3xl font-bold text-white text-center">
                  Gestão de Pacientes
                </h1>
              </div>
            </div>
          </div>
          
          {/* Seção de Filtros Moderna */}
          {!isLoading && !error && patients && (
            <Card className="border-gray-200 bg-gradient-to-r from-sky-50 to-sky-100/50 shadow-sm mb-6" data-testid="patients-filters-card">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-sky-200 rounded-lg">
                      <Filter className="h-5 w-5 text-sky-700" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-sky-800">Filtros de Busca</h3>
                      <p className="text-sm text-sky-700/80">Encontre pacientes específicos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasActiveFilters && (
                      <div className="px-3 py-1 bg-sky-200/70 rounded-full text-xs font-medium text-sky-800">
                        {filteredPatients.length} de {patients.length} resultados
                      </div>
                    )}
                    <Button
                      onClick={handleAddNew}
                      className="bg-medsync-blue hover:bg-medsync-blue-dark text-white font-semibold"
                      data-testid="button-novo-paciente-page"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Novo Paciente
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Filtro por Nome */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-sky-600" />
                    <input
                      type="text"
                      placeholder="Buscar por nome..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input-medsync-combo pl-10"
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

                  {/* Filtro por CPF */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar por CPF..."
                      value={filterCpf}
                      onChange={(e) => setFilterCpf(e.target.value)}
                      className="input-medsync-combo"
                    />
                    {filterCpf && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilterCpf}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-sky-600 hover:text-sky-800"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  {/* Filtro por Data de Nascimento */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Data de nascimento (dd/mm/aaaa)..."
                      value={filterBirthDate}
                      onChange={(e) => setFilterBirthDate(e.target.value)}
                      className="input-medsync-combo"
                    />
                    {filterBirthDate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilterBirthDate}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-sky-600 hover:text-sky-800"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  {/* Filtro por Convênio - Combobox com busca */}
                  <Popover open={openInsuranceCombobox} onOpenChange={setOpenInsuranceCombobox}>
                    <PopoverTrigger asChild>
                      <button
                        role="combobox"
                        aria-expanded={openInsuranceCombobox}
                        className="combobox-medsync w-full"
                      >
                        <span className={filterInsurance ? "combobox-value" : "combobox-placeholder"}>
                          {filterInsurance
                            ? uniqueInsurances.find((insurance) => insurance === filterInsurance)
                            : "Filtrar por convênio..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0 bg-white border-sky-200">
                      <Command>
                        <CommandInput placeholder="Buscar convênio..." className="h-9" />
                        <CommandList>
                          <CommandEmpty>Nenhum convênio encontrado.</CommandEmpty>
                          <CommandGroup>
                            {uniqueInsurances.map((insurance) => (
                              <CommandItem
                                key={insurance}
                                value={insurance}
                                onSelect={(currentValue) => {
                                  setFilterInsurance(currentValue === filterInsurance ? "" : currentValue);
                                  setOpenInsuranceCombobox(false);
                                }}
                              >
                                {insurance}
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    filterInsurance === insurance ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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

          {/* Card principal com toda a listagem */}
          <Card className="border-gray-200 bg-card shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-200 rounded-lg">
                  <UserPlus className="h-5 w-5 text-sky-700" />
                </div>
                <div>
                  <CardTitle className="flex items-center text-foreground">
                    Meus Pacientes
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Visualização e gerenciamento dos seus pacientes
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-full bg-muted" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="py-10 text-center">
                <p className="text-destructive mb-2">Erro ao carregar pacientes</p>
                <p className="text-sm text-muted-foreground">
                  Tente novamente mais tarde
                </p>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-muted-foreground mb-2">Nenhum paciente encontrado</p>
                <p className="text-sm text-muted-foreground/70">
                  {searchTerm ? "Clique em Novo Paciente no canto superior direito" : "Adicione seu primeiro paciente"}
                </p>
              </div>
            ) : (
              <div className="rounded-md">
                <div className="bg-card text-card-foreground overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        {/* COMENTADO: Coluna de associação manual removida da interface */}
                        {/* {(user?.roleId === 2 || user?.roleId === 1) && (
                          <th className="text-center py-3 px-4 border-b border-border text-muted-foreground font-bold">Associado</th>
                        )} */}
                        <th className="text-left py-3 px-4 border-b border-border text-muted-foreground font-bold">Nome</th>
                        <th className="text-left py-3 px-4 border-b border-border text-muted-foreground font-bold">CPF</th>
                        <th className="text-left py-3 px-4 border-b border-border text-muted-foreground font-bold">Data de Nascimento</th>
                        <th className="text-left py-3 px-4 border-b border-border text-muted-foreground font-bold">Idade</th>
                        <th className="text-left py-3 px-4 border-b border-border text-muted-foreground font-bold">Convênio</th>
                        <th className="text-right py-3 px-4 border-b border-border text-muted-foreground font-bold">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.map((patient, index) => {
                        // Verificar se o paciente está associado ao médico atual
                        const isAssociated = associatedPatients?.some(ap => ap.patientId === patient.id) || false;
                        
                        // Removi os logs de diagnóstico que não são mais necessários
                        
                        return (
                          <tr key={patient.id} className={`border-b border-border hover:bg-accent/50 ${index % 2 === 0 ? 'bg-white' : 'bg-muted'}`}>
                            {/* COMENTADO: Célula de status de associação removida da interface */}
                            {/* {(user?.roleId === 2 || user?.roleId === 1) && (
                              <td className="py-3 px-4 text-center">
                                {isLoadingAssociations ? (
                                  <div className="flex justify-center">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                  </div>
                                ) : isAssociated ? (
                                  <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                                ) : (
                                  <Circle className="h-5 w-5 text-muted-foreground mx-auto" />
                                )}
                              </td>
                            )} */}
                            <td className="py-3 px-4 text-foreground font-medium">{patient.fullName}</td>
                            <td className="py-3 px-4 text-foreground">{patient.cpf}</td>
                            <td className="py-3 px-4 text-foreground">{formatDate(patient.birthDate)}</td>
                            <td className="py-3 px-4 text-foreground">{calculateAge(patient.birthDate)} anos</td>
                            <td className="py-3 px-4">
                              {patient.insuranceProviderName ? (
                                <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-sky-200">
                                  {patient.insuranceProviderName}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">Não informado</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex justify-end gap-2">
                                {/* COMENTADO: Botão de associar/desassociar manualmente removido da interface */}
                                {/* {(user?.roleId === 2 || user?.roleId === 1) && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className={isAssociated 
                                      ? "border-border text-destructive hover:bg-destructive/10 hover:text-destructive" 
                                      : "border-border text-green-600 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-900/20 dark:hover:text-green-300"
                                    }
                                    onClick={() => isAssociated 
                                      ? handleDissociatePatient(patient.id) 
                                      : handleAssociatePatient(patient.id)
                                    }
                                    disabled={isLoadingAssociations || processingPatientId !== null}
                                  >
                                    {processingPatientId === patient.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : isAssociated ? (
                                      <>
                                        <Circle className="mr-2 h-4 w-4" />
                                        Desassociar
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Associar
                                      </>
                                    )}
                                  </Button>
                                )} */}
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="border-green-200 text-green-700 hover:bg-green-50 h-9 font-medium hover:shadow-sm"
                                  onClick={() => handleWhatsAppMessage(patient.phone || "")}
                                  title="Enviar mensagem no WhatsApp"
                                >
                                  <FaWhatsapp className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="border-sky-200 text-sky-700 hover:bg-sky-50 h-9 font-medium hover:shadow-sm"
                                  onClick={() => handleEdit(patient)}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Editar
                                </Button>
                                {user?.roleId === 1 && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="border-red-200 text-red-700 hover:bg-red-50 h-9 font-medium hover:shadow-sm"
                                    onClick={() => handleDelete(patient)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                  </Button>
                                )}
                                {user?.roleId === 2 && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="border-red-200 text-red-700 hover:bg-red-50 h-9 font-medium hover:shadow-sm"
                                    onClick={() => openDissociateModal(patient)}
                                    disabled={processingPatientId === patient.id}
                                  >
                                    {processingPatientId === patient.id ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="mr-2 h-4 w-4" />
                                    )}
                                    Excluir
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </main>
      
      {/* Modal de cadastro/edição de paciente */}
      <PatientFormDialog 
        open={openPatientForm} 
        onOpenChange={setOpenPatientForm}
        patient={selectedPatient}
      />

      {/* Modal de confirmação de remoção de paciente */}
      <AlertDialog open={showDissociateModal} onOpenChange={setShowDissociateModal}>
        <AlertDialogContent className="bg-card border-red-500/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Remover Paciente
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Tem certeza que deseja remover <strong>{patientToRemove?.fullName}</strong>?
              <br /><br />
              Esta ação apenas será possível se não possuir pedidos ativos no sistema para o respectivo paciente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-secondary border-gray-200 text-secondary-foreground hover:bg-secondary/80"
              onClick={() => {
                setShowDissociateModal(false);
                setPatientToRemove(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDissociatePatient}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remover Paciente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}