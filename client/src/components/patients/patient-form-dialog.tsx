import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Patient } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { validateCPF, checkCPFExists, formatCPF, applyCPFMask, applyPhoneMask } from "@/lib/utils";
import { fetchAddressByCEP, applyCEPMask } from "@/lib/viacep";
import { DragDropZone } from "@/components/ui/drag-drop-zone";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { HealthInsuranceSearch } from "@/components/health-insurance/health-insurance-search";
import { HealthInsurancePlanSearch } from "@/components/health-insurance/health-insurance-plan-search";
import { HealthInsuranceProvider, HealthInsurancePlan } from "@shared/schema";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FileText, User, Heart, Scan, Upload, ImageIcon, Trash2, Loader2, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { BrazilianDateInput } from "@/components/ui/brazilian-date-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Função para converter data do formato brasileiro (DD/MM/YYYY) para ISO (YYYY-MM-DD)
function convertBrazilianDateToISO(dateStr: string): string {
  if (!dateStr) return '';
  
  // Se já está no formato ISO (YYYY-MM-DD), retornar como está
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Formato DD/MM/YYYY ou DD-MM-YYYY
  const match = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return `${year}-${month}-${day}`;
  }
  
  return dateStr;
}

// Função para converter data ISO (YYYY-MM-DD) para formato brasileiro (DD/MM/YYYY)
function convertISOToBrazilian(isoDate: string): string {
  if (!isoDate) return '';
  
  // Se já está no formato brasileiro, retornar como está
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(isoDate)) {
    return isoDate;
  }
  
  // Formato YYYY-MM-DD
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = match[1];
    const month = match[2];
    const day = match[3];
    return `${day}/${month}/${year}`;
  }
  
  return isoDate;
}

// Schema de validação
const patientFormSchema = z.object({
  fullName: z.string().min(1, "Nome é obrigatório"),
  cpf: z.string().refine(validateCPF, "CPF inválido"),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  gender: z.enum(["M", "F"], { required_error: "Sexo é obrigatório" }),
  email: z.string().email("Email inválido").or(z.literal("")),
  phone: z.string().optional(),
  phone2: z.string().optional(),
  insurance: z.string().optional(),
  insuranceNumber: z.string().optional(),
  plan: z.string().optional(),
  notes: z.string().optional(),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientFormSchema>;

interface PatientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient;
  initialData?: { cpf?: string };
  onSuccess?: (patient: Patient) => void;
}

export function PatientFormDialog({
  open,
  onOpenChange,
  patient,
  initialData,
  onSuccess,
}: PatientFormDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedProvider, setSelectedProvider] = useState<HealthInsuranceProvider | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<HealthInsurancePlan | null>(null);
  const [extractedInfo, setExtractedInfo] = useState<{
    type: 'identity' | 'insurance';
    data: any;
    detectedType?: string;
    detectedSubtype?: string;
    extractorVersion?: string;
    typeConfidence?: number;
  } | null>(null);
  
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingDocument, setIsProcessingDocument] = useState(false);
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null);
  const [isLoadingCEP, setIsLoadingCEP] = useState(false);
  const [isAddressVisible, setIsAddressVisible] = useState(false);

  const isEditMode = !!patient;

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      fullName: "",
      cpf: "",
      birthDate: "",
      gender: undefined,
      email: "",
      phone: "",
      phone2: "",
      insurance: "",
      insuranceNumber: "",
      plan: "",
      notes: "",
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
    },
  });

  const { data: healthInsuranceProviders = [] } = useQuery<HealthInsuranceProvider[]>({
    queryKey: ["/api/health-insurance-providers"],
    enabled: open,
  });

  // Função para buscar endereço pelo CEP
  const handleCEPChange = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    
    if (cleanCEP.length === 8) {
      setIsLoadingCEP(true);
      
      try {
        const addressData = await fetchAddressByCEP(cleanCEP);
        
        if (addressData) {
          // Preencher campos automaticamente
          form.setValue('logradouro', addressData.logradouro);
          form.setValue('bairro', addressData.bairro);
          form.setValue('cidade', addressData.localidade);
          form.setValue('estado', addressData.uf);
          if (addressData.complemento) {
            form.setValue('complemento', addressData.complemento);
          }
          
          // Revalidar campos preenchidos para limpar erros
          form.trigger('logradouro');
          form.trigger('bairro');
          form.trigger('cidade');
          form.trigger('estado');
          
          // Focar no campo número após preenchimento
          const numberField = document.getElementById('patient-numero');
          if (numberField) numberField.focus();
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      } finally {
        setIsLoadingCEP(false);
      }
    }
  };

  // Função para verificar CPF existente e preencher dados automaticamente
  const checkExistingPatientAndFill = async (cpf: string) => {
    if (cpf && validateCPF(cpf)) {
      try {
        const cleanCPF = cpf.replace(/\D/g, '');
        const response = await fetch(`/api/patients/cpf/${cleanCPF}/exists`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.exists && data.patient) {
            // Preencher automaticamente todos os campos com os dados do paciente existente
            form.setValue('fullName', data.patient.fullName || '');
            form.setValue('birthDate', data.patient.birthDate || '');
            form.setValue('gender', data.patient.gender as 'M' | 'F');
            form.setValue('email', data.patient.email || '');
            form.setValue('phone', data.patient.phone || '');
            form.setValue('phone2', data.patient.phone2 || '');
            form.setValue('insurance', data.patient.insurance || '');
            form.setValue('insuranceNumber', data.patient.insuranceNumber || '');
            form.setValue('plan', data.patient.plan || '');
            form.setValue('notes', data.patient.notes || '');
            
            // Preencher campos de endereço se disponíveis
            if (data.patient.cep) form.setValue('cep', data.patient.cep);
            if (data.patient.logradouro) form.setValue('logradouro', data.patient.logradouro);
            if (data.patient.numero) form.setValue('numero', data.patient.numero);
            if (data.patient.complemento) form.setValue('complemento', data.patient.complemento);
            if (data.patient.bairro) form.setValue('bairro', data.patient.bairro);
            if (data.patient.cidade) form.setValue('cidade', data.patient.cidade);
            if (data.patient.estado) form.setValue('estado', data.patient.estado);
            
            toast({
              title: "Paciente encontrado",
              description: "Dados preenchidos automaticamente da base de dados.",
            });
          }
        }
      } catch (error) {
        console.error('Erro ao verificar CPF:', error);
      }
    }
  };

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      // Função para carregar paciente com endereço do servidor
      const loadPatientWithAddress = async () => {
        if (isEditMode && patient?.id) {
          try {
            const response = await fetch(`/api/patients/${patient.id}`, {
              credentials: 'include'
            });
            if (response.ok) {
              const patientData = await response.json();
              const address = patientData.address;
              
              form.reset({
                fullName: patientData.fullName || "",
                cpf: patientData.cpf || "",
                birthDate: patientData.birthDate || "",
                gender: (patientData.gender as "M" | "F") || undefined,
                email: patientData.email || "",
                phone: patientData.phone || "",
                phone2: patientData.phone2 || "",
                insurance: patientData.insurance || "",
                insuranceNumber: patientData.insuranceNumber || "",
                plan: patientData.plan || "",
                notes: patientData.notes || "",
                cep: address?.cep || "",
                logradouro: address?.logradouro || "",
                numero: address?.numero || "",
                complemento: address?.complemento || "",
                bairro: address?.bairro || "",
                cidade: address?.cidade || "",
                estado: address?.uf || "",
              });
              return;
            }
          } catch (error) {
            console.error('Erro ao carregar paciente com endereço:', error);
          }
        }
        
        // Fallback: usar dados do patient prop
        form.reset({
          fullName: patient?.fullName || "",
          cpf: patient?.cpf || initialData?.cpf || "",
          birthDate: patient?.birthDate || "",
          gender: (patient?.gender as "M" | "F") || undefined,
          email: patient?.email || "",
          phone: patient?.phone || "",
          phone2: patient?.phone2 || "",
          insurance: patient?.insurance || "",
          insuranceNumber: patient?.insuranceNumber || "",
          plan: patient?.plan || "",
          notes: patient?.notes || "",
          cep: "",
          logradouro: "",
          numero: "",
          complemento: "",
          bairro: "",
          cidade: "",
          estado: "",
        });
      };
      
      loadPatientWithAddress();
      
      // Se está em modo de edição e tem uma seguradora, buscar e definir o provider selecionado
      if (isEditMode && patient?.insurance && healthInsuranceProviders.length > 0) {
        const matchingProvider = healthInsuranceProviders.find(
          provider => provider.name === patient.insurance
        );
        if (matchingProvider) {
          setSelectedProvider(matchingProvider);
          
          // Se também tem um plano, buscar e selecionar automaticamente
          if (patient?.plan && matchingProvider.ansCode) {
            const loadPlanForEdit = async () => {
              try {
                const response = await fetch(`/api/health-insurance-plans/provider/${matchingProvider.ansCode}`, {
                  credentials: 'include'
                });
                
                if (response.ok) {
                  const plans = await response.json();
                  // Buscar o plano que corresponde ao nome salvo
                  const matchingPlan = plans.find((plan: any) => 
                    plan.nmPlano === patient.plan || 
                    (plan.nmPlano && patient.plan && plan.nmPlano.toLowerCase().includes(patient.plan.toLowerCase())) ||
                    (patient.plan && plan.nmPlano && patient.plan.toLowerCase().includes(plan.nmPlano.toLowerCase()))
                  );
                  
                  if (matchingPlan) {
                    setSelectedPlan(matchingPlan);
                  }
                }
              } catch (error) {
                console.error('Erro ao carregar plano para edição:', error);
              }
            };
            
            loadPlanForEdit();
          }
        } else {
          setSelectedProvider(null);
        }
      } else {
        // Resetar provider selecionado apenas se não estiver em modo de edição
        setSelectedProvider(null);
      }
      
      // Só limpar extractedInfo se não for modo de edição
      if (!isEditMode) {
        setExtractedInfo(null);
      }
    } else {
      // Limpar informações extraídas quando o dialog fechar
      setExtractedInfo(null);
      setSelectedProvider(null);
    }
  }, [open, patient, initialData, isEditMode, form, healthInsuranceProviders]);


  // Handler unificado para seleção de arquivo (qualquer tipo de documento)
  const handleUnifiedDocumentFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedDocumentFile(file);
      processUnifiedDocumentWithOCR(file);
    }
  };

  // Função unificada para processar qualquer documento com detecção automática
  // Usa o novo endpoint unificado que retorna a mesma estrutura para todos os tipos
  const processUnifiedDocumentWithOCR = async (file: File) => {
    try {
      setIsProcessingDocument(true);
      setExtractedInfo(null);
      
      const formData = new FormData();
      formData.append('document', file);
      formData.append('usePreprocessing', 'true');

      // Usar o novo endpoint unificado
      const response = await fetch("/api/process-document-unified", {
        method: "POST",
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.success) {
        // ESTRUTURA UNIFICADA: Todos os documentos retornam o mesmo formato
        // patient: { fullName, cpf, rg, birthDate, gender, phone, email, ... }
        // insurance?: { provider, plan, cardNumber, cns, ... }
        // metadata: { documentType, subtype, extractorVersion, confidence }
        
        const { patient, insurance, metadata } = result;
        
        // Preencher dados do paciente (sempre presente)
        if (patient.fullName) {
          form.setValue('fullName', patient.fullName);
        }
        if (patient.cpf) {
          form.setValue('cpf', patient.cpf);
          await checkExistingPatientAndFill(patient.cpf);
        }
        if (patient.birthDate) {
          const isoDate = convertBrazilianDateToISO(patient.birthDate);
          form.setValue('birthDate', isoDate);
        }
        if (patient.gender) {
          form.setValue('gender', patient.gender as 'M' | 'F');
        }
        if (patient.phone) {
          form.setValue('phone', patient.phone);
        }
        if (patient.email) {
          form.setValue('email', patient.email);
        }
        
        // Preencher dados de endereço se disponíveis (vindo do OCR)
        if (patient.address) {
          const address = patient.address;
          
          // Preencher CEP e buscar endereço completo via ViaCEP
          if (address.cep) {
            const formattedCep = applyCEPMask(address.cep);
            form.setValue('cep', formattedCep);
            
            // Buscar endereço completo pelo CEP
            const cleanCEP = address.cep.replace(/\D/g, '');
            if (cleanCEP.length === 8) {
              try {
                const viaCepData = await fetchAddressByCEP(cleanCEP);
                
                if (viaCepData) {
                  // Preencher com dados do ViaCEP (mais confiáveis)
                  form.setValue('logradouro', viaCepData.logradouro || address.logradouro || '');
                  form.setValue('bairro', viaCepData.bairro || address.bairro || '');
                  form.setValue('cidade', viaCepData.localidade || address.cidade || '');
                  form.setValue('estado', viaCepData.uf || address.estado || '');
                  
                  // Complemento: preferir o do OCR pois ViaCEP geralmente não tem
                  if (address.complemento) {
                    form.setValue('complemento', address.complemento);
                  } else if (viaCepData.complemento) {
                    form.setValue('complemento', viaCepData.complemento);
                  }
                } else {
                  // Se ViaCEP falhar, usar dados do OCR diretamente
                  if (address.logradouro) form.setValue('logradouro', address.logradouro);
                  if (address.bairro) form.setValue('bairro', address.bairro);
                  if (address.cidade) form.setValue('cidade', address.cidade);
                  if (address.estado) form.setValue('estado', address.estado);
                  if (address.complemento) form.setValue('complemento', address.complemento);
                }
              } catch (error) {
                console.error('Erro ao buscar CEP:', error);
                // Em caso de erro, usar dados do OCR
                if (address.logradouro) form.setValue('logradouro', address.logradouro);
                if (address.bairro) form.setValue('bairro', address.bairro);
                if (address.cidade) form.setValue('cidade', address.cidade);
                if (address.estado) form.setValue('estado', address.estado);
                if (address.complemento) form.setValue('complemento', address.complemento);
              }
            }
          } else {
            // Sem CEP, preencher campos diretamente do OCR
            if (address.logradouro) form.setValue('logradouro', address.logradouro);
            if (address.numero) form.setValue('numero', address.numero);
            if (address.complemento) form.setValue('complemento', address.complemento);
            if (address.bairro) form.setValue('bairro', address.bairro);
            if (address.cidade) form.setValue('cidade', address.cidade);
            if (address.estado) form.setValue('estado', address.estado);
          }
          
          // Número sempre vem do OCR (ViaCEP não tem)
          if (address.numero) {
            form.setValue('numero', address.numero);
          }
        }
        
        // Preencher dados do plano de saúde (quando disponível)
        if (insurance) {
          if (insurance.provider) {
            form.setValue('insurance', insurance.provider);
            
            // Buscar operadora no banco para obter dados completos
            try {
              const searchUrl = `/api/health-insurance-providers/search?q=${encodeURIComponent(insurance.provider)}`;
              const providerResponse = await fetch(searchUrl, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                credentials: 'include'
              });
              
              if (providerResponse.ok) {
                const providersResult = await providerResponse.json();
                if (providersResult && providersResult.length > 0) {
                  const provider = providersResult[0];
                  setSelectedProvider(provider);
                  form.setValue('insurance', provider.name);
                  
                  // Buscar plano se disponível
                  if (insurance.plan) {
                    const planUrl = `/api/health-insurance-plans/search?q=${encodeURIComponent(insurance.plan)}&registroAns=${encodeURIComponent(provider.ansCode)}`;
                    const planResponse = await fetch(planUrl, {
                      method: 'GET',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include'
                    });
                    
                    if (planResponse.ok) {
                      const plansResult = await planResponse.json();
                      if (plansResult && plansResult.length > 0) {
                        setSelectedPlan(plansResult[0]);
                        form.setValue('plan', plansResult[0].name);
                      } else {
                        form.setValue('plan', insurance.plan);
                      }
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Erro ao buscar operadora:', error);
            }
          }
          
          if (insurance.plan && !form.getValues('plan')) {
            form.setValue('plan', insurance.plan);
          }
          if (insurance.cardNumber) {
            form.setValue('insuranceNumber', insurance.cardNumber);
          }
        }
        
        // Armazenar informações da extração para exibição
        const isInsuranceDoc = metadata.documentType === 'CARTEIRINHA';
        setExtractedInfo({
          type: isInsuranceDoc ? 'insurance' : 'identity',
          data: { patient, insurance },
          detectedType: metadata.documentType,
          detectedSubtype: metadata.subtype,
          extractorVersion: metadata.extractorVersion,
          typeConfidence: metadata.confidence,
        });
        
        // Mensagem de sucesso baseada no tipo
        const typeMessages: Record<string, string> = {
          'RG': 'RG processado com sucesso',
          'CNH': 'CNH processada com sucesso',
          'CARTEIRINHA': 'Carteirinha processada com sucesso',
          'MV_PATIENT_SCREEN': 'Tela MV processada com sucesso',
        };
        
        toast({
          title: typeMessages[metadata.documentType] || 'Documento processado',
          description: insurance 
            ? 'Dados do paciente e plano extraídos automaticamente.' 
            : 'Dados extraídos e preenchidos automaticamente.',
        });
        
      } else {
        const errorMessage = result.errors?.join(', ') || 'Envie um RG, CNH, carteirinha ou tela do sistema MV.';
        toast({
          title: "Documento não reconhecido",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao processar documento:', error);
      toast({
        title: "Erro no processamento",
        description: "Não foi possível processar o documento.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingDocument(false);
    }
  };

  const onSubmit = async (data: PatientFormValues) => {
    try {
      // Separar dados do paciente dos dados de endereço
      const { cep, logradouro, numero, complemento, bairro, cidade, estado, ...patientFields } = data;
      
      // Formatar dados do paciente para envio
      const patientData = {
        ...patientFields,
        cpf: formatCPF(data.cpf),
      };
      
      // Preparar dados de endereço (se houver CEP preenchido)
      const hasAddress = cep && cep.replace(/\D/g, '').length === 8;
      const addressData = hasAddress ? {
        cep: cep,
        logradouro: logradouro || '',
        numero: numero || '',
        complemento: complemento || '',
        bairro: bairro || '',
        cidade: cidade || '',
        uf: estado || '',
        isPrimary: true,
      } : null;

      let result;
      if (isEditMode && patient) {
        result = await apiRequest(`/api/patients/${patient.id}`, "PUT", { ...patientData, address: addressData });
      } else {
        result = await apiRequest("/api/patients/register", "POST", { ...patientData, address: addressData });
      }

      // Tratar diferentes tipos de resposta do servidor
      if (result.alreadyAssociated) {
        toast({
          title: "Paciente já associado",
          description: "Este paciente já está na sua lista.",
        });
      } else if (result.wasAssociated) {
        toast({
          title: "Paciente associado",
          description: `${result.fullName} foi associado à sua lista.`,
        });
      } else {
        toast({
          title: isEditMode ? "Paciente atualizado" : "Paciente criado",
          description: `${result.fullName} foi ${isEditMode ? "atualizado" : "cadastrado"} com sucesso.`,
        });
      }

      // Invalidar cache para atualizar a lista de pacientes automaticamente
      await queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/doctors"] });

      onSuccess?.(result.patient || result);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar paciente",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] max-h-[95vh] w-[95vw] sm:w-full bg-white border-sky-200 text-sky-900 overflow-hidden flex flex-col" data-testid="patient-form-dialog">
        <DialogHeader className="flex-shrink-0" data-testid="patient-form-header">
          <DialogTitle className="text-foreground text-lg font-semibold">
            {isEditMode ? "Editar Paciente" : "Novo Paciente"}
          </DialogTitle>
          <DialogDescription className="text-sky-700/80">
            {isEditMode 
              ? "Atualize as informações do paciente selecionado." 
              : "Adicione um novo paciente ao sistema."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-4">
            {/* Layout em duas colunas principais */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              
              {/* Coluna Esquerda - Dados Pessoais */}
              <div className="flex flex-col">
                <Card className="bg-white border-sky-200 flex-1 flex flex-col" data-testid="patient-form-personal-data">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground text-sm font-semibold">
                      <User className="w-4 h-4" />
                      Dados Pessoais
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 flex-1">
                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground font-semibold">Nome Completo *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="João da Silva"
                                {...field} 
                                className="input-medsync-combo"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="cpf"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground font-semibold">CPF *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="000.000.000-00" 
                                value={field.value}
                                onChange={(e) => {
                                  const maskedValue = applyCPFMask(e.target.value);
                                  field.onChange(maskedValue);
                                }}
                                onBlur={async (e) => {
                                  await checkExistingPatientAndFill(e.target.value);
                                }}
                                maxLength={14}
                                className="input-medsync-combo"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="birthDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground font-semibold">Data de Nascimento *</FormLabel>
                              <FormControl>
                                <BrazilianDateInput 
                                  value={field.value}
                                  onChange={field.onChange}
                                  className="input-medsync-combo"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="gender"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground font-semibold">Sexo *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="combobox-medsync">
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-white border-sky-200">
                                  <SelectItem value="M">Masculino</SelectItem>
                                  <SelectItem value="F">Feminino</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground font-semibold">E-mail</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email"
                                  placeholder="exemplo@email.com"
                                  {...field} 
                                  className="input-medsync-combo"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground font-semibold">Telefone</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="(00) 00000-0000" 
                                  value={field.value}
                                  onChange={(e) => {
                                    const maskedValue = applyPhoneMask(e.target.value);
                                    field.onChange(maskedValue);
                                  }}
                                  maxLength={15}
                                  className="input-medsync-combo"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="phone2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground font-semibold">Telefone 2</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="(00) 00000-0000" 
                                value={field.value}
                                onChange={(e) => {
                                  const maskedValue = applyPhoneMask(e.target.value);
                                  field.onChange(maskedValue);
                                }}
                                maxLength={15}
                                className="input-medsync-combo"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Coluna Direita - Digitalizador OCR e Plano de Saúde */}
              <div className="flex flex-col space-y-4">
                <Card className="bg-white border-sky-200">
                  <CardContent className="p-6">
                    {/* Upload Unificado de Documento */}
                    <div className="space-y-3">
                      <DragDropZone
                        onFileDrop={async (file) => {
                          const event = { target: { files: [file] } } as any;
                          await handleUnifiedDocumentFileSelected(event);
                        }}
                        accept="image/*,application/pdf"
                        disabled={isProcessingDocument}
                        className="w-full"
                      >
                        <div
                          className={`
                            border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer
                            ${isProcessingDocument 
                              ? "border-sky-400 bg-sky-50 cursor-wait" 
                              : "border-sky-300 hover:border-sky-400 hover:bg-sky-50"
                            }
                          `}
                          onClick={() => !isProcessingDocument && docFileInputRef.current?.click()}
                        >
                          {isProcessingDocument ? (
                            <>
                              <Loader2 className="h-8 w-8 mx-auto mb-2 text-sky-600 animate-spin" />
                              <p className="font-medium text-sky-700 text-sm">Detectando e Processando...</p>
                            </>
                          ) : (
                            <>
                              <Scan className="h-8 w-8 mx-auto mb-2 text-sky-600" />
                              <p className="font-medium text-sky-700 text-sm mb-1">
                                Arraste e solte ou clique para selecionar
                              </p>
                              <p className="text-xs text-sky-600 mb-2">
                                RG, CNH, Carteirinha ou Tela MV
                              </p>
                              <div className="flex flex-wrap justify-center gap-1">
                                <Badge variant="outline" className="text-xs">PDF</Badge>
                                <Badge variant="outline" className="text-xs">PNG</Badge>
                                <Badge variant="outline" className="text-xs">JPG</Badge>
                              </div>
                            </>
                          )}
                        </div>
                      </DragDropZone>
                      
                      <input
                        ref={docFileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                        onChange={handleUnifiedDocumentFileSelected}
                        className="hidden"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Plano de Saúde */}
                <Card className="bg-white border-sky-200 flex-1 flex flex-col" data-testid="patient-form-insurance">
                  <CardHeader className="p-8">
                    <CardTitle className="flex items-center gap-2 text-foreground text-sm font-semibold">
                      <Heart className="w-4 h-4" />
                      Plano de Saúde
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 flex-1">
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="insurance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground font-semibold text-sm">Seguradora</FormLabel>
                            <FormControl>
                              <HealthInsuranceSearch
                                selectedProvider={selectedProvider}
                                setSelectedProvider={(provider) => {
                                  setSelectedProvider(provider);
                                  field.onChange(provider?.name || "");
                                }}
                                className="h-8"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="plan"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground font-semibold text-sm">Plano</FormLabel>
                            <FormControl>
                              <HealthInsurancePlanSearch
                                selectedPlan={selectedPlan}
                                setSelectedPlan={(plan) => {
                                  setSelectedPlan(plan);
                                  field.onChange(plan ? plan.nmPlano || `Plano ${plan.cdPlano}` : "");
                                }}
                                providerId={selectedProvider?.ansCode}
                                className="h-8"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="insuranceNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground font-semibold text-sm">Número da Carteirinha</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="000000"
                              {...field} 
                              className="input-medsync-combo text-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>


              </div>
            </div>

            {/* Card de Endereço - Largura Total */}
            <Card className="bg-white border-sky-200" data-testid="patient-form-address">
              <CardHeader 
                className="cursor-pointer hover:bg-sky-50 transition-colors rounded-t-lg"
                onClick={() => setIsAddressVisible(!isAddressVisible)}
              >
                <CardTitle className="flex items-center justify-between text-foreground text-sm font-semibold">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Endereço
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    className="h-6 w-6 p-0"
                  >
                    {isAddressVisible ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              {isAddressVisible && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground font-semibold">CEP</FormLabel>
                        <FormControl>
                          <Input 
                            id="patient-cep"
                            placeholder="00000-000" 
                            value={field.value}
                            onChange={(e) => {
                              const maskedValue = applyCEPMask(e.target.value);
                              field.onChange(maskedValue);
                            }}
                            onBlur={(e) => {
                              setTimeout(() => {
                                handleCEPChange(e.target.value);
                              }, 100);
                            }}
                            maxLength={9}
                            className="input-medsync-combo"
                            disabled={isLoadingCEP}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="logradouro"
                    render={({ field }) => (
                      <FormItem className="lg:col-span-2">
                        <FormLabel className="text-foreground font-semibold">Logradouro</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Rua, Avenida, Travessa..." 
                            {...field} 
                            className="input-medsync-combo"
                            disabled={isLoadingCEP}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="numero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground font-semibold">Número</FormLabel>
                        <FormControl>
                          <Input 
                            id="patient-numero"
                            placeholder="123" 
                            {...field} 
                            className="input-medsync-combo"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="complemento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground font-semibold">Complemento</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Apto, Bloco..." 
                            {...field} 
                            className="input-medsync-combo"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bairro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground font-semibold">Bairro</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Centro" 
                            {...field} 
                            className="input-medsync-combo"
                            disabled={isLoadingCEP}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground font-semibold">Cidade</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="São Paulo" 
                            {...field} 
                            className="input-medsync-combo"
                            disabled={isLoadingCEP}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="estado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground font-semibold">Estado</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="SP" 
                            maxLength={2}
                            {...field} 
                            className="input-medsync-combo uppercase"
                            disabled={isLoadingCEP}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
              )}
            </Card>

            {/* Botões de Ação */}
            <div className="flex justify-end space-x-2 pt-4" data-testid="patient-form-actions">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="btn-medsync-light"
                data-testid="button-cancel-patient"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={form.formState.isSubmitting}
                className="bg-medsync-blue hover:bg-medsync-blue-dark text-white font-semibold px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-save-patient"
              >
                {form.formState.isSubmitting ? "Salvando..." : (isEditMode ? "Atualizar" : "Salvar")}
              </button>
            </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}