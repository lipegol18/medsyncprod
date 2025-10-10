import { useState, useEffect } from "react";
import { useLocation, useRoute, useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SurgeryAppointmentFormCompact } from "@/components/surgery-appointment-form-compact";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";

import { 
  ChevronLeft, 
  User, 
  Building, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  Package,
  ShieldAlert,
  Clock,
  AlertCircle,
  Image,
  Pencil,
  Edit3,
  Edit2,
  Activity,
  DollarSign,
  Hash,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  ArrowRight,
  Truck
} from "lucide-react";
import { addOrderDetailsTranslations } from "@/lib/translations/order-details";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PROCEDURE_TYPES, PROCEDURE_TYPE_VALUES } from "@shared/constants";
import { PartialApprovalModal } from "@/components/partial-approval-modal";
import { ReceivedValuesModal } from "@/components/received-values-modal";
import { StatusChangeModal } from "@/components/status-change-modal";
import { SupplierApprovalModal } from "@/components/supplier-approval-modal";

// Adicionar traduções
addOrderDetailsTranslations();

// Tipos para materiais OPME
interface OpmeItem {
  id: number;
  quantity: number;
  opmeItem: {
    id: number;
    technicalName: string;
    commercialName: string;
    anvisaRegistrationNumber: string | null;
    processNumber: string | null;
    riskClass: string | null;
    holderCnpj: string | null;
    registrationHolder: string | null;
    manufacturerName: string | null;
    countryOfManufacture: string | null;
    registrationDate: string | null;
    expirationDate: string | null;
    isValid: boolean | null;
  };
}

// Tipos para fornecedores
interface SupplierItem {
  id: number;
  supplierId: number;
  isApproved: boolean;
  approvedAt: string | null;
  supplier: {
    id: number;
    companyName: string;
    tradeName: string;
    cnpj: string;
  };
}

// Tipos para procedimentos CBHPM
interface ProcedureItem {
  id: number;
  orderId: number;
  procedureId: number;
  code: string;
  name: string;
  description: string;
  quantityRequested: number;
  quantityApproved: number | null;
  status: string;
  receivedValue: number | null;
  isMain: boolean;
  procedureDetails: {
    porte: string | null;
    custoOperacional: string | null;
    porteAnestesista: string | null;
    numeroAuxiliares: number | null;
    active: boolean | null;
  };
  createdAt: string;
  updatedAt: string;
}

// Componente para lista de procedimentos CBHPM
const ProceduresList = ({ orderId, orderStatus }: { orderId: number; orderStatus: string }) => {
  const { data: procedures, isLoading, error } = useQuery({
    queryKey: ['/api/medical-orders', orderId, 'procedures'],
    queryFn: () => apiRequest(`/api/medical-orders/${orderId}/procedures`, 'GET'),
  });

  // Log temporário para debug
  console.log(`🔍 ProceduresList para orderId ${orderId}:`, { 
    procedures: procedures?.length, 
    isLoading, 
    error: error?.message,
    orderStatus 
  });

  // Função para derivar status do procedimento baseado no status do pedido
  const getProcedureStatusFromOrder = (orderStatus: string, procedureStatus?: string) => {
    switch (orderStatus) {
      case 'em_preenchimento':
        return {
          label: 'Incompleto',
          color: 'text-amber-600',
          bgColor: 'bg-amber-100 dark:bg-amber-900/20',
          icon: Clock,
          editable: false,
          showStatus: true
        };
      case 'em_avaliacao':
        return {
          label: 'Em Análise',
          color: 'text-accent-foreground',
          bgColor: 'bg-accent',
          icon: Clock,
          editable: false,
          showStatus: true
        };
      case 'aceito':
        return {
          label: 'Autorizado',
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-100 dark:bg-emerald-900/20',
          icon: CheckCircle,
          editable: false,
          showStatus: true
        };
      case 'autorizado_parcial':
        // Para pedidos parciais, usar o status individual do procedimento
        switch (procedureStatus) {
          case 'aprovado':
            return {
              label: 'Autorizado',
              color: 'text-emerald-600',
              bgColor: 'bg-emerald-100 dark:bg-emerald-900/20',
              icon: CheckCircle,
              editable: true,
              showStatus: true
            };
          case 'negado':
            return {
              label: 'Negado',
              color: 'text-destructive',
              bgColor: 'bg-destructive/10',
              icon: XCircle,
              editable: true,
              showStatus: true
            };
          default:
            return {
              label: 'Pendente Avaliação',
              color: 'text-amber-600',
              bgColor: 'bg-amber-100 dark:bg-amber-900/20',
              icon: AlertTriangle,
              editable: true,
              showStatus: true
            };
        }
      case 'cirurgia_realizada':
        return {
          label: 'Finalizado',
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-100 dark:bg-emerald-900/20',
          icon: CheckCircle,
          editable: false,
          showStatus: true
        };
      case 'recebido':
        // Para pedidos recebidos, usar o status individual do procedimento
        switch (procedureStatus) {
          case 'aprovado':
            return {
              label: 'Recebido',
              color: 'text-emerald-600',
              bgColor: 'bg-emerald-100 dark:bg-emerald-900/20',
              icon: CheckCircle,
              editable: false,
              showStatus: true
            };
          case 'negado':
          case 'cancelado':
            return {
              label: 'Cancelado',
              color: 'text-destructive',
              bgColor: 'bg-destructive/10',
              icon: XCircle,
              editable: false,
              showStatus: true
            };
          default:
            return {
              label: 'Pendente',
              color: 'text-amber-600',
              bgColor: 'bg-amber-100 dark:bg-amber-900/20',
              icon: AlertTriangle,
              editable: false,
              showStatus: true
            };
        }
      case 'cancelado':
      case 'aguardando_envio':
        return {
          label: '',
          color: '',
          bgColor: '',
          icon: Clock,
          editable: false,
          showStatus: false
        };
      default:
        return {
          label: 'Status Indefinido',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
          icon: AlertTriangle,
          editable: false,
          showStatus: true
        };
    }
  };

  // Função para formatar valores monetários
  const formatCurrency = (value: number | null) => {
    if (!value) return 'Não informado';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para calcular valor numérico do porte para ordenação
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="h-8 w-8" />
        <span className="ml-2 text-muted-foreground">Carregando procedimentos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
        <p className="text-destructive">Erro ao carregar procedimentos</p>
      </div>
    );
  }

  if (!procedures || procedures.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Nenhum procedimento CBHPM encontrado</p>
      </div>
    );
  }

  // Ordenar procedimentos por porte (maior para menor)
  const sortedProcedures = [...procedures].sort((a: ProcedureItem, b: ProcedureItem) => 
    parsePorteValue(b.procedureDetails.porte) - parsePorteValue(a.procedureDetails.porte)
  );

  return (
    <div className="space-y-4">
      {sortedProcedures.map((procedure: ProcedureItem, index: number) => {
        const statusConfig = getProcedureStatusFromOrder(orderStatus, procedure.status);
        const StatusIcon = statusConfig.icon;
        
        return (
          <div key={procedure.id} className="bg-card border-border p-4 rounded-md border">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Hash className="h-4 w-4 text-primary-foreground" />
                  <span className="text-sm text-primary-foreground font-medium">
                    {procedure.code}
                  </span>
                  {index === 0 && (
                    <Badge variant="secondary" className="text-xs bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600">
                      Procedimento Principal
                    </Badge>
                  )}
                </div>
                <h3 className="font-medium text-foreground mb-1">
                  {procedure.name}
                </h3>
              </div>
              
              {statusConfig.showStatus && (
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusConfig.bgColor}`}>
                  <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                  <span className={`text-sm font-medium ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <div>
                  <span className="text-foreground">Quantidade Solicitada:</span>{' '}
                  <span className="text-white font-medium">{procedure.quantityRequested}</span>
                </div>
                {/* Mostrar quantidade aprovada baseada no status do pedido */}
                {(orderStatus === 'aceito' || orderStatus === 'autorizado_parcial' || orderStatus === 'cirurgia_realizada' || orderStatus === 'recebido') && (
                  <div>
                    <span className="text-foreground">Quantidade Aprovada:</span>{' '}
                    <span className="text-white font-medium">
                      {orderStatus === 'aceito' || orderStatus === 'cirurgia_realizada' ? 
                        procedure.quantityRequested : // Para pedidos aceitos totalmente, quantidade aprovada = solicitada
                        (procedure.quantityApproved !== null ? procedure.quantityApproved : 'Pendente')
                      }
                    </span>
                  </div>
                )}
              </div>

              {/* Mostrar valor recebido apenas para pedidos finalizados */}
              {(orderStatus === 'cirurgia_realizada' || orderStatus === 'recebido') && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    <span className="text-foreground">Valor Recebido:</span>
                  </div>
                  <div className="ml-6">
                    <span className="text-white font-medium">
                      {formatCurrency(procedure.receivedValue)}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div>
                  <span className="text-foreground">Porte:</span>{' '}
                  <span className="text-foreground">
                    {procedure.procedureDetails.porte || 'Não informado'}
                  </span>
                </div>
                <div>
                  <span className="text-foreground">Auxiliares:</span>{' '}
                  <span className="text-foreground">
                    {procedure.procedureDetails.numeroAuxiliares || 'Não informado'}
                  </span>
                </div>
              </div>
            </div>

            {procedure.description && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-foreground text-xs">
                  {procedure.description}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {/* Resumo dos procedimentos */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex justify-between items-center text-sm">
          <span className="text-primary-foreground">
            Total de procedimentos: <span className="text-white font-medium">{procedures.length}</span>
          </span>
          {/* Mostrar valor total apenas para pedidos finalizados */}
          {(orderStatus === 'cirurgia_realizada' || orderStatus === 'recebido') && (
            <span className="text-primary-foreground">
              Valor total recebido:{' '}
              <span className="text-white font-medium">
                {formatCurrency(
                  procedures.reduce((total: number, proc: ProcedureItem) => 
                    total + ((proc.receivedValue || 0) * (proc.quantityApproved || 0)), 0
                  )
                )}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Componente para exibir materiais OPME
const OpmeItemsList = ({ orderId }: { orderId: number }) => {
  const { data: opmeItems, isLoading, isError } = useQuery<OpmeItem[]>({
    queryKey: [`/api/medical-orders/${orderId}/opme-items`],
    queryFn: async () => {
      const response = await fetch(`/api/medical-orders/${orderId}/opme-items`);
      if (!response.ok) {
        throw new Error("Falha ao carregar materiais OPME");
      }
      return response.json();
    },
    enabled: !!orderId,
  });

  if (isLoading) {
    return (
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Materiais OPME</CardTitle>
          <CardDescription>Materiais OPME associados ao pedido médico</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <Spinner className="h-8 w-8 text-primary-foreground" />
            <span className="ml-2 text-primary-foreground">Carregando materiais OPME...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Materiais OPME</CardTitle>
          <CardDescription>Materiais OPME associados ao pedido médico</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
            <p className="text-destructive">Erro ao carregar materiais OPME</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg text-foreground">Materiais OPME</CardTitle>
        <CardDescription>Materiais OPME associados ao pedido médico</CardDescription>
      </CardHeader>
      <CardContent>
        {opmeItems && opmeItems.length > 0 ? (
          <div className="space-y-4">
            {opmeItems.map((item: OpmeItem) => (
              <div key={item.id} className="bg-background p-6 rounded-lg border border-border">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-lg mb-2">
                      {item.opmeItem.commercialName}
                    </h3>
                    <p className="text-primary-foreground text-sm mb-2">
                      {item.opmeItem.technicalName}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-accent text-foreground">
                    Qtd: {item.quantity}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  {item.opmeItem.anvisaRegistrationNumber && (
                    <div>
                      <span className="text-foreground">Registro ANVISA:</span>{' '}
                      <span className="text-foreground">{item.opmeItem.anvisaRegistrationNumber}</span>
                    </div>
                  )}
                  
                  {item.opmeItem.processNumber && (
                    <div>
                      <span className="text-foreground">Processo:</span>{' '}
                      <span className="text-foreground">{item.opmeItem.processNumber}</span>
                    </div>
                  )}
                  
                  {item.opmeItem.riskClass && (
                    <div>
                      <span className="text-foreground">Classe de Risco:</span>{' '}
                      <span className="text-foreground">{item.opmeItem.riskClass}</span>
                    </div>
                  )}
                  
                  {item.opmeItem.registrationHolder && (
                    <div>
                      <span className="text-foreground">Detentor:</span>{' '}
                      <span className="text-foreground">{item.opmeItem.registrationHolder}</span>
                    </div>
                  )}
                  
                  {item.opmeItem.manufacturerName && (
                    <div>
                      <span className="text-foreground">Fabricante:</span>{' '}
                      <span className="text-foreground">{item.opmeItem.manufacturerName}</span>
                    </div>
                  )}
                  
                  {item.opmeItem.countryOfManufacture && (
                    <div>
                      <span className="text-foreground">País:</span>{' '}
                      <span className="text-foreground">{item.opmeItem.countryOfManufacture}</span>
                    </div>
                  )}
                </div>

                {(item.opmeItem.registrationDate || item.opmeItem.expirationDate) && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {item.opmeItem.registrationDate && (
                        <div>
                          <span className="text-foreground">Data de Registro:</span>{' '}
                          <span className="text-foreground">
                            {format(new Date(item.opmeItem.registrationDate), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      )}
                      
                      {item.opmeItem.expirationDate && (
                        <div>
                          <span className="text-foreground">Validade:</span>{' '}
                          <span className="text-foreground">
                            {format(new Date(item.opmeItem.expirationDate), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-3 flex items-center">
                  <span className="text-foreground text-sm">Status:</span>
                  <Badge 
                    variant={item.opmeItem.isValid ? "default" : "destructive"}
                    className={`ml-2 ${item.opmeItem.isValid ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600' : 'bg-destructive/20 text-destructive'}`}
                  >
                    {item.opmeItem.isValid ? 'Vigente' : 'Vencido'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Package className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-primary-foreground">Nenhum material OPME associado a este pedido</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Componente para exibir fornecedores
const SuppliersList = ({ orderId }: { orderId: number }) => {
  const { data: suppliers, isLoading, isError } = useQuery<SupplierItem[]>({
    queryKey: [`/api/medical-orders/${orderId}/suppliers`],
    queryFn: async () => {
      const response = await fetch(`/api/medical-orders/${orderId}/suppliers`);
      if (!response.ok) {
        throw new Error("Falha ao carregar fornecedores");
      }
      return response.json();
    },
    enabled: !!orderId,
  });

  const formatCnpj = (cnpj: string) => {
    if (!cnpj) return '';
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  if (isLoading) {
    return (
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Fornecedores</CardTitle>
          <CardDescription>Fornecedores aprovados para este pedido médico</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <Spinner className="h-8 w-8 text-primary-foreground" />
            <span className="ml-2 text-primary-foreground">Carregando fornecedores...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Fornecedores</CardTitle>
          <CardDescription>Fornecedores aprovados para este pedido médico</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
            <p className="text-destructive">Erro ao carregar fornecedores</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {suppliers && suppliers.length > 0 ? (
        <div className="space-y-4">
          {suppliers.map((supplierItem: SupplierItem) => (
            <div key={supplierItem.id} className="bg-background p-6 rounded-lg border border-border">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent rounded-lg">
                    <Truck className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-lg mb-1">
                      {supplierItem.supplier.tradeName}
                    </h3>
                    <p className="text-primary-foreground text-sm">
                      {supplierItem.supplier.companyName}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge 
                    variant={supplierItem.isApproved ? "default" : "secondary"} 
                    className={supplierItem.isApproved 
                      ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 border-emerald-600" 
                      : "bg-amber-100 dark:bg-amber-900/20 text-amber-600 border-amber-600"
                    }
                  >
                    {supplierItem.isApproved ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Aprovado
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3 mr-1" />
                        Pendente
                      </>
                    )}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-foreground">CNPJ:</span>{' '}
                  <span className="text-white font-mono">{formatCnpj(supplierItem.supplier.cnpj)}</span>
                </div>
                
                {supplierItem.approvedAt && (
                  <div>
                    <span className="text-foreground">Aprovado em:</span>{' '}
                    <span className="text-foreground">
                      {format(new Date(supplierItem.approvedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="p-4 bg-muted rounded-lg inline-block mb-4">
            <Truck className="h-12 w-12 text-muted-foreground mx-auto" />
          </div>
          <p className="text-muted-foreground text-lg mb-2">Nenhum fornecedor encontrado</p>
          <p className="text-muted-foreground text-sm">
            Os fornecedores aprovados aparecerão aqui após a autorização do pedido.
          </p>
        </div>
      )}
    </>
  );
};

// Status dos pedidos com cores
const orderStatus = {
  "em_preenchimento": { label: "Incompleta", color: "bg-amber-100 dark:bg-amber-900/20 text-amber-600" },
  "em_avaliacao": { label: "Em análise", color: "bg-accent text-foreground" },
  "aceito": { label: "Autorizado", color: "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600" },
  "autorizado_parcial": { label: "Autorizado Parcial", color: "bg-purple-700/70 text-purple-200" },
  "pendencia": { label: "Pendência", color: "bg-amber-100 dark:bg-amber-900/20 text-amber-600" },
  "cirurgia_realizada": { label: "Cirurgia realizada", color: "bg-accent-light text-accent" },
  "cancelado": { label: "Cancelada", color: "bg-destructive/20 text-destructive" },
  "aguardando_envio": { label: "Aguardando Envio", color: "bg-purple-700/70 text-purple-200" },
  "recebido": { label: "Recebido", color: "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600" },
  "aguardando_recurso": { label: "Aguardando Recurso", color: "bg-rose-100 dark:bg-rose-900/20 text-rose-600" }
};

// Formatação de data
const formatDate = (dateString: string) => {
  if (!dateString || dateString === "Data não agendada") return "Data não agendada";
  try {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
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

// Função para formatar o caráter da cirurgia
const formatProcedureType = (procedureType: string | null | undefined) => {
  if (!procedureType) return "Não informado";
  
  switch (procedureType) {
    case PROCEDURE_TYPE_VALUES.ELETIVA:
      return PROCEDURE_TYPES.ELETIVA;
    case PROCEDURE_TYPE_VALUES.URGENCIA:
      return PROCEDURE_TYPES.URGENCIA;
    default:
      return procedureType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};

// Função para formatar a lateralidade da cirurgia
const formatProcedureLaterality = (laterality: string | null | undefined) => {
  if (!laterality) return "Não informado";
  
  switch (laterality) {
    case "esquerdo":
      return "Esquerdo";
    case "direito":
      return "Direito";
    case "bilateral":
      return "Bilateral";
    case "indeterminado":
      return "Indeterminado";
    default:
      return laterality.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};

export default function OrderDetails() {
  const [, navigate] = useLocation();
  const params = useParams();
  const orderId = params?.id ? parseInt(params.id, 10) : 0;
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPartialApprovalModal, setShowPartialApprovalModal] = useState(false);
  const [showReceivedValuesModal, setShowReceivedValuesModal] = useState(false);
  const [showSupplierApprovalModal, setShowSupplierApprovalModal] = useState(false);
  
  // Estados para StatusChangeModal
  const [showStatusChangeModal, setShowStatusChangeModal] = useState(false);
  const [statusChangeOrderId, setStatusChangeOrderId] = useState<number | null>(null);
  const [statusChangeCurrentStatus, setStatusChangeCurrentStatus] = useState("");
  const [statusChangeCurrentStatusLabel, setStatusChangeCurrentStatusLabel] = useState("");
  
  const { data: order, isLoading, isError } = useQuery({
    queryKey: [`/api/medical-orders/${orderId}`],
    queryFn: async () => {
      const response = await fetch(`/api/medical-orders/${orderId}`);
      if (!response.ok) {
        throw new Error("Falha ao carregar dados do pedido médico");
      }
      return response.json();
    },
    enabled: !!orderId,
  });

  // Buscar agendamento para este pedido específico
  const { data: appointment } = useQuery({
    queryKey: ['/api/surgery-appointments/by-medical-order', orderId],
    enabled: !!orderId && ['aceito', 'autorizado_parcial', 'cirurgia_realizada', 'recebido'].includes(order?.statusCode),
    queryFn: async () => {
      const response = await fetch(`/api/surgery-appointments/by-medical-order/${orderId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return null; // Nenhum agendamento encontrado
        }
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    }
  });

  // Estado para rastrear se o modal foi aberto devido a mudança de status
  const [pendingStatusChange, setPendingStatusChange] = useState<string | null>(null);

  // Estados para prompt de agendamento após autorização
  const [showSchedulingPrompt, setShowSchedulingPrompt] = useState<boolean>(false);
  
  // Estados para modal de agendamento cirúrgico
  const [showAppointmentModal, setShowAppointmentModal] = useState<boolean>(false);
  const [selectedOrderForAppointment, setSelectedOrderForAppointment] = useState<number | null>(null);
  
  // Voltar para a página anterior
  const handleGoBack = () => {
    navigate("/orders");
  };

  // Verificar se o botão editar deve aparecer (mesma lógica de orders.tsx)
  const shouldShowEditButton = order && ["em_preenchimento", "aguardando_envio"].includes(order.statusCode);

  // Função para editar pedido (mesma lógica de orders.tsx)
  const handleEditOrder = () => {
    if (!order) return;

    // Verificar se o pedido está em status que não permite edição
    const nonEditableStatuses = ["aceito", "autorizado_parcial", "realizado", "cancelado", "concluido"];
    
    if (nonEditableStatuses.includes(order.statusCode)) {
      const statusMessages = {
        "aceito": "Este pedido já foi aceito pela seguradora e não pode mais ser editado.",
        "autorizado_parcial": "Este pedido já foi autorizado parcialmente pela seguradora e não pode mais ser editado.",
        "realizado": "Este pedido já foi realizado e não pode mais ser editado.",
        "cancelado": "Este pedido foi cancelado e não pode mais ser editado.",
        "concluido": "Este pedido já foi concluído e não pode mais ser editado."
      };
      
      toast({
        title: "Edição não permitida",
        description: statusMessages[order.statusCode as keyof typeof statusMessages] || "Este pedido não pode mais ser editado.",
        variant: "destructive",
      });
      return;
    }

    // Se o pedido pode ser editado, navegar para create-order com o ID do pedido
    navigate(`/create-order?edit=${order.id}`);
  };

  // Função para abrir modal de próxima etapa (StatusChangeModal)
  const handleStatusChange = (orderId: number, currentStatus: string) => {
    console.log('🔵 handleStatusChange chamado com:', { orderId, currentStatus });
    const statusInfo = orderStatus[currentStatus as keyof typeof orderStatus];
    setStatusChangeOrderId(orderId);
    setStatusChangeCurrentStatus(currentStatus);
    setStatusChangeCurrentStatusLabel(statusInfo?.label || currentStatus);
    setShowStatusChangeModal(true);
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

  // Função para obter informações de data baseadas no status
  const getDateInfo = () => {
    if (!order) {
      return {
        label: "Carregando...",
        date: "...",
        subtitle: "...",
        color: "text-muted-foreground"
      };
    }
    
    const now = new Date();
    
    switch (order.statusCode) {
      case 'em_avaliacao': // Em análise
        const analysisStart = new Date(order.updatedAt);
        const deadline = addBusinessDays(analysisStart, 21);
        const businessDaysElapsed = calculateBusinessDays(analysisStart, now);
        const remainingDays = Math.max(0, 21 - businessDaysElapsed);
        
        return {
          label: "Análise iniciada",
          date: formatDate(order.updatedAt),
          subtitle: `${remainingDays} dias úteis restantes (de 21)`,
          color: remainingDays <= 5 ? "text-amber-600" : "text-primary-foreground"
        };
        
      case 'aceito': // Autorizado
      case 'autorizado_parcial': // Autorizado Parcial
        // Se existe agendamento, mostrar data e hora agendada
        if (appointment && appointment.scheduledDate && appointment.scheduledTime) {
          const scheduledDate = new Date(appointment.scheduledDate);
          return {
            label: "Procedimento agendado",
            date: `${formatDateBrazilian(scheduledDate.toISOString())} às ${appointment.scheduledTime}`,
            subtitle: "Data confirmada",
            color: "text-emerald-600"
          };
        }
        // Fallback para procedureDate legado
        else if (order.procedureDate) {
          return {
            label: "Procedimento agendado",
            date: formatDate(order.procedureDate),
            subtitle: "Data confirmada",
            color: "text-emerald-600"
          };
        } else {
          return {
            label: "Aguardando agendamento",
            date: "Não agendado",
            subtitle: "Autorização concedida",
            color: "text-amber-600"
          };
        }
        
      case 'cirurgia_realizada': // Cirurgia realizada
        // Se existe agendamento, mostrar data e hora agendada
        if (appointment && appointment.scheduledDate && appointment.scheduledTime) {
          const scheduledDate = new Date(appointment.scheduledDate);
          return {
            label: "Procedimento realizado",
            date: `${formatDateBrazilian(scheduledDate.toISOString())} às ${appointment.scheduledTime}`,
            subtitle: "Concluído",
            color: "text-emerald-600"
          };
        }
        // Fallback para procedureDate legado
        else {
          return {
            label: "Procedimento realizado",
            date: order.procedureDate ? formatDate(order.procedureDate) : "Data não informada",
            subtitle: "Concluído",
            color: "text-emerald-600"
          };
        }
        
      case 'aguardando_envio': // Aguardando Envio
        return {
          label: "Aguardando envio",
          date: formatDate(order.updatedAt),
          subtitle: "Preparação para análise",
          color: "text-purple-400"
        };
        
      case 'pendencia': // Pendência
        return {
          label: "Pendência identificada",
          date: formatDate(order.updatedAt),
          subtitle: "Requer ação",
          color: "text-destructive"
        };
        
      case 'aguardando_recurso': // Aguardando Recurso
        return {
          label: "Aguardando recurso",
          date: formatDate(order.updatedAt),
          subtitle: "Em análise de recurso",
          color: "text-rose-600"
        };
        
      case 'cancelado': // Cancelada
        return {
          label: "Pedido cancelado",
          date: formatDate(order.updatedAt),
          subtitle: "Processo encerrado",
          color: "text-muted-foreground"
        };
        
      case 'recebido': // Recebido
        return {
          label: "Pedido recebido",
          date: formatDate(order.updatedAt),
          subtitle: "Processo concluído",
          color: "text-emerald-600"
        };
        
      case 'em_preenchimento': // Incompleta
      default:
        return {
          label: "Criado em",
          date: formatDate(order.createdAt),
          subtitle: "Em elaboração",
          color: "text-primary-foreground"
        };
    }
  };

  // Função para atualizar status do pedido (replicada da página orders)
  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      console.log(`Atualizando status do pedido ${orderId} para: ${newStatus}`);
      
      // Se for autorizado parcial, abrir modal primeiro
      if (newStatus === 'autorizado_parcial') {
        setShowPartialApprovalModal(true);
        return; // Não atualizar o status ainda
      }
      
      // Se for recebido e status anterior é cirurgia_realizada, abrir modal de valores recebidos
      if (newStatus === 'recebido' && order?.statusCode === 'cirurgia_realizada') {
        setPendingStatusChange(newStatus);
        setShowReceivedValuesModal(true);
        return; // Não atualizar o status ainda - será atualizado quando modal for fechado
      }
      
      const response = await fetch(`/api/medical-orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        throw new Error('Erro ao atualizar status do pedido');
      }
      
      const result = await response.json();
      console.log("Resposta da atualização de status:", result);
      
      // Invalidar e refetch os dados do pedido
      queryClient.invalidateQueries({ queryKey: [`/api/medical-orders/${orderId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/home/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/stats'] });
      
      toast({
        title: "Status atualizado",
        description: `Status do pedido alterado para "${orderStatus[newStatus as keyof typeof orderStatus]?.label || newStatus}"`,
      });

      // Se o status mudou para "aceito" (autorizado), perguntar se quer agendar o procedimento
      if (newStatus === 'aceito') {
        setShowSchedulingPrompt(true);
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do pedido.",
        variant: "destructive",
      });
    }
  };

  // Função para finalizar a aprovação parcial
  const handlePartialApprovalComplete = async () => {
    // Apenas fechar o modal - o status não deve ser alterado aqui
    // Os procedimentos já foram salvos individualmente pelo modal
    setShowPartialApprovalModal(false);
    
    // Recarregar dados para refletir as mudanças nos procedimentos
    queryClient.invalidateQueries({ queryKey: [`/api/medical-orders/${orderId}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/medical-orders/${orderId}/procedures`] });
  };

  // Função para finalizar o preenchimento de valores recebidos
  const handleReceivedValuesComplete = async () => {
    try {
      // Se há uma mudança de status pendente, atualizar o status agora
      if (pendingStatusChange && orderId) {
        console.log(`Atualizando status do pedido ${orderId} para: ${pendingStatusChange}`);
        
        const response = await fetch(`/api/medical-orders/${orderId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: pendingStatusChange })
        });
        
        if (!response.ok) {
          throw new Error('Erro ao atualizar status do pedido');
        }
        
        // Limpar mudança de status pendente
        setPendingStatusChange(null);
      }
      
      // Invalidar queries para recarregar dados dos procedimentos
      queryClient.invalidateQueries({ queryKey: [`/api/medical-orders/${orderId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/medical-orders/${orderId}/procedures`] });
      queryClient.invalidateQueries({ queryKey: ['/api/home/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/stats'] });
      
      toast({
        title: "Valores registrados",
        description: "Valores recebidos dos procedimentos foram salvos com sucesso",
      });

    } catch (error) {
      console.error('Erro ao finalizar valores recebidos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar os valores recebidos",
        variant: "destructive",
      });
    }
  };

  // Função para gerar recurso após aprovação parcial
  const handleGenerateAppeal = async (orderId: number) => {
    // Redirecionar para a página de pedidos com o dialog de recurso aberto
    // Como não temos os estados do dialog aqui, vamos navegar para orders e passar parâmetros
    navigate(`/orders?appeal=${orderId}`);
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
      queryClient.invalidateQueries({ queryKey: ['/api/home/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/stats'] });
      
      // Depois, abrir modal de seleção de fornecedor
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

  // Renderizar o status do pedido
  const renderStatus = (status: string) => {
    const statusInfo = (orderStatus as any)[status] || { 
      label: status, 
      color: "bg-muted text-foreground" 
    };

    return (
      <Badge className={`${statusInfo.color} px-3 py-1 rounded-full`}>
        {statusInfo.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto py-12">
        <div className="flex justify-center items-center py-20">
          <Spinner size="lg" />
          <span className="ml-3 text-lg text-primary-foreground">{t('orderDetails.loading')}</span>
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="container max-w-5xl mx-auto py-12">
        <div className="text-center py-16">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl text-destructive mb-2">{t('orderDetails.error.title')}</h2>
          <p className="text-destructive mb-6">{t('orderDetails.error.description')}</p>
          <Button onClick={handleGoBack}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t('orderDetails.backButton')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-8">
      {/* Botão voltar e título */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={handleGoBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          {t('orderDetails.backButton')}
        </Button>
        <h1 className="text-2xl font-bold text-foreground">
          {t('orderDetails.title')} #{order.id}
        </h1>
      </div>

      {/* Informações principais */}
      <Card className="mb-6 border border-border bg-card">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl text-foreground">
                {order.surgicalApproaches && order.surgicalApproaches.length > 0 
                  ? order.surgicalApproaches[0].name
                  : `Pedido #${order.id}`}
              </CardTitle>
              <CardDescription>
                Criado em {formatDateBrazilian(order.createdAt)}
              </CardDescription>
              <CardDescription className="text-primary-foreground text-sm">
                Última atualização em: {formatDateBrazilian(order.updatedAt || order.createdAt)}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-3">
              {/* Botão Próxima Etapa (seguindo padrão da página orders) */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-emerald-100 dark:bg-emerald-900/20 border-emerald-600 text-emerald-600 hover:bg-emerald-200 dark:hover:bg-emerald-900/30 hover:text-emerald-700 text-sm px-4 py-2"
                  onClick={() => handleStatusChange(order.id, order.statusCode)}
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Próxima Etapa
                </Button>
              </div>
              
              {/* Botão editar pedido - só aparece para status editáveis */}
              {shouldShowEditButton && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-accent border-primary text-foreground hover:bg-accent hover:text-foreground"
                  onClick={handleEditOrder}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar Pedido
                </Button>
              )}
              
              {/* Botão de agendamento - aparece para status "aceito" e "autorizado_parcial" */}
              {(order.statusCode === "aceito" || order.statusCode === "autorizado_parcial") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-amber-100 dark:bg-amber-900/20 border-amber-600 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 hover:text-amber-700"
                  onClick={() => {
                    setSelectedOrderForAppointment(order.id);
                    setShowAppointmentModal(true);
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {/* Usar agendamento da surgery_appointments se existir, senão usar procedureDate */}
                  {(appointment && appointment.scheduledDate) ||
                   (order.procedureDate && 
                    order.procedureDate !== null && 
                    order.procedureDate !== 'null' && 
                    order.procedureDate !== 'undefined' &&
                    order.procedureDate !== 'Data não agendada') ? 
                    "Reagendar" : "Agendar"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center">
                <User className="text-primary-foreground mr-2 h-5 w-5" />
                <div>
                  <p className="text-sm text-primary-foreground">{t('orderDetails.patient')}</p>
                  <p className="text-base text-foreground">{order.patientName || 'Não informado'}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <Building className="text-primary-foreground mr-2 h-5 w-5" />
                <div>
                  <p className="text-sm text-primary-foreground">{t('orderDetails.hospital')}</p>
                  <p className="text-base text-foreground">{order.hospitalName || 'Não informado'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {(() => {
                const dateInfo = getDateInfo();
                return (
                  <div className="flex items-center">
                    <Calendar className={`mr-2 h-5 w-5 ${dateInfo.color}`} />
                    <div>
                      <p className={`text-sm ${dateInfo.color}`}>{dateInfo.label}</p>
                      <p className="text-base text-foreground">{dateInfo.date}</p>
                      <p className={`text-xs ${dateInfo.color} mt-1`}>{dateInfo.subtitle}</p>
                    </div>
                  </div>
                );
              })()}
              

            </div>
          </div>
        </CardContent>
      </Card>

      {/* Abas de detalhes */}
      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-6">
          <TabsTrigger value="geral">{t('orderDetails.tabs.general')}</TabsTrigger>
          <TabsTrigger value="diagnosticos">{t('orderDetails.tabs.diagnostics')}</TabsTrigger>
          <TabsTrigger value="procedimentos">{t('orderDetails.tabs.procedures')}</TabsTrigger>
          <TabsTrigger value="materiais">{t('orderDetails.tabs.materials')}</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
          <TabsTrigger value="anexos">Anexos</TabsTrigger>
        </TabsList>
        
        {/* Aba Geral */}
        <TabsContent value="geral">
          <Card className="border border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">{t('orderDetails.generalInfo.title')}</CardTitle>
              <CardDescription>{t('orderDetails.generalInfo.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-foreground">{t('orderDetails.generalInfo.doctorResponsible')}:</span>{' '}
                      <span className="text-foreground">
                        {order.doctorName ? `Dr(a). ${order.doctorName}` : 'Não informado'}
                      </span>
                    </div>
                    <div>
                      <span className="text-foreground">Lateralidade da Cirurgia:</span>{' '}
                      <span className="text-foreground">{formatProcedureLaterality(order.procedureLaterality)}</span>
                    </div>
                    <div>
                      <span className="text-foreground">{t('orderDetails.generalInfo.surgeryCharacter')}:</span>{' '}
                      <span className="text-foreground">
                        {formatProcedureType(order.procedureType)}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator className="bg-accent" />

                <div>
                  <h3 className="text-md font-medium text-primary-foreground mb-2">Indicação Clínica</h3>
                  <div className="bg-accent p-4 rounded-md">
                    {order.clinicalIndication ? (
                      <p className="text-foreground whitespace-pre-line">{order.clinicalIndication}</p>
                    ) : (
                      <p className="text-foreground italic">Nenhuma indicação clínica informada</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-md font-medium text-primary-foreground mb-2">{t('orderDetails.generalInfo.observations')}</h3>
                  <div className="bg-accent p-4 rounded-md">
                    {order.additionalNotes ? (
                      <p className="text-foreground whitespace-pre-line">{order.additionalNotes}</p>
                    ) : (
                      <p className="text-foreground italic">{t('orderDetails.generalInfo.noObservations')}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Aba Diagnósticos */}
        <TabsContent value="diagnosticos">
          <Card className="border border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">{t('orderDetails.diagnostics.title')}</CardTitle>
              <CardDescription>{t('orderDetails.diagnostics.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {order.cidCodes && order.cidCodes.length > 0 ? (
                <div className="space-y-4">
                  {order.cidCodes.map((cid: any, index: number) => (
                    <div key={index} className="bg-accent p-4 rounded-md">
                      <div className="flex items-start">
                        <Badge variant="outline" className="mr-3 bg-accent">
                          CID-10: {cid.code}
                        </Badge>
                        <div>
                          <p className="text-foreground">
                            {cid.description || t('orderDetails.diagnostics.descriptionNotAvailable')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-10 w-10 text-amber-600 mx-auto mb-4" />
                  <p className="text-amber-600">{t('orderDetails.diagnostics.noDiagnostics')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Aba Procedimentos */}
        <TabsContent value="procedimentos">
          <Card className="border border-border bg-card">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg text-foreground">Procedimentos CBHPM</CardTitle>
                  <CardDescription>Lista de procedimentos associados a este pedido médico</CardDescription>
                </div>
                {/* Botão Editar Aprovações só aparece para status autorizado parcial */}
                {order.statusCode === 'autorizado_parcial' && (
                  <Button
                    onClick={() => setShowPartialApprovalModal(true)}
                    variant="outline"
                    size="sm"
                    className="bg-accent border-border text-foreground hover:bg-accent hover:border-border"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Editar Aprovações
                  </Button>
                )}
                
                {/* Botão Editar Valores Recebidos só aparece para status recebido */}
                {order.statusCode === 'recebido' && (
                  <Button
                    onClick={() => setShowReceivedValuesModal(true)}
                    variant="outline"
                    size="sm"
                    className="bg-accent border-border text-foreground hover:bg-accent hover:border-border"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Editar Valores Recebidos
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ProceduresList orderId={order.id} orderStatus={order.statusCode} />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Aba Materiais OPME */}
        <TabsContent value="materiais">
          <OpmeItemsList orderId={order.id} />
        </TabsContent>
        
        {/* Aba Fornecedores */}
        <TabsContent value="fornecedores">
          <Card className="border border-border bg-card">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg text-foreground">Fornecedores</CardTitle>
                  <CardDescription>Fornecedores aprovados para este pedido médico</CardDescription>
                </div>
                {/* Botão Editar Aprovações só aparece para status autorizado ou autorizado parcial */}
                {(order.statusCode === 'aceito' || order.statusCode === 'autorizado_parcial') && (
                  <Button
                    onClick={() => setShowSupplierApprovalModal(true)}
                    variant="outline"
                    size="sm"
                    className="bg-accent border-border text-foreground hover:bg-accent hover:border-border"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Editar Aprovações
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <SuppliersList orderId={order.id} />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Aba Anexos */}
        <TabsContent value="anexos">
          <Card className="border border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Anexos do Pedido</CardTitle>
              <CardDescription>Todos os arquivos anexados ao pedido médico</CardDescription>
            </CardHeader>
            <CardContent>
              {order.attachments && order.attachments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {order.attachments.map((attachment: any, index: number) => (
                    <div key={attachment.id || index} className="relative group bg-background p-4 rounded-lg border border-border">
                      {/* Miniatura ou ícone baseado no tipo de arquivo */}
                      <div className="relative mb-3">
                        {attachment.type === 'image' ? (
                          <img 
                            src={attachment.url} 
                            alt={attachment.filename} 
                            className="w-full h-32 object-cover rounded-md border border-primary"
                          />
                        ) : attachment.type === 'pdf' ? (
                          <div className="w-full h-32 bg-destructive/10 border border-destructive rounded-md flex items-center justify-center">
                            <FileText className="h-12 w-12 text-destructive" />
                          </div>
                        ) : (
                          <div className="w-full h-32 bg-muted border border-border rounded-md flex items-center justify-center">
                            <Package className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        
                        {/* Overlay com ações */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => window.open(attachment.url, '_blank')}
                            className="bg-primary hover:bg-primary/90 border-border/50 text-foreground"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Abrir
                          </Button>
                        </div>
                      </div>
                      
                      {/* Informações do arquivo */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-foreground truncate" title={attachment.filename}>
                          {attachment.filename}
                        </h4>
                        
                        <div className="flex items-center justify-between text-xs text-foreground">
                          <Badge 
                            variant="secondary" 
                            className={`
                              ${attachment.type === 'image' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600' : 
                                attachment.type === 'pdf' ? 'bg-destructive/20 text-destructive' : 
                                'bg-muted text-foreground'}
                            `}
                          >
                            {attachment.type === 'image' ? 'Imagem' : 
                             attachment.type === 'pdf' ? 'PDF' : 
                             'Arquivo'}
                          </Badge>
                          
                          <span>
                            {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : 'Tamanho desconhecido'}
                          </span>
                        </div>
                        
                        {attachment.uploadedAt && (
                          <div className="text-xs text-foreground">
                            Enviado em: {format(new Date(attachment.uploadedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-primary-foreground">Nenhum anexo encontrado para este pedido</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Aprovação Parcial */}
      <PartialApprovalModal
        isOpen={showPartialApprovalModal}
        onClose={() => setShowPartialApprovalModal(false)}
        orderId={orderId}
        onApprovalComplete={handlePartialApprovalComplete}
        onGenerateAppeal={handleGenerateAppeal}
        onAcceptGloss={handleAcceptGloss}
      />

      {/* Modal de Valores Recebidos */}
      <ReceivedValuesModal
        isOpen={showReceivedValuesModal}
        onClose={() => {
          setShowReceivedValuesModal(false);
          setPendingStatusChange(null); // Limpar mudança pendente se modal for cancelado
        }}
        orderId={orderId}
        onValuesComplete={handleReceivedValuesComplete}
      />

      {/* Modal de Aprovação de Fornecedores */}
      <SupplierApprovalModal
        isOpen={showSupplierApprovalModal}
        onClose={() => setShowSupplierApprovalModal(false)}
        orderId={orderId}
        onApprovalComplete={() => {
          setShowSupplierApprovalModal(false);
          queryClient.invalidateQueries({ queryKey: [`/api/medical-orders/${orderId}/suppliers`] });
        }}
      />

      {/* Prompt de Agendamento após Autorização */}
      <AlertDialog open={showSchedulingPrompt} onOpenChange={setShowSchedulingPrompt}>
        <AlertDialogContent className="bg-background border-emerald-600">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-emerald-600 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Pedido Autorizado!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              O pedido foi autorizado com sucesso. Gostaria de agendar o procedimento cirúrgico agora?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-secondary border-border text-secondary-foreground hover:bg-secondary/80"
              onClick={() => setShowSchedulingPrompt(false)}
            >
              Mais tarde
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                // Abrir modal de agendamento diretamente (igual ao orders.tsx)
                if (order) {
                  setSelectedOrderForAppointment(order.id);
                  setShowAppointmentModal(true);
                }
                setShowSchedulingPrompt(false);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Agendar Agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Agendamento Cirúrgico */}
      <Dialog open={showAppointmentModal} onOpenChange={setShowAppointmentModal}>
        <DialogContent className="bg-background border-border text-foreground max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary-foreground text-xl">
              <Calendar className="h-5 w-5 inline mr-2" />
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
                // Invalidar cache para atualizar informações do pedido
                queryClient.invalidateQueries({ queryKey: [`/api/medical-orders/${orderId}`] });
                queryClient.invalidateQueries({ queryKey: ['/api/home/stats'] });
                queryClient.invalidateQueries({ queryKey: ['/api/reports/stats'] });
                toast({
                  title: "Agendamento criado",
                  description: "Cirurgia agendada com sucesso",
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* StatusChangeModal */}
      <StatusChangeModal
        isOpen={showStatusChangeModal}
        onClose={() => setShowStatusChangeModal(false)}
        orderId={statusChangeOrderId || order?.id || 0}
        currentStatus={statusChangeCurrentStatus}
        currentStatusLabel={statusChangeCurrentStatusLabel}
        onStatusChange={updateOrderStatus}
        onEditOrder={() => {
          // Usar a mesma lógica do botão "Editar" da página
          handleEditOrder();
          setShowStatusChangeModal(false);
        }}
        onPartialApproval={() => {
          setShowPartialApprovalModal(true);
          setShowStatusChangeModal(false);
        }}
        onReceivedValues={() => {
          setShowReceivedValuesModal(true);
          setShowStatusChangeModal(false);
        }}
      />
    </div>
  );
}